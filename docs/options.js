// src/lib/id.js
var ALPHA = "abcdefghijklmnopqrstuvwxyz0123456789";
function rand(n) {
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return s;
}
function id(prefix) {
  if (!["q", "r", "h"].includes(prefix)) throw new Error(`id: bad prefix ${prefix}`);
  return `${prefix}_${Date.now().toString(36)}${rand(4)}`;
}

// src/lib/log.js
var PREFIX = "[ai-auto-sender]";
var log = {
  info: (tag, ...a) => console.info(PREFIX, tag, ...a),
  warn: (tag, ...a) => console.warn(PREFIX, tag, ...a),
  error: (tag, ...a) => console.error(PREFIX, tag, ...a)
};

// src/lib/platform.js
var PLATFORMS = Object.freeze({ CLAUDE: "claude", GPT: "gpt", GEMINI: "gemini" });
var WELL_KNOWN = /* @__PURE__ */ new Set(["claude.ai", "chatgpt.com", "gemini.google.com"]);
var SHORT_TO_HOST = {
  "claude": "claude.ai",
  "gpt": "chatgpt.com",
  "gemini": "gemini.google.com"
};
function isWellKnownPlatform(p) {
  return WELL_KNOWN.has(p);
}
function isKnownPlatform(p) {
  return typeof p === "string" && /^[a-z0-9.\-]+$/i.test(p);
}
function hostnameForPlatform(platform) {
  if (SHORT_TO_HOST[platform]) return SHORT_TO_HOST[platform];
  if (isWellKnownPlatform(platform)) return platform;
  return platform;
}

