// Shared "launch tour" handler for the header Tour button on every page.
// Opens a fresh ChatGPT tab, waits for it to actually finish loading, then
// opens the real extension popup (chrome.action.openPopup(), Chrome 127+)
// with the auto-driven walkthrough armed via a storage flag.
//
// Root cause this works around: chrome.tabs.create()'s returned Tab has an
// empty/stale .url until the navigation commits (the target URL sits in
// .pendingUrl until then). Calling openPopup() right after create() used to
// race that — the popup's own tab query would read the still-empty url,
// detectPlatformFromUrl() would return null, and the badge showed
// "Unsupported" with no tour. Waiting for tabs.onUpdated's "complete"
// status closes that race; the 8s timeout is a fallback so a slow/broken
// network doesn't wedge the tour open forever.
function waitForTabComplete(tabId, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const listener = (id, info) => {
      if (id === tabId && info.status === "complete") finish();
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((tab) => {
      if (tab?.status === "complete") finish();
    }).catch(finish);
    setTimeout(finish, timeoutMs);
  });
}

export async function launchTour() {
  const { settings = {} } = await chrome.storage.local.get("settings");
  await chrome.storage.local.set({ settings: { ...settings, pendingTourLaunch: true } });
  const tab = await chrome.tabs.create({ url: "https://chatgpt.com/", active: true });
  await waitForTabComplete(tab.id);
  if (tab.windowId != null) await chrome.windows.update(tab.windowId, { focused: true });
  try {
    await chrome.action.openPopup();
  } catch (_) {
    // Chrome <127 (below this extension's minimum, but degrade rather than
    // silently do nothing if it somehow gets here): fall back to the old
    // tab-based approximation.
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
  }
}
