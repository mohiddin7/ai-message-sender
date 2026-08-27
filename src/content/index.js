import { MESSAGE_TYPES } from "../lib/messages.js";
import { log } from "../lib/log.js";
import { startPicking, showPickerLabel, hidePickerLabel } from "./selector-picker.js";
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
        startPicking({ type: msg.type, platform: msg.platform, onPicked: async ({ selector }) => {
          const all = (await syncStore.getSelectors()) || {};
          const cur = all[msg.platform] || {};
          cur[msg.type === "input" ? "input" : "sendButton"] = selector;
          all[msg.platform] = cur;
          await syncStore.setSelectors(all);
          const label = msg.type === "input" ? "Input field" : "Send button";
          try { alert(`Mapped ${msg.platform.toUpperCase()}! ${label} locked to selector: ${selector}`); } catch (_) {}
          chrome.runtime.sendMessage({ action: MESSAGE_TYPES.PICKER_CONFIRMED, type: msg.type, platform: msg.platform, selector });
        }});
        break;
      case MESSAGE_TYPES.INJECT_AND_SEND:
        (async () => {
          const selectors = await syncStore.getSelectors().then(s => s?.[msg.platform]);
          const result = msg.dryRun
            ? await dryRunSend({ text: msg.text, platform: msg.platform, selectors, root: document })
            : await executeSend({ text: msg.text, platform: msg.platform, selectors, root: document });
          if (msg.dryRun) {
            const ok = result.steps.every(s => s.ok);
            const summary = result.steps.map(s => `${s.step}: ${s.ok ? "✓" : "✗" + (s.reason ? " (" + s.reason + ")" : "")}`).join("\n");
            try { alert(`Dry run: ${ok ? "OK" : "FAIL"}\n\n${summary}`); } catch (_) {}
          } else {
            try { alert(`Message sent to ${msg.platform}.`); } catch (_) {}
          }
          sendResponse({ ok: result.steps.every(s => s.ok), steps: result.steps });
        })();
        return true;
      case MESSAGE_TYPES.SEND_NOTICE:
        try { alert(msg.summary); } catch (_) {}
        sendResponse({ ok: true });
        break;
      case MESSAGE_TYPES.DETECT_RESET:
        sendResponse({ ts: detectResetScan(msg.platform) });
        break;
      case MESSAGE_TYPES.CHAIN_READY: {
        // The service worker is asking the content script to arm chain mode.
        // Show a non-blocking banner in the page so the user can see the
        // watcher is live. When the MO fires, update the banner and signal
        // back to the background, which then schedules the real send.
        showPickerLabel({ title: "Watching for response to end…", kind: "info" });
        watchResponse(msg.platform, () => {
          showPickerLabel({ title: "Sending now…", kind: "valid" });
          chrome.runtime.sendMessage({ action: MESSAGE_TYPES.CHAIN_READY, itemId: msg.itemId });
          // The actual INJECT_AND_SEND notice ("Message sent to …") will fire
          // ~500ms later. Hide the chain banner 2.5s after the send fires.
          setTimeout(hidePickerLabel, 2500);
        });
        sendResponse({ ok: true });
        break;
      }
      default:
        log.warn("content", "unknown action", msg.action);
    }
  });

  // Test/dev hook: a page can ask the content script to start the picker
  // by dispatching a window.postMessage. postMessage crosses the isolated-
  // world boundary, so this works from the page's main world. Same path
  // the popup uses, but reachable from E2E test drivers. Harmless in
  // production — a page would need to know the message name to invoke it.
  window.addEventListener("message", (ev) => {
    if (!ev.data || ev.data.source !== "ai-auto-sender-test") return;
    if (ev.data.cmd === "start-picking") {
      const { type, platform } = ev.data;
      if (!type || !platform) return;
      startPicking({ type, platform, onPicked: async ({ selector }) => {
        const all = (await syncStore.getSelectors()) || {};
        const cur = all[platform] || {};
        cur[type === "input" ? "input" : "sendButton"] = selector;
        all[platform] = cur;
        await syncStore.setSelectors(all);
        // Write to a DOM element so E2E test scripts in the main world
        // can read the mapped selector. This is harmless in production.
        let sig = document.getElementById("ai-auto-sender-test-sig");
        if (!sig) { sig = document.createElement("div"); sig.id = "ai-auto-sender-test-sig"; sig.style.cssText = "position:fixed;top:0;left:0;z-index:2147483647;background:lime;color:black;padding:4px;font:12px monospace"; document.documentElement.appendChild(sig); }
        sig.dataset.selector = selector;
        sig.dataset.platform = platform;
        sig.dataset.type = type;
        const label = type === "input" ? "Input field" : "Send button";
        try { alert(`Mapped ${platform.toUpperCase()}! ${label} locked to selector: ${selector}`); } catch (_) {}
        chrome.runtime.sendMessage({ action: MESSAGE_TYPES.PICKER_CONFIRMED, type, platform, selector });
      }});
    } else if (ev.data.cmd === "get-selectors") {
      (async () => {
        const all = (await syncStore.getSelectors()) || {};
        const sig = document.getElementById("ai-auto-sender-test-sig") || (() => { const s = document.createElement("div"); s.id = "ai-auto-sender-test-sig"; s.style.cssText = "position:fixed;top:0;left:0;z-index:2147483647;background:lime;color:black;padding:4px;font:12px monospace"; document.documentElement.appendChild(s); return s; })();
        sig.dataset.all = JSON.stringify(all);
      })();
    }
  });
}
