# Documentation publishing

Code paths and commands are relative to the repository root. Apply only the sections relevant to the changed path.

## Before publishing

Use Node.js 22 LTS and run:

```bash
node scripts/build-openapi.mjs --check
node scripts/check-public-language.mjs
node scripts/check-docs-structure.mjs
node scripts/check-sdk-guidance.mjs
mint validate
mint broken-links --check-redirects
```

The public deployment identifies this repository's `main` branch and Mint rendering infrastructure. Use the compatible renderer for validation and preview; CLI validation does not require publishing-dashboard login. If this environment cannot render, report that specific gate and use an already-authorized supported environment rather than skipping it.

Preview the changed pages at desktop and mobile widths. Confirm headings, code blocks, callouts, tables, and next-step links remain easy to scan.

## Deployment architecture

- Public deployment metadata identifies `the-boring-ai/mintlify-docs`, branch `main`, root content directory, as the source for `docs.bily.ai`.
- Follow [the deployment checklist](../../DEPLOYMENT.md). Use the existing source integration; do not invent a separate custom frontend or mandatory manual publication step.
- Do not infer login requirements from repository format. Do not install the Mintlify GitHub App or treat an **Installation Needed** prompt as permission to add an integration.
- Reverify the current mode in DEPLOYMENT.md. On 2026-10-21 the existing Manual update action worked while automatic updates were not connected; no new app or grant was required. Do not assume that mode is permanent.
- A merge does not prove publication. Verify changed live content against the approved revision after the source update.
- If the established workflow is unavailable, report its exact blocker. Do not create a replacement integration or expand persistent access.
