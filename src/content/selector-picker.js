function cleanSelector(el) {
  if (el.id) return `#${el.id}`;
  const aria = el.getAttribute("aria-label");
  if (aria) return `${el.tagName.toLowerCase()}[aria-label="${aria}"]`;
  if (el.getAttribute("contenteditable") === "true") return "div[contenteditable='true']";
  let path = el.tagName.toLowerCase();
  if (typeof el.className === "string") {
    const cls = el.className.trim().split(/\s+/).filter(c => c && !/[\[\]\(\),:]/.test(c)).join(".");
    if (cls) path += `.${cls}`;
  }
  return path;
}

export function startPicking({ type, platform, onPicked, onCancel }) {
  const styleId = "auto-sender-picker-style";
  let styleEl = document.createElement("style");
  styleEl.id = styleId;
  styleEl.textContent = "* { cursor: crosshair !important; pointer-events: auto !important; }";
  document.head.appendChild(styleEl);

  function targetFor(e) {
    if (type === "input")  return e.target.closest("div[contenteditable='true']") || e.target.closest("textarea") || e.target;
    if (type === "button") return e.target.closest("button") || e.target;
    return e.target;
  }
  function onOver(e) { const t = targetFor(e); t.style.outline = "3px dashed #2563eb"; e.target.__senderTarget = t; }
  function onOut(e)  { if (e.target.__senderTarget) e.target.__senderTarget.style.outline = ""; }
  function onClick(e) {
    e.preventDefault(); e.stopPropagation();
    cleanup();
    const t = targetFor(e); t.style.outline = "";
    const selector = cleanSelector(t);
    onPicked?.({ platform, type, selector });
  }
  function onKey(e) { if (e.key === "Escape") { cleanup(); onCancel?.(); } }
  function cleanup() {
    document.removeEventListener("mouseover", onOver, true);
    document.removeEventListener("mouseout",  onOut,  true);
    document.removeEventListener("click",     onClick, true);
    document.removeEventListener("keydown",   onKey,  true);
    const s = document.getElementById(styleId); if (s) s.remove();
  }

  document.addEventListener("mouseover", onOver, true);
  document.addEventListener("mouseout",  onOut,  true);
  document.addEventListener("click",     onClick, true);
  document.addEventListener("keydown",   onKey,   true);
  return cleanup;
}