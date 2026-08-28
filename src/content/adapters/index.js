import * as claude from "./claude.js";
import * as chatgpt from "./chatgpt.js";
import * as gemini from "./gemini.js";
import * as generic from "./generic.js";

export const adapters = {
  "claude.ai":         claude,
  "chatgpt.com":       chatgpt,
  "gemini.google.com": gemini
};

export function getAdapter(platform) {
  return adapters[platform] || generic;
}
