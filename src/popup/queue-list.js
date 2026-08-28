import { MESSAGE_TYPES } from "../lib/messages.js";

export async function renderQueueList(rootEl) {
  const { queue = [], recurring = [] } = await chrome.storage.local.get(["queue", "recurring"]);
  const recById = Object.fromEntries(recurring.map(r => [r.id, r]));
  rootEl.innerHTML = "";
  if (queue.length === 0) {
    rootEl.innerHTML = '<div class="item"><div class="text" style="color:#888;font-style:italic;">No items in queue.</div></div>';
    return;
  }
  for (const item of queue) {
    const el = document.createElement("div"); el.className = "item";
    const tag = item.platform.toUpperCase();
    const recTag = item.recurringSourceId
      ? `<span class="tag recurring">↻ ${describeRec(recById[item.recurringSourceId])}</span>` : "";
    const when = item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : (item.mode === "chain" ? "when response ends" : "?");
    el.innerHTML = `
      <div style="flex:1;min-width:0;">
        <div class="text"></div>
        <div class="meta"><span class="tag">${tag}</span> ${recTag} <span>${when}</span></div>
      </div>
      <div class="actions">
        <button class="dryrun" data-id="${item.id}">Dry run</button>
        <button class="cancel" data-id="${item.id}">Cancel</button>
      </div>`;
    el.querySelector(".text").textContent = item.text;
    rootEl.appendChild(el);
  }
  rootEl.querySelectorAll(".dryrun").forEach(b => b.addEventListener("click", () => chrome.runtime.sendMessage({ action: MESSAGE_TYPES.DRY_RUN_ITEM, itemId: b.dataset.id })));
  rootEl.querySelectorAll(".cancel").forEach(b => b.addEventListener("click", () => chrome.runtime.sendMessage({ action: MESSAGE_TYPES.CANCEL_ITEM, itemId: b.dataset.id })));
}

function describeRec(r) {
  if (!r) return "recurring";
  if (r.schedule?.kind === "daily")  return `Daily ${r.schedule.timeOfDay}`;
  if (r.schedule?.kind === "weekly") return `Weekly ${r.schedule.daysOfWeek.join(",")} ${r.schedule.timeOfDay}`;
  return "recurring";
}