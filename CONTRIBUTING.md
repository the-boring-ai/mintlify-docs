# Contribute to the Bily SDK documentation

Keep changes concise, testable, and consistent with the current public SDK types.

## Before opening a pull request

1. Update all affected guides and reference pages together.
2. Use active voice and address the reader as "you."
3. Preserve exact event names, option names, and payload keys.
4. Run `node scripts/check-public-language.mjs`.
5. Run `mint broken-links --check-redirects` when the Mintlify CLI is available.
6. Preview the changed pages with `mint dev`.

Do not publish or deploy documentation from a feature branch.
