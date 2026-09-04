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

// src/welcome/sprite.js
var SPRITE_HTML = ui_icons_default;

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

// src/welcome/welcome.js
document.addEventListener("DOMContentLoaded", () => {
  const host = document.getElementById("sprite-host");
  if (host) host.innerHTML = SPRITE_HTML;
  document.getElementById("nav-tour-header")?.addEventListener("click", launchTour);
});
