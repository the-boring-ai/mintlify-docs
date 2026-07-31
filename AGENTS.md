# Bily documentation instructions

These instructions apply to every public page in this repository.

## Purpose

Bily gives teams one programmable layer for website data, customer context, analytics, and activation. Write for the person trying to install, understand, verify, or operate Bily—not for the team that built it.

Bily Apps is a product within Bily. Keep the two concepts distinct. Only the Bily Apps product page may use its approved app-store positioning.

## Voice

Bily sounds calm, capable, direct, and human.

- Lead with the outcome the reader can achieve.
- Put the most important information first.
- Use active voice, second person, and concrete verbs.
- Prefer familiar words over internal or abstract terms.
- Keep one idea in each sentence and one purpose in each paragraph.
- Remove any word that does not improve meaning, safety, or confidence.
- Be concise without hiding prerequisites, consequences, or failure modes.
- Be warm through usefulness, not jokes, hype, or forced enthusiasm.

## Page structure

- Give each page one clear job.
- Write a specific title and a one-sentence description that states the outcome.
- Open with what the reader will accomplish or understand.
- Organize instructions in the order the reader performs them.
- Use outcome-led, sentence-case headings.
- Place prerequisites before the action that depends on them.
- Put warnings immediately before the risky step.
- End with the next useful action when one exists.

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

## Instructions and interface paths

- Start steps with a verb.
- Bold interface labels: Select **Settings**.
- Format commands, files, paths, fields, methods, and values as code.
- Name the expected result after a consequential action.
- Write errors as a path forward: state what happened, why it matters, and what to do next.
- Never use “click here” or a vague link label such as “learn more.”

## Technical invariants

- Keep every example aligned with the exported `@bilyai/js` contract.
- Copy the exact Bily tracking URL. Never remove, reorder, decode, or rebuild its query string.
- Use one installation path per website surface: the raw script for plain HTML or the SDK for application frameworks.
- Treat the initial `PageView` as automatic. Track only later client-side route changes manually.
- Never include credentials, private tokens, or customer data in examples.
- Preserve API authentication, organization scope, store scope, safety, and retry semantics.
- Keep `openapi.json` generated from `scripts/build-openapi.mjs`; update the generator first.

## Code examples

- Include a language identifier and a useful filename when appropriate.
- Use realistic, obviously fictional values.
- Show the shortest production-safe path, including relevant error handling.
- Explain what the example proves; do not narrate every line.
- Preserve exact casing for methods, events, fields, headers, and environment variables.

## Before publishing

Use Node.js 22 LTS and run:

```bash
node scripts/build-openapi.mjs --check
node scripts/check-public-language.mjs
node scripts/check-docs-structure.mjs
mint validate
mint broken-links --check-redirects
```

Preview the changed pages at desktop and mobile widths. Confirm headings, code blocks, callouts, tables, and next-step links remain easy to scan.

## Deployment architecture

- Publish `docs.bily.ai` through Bily's existing direct Mintlify deployment.
- Do not install or authorize the Mintlify GitHub App for this repository.
- Treat **Installation Needed** as an optional integration prompt, not a deployment blocker.
- A merged commit does not prove publication. Verify the changed live pages after the direct deployment completes.
- If the established direct deployment is unavailable, stop and ask the Bily owner. Do not create a replacement integration.
