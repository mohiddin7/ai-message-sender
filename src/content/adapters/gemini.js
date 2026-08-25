export const defaultSelectors = {
  input: "div[contenteditable='true'], rich-textarea div[contenteditable='true']",
  sendButton: "button[aria-label*='Send' i]"
};

export function isResponseComplete(root = document) {
  if (root.querySelector("button[aria-label*='Stop' i]")) return false;
  return true;
}

export function detectReset(root = document) {
  const text = root.body?.innerText || "";
  const m = text.match(/resets?\s+in\s+(\d+)\s*(h|hour|hours|m|min|minute|minutes)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const ms = (m[2].toLowerCase().startsWith("h") ? n * 3600_000 : n * 60_000);
  return Date.now() + ms;
}