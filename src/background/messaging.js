import { MESSAGE_TYPES } from "../lib/messages.js";
import { queueStore } from "./queue-store.js";
import { scheduleAlarm, clearAlarm, onAlarm } from "./scheduler.js";
import { syncStore } from "./sync-store.js";
import { expandAll } from "./recurring-expander.js";
import { notifications } from "./notifications.js";
import { log } from "../lib/log.js";

async function resolveTargetTab(item) {
  try {
    const tab = await chrome.tabs.get(item.tabId);
    return { kind: "ok", tab };
  } catch {
    await queueStore.update(item.id, { status: "tab-lost" });
    await notifications.notify({
      id: `tab-lost-${item.id}`,
      title: "Target tab closed",
      message: "Re-target or cancel this queue item.",
      buttons: [{ title: "Re-target" }, { title: "Cancel" }]
    });
    return { kind: "lost" };
  }
}

async function sendViaContentScript(tabId, msg) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg, { frameId: 0 });
  } catch (err) {
    // Content script not responding or other runtime error
    return { ok: false, steps: [{ step: "focusTab", reason: "content script not responding" }] };
  }
}

export function wireBackground() {
  chrome.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === "install") {
      chrome.tabs.create({ url: chrome.runtime.getURL("src/welcome/welcome.html") });
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
      // Arm the watcher; this branch fires when CHAIN_READY arrives from content.
      const tabId = target.tab.id;
      await chrome.tabs.sendMessage(tabId, { action: MESSAGE_TYPES.CHAIN_READY, platform: item.platform, itemId: item.id });
      return { status: "pending" };
    }
    const selectors = (await syncStore.getSelectors())[item.platform];
    const msg = { action: MESSAGE_TYPES.INJECT_AND_SEND, tabId: item.tabId, text: item.text, platform: item.platform, selectors };
    const result = await sendViaContentScript(item.tabId, msg);
    const ok = result.steps.every(s => s.ok);
    if (ok) {
      await notifications.notify({ id: `sent-${item.id}`, title: "Message sent", message: `Sent to ${item.platform}.` });
      return { status: "sent" };
    }
    const failedStep = result.steps.find(s => !s.ok);
    return { status: "failed", lastError: `${failedStep?.step}: ${failedStep?.reason}` };
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      switch (msg.action) {
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
          const dryMsg = { action: MESSAGE_TYPES.INJECT_AND_SEND, tabId: item.tabId, text: item.text, platform: item.platform, selectors, dryRun: true };
          const result = await sendViaContentScript(item.tabId, dryMsg);
          const ok = result.steps.every(s => s.ok);
          await queueStore.update(item.id, { status: ok ? "dry-run-ok" : "dry-run-fail", lastError: ok ? null : JSON.stringify(result.steps.find(s => !s.ok)) });
          await notifications.notify({
            id: `dryrun-${item.id}`,
            title: ok ? "Dry run: OK" : "Dry run: FAIL",
            message: result.steps.map(s => `${s.step}:${s.ok ? "✓" : "✗"}`).join(" ")
          });
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