# Bily documentation

Write for the person installing, understanding, verifying, or operating Bily. Complete requested edits and relevant validation; continue already-authorized publishing work through live verification.

## Voice and structure

Lead with the reader's outcome. Use concise, active, concrete language, one job per page, sentence-case headings, and instructions in execution order. Put prerequisites before dependent actions and warnings immediately before risky steps. Preserve consequences and failure modes; avoid hype, vague claims, or calling a task easy.

Start steps with verbs, bold interface labels, and format technical names as code. Give consequential actions an expected result and errors a path forward. Use descriptive links and a useful next action. Code examples use a language tag, exact casing, obviously fictional values, and the shortest safe path with relevant error handling.

## Product language

- Use **Bily** for the product and platform.
- Use **Bily Apps** for installable capabilities managed through Bily.
- Use **Bily API**, **Bily MCP**, and **Bily JavaScript SDK** for developer surfaces.
- Use **browser script** for the installed website runtime.
- Use **tracking URL** for the exact customer-specific browser-script URL.
- Use **store** for an ecommerce property and **website** for the browser surface.
- Use **event** for a named customer or website action and **payload** for its attached data.
- Keep private implementation providers and infrastructure out of public content.

Avoid vague product language such as “powerful,” “seamless,” “robust,” “next-generation,” “all-in-one,” and “leverage.” Do not call a task easy or simple. Make it easy through the instructions.

## Technical invariants

- Keep every example aligned with the exported `@bilyai/js` contract.
- Copy the exact Bily tracking URL. Never remove, reorder, decode, or rebuild its query string.
- Use one installation path per website surface: the raw script for plain HTML or the SDK for application frameworks.
- Treat the initial `PageView` as automatic. Track only later client-side route changes manually.
- Never include credentials, private tokens, or customer data in examples.
- Preserve API authentication, organization scope, store scope, safety, and retry semantics.
- Keep `openapi.json` generated from `scripts/build-openapi.mjs`; update the generator first.

## Publishing

Before publishing public pages, follow [publishing checks and deployment](.agents/references/publishing.md). Keep the existing direct Mintlify path and verify changed live pages; a merge alone is not publication. Do not install a replacement integration. For instruction-only changes, validate the changed instructions and links without running a public-page publishing workflow.
