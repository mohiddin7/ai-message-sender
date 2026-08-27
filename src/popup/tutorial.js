// Tutorial overlay — a focus-style walkthrough for the popup.
//
// Usage: import { startTutorial } from "./tutorial.js" and call it from
// popup.js when the user clicks the "Show tutorial" footer link, or
// automatically on first install.
//
// The overlay:
//
//  - darkens the rest of the page (backdrop with a "punch through" hole
//    around the highlighted element)
//  - draws a focus ring around the target
//  - shows a floating tooltip card with title, body, prev/next/done
//  - moves the tooltip to stay visible when the target is at an edge
//
// State: writes chrome.storage.local.settings.tutorialSeen = true when
// the user finishes or skips. The on-demand re-launch clears that flag
// so the next time the popup opens it doesn't auto-fire.

const STEPS = [
  {
    id: "platform",
    sel: "#badge",
    title: "This pill is the platform",
    body: "When you open the popup from a Claude, ChatGPT, or Gemini tab, this shows the platform name. The whole extension is keyed to that tab.",
    placement: "below"
  },
  {
    id: "modes",
    sel: ".segmented",
    title: "Pick a time mode",
    body: "Delay sends after a relative offset. At time fires at an exact moment. Reset scans the page for a 'resets in 2 hours' notice. Chain sends ~500ms after this tab's current response ends.",
    placement: "below"
  },
  {
    id: "picker",
    sel: ".picker-row",
    title: "Teach the page",
    body: "Click Teach input, then click the prompt box on the page. Click Teach send, then click the send button. The picker picks a stable selector for you.",
    placement: "below"
  },
  {
    id: "prompt",
    sel: "#msg",
    title: "Type your prompt",
    body: "Write what you want the AI to receive. You can queue several at once.",
    placement: "above"
  },
  {
    id: "queue",
    sel: "#saveBtn",
    title: "Queue it",
    body: "The extension schedules the send. The tab can be in the background — it'll focus when the moment comes.",
    placement: "above"
  },
  {
    id: "queue-list",
    sel: ".queue-section",
    title: "Your queue lives here",
    body: "Pending items show a status-colored left border. The play icon dry-runs an item; the x cancels it. Open History from the footer for the full 30-day log.",
    placement: "above"
  }
];

const STORAGE_KEY = "settings";
const SEEN_FLAG = "tutorialSeen";

export async function startTutorial({ onFinish, force = false } = {}) {
  if (!force) {
    const { settings = {} } = await chrome.storage.local.get(STORAGE_KEY);
    if (settings[SEEN_FLAG]) return;
  }
  const overlay = mountOverlay(onFinish);
  document.body.appendChild(overlay.root);
  // Wait one frame for layout, then position the first step
  await new Promise(r => requestAnimationFrame(r));
  overlay.go(0);
  return overlay;
}

function mountOverlay(onFinish) {
  const root = document.createElement("div");
  root.className = "tutorial-overlay";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Tutorial");

  // Backdrop SVG: a single rect with a punched-through "hole" for the
  // focus ring. Implemented as a path with a hollow cutout using even-odd
  // fill rule. Repositioned per step.
  const backdrop = document.createElement("div");
  backdrop.className = "tutorial-backdrop";
  root.appendChild(backdrop);

  const ring = document.createElement("div");
  ring.className = "tutorial-ring";
  root.appendChild(ring);

  const card = document.createElement("div");
  card.className = "tutorial-card";
  card.innerHTML = `
    <div class="tutorial-step">Step 1 of ${STEPS.length}</div>
    <h3 class="tutorial-title"></h3>
    <p class="tutorial-body"></p>
    <div class="tutorial-actions">
      <button class="btn btn-ghost btn-sm" data-act="skip" type="button">Skip</button>
      <div class="tutorial-actions-right">
        <button class="btn btn-ghost btn-sm" data-act="prev" type="button" hidden>Back</button>
        <button class="btn btn-primary btn-sm" data-act="next" type="button">Next</button>
      </div>
    </div>
  `;
  root.appendChild(card);

  const stepEl   = card.querySelector(".tutorial-step");
  const titleEl  = card.querySelector(".tutorial-title");
  const bodyEl   = card.querySelector(".tutorial-body");
  const prevBtn  = card.querySelector('[data-act="prev"]');
  const nextBtn  = card.querySelector('[data-act="next"]');
  const skipBtn  = card.querySelector('[data-act="skip"]');

  let idx = 0;
  let disposed = false;

  function placeAt(target) {
    const r = target.getBoundingClientRect();
    const pad = 6;
    ring.style.left   = (r.left - pad)   + "px";
    ring.style.top    = (r.top - pad)    + "px";
    ring.style.width  = (r.width + pad * 2)  + "px";
    ring.style.height = (r.height + pad * 2) + "px";

    const step = STEPS[idx];
    // Default placement below
    let top = r.bottom + 16;
    let left = r.left + r.width / 2 - 180;
    if (step.placement === "above") {
      top = r.top - 16 - card.offsetHeight;
    }
    // Clamp to viewport
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    left = Math.max(8, Math.min(left, vw - card.offsetWidth - 8));
    top  = Math.max(8, Math.min(top,  vh - card.offsetHeight - 8));
    card.style.left = left + "px";
    card.style.top  = top + "px";
  }

  function go(n) {
    if (disposed) return;
    idx = Math.max(0, Math.min(n, STEPS.length - 1));
    const step = STEPS[idx];
    const target = document.querySelector(step.sel);
    if (!target) { finish(); return; }

    stepEl.textContent  = `Step ${idx + 1} of ${STEPS.length}`;
    titleEl.textContent = step.title;
    bodyEl.textContent  = step.body;
    prevBtn.hidden = idx === 0;
    nextBtn.textContent = idx === STEPS.length - 1 ? "Done" : "Next";

    placeAt(target);
  }

  function finish() {
    if (disposed) return;
    disposed = true;
    root.remove();
    chrome.storage.local.get(STORAGE_KEY).then(({ settings = {} } = {}) => {
      chrome.storage.local.set({ settings: { ...settings, [SEEN_FLAG]: true } });
    });
    onFinish && onFinish();
  }

  prevBtn.addEventListener("click", () => go(idx - 1));
  nextBtn.addEventListener("click", () => idx === STEPS.length - 1 ? finish() : go(idx + 1));
  skipBtn.addEventListener("click", finish);

  document.addEventListener("keydown", function onKey(e) {
    if (disposed) { document.removeEventListener("keydown", onKey); return; }
    if (e.key === "Escape") finish();
    else if (e.key === "ArrowRight") idx === STEPS.length - 1 ? finish() : go(idx + 1);
    else if (e.key === "ArrowLeft") go(idx - 1);
  });

  return { root, go, finish, get index() { return idx; } };
}
