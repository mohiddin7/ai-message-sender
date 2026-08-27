import esbuild from "esbuild";
import { copyFile, mkdir, readdir, writeFile, readFile } from "node:fs/promises";

const common = { bundle: true, format: "esm", target: "chrome120", logLevel: "info", sourcemap: false, loader: { ".html": "text" } };

await Promise.all([
  esbuild.build({ ...common, entryPoints: ["src/background/index.js"], outfile: "dist/background.js" }),
  esbuild.build({ ...common, entryPoints: ["src/content/index.js"],     outfile: "dist/content.js",   platform: "browser" }),
  esbuild.build({ ...common, entryPoints: ["src/popup/popup.js"],        outfile: "dist/popup.js" }),
  esbuild.build({ ...common, entryPoints: ["src/options/options.js"],    outfile: "dist/options.js" }),
  esbuild.build({ ...common, entryPoints: ["src/welcome/welcome.js"],    outfile: "dist/welcome.js" })
]);

await mkdir("dist", { recursive: true });

// Copy bundled HTML/CSS shells (flat in dist/)
for (const f of ["src/popup/popup.html", "src/popup/popup.css", "src/options/options.html", "src/options/options.css", "src/welcome/welcome.html", "src/welcome/welcome.css", "src/lib/ui-tokens.css", "src/content/selector-picker.css"]) {
  await copyFile(f, "dist/" + f.split("/").pop());
}

// Copy icons into dist/icons/ (manifest references them as icons/*.png)
await mkdir("dist/icons", { recursive: true });
for (const name of await readdir("icons")) {
  if (name.endsWith(".png") || name.endsWith(".svg")) {
    await copyFile(`icons/${name}`, `dist/icons/${name}`);
  }
}

// Copy privacy policy
await copyFile("privacy-policy.html", "dist/privacy-policy.html");
await copyFile("privacy.css", "dist/privacy.css");

// Generate a dist/manifest.json with paths rewritten relative to dist/
// The source manifest.json references paths like "dist/background.js" and
// "icons/16.png" relative to the project root. When loaded as an unpacked
// extension, Chrome reads dist/manifest.json with all paths relative to
// dist/. So we strip the "dist/" prefix from path-shaped string values.
const SRC_MANIFEST = "manifest.json";
const DIST_MANIFEST = "dist/manifest.json";
const PATH_KEYS = new Set([
  "service_worker",  // background.service_worker
  "default_popup",   // action.default_popup
  "page",            // options_ui.page
  "js",              // content_scripts[].js (array of strings)
  // icons is an object { "16": "icons/16.png", ... }
]);

const stripDistPrefix = (v) => typeof v === "string" && v.startsWith("dist/") ? v.slice("dist/".length) : v;

const rewritePaths = (node) => {
  if (Array.isArray(node)) return node.map(rewritePaths);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "icons" && v && typeof v === "object") {
        // icons map: { "16": "icons/16.png", ... } — already relative
        out[k] = { ...v };
      } else if (PATH_KEYS.has(k)) {
        out[k] = Array.isArray(v) ? v.map(stripDistPrefix) : stripDistPrefix(v);
      } else {
        out[k] = rewritePaths(v);
      }
    }
    return out;
  }
  return node;
};

const srcManifest = JSON.parse(await readFile(SRC_MANIFEST, "utf8"));
const distManifest = rewritePaths(srcManifest);
await writeFile(DIST_MANIFEST, JSON.stringify(distManifest, null, 2) + "\n");

console.log("build done");
