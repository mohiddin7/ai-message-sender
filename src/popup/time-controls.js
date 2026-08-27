// time-controls.js — owns the four time modes: delay (chips), absolute
// (custom date/time grid + Confirm), reset (parse the page), chain (passive).
//
// The absolute mode used to render the native <input type="datetime-local">
// which opens Chrome's own picker and dismisses on outside-click. That made
// it impossible to fix a mistake without committing a wrong value. This
// custom grid replaces the native picker entirely: the user types 5 numbers
// and the only path that commits is the Confirm button.

const DELAY_CHIPS = [
  { label: "+5m",  ms: 5 * 60_000 },
  { label: "+15m", ms: 15 * 60_000 },
  { label: "+1h",  ms: 60 * 60_000 },
  { label: "Tomorrow 9am", ms: "tomorrow-9" }
];

const ABS_PRESETS = [
  { label: "In 1h",  fn: () => nextSlot(Date.now() + 3600_000) },
  { label: "In 3h",  fn: () => nextSlot(Date.now() + 3 * 3600_000) },
  { label: "Tomorrow 9am", fn: () => tomorrowAt(9, 0) },
  { label: "Mon 9am", fn: () => nextWeekday(1, 9, 0) }
];

export function mountTimeControls(root, { onChange }) {
  let mode = "delay";
  let value = DELAY_CHIPS[0].ms;

  function render() {
    root.innerHTML = "";
    if (mode === "delay") renderDelay();
    else if (mode === "absolute") renderAbsolute();
    else if (mode === "reset") renderReset();
    else if (mode === "chain") renderChain();
  }

  function renderDelay() {
    const wrap = document.createElement("div"); wrap.className = "chips";
    DELAY_CHIPS.forEach(c => {
      const b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.textContent = c.label;
      if (c.ms === value) b.classList.add("active");
      b.addEventListener("click", () => {
        value = typeof c.ms === "number" ? c.ms : computePresetMs(c.ms);
        onChange({ mode, value });
        render();
      });
      wrap.appendChild(b);
    });
    root.appendChild(wrap);
  }

  function renderAbsolute() {
    const d = value ? new Date(value) : defaultFutureDate();
    const draft = {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes()
    };
    const original = value;

    const label = document.createElement("div");
    label.className = "field-label";
    label.textContent = "Date & time (24h)";

    const grid = document.createElement("div");
    grid.className = "when-grid";
    const fields = [
      { k: "year",   label: "Year",  min: 2026, max: 2099, w: 64 },
      { k: "month",  label: "Mo",    min: 1,    max: 12,   w: 44 },
      { k: "day",    label: "Day",   min: 1,    max: 31,   w: 44 },
      { k: "hour",   label: "Hr",    min: 0,    max: 23,   w: 44 },
      { k: "minute", label: "Min",   min: 0,    max: 59,   w: 44 }
    ];
    const inputs = {};
    fields.forEach(f => {
      const cell = document.createElement("label");
      cell.className = "when-cell";
      const sub = document.createElement("span");
      sub.className = "when-sub";
      sub.textContent = f.label;
      const inp = document.createElement("input");
      inp.type = "number";
      inp.inputMode = "numeric";
      inp.min = String(f.min); inp.max = String(f.max);
      inp.value = String(draft[f.k]);
      inp.dataset.k = f.k;
      inp.style.width = f.w + "px";
      cell.appendChild(sub);
      cell.appendChild(inp);
      grid.appendChild(cell);
      inputs[f.k] = inp;
    });
    root.appendChild(label);
    root.appendChild(grid);

    const presets = document.createElement("div");
    presets.className = "chips when-presets";
    ABS_PRESETS.forEach(p => {
      const b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.textContent = p.label;
      b.addEventListener("click", () => {
        const ts = p.fn();
        const dd = new Date(ts);
        inputs.year.value   = dd.getFullYear();
        inputs.month.value  = dd.getMonth() + 1;
        inputs.day.value    = dd.getDate();
        inputs.hour.value   = dd.getHours();
        inputs.minute.value = dd.getMinutes();
        updateConfirm();
      });
      presets.appendChild(b);
    });
    root.appendChild(presets);

    const hint = document.createElement("span");
    hint.className = "hint";
    hint.textContent = "Edit fields, then press Confirm.";
    root.appendChild(hint);

    const actions = document.createElement("div");
    actions.className = "when-actions";
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "btn btn-primary confirm";
    confirmBtn.type = "button";
    confirmBtn.textContent = "Confirm";
    confirmBtn.disabled = true;
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-ghost";
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    actions.appendChild(confirmBtn);
    actions.appendChild(cancelBtn);
    root.appendChild(actions);

    const preview = document.createElement("div");
    preview.className = "when-preview";
    preview.textContent = "";
    root.appendChild(preview);

    function readDraft() {
      const y = parseInt(inputs.year.value, 10);
      const mo = parseInt(inputs.month.value, 10);
      const da = parseInt(inputs.day.value, 10);
      const hr = parseInt(inputs.hour.value, 10);
      const mi = parseInt(inputs.minute.value, 10);
      if ([y, mo, da, hr, mi].some(Number.isNaN)) return null;
      const d = new Date(y, mo - 1, da, hr, mi, 0, 0);
      if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
      return d.getTime();
    }

    function updateConfirm() {
      const ts = readDraft();
      if (!ts) {
        confirmBtn.disabled = true;
        preview.textContent = "Invalid date";
        preview.className = "when-preview is-err";
        return;
      }
      if (ts <= Date.now()) {
        confirmBtn.disabled = true;
        preview.textContent = `Would be ${new Date(ts).toLocaleString()} (in the past)`;
        preview.className = "when-preview is-err";
        return;
      }
      confirmBtn.disabled = false;
      preview.textContent = `Will fire at ${new Date(ts).toLocaleString()}`;
      preview.className = "when-preview";
    }

    Object.values(inputs).forEach(inp => inp.addEventListener("input", updateConfirm));
    updateConfirm();

    confirmBtn.addEventListener("click", () => {
      const ts = readDraft();
      if (!ts || ts <= Date.now()) return;
      value = ts;
      onChange({ mode, value });
      confirmBtn.textContent = "Confirmed ✓";
      confirmBtn.disabled = true;
      setTimeout(() => { confirmBtn.textContent = "Confirm"; updateConfirm(); }, 1500);
    });
    cancelBtn.addEventListener("click", () => {
      value = original;
      onChange({ mode, value });
      render();
    });
  }

  function renderReset() {
    const t = document.createElement("div");
    t.className = "meta";
    t.textContent = value ? `Detected reset: ${new Date(value).toLocaleString()}` : "Click 'Detect reset' to scan the page.";
    root.appendChild(t);
    const b = document.createElement("button");
    b.className = "btn btn-ghost";
    b.type = "button";
    b.textContent = "Detect reset";
    b.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let resp;
      try {
        resp = await chrome.tabs.sendMessage(tab.id, { action: "DETECT_RESET", platform: window.__platform });
      } catch (e) {
        t.className = "meta is-err";
        t.textContent = `Couldn't reach the page (${e.message || "no content script"}). Reload the tab and try again.`;
        return;
      }
      const ts = resp?.ts;
      if (ts && Number.isFinite(ts)) {
        value = ts;
        t.className = "meta";
        t.textContent = `Detected reset: ${new Date(ts).toLocaleString()}`;
        onChange({ mode, value });
      } else {
        value = null;
        t.className = "meta is-err";
        t.textContent = "No reset time detected on this page.";
        onChange({ mode, value: null });
      }
    });
    root.appendChild(b);
  }

  function renderChain() {
    const t = document.createElement("div"); t.className = "meta";
    t.textContent = "Sends the prompt ~500ms after this tab's current AI response finishes. The page will show a small banner while it waits.";
    root.appendChild(t);
  }

  function setMode(m) {
    mode = m;
    value = m === "delay" ? DELAY_CHIPS[0].ms : null;
    render();
  }

  return {
    render,
    setMode,
    get value() { return { mode, value }; }
  };
}

function computePresetMs(kind) {
  if (kind === "tomorrow-9") return tomorrowAt(9, 0);
  return Date.now();
}

function tomorrowAt(h, m) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function nextWeekday(target, h, m) {
  const d = new Date();
  while (d.getDay() !== target || (d.getHours() > h) || (d.getHours() === h && d.getMinutes() >= m)) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function nextSlot(ms) {
  const d = new Date(ms);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 0);
  if (d.getMinutes() === 0) d.setHours(d.getHours() + 1);
  d.setSeconds(0, 0);
  return d.getTime();
}

function defaultFutureDate() {
  return new Date(Date.now() + 3600_000);
}
