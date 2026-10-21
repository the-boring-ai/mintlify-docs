# Contribute to the Bily SDK documentation

Keep changes concise, testable, and consistent with the current public SDK types.

## Before opening a pull request

1. Update all affected guides and reference pages together.
2. Use active voice and address the reader as "you."
3. Preserve exact event names, option names, and payload keys.
4. Run `node scripts/check-public-language.mjs`.
5. Run the renderer's validation and link checks from the publishing reference.
6. Preview changed pages at desktop and mobile widths through the compatible
   renderer. Local checks do not require publishing-dashboard login.

Do not publish or deploy documentation from a feature branch.

After the approved change merges into `main`, reverify and use the current
publishing mode described in [DEPLOYMENT.md](./DEPLOYMENT.md). The existing
Manual update action was verified on 2026-10-21 while automatic updates were
not connected; this is an observation, not a permanent manual-only rule. Public
deployment metadata identifies this repository and branch as the live source. Do not
invent a separate frontend, infer a manual login requirement, install the
Mintlify GitHub App, or create a replacement integration. Verify changed live
content separately from the source merge.
