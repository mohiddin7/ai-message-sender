export const PLATFORMS = Object.freeze({ CLAUDE: "claude", GPT: "gpt", GEMINI: "gemini" });
const WELL_KNOWN = new Set(Object.values(PLATFORMS));

const UNSUPPORTED_PREFIXES = [
  "chrome://", "about:", "chrome-extension://", "file://", "edge://", "devtools://"
];

const PLATFORM_TO_HOST = {
  [PLATFORMS.CLAUDE]: "claude.ai",
  [PLATFORMS.GPT]:    "chatgpt.com",
  [PLATFORMS.GEMINI]: "gemini.google.com"
};

export function detectPlatformFromUrl(url) {
  if (!url) return null;
  if (UNSUPPORTED_PREFIXES.some(p => url.startsWith(p))) return null;
  if (url.includes("claude.ai"))   return PLATFORMS.CLAUDE;
  if (url.includes("chatgpt.com") || url.includes("chat.openai.com")) return PLATFORMS.GPT;
  if (url.includes("gemini.google.com")) return PLATFORMS.GEMINI;
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

export function hostnameForPlatform(platform) {
  if (PLATFORM_TO_HOST[platform]) return PLATFORM_TO_HOST[platform];
  if (isWellKnownPlatform(platform)) return null;
  return platform;
}
