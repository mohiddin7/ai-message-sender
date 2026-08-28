# Chrome Web Store — "Privacy practices" tab

Fill this in on the dashboard's Privacy practices tab. Everything here is
accurate to what the code actually does as of v5.1.0 — check it still
matches if permissions change later.

## Single purpose description
Schedule and automatically send a prompt into any webpage's text input and
send button at a chosen time — on ChatGPT, Claude, Gemini, or any other
site the user points it at.

## Permission justifications
Paste one of these into the box that appears for each permission.

**alarms**
Used to fire scheduled and recurring sends at the exact time the user
picked, even while the popup is closed — Chrome's alarms API is the only
way to wake the extension's background script at a specific future time.

**storage**
Stores the user's queued messages, taught element selectors, recurring
rules, and settings locally so schedules survive browser restarts.
Nothing is stored on a server we operate.

**tabs**
Used to read the active tab's URL (to detect which AI platform is open)
and to bring the correct tab to the foreground when a scheduled send
fires. `activeTab` alone isn't enough here because a scheduled send can
fire minutes or hours later, by which time the tab is no longer the
active one.

**windows**
Used to focus the correct browser window when a scheduled send fires, so
the tab it's sending to is actually visible and interactive when the
message goes out.

**scripting**
Used to inject the content script that reads the page's input field and
send button and writes the scheduled prompt into them when a send fires,
or when the user is teaching the picker a new selector.

**host_permissions: <all_urls>**
The extension's core feature is scheduling sends on any webpage with a
text input and a send button — not just Claude, ChatGPT, and Gemini.
Broad host access is required so a user can point the picker at any site
they choose and schedule sends there too.

## Remote code
No. All JavaScript ships inside the packaged extension; nothing is
fetched or eval'd from a remote source at runtime.

## Data usage disclosure
What's actually stored (all locally, via `chrome.storage.local`, optionally
mirrored to the user's own Google account via `chrome.storage.sync` — never
to a server we operate):
- The prompt text the user schedules (closest CWS category: **User activity** — content the user creates for the extension to act on).
- CSS selectors identifying page elements the user teaches the picker (closest CWS category: **Website content** — a reference to page structure, not the page's actual content).

Nothing else is collected. No analytics, no crash reporting, no PII, no
health/financial/authentication info, no location, no browsing history.

Certification checkboxes — all three are true and should be checked:
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [x] I do not use or transfer user data for purposes unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

## Privacy policy URL
Paste the public URL here (the Claude Artifact link for now, or the
GitHub Pages URL once the public mirror is live — either is a real
https:// URL, which is the only requirement).
