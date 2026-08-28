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

// help.js
document.getElementById("nav-tour-header")?.addEventListener("click", launchTour);
