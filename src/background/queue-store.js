import { id as makeId } from "../lib/id.js";
import { log } from "../lib/log.js";
import { detectPlatformFromUrl, isKnownPlatform, hostnameForPlatform } from "../lib/platform.js";

const KEYS = {
  QUEUE:     "queue",
  RECURRING: "recurring",
  SELECTORS: "selectors",
  SETTINGS:  "settings",
  HISTORY:   "history"
};

const LEGACY_PAIRS = [
  ["claude", "claude_pendingMessage", "claude_scheduledTime", "claude_customInputPath", "claude_customButtonPath"],
  ["gpt",    "gpt_pendingMessage",    "gpt_scheduledTime",    "gpt_customInputPath",    "gpt_customButtonPath"],
  ["gemini", "gemini_pendingMessage", "gemini_scheduledTime", "gemini_customInputPath", "gemini_customButtonPath"]
];

async function getKey(k) { return (await chrome.storage.local.get(k))[k]; }
async function setKey(k, v) { return chrome.storage.local.set({ [k]: v }); }

export const queueStore = {
  async add(item) {
    if (!item?.id) throw new Error("queueStore.add: item.id required");
    if (!isKnownPlatform(item.platform)) throw new Error(`queueStore.add: bad platform ${item.platform}`);
    const queue = (await getKey(KEYS.QUEUE)) || [];
    queue.push(item);
    await setKey(KEYS.QUEUE, queue);
    return item;
  },
  async update(id, patch) {
    const queue = (await getKey(KEYS.QUEUE)) || [];
    const i = queue.findIndex(x => x.id === id);
    if (i < 0) throw new Error(`queueStore.update: ${id} not found`);
    queue[i] = { ...queue[i], ...patch };
    await setKey(KEYS.QUEUE, queue);
    return queue[i];
  },
  async remove(id) {
    const queue = (await getKey(KEYS.QUEUE)) || [];
    const next = queue.filter(x => x.id !== id);
    await setKey(KEYS.QUEUE, next);
  },
  list()        { return getKey(KEYS.QUEUE).then(v => v || []); },
  async getById(id) {
    const queue = (await getKey(KEYS.QUEUE)) || [];
    return queue.find(x => x.id === id) || null;
  },
  async getByStatus(status) {
    const queue = (await getKey(KEYS.QUEUE)) || [];
    return queue.filter(x => x.status === status);
  },

  // recurring
  async addRecurring(item) {
    if (!item.id) throw new Error("recurring id required");
    const rec = (await getKey(KEYS.RECURRING)) || [];
    rec.push(item); await setKey(KEYS.RECURRING, rec); return item;
  },
  async updateRecurring(id, patch) {
    const rec = (await getKey(KEYS.RECURRING)) || [];
    const i = rec.findIndex(x => x.id === id);
    if (i < 0) throw new Error(`recurring ${id} not found`);
    rec[i] = { ...rec[i], ...patch };
    await setKey(KEYS.RECURRING, rec);
    return rec[i];
  },
  async removeRecurring(id) {
    const rec = (await getKey(KEYS.RECURRING)) || [];
    await setKey(KEYS.RECURRING, rec.filter(x => x.id !== id));
  },
  listRecurring() { return getKey(KEYS.RECURRING).then(v => v || []); },
  async getRecurringById(id) {
    const rec = (await getKey(KEYS.RECURRING)) || [];
    return rec.find(x => x.id === id) || null;
  },

  // selectors + settings (read/write; sync mirroring is wired in sync-store.js)
  async getSelectors() { return (await getKey(KEYS.SELECTORS)) || {}; },
  async setSelectors(s) {
    await setKey(KEYS.SELECTORS, s);
    // Mirror to sync is handled by syncStore when called from background
  },
  async getSettings() { return (await getKey(KEYS.SETTINGS)) || { onboarded: false, sendNotifications: true, soundOnFire: false }; },
  async setSettings(s) {
    await setKey(KEYS.SETTINGS, s);
    // Mirror to sync is handled by syncStore when called from background
  },

  // history
  async appendHistory(item) {
    const history = (await getKey(KEYS.HISTORY)) || [];
    history.push({ ...item, archivedAt: Date.now() });
    const cutoff = Date.now() - 30 * 86400_000;
    const trimmed = history.filter(h => (h.archivedAt || 0) > cutoff).slice(-500);
    await setKey(KEYS.HISTORY, trimmed);
  },
  listHistory() { return getKey(KEYS.HISTORY).then(v => v || []); },

  async migrate() {
    const all = await chrome.storage.local.get(null);
    let migrated = 0;
    const selectors = (await this.getSelectors());
    let selectorsChanged = false;

    // One-time rename: in v5, well-known platforms were keyed by short name (claude, gpt, gemini).
    // After v5.1 they are keyed by hostname. Migrate selectors and any pre-existing queue/recurring items.
    {
      const remap = { claude: "claude.ai", gpt: "chatgpt.com", gemini: "gemini.google.com" };
      let selChanged = false;
      for (const [from, to] of Object.entries(remap)) {
        if (selectors[from]) {
          selectors[to] = { ...(selectors[to] || {}), ...selectors[from] };
          delete selectors[from];
          selChanged = true;
        }
      }
      if (selChanged) selectorsChanged = true;

      const needsRename = (x) => x && x.platform && remap[x.platform];
      const renames = (arr) => arr.map(x => needsRename(x) ? { ...x, platform: remap[x.platform] } : x);

      const queue = (await getKey(KEYS.QUEUE)) || [];
      if (queue.some(needsRename)) await setKey(KEYS.QUEUE, renames(queue));
      const recurring = (await getKey(KEYS.RECURRING)) || [];
      if (recurring.some(needsRename)) await setKey(KEYS.RECURRING, renames(recurring));
    }

    for (const [plat, msgKey, timeKey, inputKey, buttonKey] of LEGACY_PAIRS) {
      if (all[msgKey] && all[timeKey]) {
        const item = {
          id: makeId("q"),
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
      if (all[inputKey])  { selectors[host] = { ...(selectors[host] || {}), input: all[inputKey] };       selectorsChanged = true; }
      if (all[buttonKey]) { selectors[host] = { ...(selectors[host] || {}), sendButton: all[buttonKey] };  selectorsChanged = true; }
      if (all[inputKey] || all[buttonKey]) {
        await chrome.storage.local.remove([inputKey, buttonKey].filter(Boolean));
      }
    }
    if (selectorsChanged) await this.setSelectors(selectors);
    log.info("queueStore", "migrate done", { migrated });
    return { migrated };
  }
};