# Grok project guidance

`../AGENTS.md` is the authoritative repository governance file.
Read and follow it before modifying this repository.

## Project

This is a Google Apps Script project managed with clasp.

- Current module boundaries and source classifications are authoritative in `../AGENTS.md`.
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

## Write-safety protocol

### Mandatory preflight

Before any write-capable task, Grok MUST:

1. Read `../AGENTS.md`, `../.ai-workflow/LESSONS_LEARNED.md`, and this file.
2. Run `git status` and inspect the existing diff.
3. Identify the exact target files and the smallest required change.
4. Record each target file's line count.
5. Identify the exact insertion or replacement anchor from complete source.

### Protected files

Treat `../tests.gs`, every file over 1000 lines, and files containing test
registries, QUnit batch selectors, fixtures, shared helper libraries, or
generated or centralized registries as protected. Protected files are read
only unless the task explicitly authorizes a narrow patch.

For a protected file, never rewrite the whole file for a local edit,
reconstruct it from partial reads, or replace it using an incomplete or
truncated buffer. Use bounded local patching and preserve all unrelated
content.

### Mandatory post-write integrity gate

Immediately after every write to a protected file:

1. Recount its lines and compare them with the pre-write count.
2. Run `git diff --stat`.
3. Run `git diff -- <target>` and review the saved file's actual diff.
4. Run applicable syntax validation.
5. Verify known neighboring sections still exist.
6. Where applicable, verify known test and batch registrations still exist.

### Catastrophic-write stop rule

If the line count drops unexpectedly, unrelated sections disappear, the diff
is grossly larger than intended, syntax fails outside the intended edit, or
known selectors or registrations disappear, classify the result as
`CATASTROPHIC_WRITE_INTEGRITY_FAILURE` and STOP immediately. Do not continue
tests, claim validation success, or attempt speculative reconstruction.
Restore from Git or the pre-task state only after explicit authorization or
under an already-established safe recovery rule.

### Reporting discipline

Never report "all gates passed", "validation complete", or "implementation
complete" unless the final saved file was integrity-checked, syntax-checked,
diff-reviewed, and all required tests actually executed successfully.
Repository state and runtime evidence override the agent's narrative summary.

### Partial-read limitation

If tool or window limits prevent reading the full relevant file or section,
STOP before writing. Do not infer an insertion point from a partial read;
obtain an exact narrower range or use another safe retrieval method. In
particular, never insert a QUnit module or test from an incomplete view of the
surrounding structure.
