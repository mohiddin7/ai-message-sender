// welcome.js — first-run wizard + persistent navigation hub.
// The wizard is shown only if the user hasn't completed onboarding yet
// (settings.onboarded !== true). The nav-hub is always visible.

import { SPRITE_HTML } from "./sprite.js";

const items = [...document.querySelectorAll("#steps .wizard-step")];
const wizard = document.getElementById("wizard");
const restartBtn = document.getElementById("restart-tour");
const navHub = document.getElementById("nav-hub");

async function check() {
  const all = await chrome.storage.local.get(["selectors", "queue", "history", "settings"]);
  for (const li of items) {
    const v = li.dataset.verify;
    if (!v) continue;
    let ok = false;
    if (v.startsWith("selectors.")) {
      const key = v.split(".").pop();
      ok = !!all.selectors && Object.values(all.selectors).some(s => !!s[key]);
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

  // Nav links
  const openHistory = e => { e.preventDefault(); chrome.runtime.openOptionsPage(); };
  document.getElementById("nav-history").addEventListener("click", openHistory);
  document.getElementById("nav-history-foot").addEventListener("click", openHistory);
  document.getElementById("nav-coffee")  .addEventListener("click", e => { e.preventDefault(); chrome.tabs.create({ url: "https://donate.stripe.com/28EbITdPK6pa0kv3gU3Ru00" }); });
  document.getElementById("coffee")      .addEventListener("click", e => { e.preventDefault(); chrome.tabs.create({ url: "https://donate.stripe.com/28EbITdPK6pa0kv3gU3Ru00" }); });
  document.getElementById("nav-popup-tour").addEventListener("click", e => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html?tour=tutorial") });
  });
});
