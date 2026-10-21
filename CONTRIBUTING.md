# Contribute to the Bily SDK documentation

Keep changes concise, testable, and consistent with the current public SDK types.

## Before opening a pull request

1. Update all affected guides and reference pages together.
2. Use active voice and address the reader as "you."
3. Preserve exact event names, option names, and payload keys.
4. Run `node scripts/check-public-language.mjs`.
5. Verify the actual frontend source and run its required build and link checks.
6. Preview changed pages at desktop and mobile widths through that frontend.
   Mintlify CLI checks may supplement compatible-content checks; they do not
   identify the production publishing workflow.

Do not publish or deploy documentation from a feature branch.

After the approved change merges into `main`, use the verified existing
frontend release workflow described in [DEPLOYMENT.md](./DEPLOYMENT.md).
The owner identifies a custom frontend; resolve its source and current routing
before choosing a publisher. Do not infer a Mintlify login requirement from
this repository, install the Mintlify GitHub App, or create a replacement
integration. Verify the changed live pages separately from the source merge.
