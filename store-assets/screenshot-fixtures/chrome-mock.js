// Screenshot-only fixture: a lenient chrome.* mock so the real popup/
// options/welcome pages render with realistic seeded data outside the
// extension context. Never shipped — lives only in store-assets/.
(function () {
  const store = {
    local: {
      settings: { onboarded: true, tutorialSeen: true },
      selectors: { "chatgpt.com": { input: "#prompt-textarea", sendButton: "[data-testid='send-button']" } },
      queue: window.__SEED_QUEUE || [],
      recurring: window.__SEED_RECURRING || [],
      history: window.__SEED_HISTORY || []
    },
    sync: {}
  };

  function area(name) { return store[name] || (store[name] = {}); }

  function makeStorageArea(name) {
    return {
      get(keys) {
        const a = area(name);
        let result;
        if (keys == null) result = { ...a };
        else if (typeof keys === "string") result = { [keys]: a[keys] };
        else if (Array.isArray(keys)) result = Object.fromEntries(keys.map(k => [k, a[k]]));
        else result = { ...keys, ...Object.fromEntries(Object.keys(keys).filter(k => k in a).map(k => [k, a[k]])) };
        return Promise.resolve(result);
      },
      set(obj) {
        Object.assign(area(name), obj);
        return Promise.resolve();
      },
      remove(key) { delete area(name)[key]; return Promise.resolve(); }
    };
  }

  function noop() { return (...args) => {
    const cb = args[args.length - 1];
    if (typeof cb === "function") { cb(undefined); return; }
    return Promise.resolve(undefined);
  }; }

  window.chrome = {
    storage: {
      local: makeStorageArea("local"),
      sync: makeStorageArea("sync"),
      onChanged: { addListener() {} }
    },
    tabs: {
      query: () => Promise.resolve([{ id: 1, windowId: 1, url: "https://chatgpt.com/c/demo", active: true }]),
      sendMessage: (...args) => {
        const cb = args[args.length - 1];
        if (typeof cb === "function") { cb(undefined); return; }
        return Promise.resolve(undefined);
      },
      create: noop(),
      get: (id) => Promise.resolve({ id, status: "complete" })
    },
    runtime: {
      getURL: (p) => p,
      openOptionsPage: noop(),
      sendMessage: noop(),
      onMessage: { addListener() {} },
      lastError: null
    },
    action: { openPopup: noop() },
    windows: { update: noop() },
    scripting: { executeScript: noop() },
    alarms: { create: noop(), clear: noop(), getAll: (cb) => cb([]), onAlarm: { addListener() {} } }
  };
})();
