import { MESSAGE_TYPES } from "../lib/messages.js";
import { detectPlatformFromUrl, isWellKnownPlatform } from "../lib/platform.js";
import { id as makeId } from "../lib/id.js";
import { mountTimeControls } from "./time-controls.js";
import { renderQueueList } from "./queue-list.js";
import { mountRecurringForm } from "./recurring-form.js";
import { scheduleAlarm } from "../background/scheduler.js";
import { SPRITE_HTML } from "./sprite.js";
import { startTutorial } from "./tutorial.js";

// Inject the shared icon sprite so <use href="#i-..."> works
document.getElementById("sprite-host").innerHTML = SPRITE_HTML;

const badge = document.getElementById("badge");
const badgeLabel = badge.querySelector(".platform-label");
const controls = document.getElementById("controls");
const err = document.getElementById("err");
const timeRoot = document.getElementById("time-controls");
let tc = mountTimeControls(timeRoot, { onChange: () => {} });
let currentPlatform = null;
let currentTab = null;

document.querySelectorAll(".segment").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".segment").forEach(x => { x.classList.remove("is-active"); x.setAttribute("aria-selected", "false"); });
  b.classList.add("is-active"); b.setAttribute("aria-selected", "true"); tc.setMode(b.dataset.mode);
}));

document.getElementById("pickInput") .addEventListener("click", () => triggerPicker("input"));
document.getElementById("pickButton").addEventListener("click", () => triggerPicker("button"));

document.getElementById("saveBtn").addEventListener("click", async () => {
  const text = document.getElementById("msg").value;
  const { mode, value } = tc.value;
  if (!text) {
    err.textContent = "Enter a prompt.";
    alert("Please fill out the prompt fields fully!");
    return;
  }
  if (mode !== "chain" && !value) {
    err.textContent = "Pick a time.";
    alert("Please pick a future time target!");
    return;
  }
  const scheduledAt = mode === "delay" ? Date.now() + value : (mode === "chain" ? null : value);
  const item = {
    id: makeId("q"), platform: currentPlatform, tabId: currentTab.id,
    conversationUrl: currentTab.url, text, mode, scheduledAt,
    status: "pending", attempts: 0, lastError: null, createdAt: Date.now()
  };
  const { queue = [] } = await chrome.storage.local.get("queue");
  queue.push(item);
  await chrome.storage.local.set({ queue });
  if (item.scheduledAt) await scheduleAlarm(item);
  const when = scheduledAt ? new Date(scheduledAt).toLocaleString() : "when the response ends";
  err.textContent = "Queued.";
  alert(`Queued for ${when}.`);
  document.getElementById("msg").value = "";
  renderQueueList(document.getElementById("queue-list"));
});

document.getElementById("open-welcome").addEventListener("click", e => { e.preventDefault(); chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") }); });
document.getElementById("open-history").addEventListener("click", e => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
document.getElementById("open-tutorial").addEventListener("click", e => { e.preventDefault(); startTutorial({ force: true }); });

mountRecurringForm(document.getElementById("recurring-form"), () => ({ tabId: currentTab?.id, conversationUrl: currentTab?.url, text: document.getElementById("msg").value, platform: currentPlatform }));

async function triggerPicker(type) {
  // Content script is auto-injected on every URL by the manifest. The executeScript
  // call is a safety net for browser-internal pages where auto-injection is denied.
  try {
    await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, files: ["content.js"] });
  } catch (_) {
    // ignore — the content script may already be there, or this tab may be sandboxed
  }
  try {
    await chrome.tabs.sendMessage(currentTab.id, { action: MESSAGE_TYPES.START_PICKING, type, platform: currentPlatform });
  } catch (e) {
    err.textContent = `Could not start picker: ${e.message}`;
    return;
  }
  window.close();
}

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;
  currentPlatform = detectPlatformFromUrl(tab.url);
  if (!currentPlatform) {
    badgeLabel.textContent = "Unsupported";
    badge.dataset.platform = "generic";
    err.textContent = "Open Claude, ChatGPT, or Gemini.";
    return;
  }
  window.__platform = currentPlatform;
  badgeLabel.textContent = currentPlatform;
  badge.dataset.platform = isWellKnownPlatform(currentPlatform) ? currentPlatform : "generic";
  controls.hidden = false;
  tc.render();
  renderQueueList(document.getElementById("queue-list"));

  // Auto-fire the tutorial on first run (no settings.tutorialSeen flag yet).
  // Welcome's wizard covers the "what is this" question; the popup tutorial
  // covers the "how do I use these buttons" question. Users on a known
  // platform are ready to use the buttons; fire the tour.
  const { settings = {} } = await chrome.storage.local.get("settings");
  if (!settings.tutorialSeen) {
    setTimeout(() => startTutorial({ force: true }), 400);
  }
})();
