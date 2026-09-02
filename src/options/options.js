import { syncStore } from "../background/sync-store.js";
import { queueStore } from "../background/queue-store.js";
import { MESSAGE_TYPES } from "../lib/messages.js";
import { showHistoryDetail } from "./history-view.js";
import { SPRITE_HTML } from "./sprite.js";
import { launchTour } from "../lib/tour-launch.js";

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }

function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "sent" || s === "ok" || s === "succeeded") return "is-ok";
  if (s === "failed" || s === "fail" || s === "error") return "is-fail";
  if (s === "pending" || s === "queued" || s === "waiting") return "is-warn";
  return "";
}

function platformClass(p) {
  const s = String(p || "").toLowerCase();
  if (s === "claude") return "platform-claude";
  if (s === "gpt" || s === "chatgpt") return "platform-gpt";
  if (s === "gemini") return "platform-gemini";
  return "";
}

async function renderRecurring() {
  const { recurring = [] } = await chrome.storage.local.get("recurring");
  const root = document.getElementById("recurring-list");
  root.innerHTML = recurring.length === 0
    ? `<div class="empty-state">
         <svg class="i" width="32" height="32"><use href="#i-repeat"/></svg>
         <div>No recurring rules yet.</div>
         <div class="empty-state-hint">Add one from the popup's "Make this recurring" panel.</div>
       </div>`
    : recurring.map(r => {
        const sched = r.schedule.kind === "daily"
          ? `Daily at ${r.schedule.timeOfDay}`
          : `Weekly on ${(r.schedule.daysOfWeek || []).map(d => "SMTWTFS"[d]).join("")} at ${r.schedule.timeOfDay}`;
        const fullText = r.text || "";
        const truncated = fullText.length > 80 ? fullText.slice(0, 80) + "…" : fullText;
        return `
        <div class="row-card" data-id="${r.id}">
          <div class="row-body">
            <div class="row-main">
              <span class="tag is-recurring">Recurring</span>
              <span>${escapeHtml(sched)}</span>
            </div>
            <div class="row-sub">${escapeHtml(truncated)}</div>
          </div>
          <div class="row-actions">
            <button class="btn-toggle ${r.enabled ? "is-on" : ""}" data-act="toggle" type="button" aria-label="${r.enabled ? "Disable" : "Enable"} rule">
              <span>${r.enabled ? "Enabled" : "Disabled"}</span>
            </button>
            <button class="btn-icon btn-icon-danger" data-act="delete" type="button" aria-label="Delete rule">
              <svg class="i"><use href="#i-trash"/></svg>
            </button>
          </div>
        </div>`;
      }).join("");
  root.querySelectorAll(".row-card").forEach(row => {
    const id = row.dataset.id;
    row.querySelector("[data-act=toggle]").addEventListener("click", async () => {
      const r = recurring.find(x => x.id === id);
      await queueStore.updateRecurring(id, { enabled: !r.enabled });
      renderRecurring();
    });
    row.querySelector("[data-act=delete]").addEventListener("click", async () => {
      if (!confirm("Delete this recurring rule? Already-queued items will still fire.")) return;
      await queueStore.removeRecurring(id);
      renderRecurring();
    });
  });
}

function renderHistoryItem(h) {
  const schedTime = h.scheduledAt ? new Date(h.scheduledAt).toLocaleString() : (h.mode === "chain" ? "when response ends" : "—");
  const archTime = h.archivedAt ? new Date(h.archivedAt).toLocaleString() : null;
  const status = h.status || "—";
  const platform = h.platform || "—";
  const text = h.text || "";
  const preview = text.length > 120 ? text.slice(0, 120) + "…" : text;
  const err = h.lastError ? `<div class="row-error">${escapeHtml(h.lastError)}</div>` : "";
  const statusCls = statusClass(status);
  const platCls = platformClass(platform);
  return `
    <div class="row-card history-item" data-id="${escapeHtml(h.id || "")}">
      <div class="row-body">
        <div class="row-main">
          <span class="tag ${statusCls}">${escapeHtml(status)}</span>
          <span class="tag ${platCls}"><span class="platform-dot"></span>${escapeHtml(platform)}</span>
          <span class="when">${escapeHtml(schedTime)}</span>
        </div>
        <div class="row-sub prompt-preview">${escapeHtml(preview)}</div>
        ${err}
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost btn-sm" data-act="view" type="button">
          <svg class="i"><use href="#i-eye"/></svg>
          <span>View full prompt</span>
        </button>
      </div>
    </div>`;
}

async function renderHistory() {
  const { history = [] } = await chrome.storage.local.get("history");
  const root = document.getElementById("history");
  if (history.length === 0) {
    root.innerHTML = `<div class="empty-state">
       <svg class="i" width="32" height="32"><use href="#i-book"/></svg>
       <div>No history yet.</div>
       <div class="empty-state-hint">Send a prompt from the popup to see it here.</div>
     </div>`;
    return;
  }
  const items = history.slice().reverse().slice(0, 200);
  root.innerHTML = items.map(renderHistoryItem).join("");
  root.querySelectorAll(".history-item").forEach((row, i) => {
    row.querySelector("[data-act=view]").addEventListener("click", () => {
      showHistoryDetail(items[i]);
    });
  });
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

document.getElementById("nav-tour-header")?.addEventListener("click", launchTour);

(async () => {
  const host = document.getElementById("sprite-host");
  if (host) host.innerHTML = SPRITE_HTML;

  // Fill the version slot in the footer from the running extension's manifest
  // (this page is loaded as the extension's options page, not from the web,
  // so chrome.runtime.getManifest is always available here).
  const ver = document.getElementById("footer-version");
  if (ver) ver.textContent = `v${chrome.runtime.getManifest().version}`;

  // Deep link from help.html: "options.html#maintenance" should open the
  // Maintenance <details> and scroll it into view. Use a one-time hashchange
  // listener too so opening the link from another tab also works.
  const openMaintenance = () => {
    if (location.hash !== "#maintenance") return;
    const m = document.querySelector("details.maintenance-card");
    if (!m) return;
    m.open = true;
    requestAnimationFrame(() => m.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  openMaintenance();
  window.addEventListener("hashchange", openMaintenance);

  const hydrated = await syncStore.hydrateFromSync();
  if (hydrated.hydrated) document.getElementById("sync-banner").hidden = false;
  await renderRecurring();
  await renderHistory();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.recurring) renderRecurring();
    if (changes.history)   renderHistory();
    if (changes.queue)     renderHistory();
  });
})();
