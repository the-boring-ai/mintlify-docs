import { readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const config = JSON.parse(await readFile(resolve(root, "docs.json"), "utf8"));

function collectNavigationPages(value, pages = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectNavigationPages(item, pages);
    return pages;
  }

  if (!value || typeof value !== "object") return pages;
  for (const [key, child] of Object.entries(value)) {
    if (key === "pages" && Array.isArray(child)) {
      for (const page of child) {
        if (typeof page === "string") pages.push(page);
        else collectNavigationPages(page, pages);
      }
    } else if (key !== "pages") {
      collectNavigationPages(child, pages);
    }
  }
  return pages;
}

async function collectMdxFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectMdxFiles(path)));
    else if (entry.name.endsWith(".mdx")) files.push(path);
  }
  return files;
}

function routeForPage(page) {
  return page === "index" ? "/" : `/${page}`;
}

function pageForFile(file) {
  return relative(root, file).split(sep).join("/").replace(/\.mdx$/, "");
}

const navigationPages = collectNavigationPages(config.navigation);
const duplicates = navigationPages.filter((page, index) => navigationPages.indexOf(page) !== index);
if (duplicates.length > 0) {
  throw new Error(`Duplicate navigation pages: ${[...new Set(duplicates)].join(", ")}`);
}

for (const page of navigationPages) {
  try {
    await readFile(resolve(root, `${page}.mdx`), "utf8");
  } catch {
    throw new Error(`Navigation page does not exist: ${page}.mdx`);
  }
}

const mdxFiles = await collectMdxFiles(root);
const filePages = mdxFiles.map(pageForFile);
const orphanedPages = filePages.filter((page) => !navigationPages.includes(page));
if (orphanedPages.length > 0) {
  throw new Error(`MDX pages missing from navigation: ${orphanedPages.join(", ")}`);
}

const validRoutes = new Set(navigationPages.map(routeForPage));
const linkPattern = /(?:\]\(|href=["'])(\/[^\s"')#?]*)/g;

for (const file of mdxFiles) {
  const contents = await readFile(file, "utf8");
  for (const match of contents.matchAll(linkPattern)) {
    const route = match[1].replace(/\/$/, "") || "/";
    if (!validRoutes.has(route)) {
      throw new Error(`Broken internal link in ${relative(root, file)}: ${route}`);
    }
  }
}

for (const redirect of config.redirects ?? []) {
  if (!validRoutes.has(redirect.destination)) {
    throw new Error(`Redirect destination does not exist: ${redirect.destination}`);
  }
}

console.info(
  `Documentation structure passed for ${navigationPages.length} navigation pages, ${mdxFiles.length} MDX files, and ${(config.redirects ?? []).length} redirects.`,
);
