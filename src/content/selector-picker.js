// Selector picker: lets the user click an input or button on the page and
// stores a stable CSS selector for it. Two responsibilities:
//
//  1. cleanSelector(el): pick a stable, descriptive selector. Avoid Tailwind
//     class chains and dev-only ids; prefer id, data-testid, aria-label,
//     role, and form name attributes. Fall back to a 2-level nth-of-type
//     path so the selector survives minor DOM changes.
//
//  2. startPicking(...): the click-and-pick interaction. An overlay / modal /
//     hidden element is REJECTED, not selected — the floating label tells
//     the user why. Esc cancels. On click, the alert() flow in
//     content/index.js announces the mapping.

const LABEL_ID = "auto-sender-picker-label";
const SKIP_ATTR = "data-extension-skip";
const STYLE_ID = "auto-sender-picker-style";
const PICKER_CSS_HREF = "selector-picker.css";

const TAILWIND_PREFIX = /^(fixed|absolute|relative|sticky|inset-|z-|p-|m-|px-|py-|mx-|my-|pt-|pb-|pl-|pr-|mt-|mb-|ml-|mr-|w-|h-|min-|max-|bg-|text-|border-|rounded-|shadow-|transition|duration-|ease-|opacity-|pointer-|cursor-|flex|grid|gap-|space-|justify-|items-|self-|content-|order-|col-|row-|block|inline|hidden|visible|overflow-|hover:|focus:|active:|disabled:|group-|sm:|md-|lg:|xl:|2xl:|dark:|sr-only|truncate)/;

const DEV_ID_PREFIX = /^(?:__|next-|radix-|chakra-|mui-|emotion-|go\d+|rc-)/;

const TARGET_ICON_SVG = '<svg class="picker-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>';

