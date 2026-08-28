export const notifications = {
  notify({ id, title, message, buttons }) {
    if (!chrome?.notifications?.create) return;
    chrome.notifications.create(id, { type: "basic", iconUrl: chrome.runtime.getURL("icons/128.png"), title, message, buttons });
  }
};