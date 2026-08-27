import { MESSAGE_TYPES } from "../lib/messages.js";
import { queueStore } from "./queue-store.js";
import { scheduleAlarm, clearAlarm, onAlarm } from "./scheduler.js";
import { syncStore } from "./sync-store.js";
import { expandAll } from "./recurring-expander.js";
import { focusTargetTab } from "./focus-tab.js";
import { log } from "../lib/log.js";

async function notice(tabId, kind, summary) {
  // In-page dialog delivery (replaces the chrome.notifications OS toast).
  // Best-effort: if the tab is gone or the content script can't be reached,
  // we drop the notice silently — the queue item's status is the durable signal.
  try {
    await sendViaContentScript(tabId, { action: MESSAGE_TYPES.SEND_NOTICE, kind, summary });
  } catch (e) {
    log.warn("bg-msg", "send notice failed", e);
  }
}

async function resolveTargetTab(item) {
  try {
    const tab = await chrome.tabs.get(item.tabId);
    return { kind: "ok", tab };
  } catch {
    await queueStore.update(item.id, { status: "tab-lost" });
    await notice(item.tabId, "tab-lost", `Target tab closed for queued message.\n\n"${item.text}"\n\nRe-target or cancel the queue item.`);
    return { kind: "lost" };
  }
}

async function sendViaContentScript(tabId, msg) {
  // First, try to ensure the content script is injected (in case the tab was opened
  // before the extension was installed, or after a navigation to a different origin).
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  } catch (_) {
    // ignore — content script may already be there, or this tab may be sandboxed
  }
  try {
    return await chrome.tabs.sendMessage(tabId, msg, { frameId: 0 });
  } catch (err) {
    return { ok: false, steps: [{ step: "sendMessage", reason: `content script not responding: ${err.message}` }] };
  }
}

export function wireBackground() {
  chrome.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === "install") {
      chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
    }
    await queueStore.migrate();
    await syncStore.hydrateFromSync();
    await expandAll();
  });

  chrome.runtime.onStartup.addListener(async () => {
    await expandAll();
  });

  onAlarm(async ({ item }) => {
    if (item.status === "tab-lost" || item.status === "sent" || item.status === "failed") return;
    const target = await resolveTargetTab(item);
    if (target.kind !== "ok") return { status: "tab-lost" };

    if (item.mode === "chain") {
      // Chain mode: CHAIN_READY from content scheduled a 500ms alarm (see the
      // CHAIN_READY case below). When that alarm fires, perform the real send
      // — the watcher is already done, do not re-arm it.
      const selectors = (await syncStore.getSelectors())[item.platform];
      const msg = { action: MESSAGE_TYPES.INJECT_AND_SEND, text: item.text, platform: item.platform, selectors };
      const focused = await focusTargetTab(item.tabId);
      const result = await sendViaContentScript(item.tabId, msg);
      result.steps = [focused, ...(result.steps || [])];
      if (!focused.ok) result.ok = false;
      const ok = result.steps.every(s => s.ok);
      if (ok) {
        await notice(item.tabId, "sent", `Message sent to ${item.platform}.`);
        return { status: "sent" };
      }
      const failedStep = result.steps.find(s => !s.ok);
      return { status: "failed", lastError: `${failedStep?.step}: ${failedStep?.reason}` };
    }
    const selectors = (await syncStore.getSelectors())[item.platform];
    const msg = { action: MESSAGE_TYPES.INJECT_AND_SEND, text: item.text, platform: item.platform, selectors };
    const focused = await focusTargetTab(item.tabId);
    const result = await sendViaContentScript(item.tabId, msg);
    result.steps = [focused, ...(result.steps || [])];
    if (!focused.ok) result.ok = false;
    const ok = result.steps.every(s => s.ok);
    if (ok) {
      await notice(item.tabId, "sent", `Message sent to ${item.platform}.`);
      return { status: "sent" };
    }
    const failedStep = result.steps.find(s => !s.ok);
    return { status: "failed", lastError: `${failedStep?.step}: ${failedStep?.reason}` };
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      switch (msg.action) {
        case MESSAGE_TYPES.PICKER_CONFIRMED: {
          // The content script already shows the v4-style in-page alert.
          // This handler is here for the background to log the pick; no toast needed.
          log.info("bg-msg", "picker confirmed", msg.type, msg.platform, msg.selector);
          break;
        }
        case MESSAGE_TYPES.CHAIN_READY: {
          const item = await queueStore.getById(msg.itemId);
          if (!item) return;
          const next = Date.now() + 500;
          await queueStore.update(item.id, { scheduledAt: next });
          await scheduleAlarm({ ...item, scheduledAt: next });
          break;
        }
        case MESSAGE_TYPES.DRY_RUN_ITEM: {
          const item = await queueStore.getById(msg.itemId);
          if (!item) return;
          const selectors = (await syncStore.getSelectors())[item.platform];
          const focused = await focusTargetTab(item.tabId);
          const dryMsg = { action: MESSAGE_TYPES.INJECT_AND_SEND, text: item.text, platform: item.platform, selectors, dryRun: true };
          const result = await sendViaContentScript(item.tabId, dryMsg);
          const steps = [focused, ...(result.steps || [])];
          const ok = focused.ok && steps.every(s => s.ok);
          await queueStore.update(item.id, { status: ok ? "dry-run-ok" : "dry-run-fail", lastError: ok ? null : JSON.stringify(steps.find(s => !s.ok)) });
          // The content script's INJECT_AND_SEND handler shows an in-page alert
          // with the dry-run result; no need to send a separate notice here.
          break;
        }
        case MESSAGE_TYPES.CANCEL_ITEM: {
          await clearAlarm(msg.itemId);
          await queueStore.remove(msg.itemId);
          break;
        }
      }
    })().catch(e => log.error("bg-msg", e));
  });
}
