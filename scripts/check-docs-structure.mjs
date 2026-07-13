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

function collectOpenApiSources(value, sources = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectOpenApiSources(item, sources);
    return sources;
  }

  if (!value || typeof value !== "object") return sources;
  for (const [key, child] of Object.entries(value)) {
    if (key === "openapi") {
      if (typeof child === "string") sources.push(child);
      else if (child && typeof child === "object" && typeof child.source === "string") {
        sources.push(child.source);
      }
    } else {
      collectOpenApiSources(child, sources);
    }
  }
  return sources;
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
const openApiSources = collectOpenApiSources(config.navigation);
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

const validRoutes = new Set([
  ...navigationPages.map(routeForPage),
  ...openApiSources.map(source => (source.startsWith("/") ? source : `/${source}`)),
]);
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

const openApiOperations = [];
for (const source of openApiSources) {
  const relativeSource = source.replace(/^\//, "");
  const specification = JSON.parse(await readFile(resolve(root, relativeSource), "utf8"));
  if (specification.openapi !== "3.1.0") {
    throw new Error(`OpenAPI source must use OpenAPI 3.1.0: ${source}`);
  }
  if (specification.servers?.[0]?.url !== "https://app.bily.ai/api/customer/v1") {
    throw new Error(`OpenAPI source uses an unexpected public server: ${source}`);
  }
  for (const [path, pathItem] of Object.entries(specification.paths ?? {})) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const endpoint = pathItem?.[method];
      if (!endpoint) continue;
      if (!endpoint.operationId) {
        throw new Error(`OpenAPI operation is missing operationId: ${method.toUpperCase()} ${path}`);
      }
      openApiOperations.push({ method: method.toUpperCase(), path, operationId: endpoint.operationId });
    }
  }
}

const expectedOpenApiOperations = 50;
if (openApiOperations.length !== expectedOpenApiOperations) {
  throw new Error(
    `Expected ${expectedOpenApiOperations} OpenAPI operations, found ${openApiOperations.length}.`,
  );
}

const duplicateOperationIds = openApiOperations
  .map(({ operationId }) => operationId)
  .filter((operationId, index, operationIds) => operationIds.indexOf(operationId) !== index);
if (duplicateOperationIds.length > 0) {
  throw new Error(`Duplicate OpenAPI operation IDs: ${[...new Set(duplicateOperationIds)].join(", ")}`);
}

console.info(
  `Documentation structure passed for ${navigationPages.length} navigation pages, ${mdxFiles.length} MDX files, ${openApiOperations.length} OpenAPI operations, and ${(config.redirects ?? []).length} redirects.`,
);
