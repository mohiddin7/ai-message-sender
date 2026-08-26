chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith("alarm_")) {
    const platform = alarm.name.split("_")[1];
    const msgKey = `${platform}_pendingMessage`;
    const timeKey = `${platform}_scheduledTime`;

    chrome.storage.local.get([msgKey], (result) => {
      const targetText = result[msgKey];
      if (!targetText) return;

      let urlFilter = ["https://*.claude.ai/*"];
      if (platform === "gpt") urlFilter = ["https://chatgpt.com/*", "https://chat.openai.com/*"];
      if (platform === "gemini") urlFilter = ["https://gemini.google.com/*"];

      chrome.tabs.query({ url: urlFilter }, (tabs) => {
        if (tabs.length === 0) return;
        const targetTab = tabs[0];

        chrome.windows.update(targetTab.windowId, { focused: true }, () => {
          chrome.tabs.update(targetTab.id, { active: true }, () => {
            setTimeout(() => {
              chrome.tabs.sendMessage(targetTab.id, { 
                action: "INJECT_AND_SEND", 
                text: targetText,
                platform: platform
              });
              chrome.storage.local.remove([msgKey, timeKey]);
            }, 1200);
          });
        });
      });
    });
  }
});