# Publishing to the Chrome Web Store via CI/CD

`.github/workflows/publish.yml` uploads a new draft version to the Chrome
Web Store automatically whenever you push a version tag (`v5.2.0`, etc.).
It stops at "uploaded" — you still click **Submit for review** yourself
in the dashboard. This doc is the one-time setup to make that work; do it
once, then every future release is just `git tag vX.Y.Z && git push --tags`.

## 1. Repo variable: the extension's item ID

Not secret — it's the same ID shown on your item's dashboard page and in
its store URL.

Public repo → **Settings → Secrets and variables → Actions → Variables** tab → New repository variable:

- Name: `CHROME_EXTENSION_ID`
- Value: `apffdldbkedhimbbmgiafmakjdbflhec`

## 2. A Google Cloud OAuth client (one-time, ~5 minutes)

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and create a new project (any name — e.g. "ai-message-sender-publish").
2. In that project, go to **APIs & Services → Library**, search "Chrome Web Store API", and click **Enable**.
3. Go to **APIs & Services → OAuth consent screen**. Choose **External**, fill in an app name (e.g. "AI Message Sender publish") and your email for the two required contact fields, save through the wizard (you don't need to publish the consent screen or add scopes — it can stay in "Testing" mode since only your own account will ever use it).
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**. Application type: **Desktop app**. Name it anything. Click Create — you'll get a **Client ID** and **Client Secret**. Keep this page open, you need both in step 4 below.

## 3. Get a refresh token (one-time, run locally)

This has to happen under your own Google account — a browser consent
click, so it can't be automated. Run this on your own machine (needs
Node, or use `npx` which downloads it on the fly):

```bash
npx chrome-webstore-upload-cli whoami --help  # confirms the CLI installs
npx chrome-webstore-upload-cli auth \
  --client-id "<the Client ID from step 2>" \
  --client-secret "<the Client Secret from step 2>"
```

That opens a browser window — sign in with the Google account that owns
the Chrome Web Store item, approve access, and the CLI prints a
**refresh token** in the terminal. Copy it.

(If that exact subcommand differs by CLI version, the fallback is
Google's own OAuth Playground: [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground/) — gear icon → check "Use your own OAuth credentials" → paste your Client ID/Secret → in the scope box on the left enter `https://www.googleapis.com/auth/chromewebstore` → Authorize → Exchange authorization code for tokens → copy the **Refresh token** field.)

## 4. Three repo secrets

Public repo → **Settings → Secrets and variables → Actions → Secrets** tab → New repository secret, three times:

| Secret name | Value |
|---|---|
| `CHROME_CLIENT_ID` | the Client ID from step 2 |
| `CHROME_CLIENT_SECRET` | the Client Secret from step 2 |
| `CHROME_REFRESH_TOKEN` | the refresh token from step 3 |

## 5. Release

```bash
git tag v5.2.0
git push --tags
```

Watch the run under the repo's **Actions** tab. When it's green, open the
Chrome Web Store dashboard — the item now has a new draft package
attached. Review it and click **Submit for review** when you're ready;
CI never does that step for you.
