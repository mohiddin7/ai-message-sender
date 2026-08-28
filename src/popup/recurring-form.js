import { id as makeId } from "../lib/id.js";

export function mountRecurringForm(root, getFormContext) {
  root.innerHTML = `
    <div style="display:flex;gap:6px;align-items:center;margin-top:6px;">
      <label><input type="radio" name="freq" value="daily" checked> Daily</label>
      <label><input type="radio" name="freq" value="weekly"> Weekly</label>
      <input type="time" id="r-time" value="09:00">
    </div>
    <div id="r-week" hidden>
      ${["S","M","T","W","T","F","S"].map((d, i) => `<label style="margin-right:4px;"><input type="checkbox" data-day="${i}"> ${d}</label>`).join("")}
    </div>
    <button id="r-save" class="primary" style="margin-top:6px;">Save recurring</button>
  `;
  const week = root.querySelector("#r-week");
  root.querySelectorAll("input[name=freq]").forEach(r => r.addEventListener("change", () => { week.hidden = root.querySelector("input[name=freq]:checked").value !== "weekly"; }));
  root.querySelector("#r-save").addEventListener("click", async () => {
    const { tabId, conversationUrl, text, platform } = getFormContext();
    if (!tabId || !text) return;
    const freq = root.querySelector("input[name=freq]:checked").value;
    const time = root.querySelector("#r-time").value || "09:00";
    const days = freq === "weekly"
      ? [...root.querySelectorAll("#r-week input:checked")].map(i => parseInt(i.dataset.day, 10))
      : null;
    const rule = {
      id: makeId("r"), platform, tabId, conversationUrl, text,
      schedule: { kind: freq, daysOfWeek: days || [], timeOfDay: time, tz: "user" },
      nextOccurrence: nextFromNow(freq, days, time),
      enabled: true, createdAt: Date.now()
    };
    const { recurring = [] } = await chrome.storage.local.get("recurring");
    recurring.push(rule);
    await chrome.storage.local.set({ recurring });
  });
}

function nextFromNow(freq, days, time) {
  const [hh, mm] = time.split(":").map(n => parseInt(n, 10));
  const d = new Date(); d.setHours(hh, mm, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  for (let i = 0; i < 8; i++) {
    if (freq === "daily") return d.getTime();
    if (days?.includes(d.getDay())) return d.getTime();
    d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}