# AI Message Sender

**Prompt or Message Scheduler for Claude, ChatGPT, and Gemini — or any messaging app you can point at.**

You write the prompt. You pick the moment. The extension delivers it, watches the response, and can chain the next one to fire when the current one finishes. No tab-focusing, no babysitting.

Supports Claude, ChatGPT, and Gemini out of the box. **Platform-agnostic**: point it at the input box and the send button once, and from then on you can schedule freely into anything — Discord, Slack, GitHub issue comments, support ticket forms, even a Google Doc's "Suggest edits" field.

---

## What it does

```
   ┌─────────────┐         ┌──────────────┐         ┌──────────────┐
   │  You type   │   ───►  │  Background  │  ───►   │  Content     │
   │  a prompt   │         │  schedules   │  alarm  │  script in   │
   │  + a time   │         │  an alarm    │  fires  │  the tab     │
   └─────────────┘         └──────────────┘         └──────────────┘
                                                          │
                                                          ▼
                                                  ┌──────────────┐
                                                  │  Types the   │
                                                  │  prompt,     │
                                                  │  clicks send,│
                                                  │  watches the │
                                                  │  response    │
                                                  └──────────────┘
```

- **Multi-queue, multi-tab.** Schedule several prompts at once across different conversations. Each item fires into the tab you scheduled it in.
- **Four schedule modes.**
  - **Delay** — `+5m`, `+30m`, `+1h`, `+2h` chips for "fire N minutes from now."
  - **At** — pick a clock time.
  - **Reset** — read the platform's "resets in 2h 15m" rate-limit banner; fire when the window resets.
  - **Chain** — fire as soon as the current response finishes, with no human in the loop.
- **Dry-run.** Run the full send pipeline (focus → find input → type → find send button → click) without actually clicking send. Useful for catching broken selectors before the real fire.
- **Recurring schedules.** Daily or weekly, with idempotent expansion that survives service-worker restarts. Capped at 8 occurrences per 24 hours to prevent runaway expansion.
- **Cross-device selector sync.** Teach the extension on one machine, pick it up on another. Last-writer-wins per top-level key, mirrored via `chrome.storage.sync`.
- **Tab-loss safe.** Closing or navigating the target tab before fire-time marks the item `tab-lost` and shows a re-target notification, not a silent failure.

### Example flows

- *"Tell me a joke about databases every weekday at 9am"* — daily recurring rule, plus a chain rule to ask a follow-up joke 30s after each response finishes.
- *"Send 'good morning' to my partner in Discord at 8:30am"* — daily recurring, pointed at the Discord tab.
- *"Translate this Slack message to French in 5 minutes"* — delay mode.
- *"When Claude is done with this code review, ask it to refactor the function"* — chain mode.

---

## Install

### From the Chrome Web Store

The extension is published as **"Prompt or Message Scheduler for Claude, ChatGPT, and Gemini"**. Search for that title in the Chrome Web Store, or use the listing link on the developer's GitHub profile.

### From source (developer build)

Requires **Node.js 20+**.

```bash
git clone https://github.com/mohiddin7/ai-message-scheduler.git
cd ai-message-scheduler
npm install
npm run build           # bundles src/ into dist/ via esbuild
```

Then in Chrome:

1. Open `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `dist/` directory.
4. The AI Auto-Sender icon appears in your extensions bar. Pin it for easy access.
5. Open a Claude, ChatGPT, or Gemini tab and click the icon to start.

To produce a Chrome Web Store–ready zip:

```bash
npm run zip             # → dist/ai-auto-sender-v5.0.0.zip
```

To run the full pre-release pipeline (lint + test + build + zip) in one go:

```bash
npm run publish
```

---

## Develop

```bash
npm run lint            # ESLint v9 (no eval, no new Function, no fetch, no XHR)
npm test                # 24 smoke tests via node --test
npm run build           # esbuild bundles 5 entry points into dist/
npm run zip             # produces the Chrome Web Store zip
npm run publish         # lint + test + build + zip in sequence
```

### Layout

```
src/
  background/           service worker: alarm scheduler, queue store, sync, recurring
  content/              injected into tabs: adapters, send pipeline, response watcher
  popup/                extension-action popup: queue, time controls, recurring form
  options/              options page: rules, sync banner, history, dry-run-all
  welcome/              5-step onboarding on first install
  lib/                  platform detection, message types, id, log
build/                  esbuild config, icon rasterizer, zip, publish, smoke test
icons/                  16/32/48/128 PNGs rasterized from source.svg
docs/                   design spec, implementation plan, store listing, test matrix
```

### How the pieces fit

1. **You click the extension icon** on a Claude/ChatGPT/Gemini tab. The popup reads the active tab's URL and platform, and shows a text input + a row of time-mode chips.
2. **You type a prompt, pick a time mode, hit Enter.** The popup calls into the background via `chrome.runtime.sendMessage`.
3. **The background service worker** stores the queue item in `chrome.storage.local`, schedules a `chrome.alarms` entry for the fire time, and (for chain mode) waits for the content script to send a `CHAIN_READY` message when the response completes.
4. **When the alarm fires**, the background forwards an `INJECT_AND_SEND` message to the content script in the target tab.
5. **The content script** focuses the input, types the prompt, finds and clicks the send button, then watches the response stream for a stop signal. For chain mode, when the response finishes, the content script posts `CHAIN_READY` to the background, which schedules the next item.
6. **Per-platform adapters** in `src/content/adapters/` provide default selectors and stop signals. For unsupported platforms, the user teaches the extension by clicking elements on the page (the picker stores their `data-testid`/`aria-label`-derived CSS selectors locally).

### Security and privacy

- **No background network.** The extension makes no `fetch`, no `XMLHttpRequest`, no remote `<script>` calls. Verified by ESLint rules + manual sweep.
- **No analytics, no telemetry, no crash reports.** Verified.
- **All data stays in your browser.** Queue items, taught selectors, and settings live in `chrome.storage.local`. Selectors and settings may optionally be mirrored to `chrome.storage.sync` (end-to-end your Google account; never seen by the developer).
- **Permissions explained:** `alarms` (fire at a specific moment), `storage` (queue + selectors + settings), `tabs` (find the target tab), `windows` (focus the window), `scripting` (re-inject after updates), `notifications` (confirm sends, surface dry-run results, flag tab-loss).

See [privacy-policy.html](privacy-policy.html) for the full statement.

---

## License

[MIT](LICENSE) — see the file for the full text.

## Support

If the extension helps you, you can support its development via [Donate](https://donate.stripe.com/28EbITdPK6pa0kv3gU3Ru00) in the popup or on the welcome page. If it breaks or you want a new platform supported, open an issue on this repository.
