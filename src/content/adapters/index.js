import * as claude from "./claude.js";
import * as chatgpt from "./chatgpt.js";
import * as gemini from "./gemini.js";
import * as generic from "./generic.js";
import { PLATFORMS } from "../../lib/platform.js";

export const adapters = {
  [PLATFORMS.CLAUDE]: claude,
  [PLATFORMS.GPT]: chatgpt,
  [PLATFORMS.GEMINI]: gemini
};

export function getAdapter(platform) {
  return adapters[platform] || generic;
}
