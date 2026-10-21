# Bily JavaScript SDK documentation

This repository contains the public documentation for the Bily browser script and `@bilyai/js`.

## Local checks

Use Node.js 22 LTS for local documentation checks.

Run the public-language guard before previewing or submitting changes:

```bash
node scripts/build-openapi.mjs
node scripts/check-public-language.mjs
node scripts/check-docs-structure.mjs
node scripts/check-sdk-guidance.mjs
```

Run build, link, and rendering checks through the actual custom frontend after
verifying its source and configuration. Preview changed pages at desktop and
mobile widths. The presence of Mintlify-compatible content or configuration
does not identify the production frontend or establish a Mintlify login requirement.

## Deployment

The Bily owner identifies a custom frontend for `docs.bily.ai`; its exact
serving source and release workflow need verification. Publish reviewed changes
through that verified existing workflow. Do not
install or authorize the Mintlify GitHub App or a replacement integration.

Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for source verification, required checks,
release, and live-verification steps. The exact frontend deployment command
must be verified from current configuration before it is used.

## Documentation rules

- Keep every example aligned with the exported `@bilyai/js` contract.
- Keep `openapi.json` generated from `scripts/build-openapi.mjs`. Update the route definition and regenerate the file together.
- Copy the exact Bily script URL. Never remove, reorder, decode, or rebuild its query string.
- Use one installation path per website surface: a raw script tag for plain HTML or the SDK for application frameworks.
- Treat the initial page view as automatic. Let the browser script track supported client-side navigation automatically; do not duplicate it with manual page-view calls.
- Keep implementation providers and private infrastructure out of public content.
- Never include credentials, private tokens, or customer data in examples.

