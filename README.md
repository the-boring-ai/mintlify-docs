# Bily JavaScript SDK documentation

This repository contains the public documentation for the Bily browser script and `@bilyai/js`.

## Local checks

Run the public-language guard before previewing or submitting changes:

```bash
node scripts/check-public-language.mjs
```

Install the Mintlify CLI, then validate links and redirects:

```bash
npm install --global mint
mint broken-links --check-redirects
```

Start a local preview from the repository root:

```bash
mint dev
```

The preview is available at `http://localhost:3000` by default.

## Documentation rules

- Keep every example aligned with the exported `@bilyai/js` contract.
- Copy the exact Bily script URL. Never remove, reorder, decode, or rebuild its query string.
- Use one installation path per website surface: a raw script tag for plain HTML or the SDK for application frameworks.
- Treat the initial page view as automatic. Track only later client-side route changes manually.
- Keep implementation providers and private infrastructure out of public content.
- Never include credentials, private tokens, or customer data in examples.
