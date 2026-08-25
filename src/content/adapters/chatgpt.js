export const defaultSelectors = {
  input: "textarea[data-id='root'], div[contenteditable='true']",
  sendButton: "button[data-testid='send-button'], button[aria-label*='Send' i]"
};

export function isResponseComplete(root = document) {
  if (root.querySelector("button[aria-label*='Stop' i]")) return false;
  return true;
}

export function detectReset(root = document) {
  const text = root.body?.innerText || "";
  const m = text.match(/resets?\s+(?:in\s+)?(\d+):(\d+)\s*(am|pm)?/i) || text.match(/(\d+)\s*(min|minute|minutes|hour|hours|h|m)\s*left/i);
  if (!m) return null;
  if (m[2] && (m[2].toLowerCase().startsWith("h"))) return Date.now() + parseInt(m[1], 10) * 3600_000;
  if (m[2]) return Date.now() + parseInt(m[1], 10) * 60_000;
  if (m[2] === undefined) {
    // HH:MM form
    const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
    return Date.now() + (h * 3600_000 + min * 60_000);
  }
  return null;
}