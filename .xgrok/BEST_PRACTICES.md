# Grok project guidance

`../AGENTS.md` is the authoritative repository governance file.
Read and follow it before modifying this repository.

## Project

This is a Google Apps Script project managed with clasp.

- Canonical source: `.gs` files (`00_Config.gs` through `07_DataHelpers.gs`)
- Tests: `tests.gs` using QUnitGS2 in Apps Script
- Manifest: `appsscript.json` (V8 runtime, QUnitGS2 library, OAuth scopes)
- Do not create parallel `.js` source files.
- Synchronization is clasp-managed. Inspect state before any clasp operations.
- Keep edits narrow and inspect the diff before completion.
- Do not run clasp synchronization, Git publishing, deployment,
  tagging, or release operations without explicit user authorization.

## Editing

Prefer targeted edits over complete-file rewrites.
Preserve existing formatting and unrelated worktree changes.
Do not introduce Node/npm tooling unless explicitly requested.

Always read the files relevant to the task.
Read `.clasp.json` and `appsscript.json` before changes involving project
structure, synchronization, runtime configuration, services, scopes, or libraries.

For receipt, VAT, reconciliation, material-total, and Werkbon
business rules, follow the invariants defined in `../AGENTS.md`.
