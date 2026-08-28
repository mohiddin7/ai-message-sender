import { detectUntilClockTime } from "./shared-time-parse.js";

export const defaultSelectors = {
  input: "div[contenteditable='true'], textarea",
  sendButton: "button[aria-label*='Send' i], button[type='submit']"
};

// Generic streaming heuristic: any element with a Stop aria-label is
// the page's "stop generating" control. The chain watcher waits for
// this to appear, then disappear.
export function isResponseStreaming(root = document) {
  return !!root.querySelector("button[aria-label*='Stop' i], button[aria-label*='Stop generating' i], [data-testid='stop-button']");
}

export function isResponseComplete() {
  return true;
}

export function detectReset(root = document) {
  return detectUntilClockTime(root.body?.innerText || "");
}
