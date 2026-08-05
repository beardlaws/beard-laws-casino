import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const src = join(root, "src");
const findings = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (/\.(ts|js|css)$/.test(entry.name)) {
      const text = await readFile(path, "utf8");
      findings.push({ path: relative(root, path), lines: text.split(/\r?\n/).length, bytes: (await stat(path)).size });
    }
  }
}

await walk(src);
const totals = findings.reduce((acc, file) => ({ lines: acc.lines + file.lines, bytes: acc.bytes + file.bytes }), { lines: 0, bytes: 0 });
const versionCss = findings.filter((file) => /src[\\/]v\d+.*\.css$/i.test(file.path));
const largest = [...findings].sort((a, b) => b.lines - a.lines).slice(0, 12);
console.log("\nBEARD LAWS CASINO PROJECT AUDIT");
console.log(`Files scanned: ${findings.length}`);
console.log(`Source lines: ${totals.lines.toLocaleString()}`);
console.log(`Legacy version CSS files: ${versionCss.length}`);
console.log("\nLargest source files:");
for (const file of largest) console.log(`${String(file.lines).padStart(6)}  ${file.path}`);
console.log("\nGuardrail: new styling belongs in src/styles or a named cabinet stylesheet. Do not add vNN-*.css files.\n");
