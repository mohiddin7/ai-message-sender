// history-view.js — modal for viewing a single history item's full details.
// Used by options.js#renderHistory when the user clicks "View full prompt".

import { SPRITE_HTML } from "./sprite.js";

let escHandler = null;
let overlayEl = null;

function ensureSprite() {
  const host = document.getElementById("sprite-host");
  if (host && !host.querySelector(".svg-sprite")) host.insertAdjacentHTML("afterbegin", SPRITE_HTML);
}

function statusLabel(s) {
  const v = String(s || "—").toLowerCase();
  if (v === "sent" || v === "succeeded") return "Sent";
  if (v === "ok") return "OK";
  if (v === "failed" || v === "fail" || v === "error") return "Failed";
  if (v === "pending" || v === "queued" || v === "waiting") return "Pending";
  return s || "—";
}

export function showHistoryDetail(item) {
  closeHistoryDetail();
  ensureSprite();
  const root = document.getElementById("modal-root");
  if (!root) return;

  overlayEl = document.createElement("div");
  overlayEl.className = "modal-overlay";
  overlayEl.setAttribute("role", "dialog");
  overlayEl.setAttribute("aria-modal", "true");
  overlayEl.setAttribute("aria-label", "History item details");

  const panel = document.createElement("div");
  panel.className = "modal-panel";

  const header = document.createElement("div");
  header.className = "modal-header";
  const title = document.createElement("h2");
  title.textContent = "Message details";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "modal-close";
  close.setAttribute("aria-label", "Close");
  close.innerHTML = `<svg class="i"><use href="#i-x"/></svg>`;
  close.addEventListener("click", closeHistoryDetail);
  header.appendChild(title);
  header.appendChild(close);

  const body = document.createElement("div");
  body.className = "modal-body";

  const fields = [
    ["Platform",   item.platform || "—"],
    ["Status",     statusLabel(item.status)],
    ["Mode",       item.mode || "—"],
    ["Scheduled",  item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "—"],
    ["Archived",   item.archivedAt ? new Date(item.archivedAt).toLocaleString() : "—"],
    ["Item id",    item.id || "—"]
  ];
  if (item.lastError) fields.push(["Last error", item.lastError]);
  const meta = document.createElement("dl");
  meta.className = "modal-meta";
  for (const [k, v] of fields) {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    meta.appendChild(dt); meta.appendChild(dd);
  }
  body.appendChild(meta);

  const promptLabel = document.createElement("h3");
  promptLabel.textContent = "Full prompt";
  body.appendChild(promptLabel);

  const pre = document.createElement("pre");
  pre.className = "modal-prompt";
  pre.textContent = item.text || "(empty)";
  body.appendChild(pre);

  panel.appendChild(header);
  panel.appendChild(body);
  overlayEl.appendChild(panel);

  overlayEl.addEventListener("click", e => { if (e.target === overlayEl) closeHistoryDetail(); });

  escHandler = (e) => { if (e.key === "Escape") closeHistoryDetail(); };
  document.addEventListener("keydown", escHandler);

  root.appendChild(overlayEl);
  setTimeout(() => close.focus(), 0);
}

export function closeHistoryDetail() {
  if (escHandler) {
    document.removeEventListener("keydown", escHandler);
    escHandler = null;
  }
  if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
  overlayEl = null;
}
