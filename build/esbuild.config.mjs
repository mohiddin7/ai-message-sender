import esbuild from "esbuild";
import { copyFile, mkdir, readdir } from "node:fs/promises";

const common = { bundle: true, format: "esm", target: "chrome120", logLevel: "info", sourcemap: false };

await Promise.all([
  esbuild.build({ ...common, entryPoints: ["src/background/index.js"], outfile: "dist/background.js" }),
  esbuild.build({ ...common, entryPoints: ["src/content/index.js"],     outfile: "dist/content.js",   platform: "browser" }),
  esbuild.build({ ...common, entryPoints: ["src/popup/popup.js"],        outfile: "dist/popup.js" }),
  esbuild.build({ ...common, entryPoints: ["src/options/options.js"],    outfile: "dist/options.js" }),
  esbuild.build({ ...common, entryPoints: ["src/welcome/welcome.js"],    outfile: "dist/welcome.js" })
]);

await mkdir("dist", { recursive: true });

// Copy bundled HTML/CSS shells
for (const f of ["src/popup/popup.html", "src/popup/popup.css", "src/options/options.html", "src/options/options.css", "src/welcome/welcome.html", "src/welcome/welcome.css"]) {
  await copyFile(f, "dist/" + f.split("/").pop());
}

// Copy the manifest so `chrome://extensions → Load unpacked` finds it
await copyFile("manifest.json", "dist/manifest.json");

// Copy the privacy policy (linked from popup + options)
await copyFile("privacy-policy.html", "dist/privacy-policy.html");

// Copy all icons referenced by the manifest
for (const name of await readdir("icons")) {
  if (name.endsWith(".png") || name.endsWith(".svg")) {
    await copyFile(`icons/${name}`, `dist/${name}`);
  }
}

console.log("build done");
