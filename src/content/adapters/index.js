import * as claude from "./claude.js";
import * as chatgpt from "./chatgpt.js";
import * as gemini from "./gemini.js";
import { PLATFORMS } from "../../lib/platform.js";

export const adapters = {
  [PLATFORMS.CLAUDE]: claude,
  [PLATFORMS.GPT]: chatgpt,
  [PLATFORMS.GEMINI]: gemini
};

export function getAdapter(platform) {
  const a = adapters[platform];
  if (!a) throw new Error(`no adapter for platform: ${platform}`);
  return a;
}