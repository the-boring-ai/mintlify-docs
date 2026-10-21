# Deploy Bily documentation

On 2026-10-21, the Bily owner identified a custom frontend for `docs.bily.ai`;
the exact frontend source and publishing workflow still need verification.
Public routing evidence and source configuration must be reconciled before
release. A Mintlify-shaped content repository or CLI configuration alone does
not establish the live hosting or publishing path.

## Publish a reviewed change

1. Prepare and review the documentation change in this repository.
2. Run the content checks in [publishing checks](.agents/references/publishing.md).
3. Verify the live custom frontend's source repository, content input, build
   configuration, and existing release workflow. Confirm the exact approved
   revision that workflow will publish.
4. Run the frontend's required build and rendering checks, including changed
   pages at desktop and mobile widths.
5. Merge the approved source change and publish through that verified existing
   workflow. Do not guess a deployment command from this content repository.
6. Wait for the deployment to finish and verify the changed pages at
   `https://docs.bily.ai` with fresh requests.

A merged commit is source-history evidence, not deployment evidence. Record
both the deployed revision and the live page checks.

## Missing deployment evidence

The exact custom frontend deployment command is not yet recorded here.
Resolve it from the current frontend configuration and existing Bily deployment
before publishing, then update this document with the verified path. If access
is unavailable, report the specific missing repository, command, or permission
rather than asking for a Mintlify login.

Do not install the Mintlify GitHub App, add an OAuth grant, create a replacement
integration, or change credentials to repair a documentation release. Do not treat Mintlify
login or direct Mintlify publication as prerequisites without verified evidence
that the actual release workflow requires them.
