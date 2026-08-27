import { test } from "node:test";
import assert from "node:assert/strict";
import { id } from "../src/lib/id.js";
import { detectPlatformFromUrl, PLATFORMS } from "../src/lib/platform.js";
import { MESSAGE_TYPES } from "../src/lib/messages.js";
import { syncStore } from "../src/background/sync-store.js";

// In-memory chrome.storage.local shim
const memStore = new Map();
// In-memory chrome.storage.sync shim
const memSync = new Map();
globalThis.chrome = {
  storage: {
    local: {
      get(keys) {
        return new Promise(resolve => {
          if (keys === null || keys === undefined) {
            return resolve(Object.fromEntries(memStore));
          }
          if (typeof keys === "string") return resolve({ [keys]: memStore.get(keys) });
          const out = {};
          for (const k of keys) out[k] = memStore.get(k);
          resolve(out);
        });
      },
      set(obj) { return new Promise(r => { for (const [k, v] of Object.entries(obj)) memStore.set(k, v); r(); }); },
      remove(keys) { return new Promise(r => { for (const k of (Array.isArray(keys) ? keys : [keys])) memStore.delete(k); r(); }); }
    },
    sync: {
      get(keys) { return Promise.resolve(typeof keys === "string" ? { [keys]: memSync.get(keys) } : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, memSync.get(k)]))); },
      set(obj)  { for (const [k, v] of Object.entries(obj)) memSync.set(k, v); return Promise.resolve(); },
      remove(keys) { for (const k of (Array.isArray(keys) ? keys : [keys])) memSync.delete(k); return Promise.resolve(); }
    }
  }
};

// Inject fake chrome.alarms before importing scheduler
const alarmStore = new Map();
globalThis.chrome.alarms = {
  create(name, opts) { alarmStore.set(name, opts); },
  clear(name)         { alarmStore.delete(name); return Promise.resolve(true); },
  getAll(cb)          { cb([...alarmStore.entries()].map(([name, opts]) => ({ name, ...opts }))); },
  onAlarm: { addListener() {} }
};

import { scheduleAlarm, listAlarms, clearAlarm } from "../src/background/scheduler.js";

// Original 4 tests

// Original 4 tests
test("id returns a prefixed string of the right shape", () => {
  const x = id("q");
  assert.match(x, /^q_[0-9a-z]{8,}[0-9a-z]{4}$/);
});

test("id rejects bad prefix", () => {
  assert.throws(() => id("z"));
});

test("detectPlatformFromUrl maps correctly", () => {
  // Well-known hosts return their hostname (the canonical key for selectors
  // and queue items). Arbitrary hosts return their hostname too. The short
  // PLATFORMS.* names are only used by the content adapter table.
  assert.equal(detectPlatformFromUrl("https://claude.ai/chat/abc"),     "claude.ai");
  assert.equal(detectPlatformFromUrl("https://chatgpt.com/c/abc"),     "chatgpt.com");
  assert.equal(detectPlatformFromUrl("https://chat.openai.com/c/abc"), "chatgpt.com");
  assert.equal(detectPlatformFromUrl("https://gemini.google.com/app"), "gemini.google.com");
  assert.equal(detectPlatformFromUrl("https://example.com"), "example.com");
  assert.equal(detectPlatformFromUrl("https://chat.deepseek.com/"), "chat.deepseek.com");
  assert.equal(detectPlatformFromUrl("chrome://extensions/"), null);
  assert.equal(detectPlatformFromUrl("about:blank"), null);
  assert.equal(detectPlatformFromUrl("file:///tmp/x"), null);
});

test("MESSAGE_TYPES contains the expected keys", () => {
  for (const k of ["START_PICKING","PICKER_CONFIRMED","INJECT_AND_SEND","DETECT_RESET","CHAIN_ARM","CHAIN_READY","DRY_RUN_ITEM","CANCEL_ITEM","RETARGET_ITEM"]) {
    assert.ok(MESSAGE_TYPES[k], k);
  }
});

// New imports for queueStore
import { queueStore } from "../src/background/queue-store.js";

// New 7 tests
test("queueStore.add/list round-trips an item", async () => {
  memStore.clear();
  const item = { id: "q_aaa", platform: PLATFORMS.CLAUDE, text: "hi", mode: "absolute", scheduledAt: Date.now() + 1000, status: "pending", attempts: 0, lastError: null, createdAt: Date.now(), tabId: 1, conversationUrl: "u" };
  await queueStore.add(item);
  const all = await queueStore.list();
  assert.equal(all.length, 1);
  assert.equal(all[0].text, "hi");
});

test("queueStore.update merges shallow", async () => {
  const updated = await queueStore.update("q_aaa", { status: "firing" });
  assert.equal(updated.status, "firing");
  assert.equal(updated.text, "hi");
});

