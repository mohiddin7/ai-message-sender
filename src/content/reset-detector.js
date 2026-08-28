import { getAdapter } from "./adapters/index.js";

export function scan(platform) {
  return getAdapter(platform).detectReset(document);
}