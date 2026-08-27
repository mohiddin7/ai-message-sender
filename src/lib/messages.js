export const MESSAGE_TYPES = Object.freeze({
  START_PICKING:    "START_PICKING",
  PICKER_CONFIRMED: "PICKER_CONFIRMED",
  INJECT_AND_SEND:  "INJECT_AND_SEND",
  DETECT_RESET:     "DETECT_RESET",
  CHAIN_READY:      "CHAIN_READY",
  DRY_RUN_ITEM:     "DRY_RUN_ITEM",
  CANCEL_ITEM:      "CANCEL_ITEM",
  RETARGET_ITEM:    "RETARGET_ITEM",
  // Background → content: show a v4-style in-page alert/confirm
  // (replaces the chrome.notifications OS toast).
  SEND_NOTICE:      "SEND_NOTICE"
});