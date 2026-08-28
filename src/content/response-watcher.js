import { getAdapter } from "./adapters/index.js";
import { log } from "../lib/log.js";

// Arm a chain-mode watcher. The contract is:
//   - first wait until the page shows a "response in progress" signal
//     (adapter.isResponseStreaming(root) === true)
//   - then wait until that signal disappears AND a brief settle period
//     passes (so the input box is ready to receive a new prompt)
//   - then call onComplete()
//
// All three well-known AI chat sites show a Stop button (or a spinner)
// while the assistant is responding, and remove it when the response
// is finished. The generic adapter has the same heuristic via a Stop
// aria-label fallback.
//
// If the page is already idle when the watcher arms, the watcher waits
// up to 60s for streaming to start. If nothing happens, it gives up
// silently — the queue item stays "pending" and the user can cancel
// or re-arm it.
export function watch(platform, onComplete) {
  const adapter = getAdapter(platform);
  const root = document.body;

  let phase = "wait-stream-start";   // wait-stream-start → wait-stream-end → settle
  let streamStartSeenAt = 0;
  let streamEndSeenAt = 0;
  let settled = false;
  let started = Date.now();

  const giveUpAfterMs = 60_000;
  const settleMs = 500;

  const finish = () => {
    if (settled) return;
    settled = true;
    try { onComplete(); } catch (e) { log.warn("response-watcher", "onComplete threw", e); }
  };

  const evaluate = () => {
    if (settled) return;
    if (Date.now() - started > giveUpAfterMs) { finish(); return; }
    let streaming = false;
    try { streaming = adapter.isResponseStreaming(root); } catch (_) {}
    if (phase === "wait-stream-start") {
      if (streaming) {
        phase = "wait-stream-end";
        streamStartSeenAt = Date.now();
      }
    } else if (phase === "wait-stream-end") {
      if (!streaming) {
        phase = "settle";
        streamEndSeenAt = Date.now();
        setTimeout(finish, settleMs);
      }
    }
  };

  const mo = new MutationObserver(() => { try { evaluate(); } catch (e) { log.warn("response-watcher", e); } });
  mo.observe(root, { childList: true, subtree: true, attributes: true });
  // Also poll once a second as a safety net (some SPA frameworks batch
  // mutations away from the observer's reach).
  const poll = setInterval(() => { try { evaluate(); } catch (_) {} }, 1000);

  return () => { mo.disconnect(); clearInterval(poll); };
}
