# Pre-release Test Matrix (v5.0.0)

Run on Chrome stable. Each row is a single pass/fail check.

## Install & first run
- [ ] 1. Fresh install opens the welcome page in a new tab.
- [ ] 2. Welcome step 1 enables "Next" only after a taught input selector lands in storage.
- [ ] 3. Welcome step 4 enables "Next" only after a dry-run-ok entry appears in history.
- [ ] 4. Clicking "Done" sets `settings.onboarded=true` and the welcome page does not re-open on next install.

## Queue & multi-tab
- [ ] 5. Two Claude tabs can have two simultaneous pending items; each fires into its own tab.
- [ ] 6. Closing the target tab before fire-time marks the item `tab-lost`; the re-target notification appears.
- [ ] 7. Navigating the target tab to a different URL before fire-time marks the item `tab-lost`.

## Schedule modes
- [ ] 8. Delay chip "+5m" produces a queue item with `mode=delay` and `scheduledAt ≈ now+5m`.
- [ ] 9. Reset mode with a banner reading "resets in 2h 15m" produces a queue item with `scheduledAt ≈ now+2h15m`.
- [ ] 10. Reset mode with no banner keeps the chip greyed.
- [ ] 11. Chain mode produces a queue item with `scheduledAt=null`; after the current response ends, the alarm is set and fires within 1s.

## Dry-run
- [ ] 12. Healthy item → `dry-run-ok` and a notification with all steps marked ✓.
- [ ] 13. Item with a broken taught selector → `dry-run-fail` and the notification names the failing step.
- [ ] 14. "Run dry-run on all pending" produces one notification summarizing `{total, ok, fail}`.

## Recurring
- [ ] 15. A daily rule set to fire 1 minute from now creates one queue item, fires successfully, advances `nextOccurrence` by 24h.
- [ ] 16. A Mon–Fri 09:00 weekly rule expands to the next 8 weekday occurrences only.
- [ ] 17. Three consecutive failures for the same `recurringSourceId` produce one "failing repeatedly" notification.

## Sync
- [ ] 18. Editing a taught selector on device A surfaces on device B within 60s of next popup open.
- [ ] 19. "Wipe synced selectors" clears both `chrome.storage.sync` and the local cache.

## Build hygiene
- [ ] 20. `npm run lint && npm test && npm run build` succeed clean.
- [ ] 21. `npm run zip` produces a zip under 200 KB.
- [ ] 22. `manifest.json` declares no `web_accessible_resources`.
- [ ] 23. No `fetch`, `XMLHttpRequest`, `eval`, `new Function`, or remote `src` in `src/`.
- [ ] 24. `privacy-policy.html` is reachable from the popup footer and the options page.