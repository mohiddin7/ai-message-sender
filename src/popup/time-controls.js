const DELAY_CHIPS = [
  { label: "+5m",  ms: 5 * 60_000 },
  { label: "+15m", ms: 15 * 60_000 },
  { label: "+1h",  ms: 60 * 60_000 },
  { label: "Tomorrow 9am", ms: "tomorrow-9" }
];

export function mountTimeControls(root, { onChange }) {
  let mode = "delay";
  let value = DELAY_CHIPS[0].ms;

  function render() {
    root.innerHTML = "";
    if (mode === "delay") {
      const wrap = document.createElement("div"); wrap.className = "chips";
      DELAY_CHIPS.forEach(c => {
        const b = document.createElement("button");
        b.className = "chip"; b.textContent = c.label;
        if (c.ms === value) b.classList.add("active");
        b.addEventListener("click", () => { value = c.ms; onChange({ mode, value }); render(); });
        wrap.appendChild(b);
      });
      root.appendChild(wrap);
    } else if (mode === "absolute") {
      const i = document.createElement("input");
      i.type = "datetime-local";
      i.addEventListener("change", () => { value = i.value ? new Date(i.value).getTime() : null; onChange({ mode, value }); });
      root.appendChild(i);
    } else if (mode === "reset") {
      const t = document.createElement("div");
      t.className = "meta";
      t.textContent = value ? `Detected reset: ${new Date(value).toLocaleString()}` : "Click 'Detect reset' to scan the page.";
      const b = document.createElement("button");
      b.className = "chip"; b.textContent = "Detect reset";
      b.addEventListener("click", async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const r = await chrome.tabs.sendMessage(tab.id, { action: "DETECT_RESET", platform: window.__platform });
        value = r?.ts || null; onChange({ mode, value }); render();
      });
      root.appendChild(t); root.appendChild(b);
    } else if (mode === "chain") {
      const t = document.createElement("div"); t.className = "meta";
      t.textContent = "Will send when the current response completes on this tab.";
      root.appendChild(t);
    }
  }

  function setMode(m) { mode = m; value = m === "delay" ? DELAY_CHIPS[0].ms : (m === "chain" ? null : null); render(); }

  return { render, setMode, get value() { return { mode, value }; } };
}