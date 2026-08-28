import esbuild from "esbuild";

const common = { bundle: true, format: "esm", target: "chrome120", logLevel: "info", sourcemap: false };

await Promise.all([
  esbuild.build({ ...common, entryPoints: ["src/background/index.js"], outfile: "dist/background.js" }),
  esbuild.build({ ...common, entryPoints: ["src/content/index.js"],     outfile: "dist/content.js",   platform: "browser" }),
  esbuild.build({ ...common, entryPoints: ["src/popup/popup.js"],        outfile: "dist/popup.js" }),
  esbuild.build({ ...common, entryPoints: ["src/options/options.js"],    outfile: "dist/options.js" }),
  esbuild.build({ ...common, entryPoints: ["src/welcome/welcome.js"],    outfile: "dist/welcome.js" })
]);

// Copy static assets
import { copyFile, mkdir } from "node:fs/promises";
await mkdir("dist", { recursive: true });
for (const f of ["src/popup/popup.html", "src/popup/popup.css", "src/options/options.html", "src/options/options.css", "src/welcome/welcome.html", "src/welcome/welcome.css"]) {
  await copyFile(f, "dist/" + f.split("/").pop());
}
console.log("build done");