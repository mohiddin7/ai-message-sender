const ALPHA = "abcdefghijklmnopqrstuvwxyz0123456789";
function rand(n) {
  let s = ""; for (let i = 0; i < n; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return s;
}
export function id(prefix) {
  if (!["q", "r", "h"].includes(prefix)) throw new Error(`id: bad prefix ${prefix}`);
  return `${prefix}_${Date.now().toString(36)}${rand(4)}`;
}