test("queueStore.remove deletes the item", async () => {
  await queueStore.remove("q_aaa");
  assert.equal((await queueStore.list()).length, 0);
});

test("queueStore.add validates id", async () => {
  await assert.rejects(() => queueStore.add({ text: "x" }), /id required/);
});

test("queueStore.add accepts any hostname platform", async () => {
  memStore.clear();
  await queueStore.add({ id: "q_z", platform: "chat.deepseek.com", text: "x", mode: "absolute", scheduledAt: 1, status: "pending", attempts: 0, lastError: null, createdAt: 1, tabId: 1, conversationUrl: "u" });
  const all = await queueStore.list();
  assert.equal(all.length, 1);
  assert.equal(all[0].platform, "chat.deepseek.com");
});

test("queueStore.getByStatus filters correctly", async () => {
  memStore.clear();
  await queueStore.add({ id: "q_a", platform: PLATFORMS.CLAUDE, text: "a", mode: "absolute", scheduledAt: 1, status: "pending", attempts: 0, lastError: null, createdAt: 1, tabId: 1, conversationUrl: "u" });
  await queueStore.add({ id: "q_b", platform: PLATFORMS.CLAUDE, text: "b", mode: "absolute", scheduledAt: 1, status: "firing", attempts: 0, lastError: null, createdAt: 1, tabId: 1, conversationUrl: "u" });
  const pending = await queueStore.getByStatus("pending");
  assert.equal(pending.length, 1);
  assert.equal(pending[0].id, "q_a");
});

test("queueStore.migrate converts legacy keys and removes them", async () => {
  memStore.clear();
  const future = Date.now() + 60_000;
  memStore.set("claude_pendingMessage", "legacy hi");
  memStore.set("claude_scheduledTime", future);
  memStore.set("claude_customInputPath", "#claude-input");
  const { migrated } = await queueStore.migrate();
  assert.equal(migrated, 1);
  assert.equal(memStore.get("claude_pendingMessage"), undefined);
  assert.equal(memStore.get("claude_customInputPath"), undefined);
  const queue = await queueStore.list();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].text, "legacy hi");
  assert.equal(queue[0].migratedFromV4, true);
  // In v5.1+ the selectors are keyed by hostname, not the short name.
  assert.equal(queue[0].platform, "claude.ai");
  const sel = await queueStore.getSelectors();
  assert.equal(sel["claude.ai"].input, "#claude-input");
  assert.equal(sel.claude, undefined);
});

test("queueStore.migrate is idempotent", async () => {
  await queueStore.migrate();
  const { migrated } = await queueStore.migrate();
  assert.equal(migrated, 0);
});

test("queueStore.migrate renames v5 short-name selectors to hostnames", async () => {
  memStore.clear();
  // Pre-existing v5 selectors keyed by short name
  memStore.set("selectors", { claude: { input: "div[ce]", sendButton: "button[send]" }, gpt: { input: "textarea" } });
  // Pre-existing v5 queue items with short-name platform
  memStore.set("queue", [{ id: "q_old1", platform: "claude", text: "x", mode: "absolute", scheduledAt: 1, status: "pending", attempts: 0, lastError: null, createdAt: 1, tabId: 1, conversationUrl: "u" }]);
  memStore.set("recurring", [{ id: "r_old1", platform: "gemini", tabId: 1, conversationUrl: "u", text: "y", schedule: { kind: "daily", timeOfDay: "09:00" }, enabled: true, createdAt: 1 }]);
  await queueStore.migrate();
  const sel = await queueStore.getSelectors();
  assert.equal(sel["claude.ai"].input, "div[ce]");
  assert.equal(sel["claude.ai"].sendButton, "button[send]");
  assert.equal(sel["chatgpt.com"].input, "textarea");
  assert.equal(sel.claude, undefined);
  assert.equal(sel.gpt, undefined);
  const queue = await queueStore.list();
  assert.equal(queue[0].platform, "claude.ai");
  const rec = (await chrome.storage.local.get("recurring")).recurring;
  assert.equal(rec[0].platform, "gemini.google.com");
});

// New tests for scheduler
test("scheduleAlarm stores an alarm with the right name and when", async () => {
  alarmStore.clear();
  await scheduleAlarm({ id: "q_x", scheduledAt: 12345 });
  const all = await listAlarms();
  assert.equal(all.length, 1);
  assert.equal(all[0].name, "alarm_q_x");
  assert.equal(all[0].when, 12345);
});

test("clearAlarm removes the alarm", async () => {
  await clearAlarm("q_x");
  const all = await listAlarms();
  assert.equal(all.length, 0);
});import { nextOccurrenceFor, expandAll } from "../src/background/recurring-expander.js";