// src/background/queue-store.js
var KEYS = {
  QUEUE: "queue",
  RECURRING: "recurring",
  SELECTORS: "selectors",
  SETTINGS: "settings",
  HISTORY: "history"
};
var LEGACY_PAIRS = [
  ["claude", "claude_pendingMessage", "claude_scheduledTime", "claude_customInputPath", "claude_customButtonPath"],
  ["gpt", "gpt_pendingMessage", "gpt_scheduledTime", "gpt_customInputPath", "gpt_customButtonPath"],
  ["gemini", "gemini_pendingMessage", "gemini_scheduledTime", "gemini_customInputPath", "gemini_customButtonPath"]
];
async function getKey(k) {
  return (await chrome.storage.local.get(k))[k];
}
async function setKey(k, v) {
  return chrome.storage.local.set({ [k]: v });
}
var queueStore = {
  async add(item) {
    if (!item?.id) throw new Error("queueStore.add: item.id required");
    if (!isKnownPlatform(item.platform)) throw new Error(`queueStore.add: bad platform ${item.platform}`);
    const queue = await getKey(KEYS.QUEUE) || [];
    queue.push(item);
    await setKey(KEYS.QUEUE, queue);
    return item;
  },
  async update(id2, patch) {
    const queue = await getKey(KEYS.QUEUE) || [];
    const i = queue.findIndex((x) => x.id === id2);
    if (i < 0) throw new Error(`queueStore.update: ${id2} not found`);
    queue[i] = { ...queue[i], ...patch };
    await setKey(KEYS.QUEUE, queue);
    return queue[i];
  },
  async remove(id2) {
    const queue = await getKey(KEYS.QUEUE) || [];
    const next = queue.filter((x) => x.id !== id2);
    await setKey(KEYS.QUEUE, next);
  },
  list() {
    return getKey(KEYS.QUEUE).then((v) => v || []);
  },
  async getById(id2) {
    const queue = await getKey(KEYS.QUEUE) || [];
    return queue.find((x) => x.id === id2) || null;
  },
  async getByStatus(status) {
    const queue = await getKey(KEYS.QUEUE) || [];
    return queue.filter((x) => x.status === status);
  },
  // recurring
  async addRecurring(item) {
    if (!item.id) throw new Error("recurring id required");
    const rec = await getKey(KEYS.RECURRING) || [];
    rec.push(item);
    await setKey(KEYS.RECURRING, rec);
    return item;
  },
  async updateRecurring(id2, patch) {
    const rec = await getKey(KEYS.RECURRING) || [];
    const i = rec.findIndex((x) => x.id === id2);
    if (i < 0) throw new Error(`recurring ${id2} not found`);
    rec[i] = { ...rec[i], ...patch };
    await setKey(KEYS.RECURRING, rec);
    return rec[i];
  },
  async removeRecurring(id2) {
    const rec = await getKey(KEYS.RECURRING) || [];
    await setKey(KEYS.RECURRING, rec.filter((x) => x.id !== id2));
  },
  listRecurring() {
    return getKey(KEYS.RECURRING).then((v) => v || []);
  },
  async getRecurringById(id2) {
    const rec = await getKey(KEYS.RECURRING) || [];
    return rec.find((x) => x.id === id2) || null;
  },
  // selectors + settings (read/write; sync mirroring is wired in sync-store.js)
  async getSelectors() {
    return await getKey(KEYS.SELECTORS) || {};
  },
  async setSelectors(s) {
    await setKey(KEYS.SELECTORS, s);
  },
  async getSettings() {
    return await getKey(KEYS.SETTINGS) || { onboarded: false, sendNotifications: true, soundOnFire: false };
  },
  async setSettings(s) {
    await setKey(KEYS.SETTINGS, s);
  },
  // history
  async appendHistory(item) {
    const history = await getKey(KEYS.HISTORY) || [];
    history.push({ ...item, archivedAt: Date.now() });
    const cutoff = Date.now() - 30 * 864e5;
    const trimmed = history.filter((h) => (h.archivedAt || 0) > cutoff).slice(-500);
    await setKey(KEYS.HISTORY, trimmed);
  },
  listHistory() {
    return getKey(KEYS.HISTORY).then((v) => v || []);
  },
  async migrate() {
    const all = await chrome.storage.local.get(null);
    let migrated = 0;
    const selectors = await this.getSelectors();
    let selectorsChanged = false;
    {
      const remap = { claude: "claude.ai", gpt: "chatgpt.com", gemini: "gemini.google.com" };
      let selChanged = false;
      for (const [from, to] of Object.entries(remap)) {
        if (selectors[from]) {
          selectors[to] = { ...selectors[to] || {}, ...selectors[from] };
          delete selectors[from];
          selChanged = true;
        }
      }
      if (selChanged) selectorsChanged = true;
      const needsRename = (x) => x && x.platform && remap[x.platform];
      const renames = (arr) => arr.map((x) => needsRename(x) ? { ...x, platform: remap[x.platform] } : x);
      const queue = await getKey(KEYS.QUEUE) || [];
      if (queue.some(needsRename)) await setKey(KEYS.QUEUE, renames(queue));
      const recurring = await getKey(KEYS.RECURRING) || [];
      if (recurring.some(needsRename)) await setKey(KEYS.RECURRING, renames(recurring));
    }
    for (const [plat, msgKey, timeKey, inputKey, buttonKey] of LEGACY_PAIRS) {
      if (all[msgKey] && all[timeKey]) {
        const item = {
          id: id("q"),
          platform: hostnameForPlatform(plat) || plat,
          tabId: null,
          conversationUrl: null,
          text: all[msgKey],
          mode: "absolute",
          scheduledAt: all[timeKey],
          status: "pending",
          attempts: 0,
          lastError: null,
          createdAt: Date.now(),
          migratedFromV4: true
        };
        await this.add(item);
        await chrome.storage.local.remove([msgKey, timeKey]);
        migrated++;
      }
      const host = hostnameForPlatform(plat) || plat;
      if (all[inputKey]) {
        selectors[host] = { ...selectors[host] || {}, input: all[inputKey] };
        selectorsChanged = true;
      }
      if (all[buttonKey]) {
        selectors[host] = { ...selectors[host] || {}, sendButton: all[buttonKey] };
        selectorsChanged = true;
      }
      if (all[inputKey] || all[buttonKey]) {
        await chrome.storage.local.remove([inputKey, buttonKey].filter(Boolean));
      }
    }
    if (selectorsChanged) await this.setSelectors(selectors);
    log.info("queueStore", "migrate done", { migrated });
    return { migrated };
  }
};

