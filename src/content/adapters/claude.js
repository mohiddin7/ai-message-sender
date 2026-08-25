export const defaultSelectors = {
  input: "div[contenteditable='true']",
  sendButton: "button[aria-label*='Send' i]"
};

export function isResponseComplete(root = document) {
  // Claude shows a stop button while streaming; when removed, response is done.
  if (root.querySelector("button[aria-label*='Stop' i]")) return false;
  // Heuristic: a "Regenerate" or copy response control appears at the end.
  if (root.querySelector("button[aria-label*='Regenerate' i], button[aria-label*='Retry' i]")) return true;
  return true; // default permissive; will be re-validated by send button enabled state
}

export function detectReset(root = document) {
  const text = root.body?.innerText || "";
  const m = text.match(/resets?\s+in\s+(\d+)\s*(h|hour|hours|m|min|minute|minutes)?/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = (m[2] || "minutes").toLowerCase();
  const ms = (unit.startsWith("h") ? n * 3600_000 : n * 60_000);
  return Date.now() + ms;
}