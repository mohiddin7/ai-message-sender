// welcome.js — first-run wizard + persistent navigation hub.
// The wizard is shown only if the user hasn't completed onboarding yet
// (settings.onboarded !== true). The nav-hub is always visible.

import { SPRITE_HTML } from "./sprite.js";
import { detectPlatformFromUrl } from "../lib/platform.js";

const items = [...document.querySelectorAll("#steps .wizard-step")];
const wizard = document.getElementById("wizard");
const restartBtn = document.getElementById("restart-tour");
const navHub = document.getElementById("nav-hub");

async function check() {
  const all = await chrome.storage.local.get(["selectors", "queue", "history", "settings"]);
  // The "teach the input box / send button" steps only make sense for the
  // platform the user is currently on. Look up that platform via the active
  // tab; if there's no active tab (welcome tab is focused, e.g. after install)
  // or no detected platform, fall back to false so the step stays disabled.
  let currentPlatform = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      currentPlatform = detectPlatformFromUrl(tab.url);
    }
  } catch (_) { /* no active tab, stay null */ }
  for (const li of items) {
    const v = li.dataset.verify;
    if (!v) continue;
    let ok = false;
    if (v.startsWith("selectors.")) {
      // Verify string just names the data source; the field is "input" or
      // "sendButton" (the last dotted segment). Look it up on the active
      // platform only, not any platform.
      const key = v.split(".").pop();
      const entry = currentPlatform ? (all.selectors || {})[currentPlatform] : null;
      ok = !!(entry && entry[key]);
    } else if (v === "queue.len>=1") {
      ok = (all.queue || []).length >= 1;
    } else if (v === "history.dryRunOk") {
      ok = (all.history || []).some(h => h.status === "dry-run-ok");
    }
    const btn = li.querySelector("[data-next]");
    if (btn) btn.disabled = !ok;
  }
}

function showHubOnly() {
  wizard.hidden = true;
  restartBtn.hidden = false;
}

function showWizard() {
  wizard.hidden = false;
  restartBtn.hidden = true;
}

document.addEventListener("DOMContentLoaded", async () => {
  const host = document.getElementById("sprite-host");
  if (host) host.innerHTML = SPRITE_HTML;

  const { settings = {} } = await chrome.storage.local.get("settings");
  if (settings.onboarded) showHubOnly();

  check();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") check();
  });
  items.forEach(li => li.querySelector("[data-next]")?.addEventListener("click", () => {
    li.hidden = true;
  }));
  document.getElementById("done").addEventListener("click", async () => {
    const { settings = {} } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...settings, onboarded: true } });
    showHubOnly();
  });
  restartBtn.addEventListener("click", async () => {
    const { settings = {} } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...settings, onboarded: false } });
    items.forEach(li => { li.hidden = false; });
    showWizard();
    check();
  });

  // Nav links (nav-hub card versions — the header/footer nav are plain
  // <a href> links now, no JS needed for those).
  document.getElementById("nav-history").addEventListener("click", e => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
  document.getElementById("nav-coffee").addEventListener("click", e => { e.preventDefault(); chrome.tabs.create({ url: "https://donate.stripe.com/28EbITdPK6pa0kv3gU3Ru00" }); });

  // "Show popup tour" used to open popup.html as a plain tab
  // (chrome.tabs.create), which rendered the popup's markup as a full
  // webpage — not the real small extension popup, and with no actual AI
  // tab behind it for the teach-input/teach-send steps to target.
  // chrome.action.openPopup() (Chrome 127+) opens the genuine popup for
  // whichever tab is currently active/focused, so: open a real ChatGPT
  // tab, focus its window, then open the real popup on it. There's no way
  // to pass a query param through openPopup(), so a storage flag tells
  // popup.js to auto-launch the tour on this specific open (see popup.js).
  document.getElementById("nav-tour-header").addEventListener("click", async () => {
    const { settings = {} } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...settings, pendingTourLaunch: true } });
    const tab = await chrome.tabs.create({ url: "https://chatgpt.com/", active: true });
    if (tab.windowId != null) await chrome.windows.update(tab.windowId, { focused: true });
    try {
      await chrome.action.openPopup();
    } catch (_) {
      // Chrome <127 (below this extension's minimum, but degrade rather
      // than silently do nothing if it somehow gets here): fall back to
      // the old tab-based approximation.
      chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
    }
  });
});