// src/background/sync-store.js
var SYNC_KEYS = { SELECTORS: "selectors", SETTINGS: "settings" };
var BANNER_FLAG = "sync_hydrated_banner_seen";
var syncStore = {
  async getSelectors() {
    return await queueStore.getSelectors();
  },
  async setSelectors(s) {
    await queueStore.setSelectors(s);
    try {
      await chrome.storage.sync.set({ [SYNC_KEYS.SELECTORS]: s });
    } catch (e) {
      log.warn("syncStore", "sync.set selectors failed", e);
    }
  },
  async setSettings(s) {
    await queueStore.setSettings(s);
    try {
      await chrome.storage.sync.set({ [SYNC_KEYS.SETTINGS]: s });
    } catch (e) {
      log.warn("syncStore", "sync.set settings failed", e);
    }
  },
  async getSyncSelectors() {
    const out = await chrome.storage.sync.get(SYNC_KEYS.SELECTORS);
    return out[SYNC_KEYS.SELECTORS] || null;
  },
  async getSyncSettings() {
    const out = await chrome.storage.sync.get(SYNC_KEYS.SETTINGS);
    return out[SYNC_KEYS.SETTINGS] || null;
  },
  async wipeSyncSelectors() {
    await queueStore.setSelectors({});
    await chrome.storage.sync.remove(SYNC_KEYS.SELECTORS);
  },
  async hydrateFromSync() {
    const localSel = await queueStore.getSelectors();
    const syncSel = await this.getSyncSelectors();
    if ((!localSel || Object.keys(localSel).length === 0) && syncSel && Object.keys(syncSel).length > 0) {
      await queueStore.setSelectors(syncSel);
      const seen = (await chrome.storage.local.get(BANNER_FLAG))[BANNER_FLAG];
      if (!seen) {
        await chrome.storage.local.set({ [BANNER_FLAG]: true });
        return { hydrated: "selectors" };
      }
    }
    return { hydrated: null };
  }
};

// src/lib/messages.js
var MESSAGE_TYPES = Object.freeze({
  START_PICKING: "START_PICKING",
  PICKER_CONFIRMED: "PICKER_CONFIRMED",
  INJECT_AND_SEND: "INJECT_AND_SEND",
  DETECT_RESET: "DETECT_RESET",
  CHAIN_READY: "CHAIN_READY",
  CHAIN_ARM: "CHAIN_ARM",
  DRY_RUN_ITEM: "DRY_RUN_ITEM",
  CANCEL_ITEM: "CANCEL_ITEM",
  RETARGET_ITEM: "RETARGET_ITEM",
  // Background → content: show a v4-style in-page alert/confirm
  // (replaces the chrome.notifications OS toast).
  SEND_NOTICE: "SEND_NOTICE",
  // Popup (tutorial) → content: auto-driven tour demo — highlight the
  // real input/send button on the page, drop in placeholder text so the
  // send button renders, then clear it back out. See tutorial.js.
  TOUR_DEMO_TEACH: "TOUR_DEMO_TEACH"
});