test("nextOccurrenceFor daily picks later today if before time, tomorrow if after", () => {
  const rule = { enabled: true, schedule: { kind: "daily", timeOfDay: "09:00" } };
  const before9  = new Date("2026-08-25T08:00:00").getTime();
  const after9   = new Date("2026-08-25T10:00:00").getTime();
  const d1 = new Date(nextOccurrenceFor(rule, before9)); assert.equal(d1.getHours(), 9);
  const d2 = new Date(nextOccurrenceFor(rule, after9));  assert.equal(d2.getHours(), 9); assert.equal(d2.getDate(), 26);
});

test("nextOccurrenceFor weekly skips weekends", () => {
  // 2026-08-29 is a Saturday
  const sat = new Date("2026-08-29T08:00:00").getTime();
  const rule = { enabled: true, schedule: { kind: "weekly", daysOfWeek: [1,2,3,4,5], timeOfDay: "09:00" } };
  const r = new Date(nextOccurrenceFor(rule, sat));
  assert.equal(r.getDay(), 1, "expected Monday");
});

test("expandAll adds up to 8 occurrences within 24h and is idempotent within a day", async () => {
  memStore.clear(); alarmStore.clear();
  const rule = { id: "r_aaa", platform: "claude", tabId: 1, conversationUrl: "u", text: "hi",
    schedule: { kind: "daily", timeOfDay: "00:00" }, nextOccurrence: Date.now() + 1000, enabled: true, createdAt: Date.now() };
  await queueStore.addRecurring(rule);
  const r1 = await expandAll();
  assert.ok(r1.expanded >= 1, "at least one occurrence expanded");
  const r2 = await expandAll();
  assert.equal(r2.skipped, true, "second call same day is skipped");
});

test("expandAll caps at 8 occurrences", async () => {
  memStore.clear(); alarmStore.clear();
  // A rule whose nextOccurrence is already past, forcing 8 future steps within 24h
  const rule = { id: "r_bbb", platform: "claude", tabId: 1, conversationUrl: "u", text: "x",
    schedule: { kind: "daily", timeOfDay: "00:00" }, nextOccurrence: Date.now() - 86400_000, enabled: true, createdAt: Date.now() };
  await queueStore.addRecurring(rule);
  const r = await expandAll();
  assert.ok(r.expanded <= 8);
});

test("syncStore.setSelectors mirrors to both storages", async () => {
  memStore.clear(); memSync.clear();
  await syncStore.setSelectors({ claude: { input: "div", sendButton: "button" } });
  assert.deepEqual(await syncStore.getSyncSelectors(), { claude: { input: "div", sendButton: "button" } });
  assert.deepEqual(await queueStore.getSelectors(),       { claude: { input: "div", sendButton: "button" } });
});

test("syncStore.hydrateFromSync populates local on first run when local is empty", async () => {
  memStore.clear(); memSync.clear();
  memSync.set("selectors", { gpt: { input: "textarea", sendButton: "button[type=submit]" } });
  const r = await syncStore.hydrateFromSync();
  assert.equal(r.hydrated, "selectors");
  const local = await queueStore.getSelectors();
  assert.equal(local.gpt.input, "textarea");
  // second call should not surface a banner again
  const r2 = await syncStore.hydrateFromSync();
  assert.equal(r2.hydrated, null);
});

test("syncStore.wipeSyncSelectors clears both", async () => {
  await syncStore.setSelectors({ claude: { input: "x", sendButton: "y" } });
  await syncStore.wipeSyncSelectors();
  assert.equal(await syncStore.getSyncSelectors(), null);
  assert.deepEqual(await queueStore.getSelectors(), {});
});

// New tests for adapters
import { getAdapter } from "../src/content/adapters/index.js";

// Tests for focus-tab — must run in a context where chrome.tabs is available
// (i.e. background). Content scripts do NOT have chrome.tabs; that's why this
// helper lives in src/background/focus-tab.js and not in src/content.
import { focusTargetTab } from "../src/background/focus-tab.js";

test("focusTargetTab returns ok when chrome.tabs.get succeeds", async () => {
  const origTabs = globalThis.chrome.tabs;
  const origWin = globalThis.chrome.windows;
  globalThis.chrome.tabs = {
    get: async (id) => ({ id, windowId: 7 }),
    update: async () => {}
  };
  globalThis.chrome.windows = { update: async () => {} };
  try {
    const r = await focusTargetTab(42);
    assert.equal(r.ok, true);
    assert.equal(r.step, "focusTab");
    assert.equal(r.tabId, 42);
  } finally {
    if (origTabs === undefined) delete globalThis.chrome.tabs; else globalThis.chrome.tabs = origTabs;
    if (origWin === undefined) delete globalThis.chrome.windows; else globalThis.chrome.windows = origWin;
  }
});

