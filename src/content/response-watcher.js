import { getAdapter } from "./adapters/index.js";
import { log } from "../lib/log.js";

export function watch(platform, onComplete) {
  const adapter = getAdapter(platform);
  const root = document.body;
  const mo = new MutationObserver(() => {
    try { if (adapter.isResponseComplete(root)) onComplete(); }
    catch (e) { log.warn("response-watcher", e); }
  });
  mo.observe(root, { childList: true, subtree: true, attributes: true });
  return () => mo.disconnect();
}