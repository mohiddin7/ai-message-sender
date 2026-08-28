// Zips dist/'s contents (flattened — manifest.json etc. at the zip root,
// not nested under a dist/ folder) into a Chrome Web Store-ready package.
// Run `npm run build` first. Version comes from dist/manifest.json (the
// built manifest actually shipping), not package.json's — they drifted
// out of sync before (package.json still says 5.0.0, dist/manifest.json
// says 5.1.0) and package.json's "private": true means it was never
// meant to track the extension's own version anyway.
import { readFile, rm, mkdir, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";

const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8"));
const out = `store-assets/ai-message-sender-${manifest.version}.zip`;

// test-page.html is a manual dev fixture that sometimes ends up in dist/
// (esbuild.config.mjs never copies it) — never ship it.
await rm("dist/test-page.html", { force: true });

await mkdir("store-assets", { recursive: true });
await rm(out, { force: true });
const files = (await readdir("dist")).filter(f => !f.startsWith("."));
await new Promise((resolve, reject) => {
  const p = spawn("zip", ["-r", "-X", "../" + out, ...files], { cwd: "dist", stdio: "inherit" });
  p.on("exit", code => code === 0 ? resolve() : reject(new Error("zip failed: " + code)));
});
console.log("wrote", out);