test("focusTargetTab returns ok:false when chrome.tabs.get throws", async () => {
  const origTabs = globalThis.chrome.tabs;
  globalThis.chrome.tabs = { get: async () => { throw new Error("no tab"); } };
  try {
    const r = await focusTargetTab(999);
    assert.equal(r.ok, false);
    assert.equal(r.step, "focusTab");
    assert.match(r.reason, /no tab/);
  } finally {
    if (origTabs === undefined) delete globalThis.chrome.tabs; else globalThis.chrome.tabs = origTabs;
  }
});

test("content/sender does not import focusTab (chrome.tabs is unavailable in content scripts)", async () => {
  // The previous bug was that focusTab lived in src/content/sender.js, where
  // chrome.tabs is undefined. Make sure it never sneaks back.
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../src/content/sender.js", import.meta.url), "utf8");
  assert.ok(!/focusTab\s*\(/.test(src), "content/sender.js should not call focusTab");
  assert.ok(!/chrome\.tabs\b/.test(src), "content/sender.js should not reference chrome.tabs");
});

test("each adapter exposes defaultSelectors, isResponseComplete, detectReset", () => {
  for (const p of ["claude.ai", "chatgpt.com", "gemini.google.com"]) {
    const a = getAdapter(p);
    assert.equal(typeof a.defaultSelectors.input, "string");
    assert.equal(typeof a.defaultSelectors.sendButton, "string");
    assert.equal(typeof a.isResponseComplete, "function");
    assert.equal(typeof a.detectReset, "function");
  }
});

test("getAdapter falls back to generic for unknown platforms", () => {
  const a = getAdapter("chat.deepseek.com");
  assert.equal(typeof a.defaultSelectors.input, "string");
  assert.equal(typeof a.defaultSelectors.sendButton, "string");
  assert.equal(a.isResponseComplete(), true);
  assert.equal(a.detectReset({ body: { innerText: "nothing here" } }), null);
});

test("detectReset returns null when no banner text matches", () => {
  for (const p of ["claude.ai", "chatgpt.com", "gemini.google.com"]) {
    const a = getAdapter(p);
    const fakeRoot = { body: { innerText: "nothing here" } };
    assert.equal(a.detectReset(fakeRoot), null);
  }
});

test("detectReset parses HH:MM form on chatgpt", () => {
  const a = getAdapter("chatgpt.com");
  const before = Date.now();
  const t = a.detectReset({ body: { innerText: "Resets in 1:30" } });
  assert.ok(t >= before + (90 * 60_000) - 5_000 && t <= before + (90 * 60_000) + 5_000);
});

test("detectReset parses hour-suffix form on chatgpt", () => {
  const a = getAdapter("chatgpt.com");
  const before = Date.now();
  const t = a.detectReset({ body: { innerText: "2 hours left" } });
  assert.ok(t >= before + (2 * 3600_000) - 5_000 && t <= before + (2 * 3600_000) + 5_000);
});

test("detectReset parses claude's real 'until H:MM AM/PM' banner text", () => {
  // Claude's actual free-tier banner reads "You are out of free messages
  // until 8:40 PM" — a wall-clock target, not a countdown duration. The
  // old regex only matched "resets in N minutes/hours" and silently
  // returned null on this real text.
  const a = getAdapter("claude.ai");
  const target = new Date(Date.now() + 2 * 3600_000);
  target.setSeconds(0, 0);
  const h = target.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(target.getMinutes()).padStart(2, "0");
  const text = `You are out of free messages until ${h12}:${mm} ${ampm}`;
  const t = a.detectReset({ body: { innerText: text } });
  assert.ok(Math.abs(t - target.getTime()) < 5_000, `expected ~${target.getTime()}, got ${t}`);
});

test("detectReset rolls an already-passed clock time to tomorrow", () => {
  const a = getAdapter("claude.ai");
  const past = new Date(Date.now() - 3600_000);
  const h = past.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(past.getMinutes()).padStart(2, "0");
  const text = `until ${h12}:${mm} ${ampm}`;
  const t = a.detectReset({ body: { innerText: text } });
  const expected = new Date(past);
  expected.setDate(expected.getDate() + 1);
  expected.setSeconds(0, 0);
  assert.ok(Math.abs(t - expected.getTime()) < 5_000, `expected ~${expected.getTime()}, got ${t}`);
});

test("detectReset 'until H:MM' fallback also works on the generic adapter", () => {
  const a = getAdapter("some-random-site.example");
  const target = new Date(Date.now() + 90 * 60_000);
  target.setSeconds(0, 0);
  const h = target.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(target.getMinutes()).padStart(2, "0");
  const t = a.detectReset({ body: { innerText: `Try again until ${h12}:${mm} ${ampm}` } });
  assert.ok(Math.abs(t - target.getTime()) < 5_000);
});
