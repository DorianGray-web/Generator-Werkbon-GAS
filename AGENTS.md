# AGENTS.md — Repository governance

This file governs automated work in this repository. Keep changes narrow, evidence-based, and easy to review.

## Repository boundaries

- `00_Config.gs` through `07_DataHelpers.gs` are core/runtime Google Apps Script modules, excluding the separately named Stage1V3 experimental modules.
- `08_StagedReceiptExtraction.gs` through `10_StagedFinancialEvidence.gs` are the staged production extraction/validation core.
- `04_Stage1V3PhysicalEvidence.gs`, `04_Stage1V3ObservedLinesProjection.gs`, `11_StagedStructuralExperiments.gs` through `15_SourceTopologyEvidenceExperiments.gs`, and `18_DocImageToPdfCompatibilityExperiment.gs` through `19_DocImageToPdfMeasurementExperiment.gs` are experimental/research modules.
- `16_PdfLibV1_17_1Vendor.gs` is vendored third-party source.
- `17_PdfBlobMerge.gs`, `20_ImageToPdfAdapter.gs`, and `21_PdfPackageBuilder.gs` are production PDF-packaging modules.
- `tests.gs` is the QUnitGS2 test suite that runs in Google Apps Script.
- `appsscript.json` is the version-controlled Apps Script manifest.
- `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, and `SECURITY.md` are project documentation.
- `.xgrok/` is optional AI-tool metadata, not a source of truth for application behavior.

The existing `.gs` files are the canonical source. Agents MUST NOT create parallel `.js` copies, even though `.clasp.json` permits both extensions.

## Inspect before editing

Before making changes, agents MUST:

1. Read the files directly relevant to the request and the applicable documentation.
2. Inspect `git status` and the relevant diff so pre-existing user changes are not overwritten or included accidentally.
3. Check `.clasp.json` and `appsscript.json` before changing project structure, synchronization behavior, runtime settings, services, scopes, or libraries.
4. Identify the smallest file set required by the request.
5. Before architectural review, receipt/financial extraction or interpretation changes, reconciliation changes, regression fixes, or QUnitGS2 harness work, read the relevant entries in `.ai-workflow/LESSONS_LEARNED.md`. Treat the ledger as historical engineering evidence, not authoritative specification. When documentation changes are in scope, update or propose an entry only for a durable repeatable lesson or invalidation, not routine debugging noise.

Agents MUST preserve unrelated changes and MUST NOT perform repository-wide formatting, quote normalization, renaming, cleanup, or generated rewrites unless explicitly requested.

### Grok write preflight

If the active agent is Grok and a task may modify repository files, Grok MUST
read `.ai-workflow/LESSONS_LEARNED.md` and `.xgrok/BEST_PRACTICES.md` before
writing. No repository write is allowed until this preflight is complete.

## Evidence-driven changes

Agents MUST NOT implement code, tests, abstractions, frameworks, extension points, or additional hardening solely for hypothetical future scenarios. A change MUST be justified by at least one of:

- an observed real-world failure or reproducible case;
- a demonstrated limitation in the current implementation;
- an explicit current project requirement;
- evidence that an existing invariant is insufficient.

Use the sequence: Evidence → Problem → Boundary → Minimal solution → Regression → Validation → Stop. Prefer the smallest generalizable solution sufficient for the demonstrated problem. This does not mean the shortest code, a receipt- or merchant-specific hardcode, removal of necessary validation, or disregard of known evidence.

Residual risks MAY be documented or investigated through bounded read-only research, but residual risk alone does not authorize implementation. Tests MUST protect an established requirement, invariant, regression, or demonstrated failure class; do not add tests merely for behavior that can be imagined. When the demonstrated problem is resolved and the applicable validation gate passes, stop. Further hardening requires new evidence or an explicit current project requirement.

This rule limits speculative implementation, not reasoning. Current decisions may still justify bounded research, ADRs, reasonable extension boundaries, and merchant-neutral generalizable solutions.

## Safety and authorization

- MUST NOT run destructive or repository-wide cleanup commands without explicit user approval.
- MUST treat `clasp pull`, `clasp push`, and any force/synchronization operation as potentially destructive. They can overwrite local state or create `.js`/`.gs` conflicts. Do not run them unless the user explicitly authorizes the exact operation after the local state is inspected.
- MUST NOT commit, push, create or move tags, publish releases, or deploy without explicit user authorization.
- MUST NOT expose or commit API keys, OAuth tokens, Script Properties, `.env` contents, private Google resource IDs, real receipt data, or other sensitive information.

## Apps Script and manifest rules

- Preserve the existing V8 runtime, enabled services, OAuth scopes, QUnitGS2 library dependency, and other `appsscript.json` settings unless the task explicitly requires a manifest change.
- Do not add npm or Node test dependencies merely to run this repository's tests. Tests currently use QUnitGS2 inside Google Apps Script; add a local Node workflow only as an intentional, explicitly scoped project change.
- Preserve existing public entry points and Apps Script/global-function behavior unless the requested change requires otherwise.

## Receipt and financial invariants

Receipt processing and material totals are evidence-sensitive business logic. Changes in this area MUST preserve these invariants:

- Preserve values actually printed on or extracted from each receipt; never normalize prices across different receipts.
- Printed item and cost rows may be VAT-inclusive or VAT-exclusive. Reconciliation may match either available authoritative `inclVAT` or `exclVAT` total within the established tolerance.
- A genuine reconciliation mismatch MUST fail closed and require review; it must not silently generate an incorrect Werkbon.
- `documentTotalInclVat` in material Column G is distinct from the sum of printed rows. When present and reliable, it supplies the receipt-level material total; otherwise the established row-sum fallback applies.
- Receipt isolation, legacy rows without `receiptKey`, additional-cost classification, and incomplete-row filtering MUST remain compatible unless the task explicitly changes those contracts.

Any behavioral change to receipt, VAT, reconciliation, material-total,
spreadsheet-column, or Werkbon-generation logic MUST include regression
coverage. Refactoring in these areas MUST preserve the existing regression suite.

## Completion and validation

Before declaring an edit complete, agents MUST:

1. Inspect the final diff and confirm that only requested files and changes are present.
2. Run `git diff --check` and report the result.
3. Run the relevant QUnitGS2 tests when executable in the available Apps Script environment, and report the actual result or state clearly that they were not run.

For release-sensitive or financial/business-logic changes, full QUnitGS2 validation means the authoritative independent batch set plus its permanent-partition gate, with each batch run in its own lifecycle; it does not mean one monolithic QUnitGS2 run. Agents MUST NOT claim test, E2E, deployment, or release success without current evidence. Historical screenshots, test counts, deployments, and releases are context only, never permanent proof of the current state.
