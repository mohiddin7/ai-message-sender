// Shared reset-time parsing helpers used by multiple adapters.
//
// detectUntilClockTime(text) — parses "until 8:40 PM" / "until 20:40"
// style wall-clock mentions. This is the phrasing Claude actually uses
// ("You are out of free messages until 8:40 PM") — a target clock time,
// not a countdown duration like "resets in 20 minutes". Each adapter's
// detectReset tries its own platform-specific duration patterns first,
// then falls back to this for the wall-clock phrasing.
export function detectUntilClockTime(text) {
  const m = text.match(/until\s+(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const ampm = m[3]?.toLowerCase();
  if (ampm === "pm" && hour !== 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  // The mentioned time is a target for later today, unless it's already
  // passed — then it means the same time tomorrow.
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}
