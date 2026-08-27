import { id as makeId } from "../lib/id.js";

export function mountRecurringForm(root, getFormContext) {
  root.innerHTML = `
    <div class="row">
      <label><input type="radio" name="freq" value="daily" checked> Daily</label>
      <label><input type="radio" name="freq" value="weekly"> Weekly</label>
      <label for="r-time">at</label>
      <input type="time" id="r-time" value="09:00">
    </div>
    <div id="r-week" class="days" hidden>
      ${["S","M","T","W","T","F","S"].map((d, i) => `<label><input type="checkbox" data-day="${i}">${d}</label>`).join("")}
    </div>
    <button id="r-save" class="btn btn-primary" type="button">Save recurring</button>
    <div class="hint">Recurring rules fire automatically. Cancel the queue item to stop the next one.</div>
  `;
  const week = root.querySelector("#r-week");
  root.querySelectorAll("input[name=freq]").forEach(r => r.addEventListener("change", () => { week.hidden = root.querySelector("input[name=freq]:checked").value !== "weekly"; }));
  root.querySelector("#r-save").addEventListener("click", async () => {
    const { tabId, conversationUrl, text, platform } = getFormContext();
    if (!tabId || !text) {
      alert("Pick a tab and write a prompt first.");
      return;
    }
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
    alert(`Recurring ${freq} at ${time} saved.`);
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
