# Documentation publishing

Code paths and commands are relative to the repository root. Apply only the sections relevant to the changed path.

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
