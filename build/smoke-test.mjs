import { test } from "node:test";
import assert from "node:assert/strict";
import { id } from "../src/lib/id.js";
import { detectPlatformFromUrl, PLATFORMS } from "../src/lib/platform.js";
import { MESSAGE_TYPES } from "../src/lib/messages.js";

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