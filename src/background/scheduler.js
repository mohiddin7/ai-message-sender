import { queueStore } from "./queue-store.js";
import { log } from "../lib/log.js";

const PREFIX = "alarm_";
let installed = false;

export async function scheduleAlarm(item) {
  if (!item?.id || typeof item.scheduledAt !== "number") throw new Error("scheduleAlarm: bad item");
  await chrome.alarms.clear(PREFIX + item.id);
  await chrome.alarms.create(PREFIX + item.id, { when: item.scheduledAt });
}

export async function clearAlarm(itemId) {
  await chrome.alarms.clear(PREFIX + itemId);
}

export async function listAlarms() {
  return new Promise(resolve => chrome.alarms.getAll(resolve));
}

export function onAlarm(handler) {
  if (installed) return;
  installed = true;
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (!alarm.name.startsWith(PREFIX)) return;
    const id = alarm.name.slice(PREFIX.length);
    const item = await queueStore.getById(id);
    if (!item) { log.warn("scheduler", "alarm for missing item", id); return; }
    try {
      const out = await handler({ item, alarm });
      await queueStore.update(id, { status: out?.status || "failed", lastError: out?.lastError || null });
      if (out?.status === "sent" || out?.status === "failed") {
        await queueStore.appendHistory({ ...item, status: out.status, lastError: out.lastError || null });
        await queueStore.remove(id);
      }
    } catch (e) {
      log.error("scheduler", "handler threw", e);
      await queueStore.update(id, { status: "failed", lastError: String(e?.message || e) });
    }
  });
}