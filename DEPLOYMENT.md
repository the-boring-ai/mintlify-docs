# Deploy Bily documentation

## Verified source linkage

A fresh response from `https://docs.bily.ai/sdk/javascript` on 2026-10-21
identified this existing GitHub source in its public deployment metadata:

- Owner: `the-boring-ai`
- Repository: `mintlify-docs`
- Deployment branch: `main`
- Content directory: repository root
- Public domain: `docs.bily.ai`

The response also contained an `x-mintlify-client-version` header. This verifies the currently served source
and Mint infrastructure; it does not prove a future source push has published.
The owner's earlier custom-frontend description did not identify a separate
source repository. Do not invent one or infer a manual publishing requirement.

## Observed publishing mode (2026-10-21)

Reverify the current project settings before each release. On this date, the
existing Bily publishing project pointed to this repository, `main`, and the
root directory, but automatic updates showed **Installation needed** for the
GitHub app. Merging alone did not start a publication.

The existing **Publishes > Manual update** action successfully published main
commit `161de9e1da88940a7a90a09e362fc3361e72ed56` without installing an app or
adding a grant. Its log reported a successful build and cache revalidation;
fresh public SDK pages then contained the approved changes.

When this same mode is still active, use that existing action after the approved
source merge and required checks. If automatic updates are already connected,
observe that workflow instead; manual publishing is not a permanent requirement.
Use an existing-account sign-in only when the supported dashboard requires it.
Do not treat **Connect GitHub** or **Installation needed** as authorization to
install an app or expand access.

## Publish a reviewed change

1. Prepare and review the documentation change in this repository.
2. Run content, build, link, and rendering checks from
   repository publishing checks in `.agents/references/publishing.md`.
3. Merge the approved change into `main`, the verified deployment source.
4. Reverify the current publishing mode above, run or observe the existing
   workflow, and inspect its publication result. A configured source alone
   does not prove automatic updates are connected.
5. Verify changed pages at `https://docs.bily.ai` with fresh requests and
   confirm their content corresponds to the approved revision.

A merge is source-history evidence, not deployment evidence. Record both the
approved revision and live page checks. A changed infrastructure asset ID alone
does not prove that documentation content updated.

## If publication does not follow the source update

Inspect the existing integration and deployment evidence. Report the exact
missing status, permission, or failed step; do not automatically request login.
Do not install the Mintlify GitHub App, add an OAuth grant, create a replacement
integration, or change credentials to repair the release.