function pickStableClass(el) {
  if (typeof el.className !== "string") return null;
  const tokens = el.className.trim().split(/\s+/).filter(Boolean);
  const stable = tokens.filter(c => !/[\[\]\(\),:#*>+~.]/.test(c) && !TAILWIND_PREFIX.test(c) && c.length < 32);
  return stable.length > 0 ? stable[0] : null;
}

export function cleanSelector(el) {
  if (!el || el.nodeType !== 1) return null;

  // 1. Stable id (filter out dev-only ids that change per build)
  if (el.id && !DEV_ID_PREFIX.test(el.id) && /^[\w-]+$/.test(el.id)) {
    return `#${el.id}`;
  }

  // 2. data-testid (the gold standard for testing — also stable for automation)
  const testid = el.getAttribute("data-testid");
  if (testid) return `[data-testid="${cssEscape(testid)}"]`;

  // 3. name (form elements only)
  if (el.name && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) {
    return `${el.tagName.toLowerCase()}[name="${cssEscape(el.name)}"]`;
  }

  // 4. aria-label (filter to short, stable labels)
  const aria = el.getAttribute("aria-label");
  if (aria && aria.length <= 60 && /^[\w .,\-!?]+$/.test(aria)) {
    return `[aria-label="${cssEscape(aria)}"]`;
  }

  // 5. role (only useful for landmark/button elements, and only if unique-ish)
  const role = el.getAttribute("role");
  if (role && (el.tagName === "DIV" || el.tagName === "SPAN")) {
    return null;
  }

  // 6. contenteditable (the actual chat input on Claude/GPT/Gemini)
  if (el.getAttribute("contenteditable") === "true") {
    const parent = el.closest("[data-testid], [aria-label], [id]:not([id=''])");
    if (parent && parent !== el) {
      return cleanSelector(parent) + ` div[contenteditable='true']`;
    }
    return "div[contenteditable='true']";
  }

  // 7. One stable class (filtered against Tailwind + utility classes)
  const stableClass = pickStableClass(el);
  if (stableClass) {
    return `${el.tagName.toLowerCase()}.${cssEscape(stableClass)}`;
  }

  // 8. 2-level nth-of-type fallback
  return nthPath(el, 2);
}

function nthPath(el, levels) {
  const parts = [];
  let cur = el;
  for (let i = 0; i < levels && cur && cur.nodeType === 1; i++) {
    const tag = cur.tagName.toLowerCase();
    const parent = cur.parentElement;
    if (parent) {
      const sameTag = [...parent.children].filter(c => c.tagName === cur.tagName);
      if (sameTag.length > 1) {
        const idx = sameTag.indexOf(cur) + 1;
        parts.unshift(`${tag}:nth-of-type(${idx})`);
      } else {
        parts.unshift(tag);
      }
    } else {
      parts.unshift(tag);
    }
    cur = parent;
  }
  return parts.join(" > ");
}

function cssEscape(s) {
  return String(s).replace(/(["\\])/g, "\\$1");
}

function isDevOverlay(el) {
  if (el.id === LABEL_ID || el.closest(`#${LABEL_ID}`)) return "Picker label";
  if (el.hasAttribute(SKIP_ATTR) || el.closest(`[${SKIP_ATTR}]`)) return "Marked skip";
  if (el.closest("noscript, script, style, link, meta, title, head")) return "Meta element";
  if (el.matches('[aria-hidden="true"]')) return "Hidden element";
  if (el.offsetParent === null && el.tagName !== "BODY" && getComputedStyle(el).position !== "fixed") {
    return "Hidden element";
  }
  const cs = getComputedStyle(el);
  if (cs.position === "fixed") {
    const z = parseInt(cs.zIndex, 10);
    if (Number.isFinite(z) && z >= 1000) {
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.width >= vw * 0.6 && rect.height >= vh * 0.4) return "Full-screen overlay";
    }
  }
  if (el.id && /^(__next|next-error|nextjs-portal|__errorPage|chakra-toast-portal|radix-|sonner|toast)/.test(el.id)) return "Dev/UI portal";
  if (typeof el.className === "string" && /\b(nextjs-portal|error-overlay|toast|sonner|snackbar|notistack|hot-toast)\b/.test(el.className)) return "Dev/UI portal";
  return null;
}

function targetFor(e, type) {
  let el = e.target;
  if (type === "input")  el = el.closest("div[contenteditable='true'], textarea, [contenteditable]") || el;
  if (type === "button") el = el.closest("button, [role='button'], input[type='submit']") || el;
  return el;
}

function clearHover(el) {
  if (!el) return;
  el.classList.remove("picker-hover-valid");
  el.classList.remove("picker-hover-error");
}

function setHover(el, kind /* "valid" | "error" */) {
  if (!el) return;
  el.classList.toggle("picker-hover-valid", kind === "valid");
  el.classList.toggle("picker-hover-error", kind === "error");
}

export function showPickerLabel({ title, selector, kind = "info" }) {
  let el = document.getElementById(LABEL_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = LABEL_ID;
    el.setAttribute(SKIP_ATTR, "");
    document.documentElement.appendChild(el);
  }
  const icon = TARGET_ICON_SVG;
  const selBlock = selector
    ? `<span class="picker-selector">${escapeHtml(selector)}</span>` : "";
  el.innerHTML = `${icon}<div class="picker-label-body"><div class="picker-label-title">${escapeHtml(title)}</div>${selBlock}</div>`;
  el.classList.remove("is-valid", "is-warn", "is-error");
  if (kind === "valid") el.classList.add("is-valid");
  else if (kind === "warn") el.classList.add("is-warn");
  else if (kind === "error") el.classList.add("is-error");
  // Force reflow so the transition runs
  void el.offsetWidth;
  el.classList.add("is-visible");
}

export function hidePickerLabel() {
  const el = document.getElementById(LABEL_ID);
  if (el) el.classList.remove("is-visible");
}

const showLabel = showPickerLabel;
const hideLabel = hidePickerLabel;

function ensurePickerStylesheet() {
  if (document.getElementById(STYLE_ID)) return;
  const link = document.createElement("link");
  link.id = STYLE_ID;
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL(PICKER_CSS_HREF);
  link.setAttribute(SKIP_ATTR, "");
  document.head.appendChild(link);
  // Mirror the design system brand color as CSS custom properties on the
  // documentElement so the picker label and hover outlines stay in sync
  // with src/lib/ui-tokens.css. Change the brand in ui-tokens.css and the
  // picker follows automatically.
  document.documentElement.style.setProperty("--picker-brand", "#7c3aed");
  document.documentElement.style.setProperty("--picker-warn",  "#b45309");
  document.documentElement.style.setProperty("--picker-error", "#b91c1c");
}

function activateCursor() {
  document.documentElement.classList.add("picker-active");
}

function deactivateCursor() {
  document.documentElement.classList.remove("picker-active");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

export function startPicking({ type, platform, onPicked, onCancel }) {
  ensurePickerStylesheet();
  activateCursor();
  showLabel({ title: `Click an ${type === "input" ? "input field" : "send button"}. Press Esc to cancel.`, kind: "info" });

  let lastHighlighted = null;

  function onOver(e) {
    const t = targetFor(e, type);
    if (!t || t === lastHighlighted) return;
    if (lastHighlighted) clearHover(lastHighlighted);
    lastHighlighted = t;
    const reason = isDevOverlay(t);
    if (reason) {
      setHover(t, "error");
      showLabel({ title: `✗ ${reason}`, selector: "try a different element", kind: "error" });
      e.target.__senderReject = reason;
      return;
    }
    setHover(t, "valid");
    e.target.__senderTarget = t;
    const sel = cleanSelector(t);
    showLabel({ title: "Will pick:", selector: sel || "(no selector)", kind: "valid" });
  }
  function onOut(e) {
    const t = e.target.__senderTarget;
    if (t) clearHover(t);
    if (e.target.__senderReject) e.target.__senderReject = null;
    lastHighlighted = null;
  }
  function onClick(e) {
    e.preventDefault(); e.stopPropagation();
    const t = targetFor(e, type);
    if (t) clearHover(t);
    const reason = isDevOverlay(t);
    if (reason) {
      showLabel({ title: `✗ ${reason}`, selector: "try a different element", kind: "error" });
      return;
    }
    cleanup();
    const selector = cleanSelector(t);
    if (!selector) {
      showLabel({ title: "✗ Couldn't derive a selector", selector: null, kind: "error" });
      onCancel?.();
      return;
    }
    hideLabel();
    onPicked?.({ platform, type, selector, element: t });
  }
  function onKey(e) {
    if (e.key === "Escape") {
      cleanup();
      showLabel({ title: "Cancelled", selector: null, kind: "warn" });
      setTimeout(hideLabel, 1500);
      onCancel?.();
    }
  }
  function cleanup() {
    document.removeEventListener("mouseover", onOver, true);
    document.removeEventListener("mouseout",  onOut,  true);
    document.removeEventListener("click",     onClick, true);
    document.removeEventListener("keydown",   onKey,  true);
    deactivateCursor();
    if (lastHighlighted) clearHover(lastHighlighted);
  }

  document.addEventListener("mouseover", onOver, true);
  document.addEventListener("mouseout",  onOut,  true);
  document.addEventListener("click",     onClick, true);
  document.addEventListener("keydown",   onKey,  true);
  return cleanup;
}
