import { execFileSync } from "node:child_process";
import { mkdir, rm, cp, writeFile } from "node:fs/promises";
import { join } from "node:path";

const version = process.argv[2] ?? "DEV";
const root = process.cwd();
const dist = join(root, "dist");
const docs = join(root, "docs");

execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], { stdio: "inherit" });
await rm(docs, { recursive: true, force: true });
await mkdir(docs, { recursive: true });
await cp(dist, docs, { recursive: true });
await writeFile(join(docs, "VERSION.txt"), `BEARD LAWS CASINO ${version}\nBuilt ${new Date().toISOString()}\n`, "utf8");
console.log(`\nRelease ${version} copied from dist to docs.`);
console.log("Review locally, then commit and push.");
