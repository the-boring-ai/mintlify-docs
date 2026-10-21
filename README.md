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

Run the compatible renderer's build/link checks and preview changed pages at
desktop and mobile widths as described in the publishing reference. Local
validation is separate from signing into a publishing dashboard.

## Deployment

The live site's public deployment metadata identifies this repository's `main`
branch, with root content, as the source for `docs.bily.ai`. On 2026-10-21,
automatic updates were not connected; the existing Manual update action
published the reviewed main revision successfully without a new grant. Reverify
that mode for each release rather than assuming either automatic or manual
publishing is permanently required. Do not invent a separate frontend.

Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for evidence, required checks, source
release, and live verification. Do not install a replacement integration.

## Documentation rules

- Keep every example aligned with the exported `@bilyai/js` contract.
- Keep `openapi.json` generated from `scripts/build-openapi.mjs`. Update the route definition and regenerate the file together.
- Copy the exact Bily script URL. Never remove, reorder, decode, or rebuild its query string.
- Use one installation path per website surface: a raw script tag for plain HTML or the SDK for application frameworks.
- Treat the initial page view as automatic. Let the browser script track supported client-side navigation automatically; do not duplicate it with manual page-view calls.
- Keep implementation providers and private infrastructure out of public content.
- Never include credentials, private tokens, or customer data in examples.

