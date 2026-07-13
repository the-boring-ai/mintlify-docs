import { readdir, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ignoredDirectories = new Set([".git", "node_modules", "scripts"]);
const publicExtensions = new Set([".json", ".md", ".mdx", ".svg"]);
const blockedTerms = [
  String.fromCharCode(99, 108, 111, 117, 100, 102, 108, 97, 114, 101),
  String.fromCharCode(122, 97, 114, 97, 122),
  String.fromCharCode(119, 114, 97, 112, 112, 101, 114),
  String.fromCharCode(112, 114, 111, 120, 121),
  String.fromCharCode(112, 111, 119, 101, 114, 101, 100, 32, 98, 121),
  String.fromCharCode(98, 117, 105, 108, 116, 32, 111, 110, 32, 116, 111, 112, 32, 111, 102),
  String.fromCharCode(117, 110, 100, 101, 114, 108, 121, 105, 110, 103, 32, 112, 114, 111, 118, 105, 100, 101, 114),
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
const bilyAppsPhrase = String.fromCharCode(
  97, 112, 112, 32, 115, 116, 111, 114, 101, 32, 102, 111, 114, 32, 116, 104, 101, 32, 105,
  110, 116, 101, 114, 110, 101, 116,
);
const bilyAppsPage = resolve(root, "concepts/bily-apps.mdx");
const docsConfig = resolve(root, "docs.json");
const staleTrackingSettingsPath = ["settings", "tracking"].join(" > ");

for (const file of files) {
  const source = await readFile(file, "utf8");
  const publicContents = file === docsConfig ? source.replace(/"proxy"\s*:\s*false/gi, "") : source;
  const contents = publicContents.toLowerCase();
  for (const term of blockedTerms) {
    if (contents.includes(term)) {
      throw new Error(`Public documentation contains a blocked implementation term: ${file}`);
    }
  }
  if (contents.includes(bilyAppsPhrase) && file !== bilyAppsPage) {
    throw new Error(`The Bily Apps positioning phrase appears outside its product page: ${file}`);
  }
  if (contents.includes(staleTrackingSettingsPath)) {
    throw new Error(`Public documentation contains the retired tracking settings path: ${file}`);
  }
}

const bilyAppsContents = (await readFile(bilyAppsPage, "utf8")).toLowerCase();
if (!bilyAppsContents.includes(bilyAppsPhrase)) {
  throw new Error("The Bily Apps product page is missing its positioning phrase.");
}

console.info(`Public-language check passed for ${files.length} files.`);
