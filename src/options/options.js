import { syncStore } from "../background/sync-store.js";
import { queueStore } from "../background/queue-store.js";
import { MESSAGE_TYPES } from "../lib/messages.js";

async function renderRecurring() {
  const { recurring = [] } = await chrome.storage.local.get("recurring");
  const root = document.getElementById("recurring-list");
  root.innerHTML = recurring.length === 0
    ? "<p>No recurring rules.</p>"
    : recurring.map(r => `
        <div class="row" data-id="${r.id}">
          <div class="text">${r.schedule.kind} ${r.schedule.daysOfWeek?.join(",") || ""} ${r.schedule.timeOfDay} — ${escapeHtml(r.text)}</div>
          <button data-act="toggle">${r.enabled ? "Disable" : "Enable"}</button>
          <button data-act="delete" class="danger">Delete</button>
        </div>
      `).join("");
  root.querySelectorAll(".row").forEach(row => {
    const id = row.dataset.id;
    row.querySelector("[data-act=toggle]").addEventListener("click", async () => {
      const r = recurring.find(x => x.id === id);
      await queueStore.updateRecurring(id, { enabled: !r.enabled });
      renderRecurring();
    });
    row.querySelector("[data-act=delete]").addEventListener("click", async () => {
      await queueStore.removeRecurring(id);
      renderRecurring();
    });
  });
}

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ "&":"&","<":"<",">":">","\"":"\"" }[c])); }

async function renderHistory() {
  const { history = [] } = await chrome.storage.local.get("history");
  const root = document.getElementById("history");
  root.innerHTML = history.length === 0
    ? "<p>No history yet.</p>"
    : history.slice().reverse().slice(0, 100).map(h => `
        <div class="row"><div class="text">${new Date(h.archivedAt || h.scheduledAt).toLocaleString()} — ${h.platform} — ${h.status} — ${escapeHtml((h.text || "").slice(0, 80))}</div></div>
      `).join("");
}

document.getElementById("dryrun-all").addEventListener("click", async () => {
  const { queue = [] } = await chrome.storage.local.get("queue");
  for (const item of queue) chrome.runtime.sendMessage({ action: MESSAGE_TYPES.DRY_RUN_ITEM, itemId: item.id });
});

document.getElementById("clear-all").addEventListener("click", async () => {
  if (!confirm("Wipe all queue, recurring, selectors, and history?")) return;
  await chrome.storage.local.clear();
  location.reload();
});

document.getElementById("wipe-sync").addEventListener("click", async () => {
  await syncStore.wipeSyncSelectors();
  location.reload();
});

document.getElementById("coffee").addEventListener("click", e => { e.preventDefault(); chrome.tabs.create({ url: "https://donate.stripe.com/28EbITdPK6pa0kv3gU3Ru00" }); });

(async () => {
  const hydrated = await syncStore.hydrateFromSync();
  if (hydrated.hydrated) document.getElementById("sync-banner").hidden = false;
  await renderRecurring();
  await renderHistory();
  chrome.storage.onChanged.addListener(() => { renderRecurring(); renderHistory(); });
})();