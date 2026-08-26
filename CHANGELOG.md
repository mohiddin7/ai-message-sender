# Changelog

## v4.0 — 2026-08 (legacy)

Flat-file Chrome extension (`manifest.json`, `background.js`, `content.js`, `popup.html`, `popup.js`). Single-queue, single-tab, no dry-run, no recurring schedules, no cross-device sync, no onboarding, no chain mode.

This branch preserves the v4 source for historical reference. **v4 is no longer maintained.**

## v5.0.0 — see the `v5` branch

Full refactor: modular lib + background + content + popup + welcome + options, esbuild pipeline, 24 smoke tests, ESLint v9, MV3 service worker, multi-queue and multi-tab, dry-run, recurring schedules, cross-device selector sync via `chrome.storage.sync`, 5-step onboarding, options page, privacy policy, and a 24-row pre-release test matrix.

To view v5: `git checkout v5` (or visit the `v5` branch on GitHub).
