import { MESSAGE_TYPES } from "../lib/messages.js";
import { detectPlatformFromUrl } from "../lib/platform.js";
import { id as makeId } from "../lib/id.js";
import { mountTimeControls } from "./time-controls.js";
import { renderQueueList } from "./queue-list.js";
import { mountRecurringForm } from "./recurring-form.js";
import { scheduleAlarm } from "../background/scheduler.js";

const badge = document.getElementById("badge");
const controls = document.getElementById("controls");
const err = document.getElementById("err");
const timeRoot = document.getElementById("time-controls");
tc = mountTimeControls(timeRoot, { onChange: () => {} });
let currentPlatform = null;
let currentTab = null;

document.querySelectorAll(".mode").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".mode").forEach(x => x.classList.remove("active"));
  b.classList.add("active"); tc.setMode(b.dataset.mode);
}));

document.getElementById("pickInput") .addEventListener("click", () => triggerPicker("input"));
document.getElementById("pickButton").addEventListener("click", () => triggerPicker("button"));

document.getElementById("saveBtn").addEventListener("click", async () => {
  const text = document.getElementById("msg").value;
  const { mode, value } = tc.value;
  if (!text)            { err.textContent = "Enter a prompt."; return; }
  if (mode !== "chain" && !value) { err.textContent = "Pick a time."; return; }
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
  err.textContent = "Queued.";
  document.getElementById("msg").value = "";
  renderQueueList(document.getElementById("queue-list"));
});

document.getElementById("open-welcome").addEventListener("click", e => { e.preventDefault(); chrome.tabs.create({ url: chrome.runtime.getURL("src/welcome/welcome.html") }); });
document.getElementById("open-options").addEventListener("click", e => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
document.getElementById("open-coffee") .addEventListener("click", e => { e.preventDefault(); chrome.tabs.create({ url: "https://donate.stripe.com/28EbITdPK6pa0kv3gU3Ru00" }); });

mountRecurringForm(document.getElementById("recurring-form"), () => ({ tabId: currentTab?.id, conversationUrl: currentTab?.url, text: document.getElementById("msg").value, platform: currentPlatform }));

async function triggerPicker(type) {
  await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, files: ["src/content/index.js"] });
  chrome.tabs.sendMessage(currentTab.id, { action: MESSAGE_TYPES.START_PICKING, type, platform: currentPlatform });
  window.close();
}

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;
  currentPlatform = detectPlatformFromUrl(tab.url);
  if (!currentPlatform) {
    badge.textContent = "Unsupported";
    err.textContent = "Open Claude, ChatGPT, or Gemini.";
    return;
  }
  window.__platform = currentPlatform;
  badge.textContent = currentPlatform;
  badge.classList.add(currentPlatform);
  controls.hidden = false;
  tc.render();
  renderQueueList(document.getElementById("queue-list"));
})();