import { MESSAGE_TYPES } from "../lib/messages.js";

let _rootEl = null;
let _countEl = null;
let _storageListenerInstalled = false;

export async function renderQueueList(rootEl) {
  _rootEl = rootEl;
  if (!_countEl) _countEl = document.getElementById("queue-count");
  const { queue = [], recurring = [] } = await chrome.storage.local.get(["queue", "recurring"]);
  const recById = Object.fromEntries(recurring.map(r => [r.id, r]));
  rootEl.innerHTML = "";
  if (_countEl) _countEl.textContent = String(queue.length);

  if (queue.length === 0) {
    const empty = document.createElement("div");
    empty.className = "queue-empty";
    empty.textContent = "No items in queue yet.";
    rootEl.appendChild(empty);
    return;
  }

  for (const item of queue) {
    const el = document.createElement("div");
    el.className = `queue-item status-${item.status || "pending"}`;
    el.dataset.id = item.id;

    const platformTag = `<span class="tag">${escapeHtml(item.platform)}</span>`;
    const recTag = item.recurringSourceId
      ? `<span class="tag is-recurring">↻ ${escapeHtml(describeRec(recById[item.recurringSourceId]))}</span>` : "";
    const isChainArmed = item.mode === "chain" && item.status === "pending" && !item.scheduledAt;
    const when = item.scheduledAt
      ? new Date(item.scheduledAt).toLocaleString()
      : (item.mode === "chain" ? "when response ends" : "?");
    const chainBadge = isChainArmed
      ? `<span class="tag is-waiting" role="status" aria-atomic="true">waiting</span>` : "";
    const statusTag = item.status && item.status !== "pending"
      ? `<span class="tag ${statusClass(item.status)}" role="status" aria-atomic="true">${escapeHtml(item.status)}</span>` : "";

    el.innerHTML = `
      <div class="qi-body">
        <div class="qi-text"></div>
        <div class="qi-meta">${platformTag} ${recTag} ${chainBadge} ${statusTag} <span class="when">${escapeHtml(when)}</span></div>
        ${item.lastError ? `<div class="qi-error">${escapeHtml(item.lastError)}</div>` : ""}
      </div>
      <div class="qi-actions">
        <button class="btn-icon" data-act="dryrun" data-id="${item.id}" type="button" title="Dry run (test without sending)" aria-label="Dry run this item">
          <svg class="i"><use href="#i-play"/></svg>
          <span class="btn-icon-label">Test</span>
        </button>
        <button class="btn-icon btn-icon-danger" data-act="cancel" data-id="${item.id}" type="button" title="Cancel" aria-label="Cancel this item">
          <svg class="i"><use href="#i-x"/></svg>
        </button>
      </div>`;
    el.querySelector(".qi-text").textContent = item.text;
    rootEl.appendChild(el);
  }
  rootEl.querySelectorAll('[data-act="dryrun"]').forEach(b => b.addEventListener("click", () => {
    b.disabled = true;
    chrome.runtime.sendMessage({ action: MESSAGE_TYPES.DRY_RUN_ITEM, itemId: b.dataset.id });
  }));
  rootEl.querySelectorAll('[data-act="cancel"]').forEach(b => b.addEventListener("click", () => {
    b.disabled = true;
    chrome.runtime.sendMessage({ action: MESSAGE_TYPES.CANCEL_ITEM, itemId: b.dataset.id });
  }));

  if (!_storageListenerInstalled) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && (changes.queue || changes.recurring)) {
        renderQueueList(_rootEl);
      }
    });
    _storageListenerInstalled = true;
  }
}

function describeRec(r) {
  if (!r) return "recurring";
  if (r.schedule?.kind === "daily")  return `Daily ${r.schedule.timeOfDay}`;
  if (r.schedule?.kind === "weekly") return `Weekly ${r.schedule.daysOfWeek.join(",")} ${r.schedule.timeOfDay}`;
  return "recurring";
}

function statusClass(status) {
  if (status === "sent" || status === "dry-run-ok") return "is-ok";
  if (status === "failed" || status === "dry-run-fail" || status === "tab-lost") return "is-fail";
  return "";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
