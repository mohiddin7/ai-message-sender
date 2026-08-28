let currentPlatform = null;

// Render active automation dashboard items
function updateQueueUI() {
  const container = document.getElementById('queueList');
  container.innerHTML = '';
  
  const platforms = ['claude', 'gpt', 'gemini'];
  let empty = true;

  chrome.storage.local.get(null, (allData) => {
    platforms.forEach(p => {
      const msgKey = `${p}_pendingMessage`;
      const timeKey = `${p}_scheduledTime`;

      if (allData[msgKey] && allData[timeKey]) {
        empty = false;
        const item = document.createElement('div');
        item.className = 'queue-item';

        let badgeClass = p === 'claude' ? 'claude-bg' : (p === 'gpt' ? 'gpt-bg' : 'gemini-bg');
        let displayTime = new Date(allData[timeKey]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        item.innerHTML = `
          <div class="queue-details">
            <div class="queue-text">${allData[msgKey]}</div>
            <div class="queue-meta">
              <span class="p-tag ${badgeClass}">${p.toUpperCase()}</span>
              <span>⏰ ${displayTime}</span>
            </div>
          </div>
          <button class="delete-btn" data-platform="${p}">Cancel</button>
        `;
        container.appendChild(item);
      }
    });

    if (empty) {
      container.innerHTML = '<div class="empty-queue">No messages currently waiting in queue.</div>';
    } else {
      // Attach click events to dynamic cancellation triggers
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const targetPlat = e.target.getAttribute('data-platform');
          chrome.alarms.clear(`alarm_${targetPlat}`, () => {
            chrome.storage.local.remove([`${targetPlat}_pendingMessage`, `${targetPlat}_scheduledTime`], () => {
              updateQueueUI();
            });
          });
        });
      });
    }
  });
}

// Check tab state layout configuration
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0] || !tabs[0].url) return;
  const url = tabs[0].url;
  const badge = document.getElementById('platformBadge');
  const controls = document.getElementById('mainControls');
  const errorZone = document.getElementById('errorZone');

  if (url.includes("claude.ai")) {
    currentPlatform = "claude";
    badge.innerText = "Targeting: Claude.ai";
    badge.className = "platform-badge claude-bg";
    controls.style.display = "block";
  } else if (url.includes("chatgpt.com") || url.includes("chat.openai.com")) {
    currentPlatform = "gpt";
    badge.innerText = "Targeting: ChatGPT";
    badge.className = "platform-badge gpt-bg";
    controls.style.display = "block";
  } else if (url.includes("gemini.google.com")) {
    currentPlatform = "gemini";
    badge.innerText = "Targeting: Gemini";
    badge.className = "platform-badge gemini-bg";
    controls.style.display = "block";
  } else {
    badge.innerText = "Unsupported Page";
    errorZone.innerText = "Open an active Claude, ChatGPT, or Gemini session window.";
  }
  updateQueueUI();
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const message = document.getElementById('msg').value;
  const timeVal = document.getElementById('execTime').value;

  if (!message || !timeVal || !currentPlatform) {
    alert('Please fill out the prompt fields fully!');
    return;
  }

  const targetTimestamp = new Date(timeVal).getTime();
  if (targetTimestamp <= Date.now()) {
    alert('Please pick a future time target!');
    return;
  }

  const msgKey = `${currentPlatform}_pendingMessage`;
  const timeKey = `${currentPlatform}_scheduledTime`;

  chrome.storage.local.set({ 
    [msgKey]: message,
    [timeKey]: targetTimestamp
  }, () => {
    chrome.alarms.create(`alarm_${currentPlatform}`, { when: targetTimestamp });
    document.getElementById('msg').value = ''; // clear out textarea field context
    updateQueueUI();
  });
});

function triggerPicker(type) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['content.js']
    }, () => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "START_PICKING", type: type, platform: currentPlatform });
      window.close();
    });
  });
}

document.getElementById('pickInput').addEventListener('click', () => triggerPicker('input'));
document.getElementById('pickButton').addEventListener('click', () => triggerPicker('button'));