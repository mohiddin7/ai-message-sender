// Platform identity uses the hostname as the canonical key. The v5.1 migration
// (see queueStore.migrate) renamed stored selectors and queued items from the
// legacy short names ("claude", "gpt", "gemini") to hostnames, so that
// arbitrary hosts (the "generic" fallback) could live in the same selectors
// map without a naming collision. detectPlatformFromUrl, isWellKnownPlatform,
// and the selectors/queue state all share that hostname key today.
//
// The short names (PLATFORMS.*) are still used by the content adapter table
// (adapters/index.js) — adapters were never migrated and still match by the
// short name. The "gpt" adapter handles both chatgpt.com and chat.openai.com,
// so the short key still works for the adapter dispatch.

export const PLATFORMS = Object.freeze({ CLAUDE: "claude", GPT: "gpt", GEMINI: "gemini" });
const WELL_KNOWN = new Set(["claude.ai", "chatgpt.com", "gemini.google.com"]);

const UNSUPPORTED_PREFIXES = [
  "chrome://", "about:", "chrome-extension://", "file://", "edge://", "devtools://"
];

const HOST_TO_SHORT = {
  "claude.ai":         "claude",
  "chatgpt.com":       "gpt",
  "gemini.google.com": "gemini"
};
const SHORT_TO_HOST = {
  "claude": "claude.ai",
  "gpt":    "chatgpt.com",
  "gemini": "gemini.google.com"
};

export function detectPlatformFromUrl(url) {
  if (!url) return null;
  if (UNSUPPORTED_PREFIXES.some(p => url.startsWith(p))) return null;
  if (url.includes("claude.ai"))   return "claude.ai";
  if (url.includes("chatgpt.com") || url.includes("chat.openai.com")) return "chatgpt.com";
  if (url.includes("gemini.google.com")) return "gemini.google.com";
  try {
    const h = new URL(url).hostname;
    return h || null;
  } catch {
    return null;
  }
}

export function isWellKnownPlatform(p) { return WELL_KNOWN.has(p); }
export function isKnownPlatform(p) {
  return typeof p === "string" && /^[a-z0-9.\-]+$/i.test(p);
}

// Short display name for the badge label, e.g. "claude.ai" -> "claude",
// "chatgpt.com" -> "ChatGPT", "gemini.google.com" -> "gemini". Falls back to
// the input so unknown hosts render as themselves.
const HOST_TO_DISPLAY = {
  "claude.ai":         "claude",
  "chatgpt.com":       "ChatGPT",
  "gemini.google.com": "gemini"
};
const SHORT_TO_DISPLAY = {
  "claude": "claude",
  "gpt":    "ChatGPT",
  "gemini": "gemini"
};
export function displayName(platform) {
  if (!platform) return platform;
  if (HOST_TO_DISPLAY[platform]) return HOST_TO_DISPLAY[platform];
  if (SHORT_TO_DISPLAY[platform]) return SHORT_TO_DISPLAY[platform];
  return platform;
}

export function hostnameForPlatform(platform) {
  if (SHORT_TO_HOST[platform]) return SHORT_TO_HOST[platform];
  if (isWellKnownPlatform(platform)) return platform;
  return platform;
}
