# Documentation publishing

Code paths and commands are relative to the repository root. Apply only the sections relevant to the changed path.

## Before publishing

Use Node.js 22 LTS and run:

```bash
node scripts/build-openapi.mjs --check
node scripts/check-public-language.mjs
node scripts/check-docs-structure.mjs
node scripts/check-sdk-guidance.mjs
```

Run the actual custom frontend's required build, link, and rendering checks after verifying its source and configuration. Mintlify CLI checks may be useful for compatible content, but are not evidence of the deployed frontend or a reason to request Mintlify login.

Preview the changed pages at desktop and mobile widths. Confirm headings, code blocks, callouts, tables, and next-step links remain easy to scan.

## Deployment architecture

- The Bily owner identifies a custom frontend for `docs.bily.ai`; verify its actual serving source and release workflow before choosing a publishing tool.
- Follow [the deployment checklist](../../DEPLOYMENT.md): verify the actual frontend source, content input, and existing release workflow before publishing.
- Do not infer a Mintlify login requirement from this repository. Do not install the Mintlify GitHub App or treat an **Installation Needed** prompt as a deployment blocker.
- A merged commit does not prove publication. Verify the deployed revision and changed live pages after the custom frontend deployment completes.
- If the established workflow is unavailable, report its exact blocker. Do not create a replacement integration or expand persistent access.
