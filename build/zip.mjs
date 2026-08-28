import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const out = `ai-auto-sender-v${pkg.version}.zip`;

await new Promise((resolve, reject) => {
  const p = spawn("zip", ["-r", out, "manifest.json", "dist", "icons", "privacy-policy.html"], { stdio: "inherit" });
  p.on("exit", code => code === 0 ? resolve() : reject(new Error("zip failed: " + code)));
});
console.log("wrote", out);