import { test } from "node:test";
import assert from "node:assert/strict";
import { id } from "../src/lib/id.js";
import { detectPlatformFromUrl, PLATFORMS } from "../src/lib/platform.js";
import { MESSAGE_TYPES } from "../src/lib/messages.js";

// In-memory chrome.storage.local shim
const memStore = new Map();
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
  assert.equal(detectPlatformFromUrl("https://claude.ai/chat/abc"), PLATFORMS.CLAUDE);
  assert.equal(detectPlatformFromUrl("https://chatgpt.com/c/abc"),     PLATFORMS.GPT);
  assert.equal(detectPlatformFromUrl("https://chat.openai.com/c/abc"), PLATFORMS.GPT);
  assert.equal(detectPlatformFromUrl("https://gemini.google.com/app"), PLATFORMS.GEMINI);
  assert.equal(detectPlatformFromUrl("https://example.com"), null);
});

test("MESSAGE_TYPES contains the expected keys", () => {
  for (const k of ["START_PICKING","INJECT_AND_SEND","DETECT_RESET","CHAIN_READY","DRY_RUN_ITEM","CANCEL_ITEM","RETARGET_ITEM"]) {
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

test("queueStore.add validates platform and id", async () => {
  await assert.rejects(() => queueStore.add({ text: "x" }), /id required/);
  await assert.rejects(() => queueStore.add({ id: "q_z", platform: "wat", text: "x", mode: "absolute", scheduledAt: 1, status: "pending", attempts: 0, lastError: null, createdAt: 1, tabId: 1, conversationUrl: "u" }), /bad platform/);
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
  const sel = await queueStore.getSelectors();
  assert.equal(sel.claude.input, "#claude-input");
});

test("queueStore.migrate is idempotent", async () => {
  await queueStore.migrate();
  const { migrated } = await queueStore.migrate();
  assert.equal(migrated, 0);
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
});