import { MESSAGE_TYPES } from "../lib/messages.js";
import { log } from "../lib/log.js";
import { startPicking } from "./selector-picker.js";
import { executeSend, dryRunSend } from "./sender.js";
import { scan as detectResetScan } from "./reset-detector.js";
import { watch as watchResponse } from "./response-watcher.js";
import { syncStore } from "../background/sync-store.js";

if (window.__aiAutoSenderInit) {
  // Already initialized; nothing to do.
} else {
  window.__aiAutoSenderInit = true;

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg.action) {
      case MESSAGE_TYPES.START_PICKING:
        startPicking({ type: msg.type, platform: msg.platform, onPicked: ({ selector }) => {
          const key = `${msg.platform}_custom${msg.type === "input" ? "Input" : "Button"}Path`;
          chrome.storage.local.set({ [key]: selector });
        }});
        break;
      case MESSAGE_TYPES.INJECT_AND_SEND:
        (async () => {
          const selectors = await syncStore.getSelectors().then(s => s?.[msg.platform]);
          const result = msg.dryRun
            ? await dryRunSend({ tabId: msg.tabId, text: msg.text, platform: msg.platform, selectors, root: document })
            : await executeSend({ tabId: msg.tabId, text: msg.text, platform: msg.platform, selectors, root: document });
          sendResponse({ ok: result.steps.every(s => s.ok), steps: result.steps });
        })();
        return true; // keep channel open for async sendResponse
      case MESSAGE_TYPES.DETECT_RESET:
        sendResponse({ ts: detectResetScan(msg.platform) });
        break;
      case MESSAGE_TYPES.CHAIN_READY: {
        // The service worker is asking the content script to arm chain mode for an item.
        watchResponse(msg.platform, () => {
          chrome.runtime.sendMessage({ action: MESSAGE_TYPES.CHAIN_READY, itemId: msg.itemId });
        });
        sendResponse({ ok: true });
        break;
      }
      default:
        log.warn("content", "unknown action", msg.action);
    }
  });
}