// src/lib/ui-icons.html?raw
var ui_icons_default = `<!-- AI Message Sender \u2014 shared SVG icon sprite.
     One <symbol> per icon, 24x24 viewBox, stroke=1.75, currentColor.
     Pages include this with innerHTML at the top of <body>.
     Usage: <svg class="i"><use href="#i-target"/></svg>
-->
<svg class="svg-sprite" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <symbol id="i-target" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="5"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    </symbol>
    <symbol id="i-send" viewBox="0 0 24 24">
      <path d="M3.5 12 20.5 4l-3.5 17-5-7.5L3.5 12Z"/>
      <path d="m12 13.5 5-4"/>
    </symbol>
    <symbol id="i-clock" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 2"/>
    </symbol>
    <symbol id="i-calendar" viewBox="0 0 24 24">
      <rect x="3.5" y="5" width="17" height="15" rx="2"/>
      <path d="M3.5 10h17M8 3v4M16 3v4"/>
    </symbol>
    <symbol id="i-rotate" viewBox="0 0 24 24">
      <path d="M3.5 12a8.5 8.5 0 0 1 14.5-6"/>
      <path d="M18 3.5V8h-4.5"/>
      <path d="M20.5 12a8.5 8.5 0 0 1-14.5 6"/>
      <path d="M6 20.5V16h4.5"/>
    </symbol>
    <symbol id="i-link" viewBox="0 0 24 24">
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66l-1 1"/>
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>
    </symbol>
    <symbol id="i-repeat" viewBox="0 0 24 24">
      <path d="M4 9V7a2 2 0 0 1 2-2h12"/>
      <path d="m18 5-2-2M18 5l-2 2"/>
      <path d="M20 15v2a2 2 0 0 1-2 2H6"/>
      <path d="m6 19 2 2M6 19l2-2"/>
    </symbol>
    <symbol id="i-play" viewBox="0 0 24 24">
      <path d="M7 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none"/>
    </symbol>
    <symbol id="i-x" viewBox="0 0 24 24">
      <path d="m6 6 12 12M18 6 6 18"/>
    </symbol>
    <symbol id="i-check" viewBox="0 0 24 24">
      <path d="m5 12.5 4.5 4.5L19 7"/>
    </symbol>
    <symbol id="i-coffee" viewBox="0 0 24 24">
      <path d="M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z"/>
      <path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16"/>
      <path d="M8 4c-1 1.5 0 3 0 3M12 4c-1 1.5 0 3 0 3"/>
    </symbol>
    <symbol id="i-book" viewBox="0 0 24 24">
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5V4.5Z"/>
      <path d="M5 19.5A2.5 2.5 0 0 1 7.5 17H19v3H7.5A2.5 2.5 0 0 0 5 19.5Z"/>
    </symbol>
    <symbol id="i-house" viewBox="0 0 24 24">
      <path d="M4 11.5 12 4l8 7.5"/>
      <path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/>
    </symbol>
    <symbol id="i-shield" viewBox="0 0 24 24">
      <path d="M12 3 4.5 6v6.5c0 4 3 7 7.5 8.5 4.5-1.5 7.5-4.5 7.5-8.5V6L12 3Z"/>
      <path d="m9 12 2 2 4-4"/>
    </symbol>
    <symbol id="i-chevron-right" viewBox="0 0 24 24">
      <path d="m9 6 6 6-6 6"/>
    </symbol>
    <symbol id="i-chevron-down" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6"/>
    </symbol>
    <symbol id="i-trash" viewBox="0 0 24 24">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/>
      <path d="M10 11v6M14 11v6"/>
    </symbol>
    <symbol id="i-list" viewBox="0 0 24 24">
      <path d="M4 6h16M4 12h16M4 18h10"/>
    </symbol>
    <!-- Brand mark \u2014 matches icons/source.svg (the toolbar/store icon).
         Filled, not stroked: overrides the sprite's default fill:none so
         it renders as a solid paper-plane shape at any size. -->
    <symbol id="i-logo" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20.5 3.5 3 11l9 10.5-2-9Z"/>
      <path d="M20.5 3.5 10 12.5l2 9Z" fill-opacity="0.55"/>
    </symbol>
    <symbol id="i-help" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9"/>
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.5 1-1.5 2.2"/>
      <path d="M12 17.5h.01"/>
    </symbol>
    <symbol id="i-alert" viewBox="0 0 24 24">
      <path d="M12 4 2 20h20L12 4Z"/>
      <path d="M12 10v4M12 17.5v.5"/>
    </symbol>
    <symbol id="i-eye" viewBox="0 0 24 24">
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"/>
      <circle cx="12" cy="12" r="2.5"/>
    </symbol>
    <symbol id="i-wand" viewBox="0 0 24 24">
      <path d="m4 20 12-12M14 6l4 4"/>
      <path d="M16 4v2M20 4v2M18 3v3M4 14v2M8 14v2M6 13v3"/>
    </symbol>
    <symbol id="i-mail" viewBox="0 0 24 24">
      <path d="M3.5 6.5h17v11h-17z"/>
      <path d="m3.5 7 8.5 6 8.5-6"/>
    </symbol>
    <symbol id="i-external" viewBox="0 0 24 24">
      <path d="M9 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/>
      <path d="M15 4h5v5"/>
      <path d="M20 4 11 13"/>
    </symbol>
  </defs>
</svg>
`;

// src/options/sprite.js
var SPRITE_HTML = ui_icons_default;

// src/options/history-view.js
var escHandler = null;
var overlayEl = null;
function ensureSprite() {
  const host = document.getElementById("sprite-host");
  if (host && !host.querySelector(".svg-sprite")) host.insertAdjacentHTML("afterbegin", SPRITE_HTML);
}
function statusLabel(s) {
  const v = String(s || "\u2014").toLowerCase();
  if (v === "sent" || v === "succeeded") return "Sent";
  if (v === "ok") return "OK";
  if (v === "failed" || v === "fail" || v === "error") return "Failed";
  if (v === "pending" || v === "queued" || v === "waiting") return "Pending";
  return s || "\u2014";
}
function showHistoryDetail(item) {
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
    ["Platform", item.platform || "\u2014"],
    ["Status", statusLabel(item.status)],
    ["Mode", item.mode || "\u2014"],
    ["Scheduled", item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "\u2014"],
    ["Archived", item.archivedAt ? new Date(item.archivedAt).toLocaleString() : "\u2014"],
    ["Item id", item.id || "\u2014"]
  ];
  if (item.lastError) fields.push(["Last error", item.lastError]);
  const meta = document.createElement("dl");
  meta.className = "modal-meta";
  for (const [k, v] of fields) {
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.textContent = v;
    meta.appendChild(dt);
    meta.appendChild(dd);
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
  overlayEl.addEventListener("click", (e) => {
    if (e.target === overlayEl) closeHistoryDetail();
  });
  escHandler = (e) => {
    if (e.key === "Escape") closeHistoryDetail();
  };
  document.addEventListener("keydown", escHandler);
  root.appendChild(overlayEl);
  setTimeout(() => close.focus(), 0);
}
function closeHistoryDetail() {
  if (escHandler) {
    document.removeEventListener("keydown", escHandler);
    escHandler = null;
  }
  if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
  overlayEl = null;
}

