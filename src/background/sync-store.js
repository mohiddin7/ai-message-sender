import { queueStore } from "./queue-store.js";
import { log } from "../lib/log.js";

const SYNC_KEYS = { SELECTORS: "selectors", SETTINGS: "settings" };
const BANNER_FLAG = "sync_hydrated_banner_seen";

export const syncStore = {
  async setSelectors(s) {
    await queueStore.setSelectors(s);
    try { await chrome.storage.sync.set({ [SYNC_KEYS.SELECTORS]: s }); }
    catch (e) { log.warn("syncStore", "sync.set selectors failed", e); }
  },
  async setSettings(s) {
    await queueStore.setSettings(s);
    try { await chrome.storage.sync.set({ [SYNC_KEYS.SETTINGS]: s }); }
    catch (e) { log.warn("syncStore", "sync.set settings failed", e); }
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