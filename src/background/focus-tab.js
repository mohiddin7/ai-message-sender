// focus-tab.js — focuses a tab using chrome.tabs (background-only API).
// Kept separate from the content script because content scripts do not have
// access to chrome.tabs.get / chrome.windows.update / chrome.tabs.update.

export async function focusTargetTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tabId, { active: true });
    return { ok: true, step: "focusTab", tabId };
  } catch (e) {
    return { ok: false, step: "focusTab", reason: String(e?.message || e) };
  }
}
