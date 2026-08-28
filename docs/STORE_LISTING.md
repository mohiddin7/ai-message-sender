# Chrome Web Store Listing — AI Auto-Sender

## Name
Prompt or Message Scheduler for Claude, ChatGPT, and Gemini or any messaging app.

## Short description (132 char max)
Schedule prompts to Claude, ChatGPT, and Gemini. Multi-queue, multi-tab, dry-run, recurring.

## Long description
AI Auto-Sender lets you queue text prompts and have them delivered to your favorite AI chat at a chosen moment — without keeping the tab focused or babysitting the response.

- **Multi-queue, multi-tab.** Schedule several prompts at once across different conversations. Each item fires into the tab you scheduled it in.
- **Four schedule modes.** Delay, at a specific time, at your token-reset, or chained to the current response.
- **Dry-run.** Try the send pipeline without actually clicking send. Catches broken selectors before the real fire.
- **Recurring schedules.** Daily or weekly, with idempotent expansion that survives service-worker restarts.
- **Cross-device selector sync.** Teach a selector on one device, pick it up on another.

Permissions we ask for and why:
- `alarms` — schedule queue items to fire at a specific moment
- `storage` — persist queue, selectors, and settings
- `tabs` — find and focus the tab an item was scheduled in
- `windows` — focus the window containing the target tab
- `scripting` — re-inject the content script after extension updates
- `notifications` — confirm sends, surface dry-run results, flag tab-loss

Privacy: no network calls, no analytics, no conversation-history reading. See `privacy-policy.html`.

## Category
Productivity

## Language
English (en-US)

## Screenshots plan
- 440x280 small promo tile
- 1280x800: "Queue view" (popup with several items)
- 1280x800: "Time modes" (segmented control with all four modes visible)
- 1280x800: "Recurring rule" (options page)
- 1280x800: "Dry-run notification"