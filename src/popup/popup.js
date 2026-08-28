import { MESSAGE_TYPES } from "../lib/messages.js";
import { detectPlatformFromUrl, isWellKnownPlatform, displayName } from "../lib/platform.js";
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
  if (item.mode === "chain") {
    // Arm the content-script response watcher. Without this, the chain
    // item never fires — it has no scheduledAt and never enters onAlarm.
    chrome.tabs.sendMessage(currentTab.id, { action: MESSAGE_TYPES.CHAIN_ARM, itemId: item.id, platform: currentPlatform }).catch(() => {});
  }
  const when = scheduledAt ? new Date(scheduledAt).toLocaleString() : "when the response ends";
  err.textContent = "Queued.";
  alert(`Queued for ${when}.`);
  document.getElementById("msg").value = "";
  renderQueueList(document.getElementById("queue-list"));
});

document.getElementById("open-history").addEventListener("click", e => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
document.getElementById("open-tutorial").addEventListener("click", e => { e.preventDefault(); startTutorial({ force: true }); });
document.getElementById("open-coffee").addEventListener("click", e => {
  e.preventDefault();
  chrome.tabs.create({ url: "https://donate.stripe.com/28EbITdPK6pa0kv3gU3Ru00" });
});
// Two entry points to the same help.html — the header icon (compact,
// always visible) and this labeled footer link (more discoverable).
// Privacy is still one click away from there, not removed — just no
// longer a standalone footer shortcut now that Help covers it plus FAQ,
// features, and limitations in one place.
document.getElementById("open-help").addEventListener("click", e => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("help.html") });
});
document.getElementById("open-help-footer").addEventListener("click", e => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("help.html") });
});

mountRecurringForm(document.getElementById("recurring-form"), () => ({ tabId: currentTab?.id, conversationUrl: currentTab?.url, text: document.getElementById("msg").value, platform: currentPlatform }));

async function refreshPickerStatus() {
  const { selectors = {} } = await chrome.storage.local.get("selectors");
  const cur = selectors[currentPlatform] || {};
  const inputEl  = document.querySelector("#pickInput  .picker-status");
  const buttonEl = document.querySelector("#pickButton .picker-status");
  if (inputEl)  updatePickerStatus(inputEl,  cur.input);
  if (buttonEl) updatePickerStatus(buttonEl, cur.sendButton);
}

function updatePickerStatus(el, selector) {
  if (!el) return;
  if (selector) {
    el.dataset.state = "set";
    // CSS wraps this onto extra lines (overflow-wrap: anywhere) instead of
    // widening the button, so show the real selector rather than an
    // ellipsis-truncated one. Still cap absurd outliers.
    el.textContent = "✓ Mapped to " + (selector.length > 80 ? selector.slice(0, 77) + "…" : selector);
    el.title = selector;
  } else {
    el.dataset.state = "unset";
    el.textContent = "click to teach";
    el.title = "";
  }
}

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
  const tourMode = new URLSearchParams(location.search).get("tour") === "tutorial";
  if (tourMode) {
    // Tab-opened tour: there's no AI tab in this context. Mount the tutorial
    // overlay over the popup DOM anyway — the targets (segmented control,
    // picker row, etc.) are present in the popup markup.
    setTimeout(() => startTutorial({ force: true }), 400);
    return;
  }
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
  badgeLabel.textContent = displayName(currentPlatform);
  badge.dataset.platform = isWellKnownPlatform(currentPlatform) ? currentPlatform : "generic";
  controls.hidden = false;
  tc.render();
  await refreshPickerStatus();
  try {
    chrome.tabs.sendMessage(currentTab.id, { action: MESSAGE_TYPES.DETECT_RESET, platform: currentPlatform }, (resp) => {
      if (chrome.runtime.lastError) return; // no content script on this tab — fine
      if (resp?.ts && Number.isFinite(resp.ts)) tc.setResetSuggestion(resp.ts);
    });
  } catch (_) { /* tab is sandboxed, no content script, or page is gone */ }
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
