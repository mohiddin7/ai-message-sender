if (typeof window.hasAutoSenderInitialized === 'undefined') {
  window.hasAutoSenderInitialized = true;

  let pickingType = null;
  let currentPlatform = null;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_PICKING") {
      pickingType = request.type;
      currentPlatform = request.platform;
      
      const oldStyle = document.getElementById('auto-sender-picker-style');
      if (oldStyle) oldStyle.remove();

      let styleEl = document.createElement('style');
      styleEl.id = 'auto-sender-picker-style';
      styleEl.innerHTML = '* { cursor: crosshair !important; pointer-events: auto !important; }';
      document.head.appendChild(styleEl);

      document.addEventListener('mouseover', highlightElement, { capture: true });
      document.addEventListener('mouseout', removeHighlight, { capture: true });
      document.addEventListener('click', selectElement, { capture: true });
    } else if (request.action === "INJECT_AND_SEND") {
      executeAutomation(request.text, request.platform);
    }
  });

  function highlightElement(e) {
    let target = e.target;
    if (pickingType === 'input') {
      target = e.target.closest('div[contenteditable="true"]') || e.target.closest('textarea') || e.target;
    } else if (pickingType === 'button') {
      target = e.target.closest('button') || e.target;
    }
    target.style.setProperty('outline', '3px dashed #2563eb', 'important');
    target.style.setProperty('outline-offset', '-3px', 'important');
    e.target._senderTarget = target;
  }

  function removeHighlight(e) {
    if (e.target._senderTarget) e.target._senderTarget.style.outline = '';
  }

  function selectElement(e) {
    e.preventDefault();
    e.stopPropagation();
    
    document.removeEventListener('mouseover', highlightElement, { capture: true });
    document.removeEventListener('mouseout', removeHighlight, { capture: true });
    document.removeEventListener('click', selectElement, { capture: true });

    let realTarget = e.target;
    if (pickingType === 'input') {
      realTarget = e.target.closest('div[contenteditable="true"]') || e.target.closest('textarea') || e.target;
    } else if (pickingType === 'button') {
      realTarget = e.target.closest('button') || e.target;
    }
    realTarget.style.outline = '';

    const styleEl = document.getElementById('auto-sender-picker-style');
    if (styleEl) styleEl.remove();

    const selector = generateCleanSelector(realTarget);
    const storageKey = `${currentPlatform}_custom${pickingType.charAt(0).toUpperCase() + pickingType.slice(1)}Path`;

    chrome.storage.local.set({ [storageKey]: selector }, () => {
      alert(`Mapped ${currentPlatform.toUpperCase()}! Target locked to selector: ${selector}`);
    });
  }

  function generateCleanSelector(el) {
    if (el.id) return `#${el.id}`;
    const aria = el.getAttribute('aria-label');
    if (aria) return `${el.tagName.toLowerCase()}[aria-label="${aria}"]`;
    
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return `${el.tagName.toLowerCase()}[placeholder="${placeholder}"]`;

    if (el.getAttribute('contenteditable') === 'true') return 'div[contenteditable="true"]';
    
    let path = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      const cleanClasses = el.className.trim().split(/\s+/)
        .filter(c => c && !/[\[\]\(\),:]/.test(c))
        .join('.');
      if (cleanClasses) path += `.${cleanClasses}`;
    }
    return path;
  }

  function executeAutomation(text, platform) {
    const inputKey = `${platform}_customInputPath`;
    const buttonKey = `${platform}_customButtonPath`;

    chrome.storage.local.get([inputKey, buttonKey], (config) => {
      let inputEl = config[inputKey] ? document.querySelector(config[inputKey]) : null;
      if (!inputEl) {
        inputEl = document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
      }

      if (!inputEl) return;
      inputEl.focus();
      
      if (inputEl.tagName === 'DIV' || inputEl.getAttribute('contenteditable') === 'true') {
        inputEl.innerHTML = '';
        // Core Web Inserter
        document.execCommand('insertText', false, text);
        
        // GEMINI HOTFIX: Force native text frame components to register state variations
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        nativeSetter.call(inputEl, text);
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Allow Gemini's rendering engine a moment to activate the send button style transitions
      setTimeout(() => {
        let sendButton = config[buttonKey] ? document.querySelector(config[buttonKey]) : null;
        if (!sendButton) {
          sendButton = document.querySelector('button[aria-label*="Send"]') || document.querySelector('button[type="submit"]');
        }

        if (sendButton) {
          sendButton.removeAttribute('disabled'); // Tear down native lock metrics explicitly
          sendButton.focus();
          sendButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          sendButton.click();
          sendButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        } else {
          const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true, cancelable: true, key: 'Enter', keyCode: 13
          });
          inputEl.dispatchEvent(enterEvent);
        }
      }, 600);
    });
  }
}