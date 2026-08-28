// time-controls.js — owns the four time modes: delay (chips), absolute
// (custom date/time grid + Confirm), reset (parse the page), chain (passive).
//
// The absolute mode used to render the native <input type="datetime-local">
// which opens Chrome's own picker and dismisses on outside-click. That made
// it impossible to fix a mistake without committing a wrong value. This
// custom grid replaces the native picker entirely: the user types 5 numbers
// and the only path that commits is the Confirm button.

// Delay-mode chips must hold a pure duration (ms to add to Date.now()) —
// saveBtn's click handler in popup.js does
// `scheduledAt = mode === "delay" ? Date.now() + value : value`. A
// "Tomorrow 9am" entry used to store an *absolute* epoch timestamp here
// instead (via computePresetMs -> tomorrowAt), so Date.now() + value
// added two absolute timestamps together — a nonsense date thousands of
// years out. Removed rather than fixed in place: At-time mode already
// has its own "Tomorrow 9am" preset that's built for absolute values.
const DELAY_CHIPS = [
  { label: "+5m",  ms: 5 * 60_000 },
  { label: "+15m", ms: 15 * 60_000 },
  { label: "+1h",  ms: 60 * 60_000 }
];

const ABS_PRESETS = [
  { label: "In 1h",  fn: () => nextSlot(Date.now() + 3600_000) },
  { label: "In 3h",  fn: () => nextSlot(Date.now() + 3 * 3600_000) },
  { label: "Tomorrow 9am", fn: () => tomorrowAt(9, 0) }
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
      // popup.css only styles .chip.is-active — "active" (no CSS rule for
      // it) rendered the selected delay chip visually identical to the
      // rest, so there was no indication which one was picked.
      if (c.ms === value) b.classList.add("is-active");
      b.addEventListener("click", () => {
        value = c.ms;
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
      { k: "year",   label: "Year",  min: 2026, max: 2099 },
      { k: "month",  label: "Mo",    min: 1,    max: 12   },
      { k: "day",    label: "Day",   min: 1,    max: 31   },
      { k: "hour",   label: "Hr",    min: 0,    max: 23   },
      { k: "minute", label: "Min",   min: 0,    max: 59   }
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
      // No inline width here — popup.css's .when-cell input { width:100% }
      // fills each equal-width grid track. An earlier fixed-px inline
      // width (64px for year, 44px for the rest) fought that: year
      // overflowed its ~61px track slightly, and the narrower fields sat
      // left-aligned in their tracks with visible empty space on the
      // right, reading as uneven, inconsistent gaps between the 5 fields.
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
        // These presets fill the 5 fields rather than persist a selected
        // state (editing a field afterward should feel like a normal
        // edit, not "still following the preset"), so there's no lasting
        // .is-active to track. Flash the clicked chip briefly instead —
        // otherwise clicking gave no visible sign the click registered at
        // all, just a silent change in the fields above.
        presets.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
        b.classList.add("is-active");
        setTimeout(() => b.classList.remove("is-active"), 450);
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
    confirmBtn.className = "btn btn-primary";
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

  let _suggestionEl = null;

  function clearSuggestion() {
    if (_suggestionEl) { _suggestionEl.remove(); _suggestionEl = null; }
  }

  function setResetSuggestion(ts) {
    clearSuggestion();
    if (!ts || ts <= Date.now()) return;
    const mins = Math.round((ts - Date.now()) / 60_000);
    if (mins < 1) return;  // ignore sub-minute suggestions

    const card = document.createElement("div");
    card.className = "reset-suggestion";
    card.innerHTML = `
      <svg class="i"><use href="#i-clock"/></svg>
      <div class="reset-suggestion-body">
        <div class="reset-suggestion-title">Limit resets in ${humanizeMins(mins)}</div>
        <div class="reset-suggestion-sub">${new Date(ts).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</div>
      </div>
      <button class="btn btn-primary btn-sm reset-suggestion-use" type="button">Use</button>
      <button class="btn-icon reset-suggestion-dismiss" type="button" aria-label="Dismiss" title="Dismiss">
        <svg class="i"><use href="#i-x"/></svg>
      </button>
    `;
    card.querySelector(".reset-suggestion-use").addEventListener("click", () => {
      // Find the matching delay chip (within 60s) or fall back to absolute mode
      const target = DELAY_CHIPS.find(c => typeof c.ms === "number" && Math.abs(c.ms - mins * 60_000) < 60_000);
      if (target) {
        setMode("delay");
        value = target.ms;
      } else {
        setMode("absolute");
        value = ts;
      }
      onChange({ mode, value });
      clearSuggestion();
      render();
    });
    card.querySelector(".reset-suggestion-dismiss").addEventListener("click", clearSuggestion);
    root.prepend(card);
    _suggestionEl = card;
  }

  return {
    render,
    setMode,
    setResetSuggestion,
    get value() { return { mode, value }; }
  };
}

function tomorrowAt(h, m) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
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

function humanizeMins(mins) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
