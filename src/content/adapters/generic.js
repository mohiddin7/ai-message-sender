export const defaultSelectors = {
  input: "div[contenteditable='true'], textarea",
  sendButton: "button[aria-label*='Send' i], button[type='submit']"
};

export function isResponseComplete() {
  return true;
}

export function detectReset() {
  return null;
}
