export const PLATFORMS = Object.freeze({ CLAUDE: "claude", GPT: "gpt", GEMINI: "gemini" });
const ALL = new Set(Object.values(PLATFORMS));

export function detectPlatformFromUrl(url) {
  if (!url) return null;
  if (url.includes("claude.ai"))   return PLATFORMS.CLAUDE;
  if (url.includes("chatgpt.com") || url.includes("chat.openai.com")) return PLATFORMS.GPT;
  if (url.includes("gemini.google.com")) return PLATFORMS.GEMINI;
  return null;
}

export function isKnownPlatform(p) { return ALL.has(p); }