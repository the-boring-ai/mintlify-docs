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

## Publish a reviewed change

1. Prepare and review the documentation change in this repository.
2. Run content, build, link, and rendering checks from
   [publishing checks](.agents/references/publishing.md).
3. Merge the approved change into `main`, the verified deployment source.
4. Observe the existing source integration's publication result. Do not start
   a separate manual release or request login unless a concrete failure shows
   that the established workflow requires it.
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
