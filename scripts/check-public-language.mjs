import { readdir, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ignoredDirectories = new Set([".git", "node_modules", "scripts"]);
const publicExtensions = new Set([".json", ".md", ".mdx", ".svg"]);
const blockedTerms = [
  String.fromCharCode(99, 108, 111, 117, 100, 102, 108, 97, 114, 101),
  String.fromCharCode(122, 97, 114, 97, 122),
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else if (publicExtensions.has(extname(entry.name))) files.push(path);
  }

  return files;
}

const files = await collectFiles(root);

for (const file of files) {
  const contents = (await readFile(file, "utf8")).toLowerCase();
  for (const term of blockedTerms) {
    if (contents.includes(term)) {
      throw new Error(`Public documentation contains a blocked implementation term: ${file}`);
    }
  }
}

console.info(`Public-language check passed for ${files.length} files.`);
