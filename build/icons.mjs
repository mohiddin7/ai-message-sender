// Optional: requires `npm i -D sharp`. Skipped if sharp not installed.
// Generates 16, 32, 48, 128 PNGs from icons/source.svg.
import { readFile, writeFile, mkdir } from "node:fs/promises";
let sharp;
try { sharp = (await import("sharp")).default; }
catch { console.warn("sharp not installed; skipping icon rasterization"); process.exit(0); }

const svg = await readFile("icons/source.svg");
await mkdir("icons", { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const buf = await sharp(svg).resize(size, size).png().toBuffer();
  await writeFile(`icons/${size}.png`, buf);
}
console.log("icons written");