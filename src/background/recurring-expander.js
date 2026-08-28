import { queueStore } from "./queue-store.js";
import { id as makeId } from "../lib/id.js";

const MAX_OCCURRENCES = 8;
const WINDOW_MS = 24 * 3600_000;

function dayKey(ms) { return new Date(ms).toISOString().slice(0, 10); }

export function nextOccurrenceFor(rule, fromMs) {
  if (!rule?.enabled) return null;
  const [hh, mm] = String(rule.schedule.timeOfDay).split(":").map(n => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const base = new Date(fromMs);
  base.setHours(hh, mm, 0, 0);
  let candidate = base.getTime() <= fromMs ? new Date(base.getTime() + 86400_000).getTime() : base.getTime();

  // Step forward up to 8 days to find a day-of-week match (weekly) or first day (daily)
  for (let i = 0; i < 8; i++) {
    const d = new Date(candidate);
    if (rule.schedule.kind === "weekly") {
      if (rule.schedule.daysOfWeek.includes(d.getDay())) return candidate;
    } else {
      return candidate;
    }
    candidate += 86400_000;
  }
  return null;
}

function expandOne(rule, fromMs) {
  const out = [];
  let cursor = fromMs;
  for (let i = 0; i < MAX_OCCURRENCES; i++) {
    const next = nextOccurrenceFor(rule, cursor);
    if (!next || next > fromMs + WINDOW_MS) break;
    out.push({
      id: makeId("q"),
      platform: rule.platform,
      tabId: rule.tabId,
      conversationUrl: rule.conversationUrl,
      text: rule.text,
      mode: "absolute",
      scheduledAt: next,
      status: "pending",
      attempts: 0,
      lastError: null,
      createdAt: Date.now(),
      recurringSourceId: rule.id
    });
    cursor = next + 1;
  }
  return { occurrences: out, nextCursor: cursor };
}

export async function expandAll(now = Date.now()) {
  const flagKey = `recurring_expanded_${dayKey(now)}`;
  const flag = await chrome.storage.local.get(flagKey);
  if (flag[flagKey] !== undefined) return { expanded: 0, skipped: true };
  const recurring = await queueStore.listRecurring();
  let total = 0;
  for (const r of recurring) {
    const { occurrences, nextCursor } = expandOne(r, now);
    for (const occ of occurrences) await queueStore.add(occ);
    if (nextCursor > now) await queueStore.updateRecurring(r.id, { nextOccurrence: nextCursor });
    total += occurrences.length;
  }
  await chrome.storage.local.set({ [flagKey]: true });
  return { expanded: total, skipped: false };
}