// src/lib/tour-launch.js
function waitForTabComplete(tabId, timeoutMs = 8e3) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const listener = (id2, info) => {
      if (id2 === tabId && info.status === "complete") finish();
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((tab) => {
      if (tab?.status === "complete") finish();
    }).catch(finish);
    setTimeout(finish, timeoutMs);
  });
}
async function launchTour() {
  const { settings = {} } = await chrome.storage.local.get("settings");
  await chrome.storage.local.set({ settings: { ...settings, pendingTourLaunch: true } });
  const tab = await chrome.tabs.create({ url: "https://chatgpt.com/", active: true });
  await waitForTabComplete(tab.id);
  if (tab.windowId != null) await chrome.windows.update(tab.windowId, { focused: true });
  try {
    await chrome.action.openPopup();
  } catch (_) {
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
  }
}

// src/options/options.js
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
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
  root.innerHTML = recurring.length === 0 ? `<div class="empty-state">
         <svg class="i" width="32" height="32"><use href="#i-repeat"/></svg>
         <div>No recurring rules yet.</div>
         <div style="font-size: var(--text-xs); margin-top: 4px; color: var(--fg-subtle);">Add one from the popup's "Make this recurring" panel.</div>
       </div>` : recurring.map((r) => {
    const sched = r.schedule.kind === "daily" ? `Daily at ${r.schedule.timeOfDay}` : `Weekly on ${(r.schedule.daysOfWeek || []).map((d) => "SMTWTFS"[d]).join("")} at ${r.schedule.timeOfDay}`;
    const fullText = r.text || "";
    const truncated = fullText.length > 80 ? fullText.slice(0, 80) + "\u2026" : fullText;
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
  root.querySelectorAll(".row-card").forEach((row) => {
    const id2 = row.dataset.id;
    row.querySelector("[data-act=toggle]").addEventListener("click", async () => {
      const r = recurring.find((x) => x.id === id2);
      await queueStore.updateRecurring(id2, { enabled: !r.enabled });
      renderRecurring();
    });
    row.querySelector("[data-act=delete]").addEventListener("click", async () => {
      if (!confirm("Delete this recurring rule? Already-queued items will still fire.")) return;
      await queueStore.removeRecurring(id2);
      renderRecurring();
    });
  });
}
function renderHistoryItem(h) {
  const schedTime = h.scheduledAt ? new Date(h.scheduledAt).toLocaleString() : h.mode === "chain" ? "when response ends" : "\u2014";
  const archTime = h.archivedAt ? new Date(h.archivedAt).toLocaleString() : null;
  const status = h.status || "\u2014";
  const platform = h.platform || "\u2014";
  const text = h.text || "";
  const preview = text.length > 120 ? text.slice(0, 120) + "\u2026" : text;
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
       <div style="font-size: var(--text-xs); margin-top: 4px; color: var(--fg-subtle);">Send a prompt from the popup to see it here.</div>
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
document.getElementById("coffee").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: "https://donate.stripe.com/28EbITdPK6pa0kv3gU3Ru00" });
});
document.getElementById("welcome").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
});
document.getElementById("nav-tour-header")?.addEventListener("click", launchTour);
(async () => {
  const host = document.getElementById("sprite-host");
  if (host) host.innerHTML = SPRITE_HTML;
  const hydrated = await syncStore.hydrateFromSync();
  if (hydrated.hydrated) document.getElementById("sync-banner").hidden = false;
  await renderRecurring();
  await renderHistory();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.recurring) renderRecurring();
    if (changes.history) renderHistory();
    if (changes.queue) renderHistory();
  });
})();
