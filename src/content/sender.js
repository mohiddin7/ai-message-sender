import { getAdapter } from "./adapters/index.js";

function pickFirstSelector(selectors, fallback) {
  if (selectors?.input) return selectors.input;
  if (fallback?.input)  return fallback.input;
  return null;
}

export function findInput(root, selectors, platform) {
  const adapter = getAdapter(platform);
  const sel = pickFirstSelector(selectors, adapter.defaultSelectors);
  if (sel) {
    const el = root.querySelector(sel);
    if (el) return { ok: true, step: "findInput", el, selector: sel };
  }
  const fallback = root.querySelector("div[contenteditable='true']") || root.querySelector("textarea");
  if (fallback) return { ok: true, step: "findInput", el: fallback, selector: "(fallback)" };
  return { ok: false, step: "findInput", reason: "no input element" };
}

export function findSendButton(root, selectors, platform) {
  const adapter = getAdapter(platform);
  const sel = selectors?.sendButton || adapter.defaultSelectors.sendButton;
  let el = sel ? root.querySelector(sel) : null;
  if (!el) {
    el = root.querySelector("button[aria-label*='Send' i]") || root.querySelector("button[type='submit']");
  }
  if (el) return { ok: true, step: "findButton", el, selector: sel || "(heuristic)" };
  return { ok: false, step: "findButton", reason: "no send button" };
}

export function writeText(el, text) {
  try {
    el.focus();
    const isCE = el.tagName === "DIV" || el.getAttribute("contenteditable") === "true";
    if (isCE) {
      const sel = window.getSelection(); if (sel && sel.rangeCount) { sel.deleteFromDocument(); }
      try { document.execCommand("insertText", false, text); } catch (_) {}
      el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: text }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      setter.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return { ok: true, step: "writeText", bytes: text.length };
  } catch (e) {
    return { ok: false, step: "writeText", reason: String(e?.message || e) };
  }
}

export function clickSend(el) {
  try {
    el.removeAttribute("disabled");
    el.focus();
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    el.click();
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    return { ok: true, step: "clickSend" };
  } catch (e) {
    return { ok: false, step: "clickSend", reason: String(e?.message || e) };
  }
}

export async function executeSend({ text, platform, selectors, root = document }) {
  const steps = [];
  const input = findInput(root, selectors, platform); steps.push(input);
  if (!input.ok) return { steps };
  const written = writeText(input.el, text); steps.push(written);
  if (!written.ok) return { steps };
  // Allow framework settle
  await new Promise(r => setTimeout(r, 600));
  const button = findSendButton(root, selectors, platform); steps.push(button);
  if (!button.ok) return { steps };
  steps.push(clickSend(button.el));
  return { steps };
}

export async function dryRunSend(args) {
  // Same as executeSend, but never clicks the send button.
  const { text, platform, selectors, root = document } = args;
  const steps = [];
  const input = findInput(root, selectors, platform); steps.push(input);
  if (!input.ok) return { steps };
  const written = writeText(input.el, text); steps.push(written);
  if (!written.ok) return { steps };
  await new Promise(r => setTimeout(r, 600));
  const button = findSendButton(root, selectors, platform); steps.push(button);
  // Intentionally do NOT call clickSend
  return { steps };
}