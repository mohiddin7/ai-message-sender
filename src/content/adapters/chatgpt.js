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
  // Match "resets in 2 hours", "12 minutes left", or "resets in 1:30" (HH:MM).
  const hhmm = text.match(/resets?\s+(?:in\s+)?(\d+):(\d+)/i);
  if (hhmm) return Date.now() + parseInt(hhmm[1], 10) * 3600_000 + parseInt(hhmm[2], 10) * 60_000;
  const m = text.match(/(\d+)\s*(hours?|h|minutes?|m)\s*(?:left|until)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const ms = m[2].toLowerCase().startsWith("h") ? n * 3600_000 : n * 60_000;
  return Date.now() + ms;
}