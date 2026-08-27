import { detectUntilClockTime } from "./shared-time-parse.js";

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
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = (m[2] || "minutes").toLowerCase();
    const ms = (unit.startsWith("h") ? n * 3600_000 : n * 60_000);
    return Date.now() + ms;
  }
  // Claude's actual free-tier banner reads "You are out of free messages
  // until 8:40 PM" — a wall-clock target, not a countdown duration. The
  // pattern above never matches that text at all, which is why reset
  // detection silently failed on Claude even with a limit banner visible.
  return detectUntilClockTime(text);
}
