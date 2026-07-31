# Deploy Bily documentation

Bily publishes `docs.bily.ai` through the existing direct deployment in the
Bily Mintlify project.

The Mintlify GitHub App is not part of this deployment architecture. Do not
install or authorize it for this repository. Treat an **Installation Needed**
prompt as an optional integration prompt, not as evidence that publication is
blocked.

## Publish a reviewed change

1. Prepare and review the documentation change in this repository.
2. Run every check listed in `AGENTS.md`.
3. Merge the approved change into `main`.
4. Publish the approved content through Bily's existing direct Mintlify
   deployment.
5. Wait for the direct deployment to finish.
6. Verify the changed pages at `https://docs.bily.ai` with a fresh request.

A merged commit is source-history evidence. It is not deployment evidence.
Record the live page checks separately.

If the direct deployment is unavailable or does not contain the expected
content, stop and ask the Bily owner to restore the established connection. Do
not solve the problem by installing a GitHub App, adding an OAuth grant, or
creating another persistent integration.
