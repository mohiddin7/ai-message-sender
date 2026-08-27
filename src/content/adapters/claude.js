export const defaultSelectors = {
  input: "div[contenteditable='true']",
  sendButton: "button[aria-label*='Send' i]"
};

// Claude shows a Stop button while streaming; when removed, response is done.
export function isResponseStreaming(root = document) {
  return !!root.querySelector("button[aria-label*='Stop' i], button[aria-label*='Stop generating' i]");
}

export function isResponseComplete(root = document) {
  // Heuristic: a "Regenerate" or copy response control appears at the end.
  // Kept for backwards compatibility (chain now uses isResponseStreaming).
  if (root.querySelector("button[aria-label*='Stop' i]")) return false;
  if (root.querySelector("button[aria-label*='Regenerate' i], button[aria-label*='Retry' i]")) return true;
  return true;
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
