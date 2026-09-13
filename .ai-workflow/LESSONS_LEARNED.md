# Engineering Lessons Learned

This ledger preserves evidence-backed engineering lessons from repeatable mistakes, important near-misses, and durable operational constraints encountered by humans and automated development workflows.

Read the relevant entries before architectural review, receipt-extraction changes, financial interpretation or reconciliation changes, regression fixes, and GAS/QUnitGS2 harness work.

This ledger is historical engineering evidence, not an automatically authoritative statement of current behavior. Current code, tests, accepted decisions, explicit contracts, and current repository evidence remain authoritative. Verify that a lesson still applies before using it. An implemented mitigation reduces a known risk; it does not prove that the failure mode is impossible.

Do not add routine debugging attempts, one-off symptoms, changelog entries, or open work items. Add or propose a lesson only when evidence exposes a repeatable failure pattern, an invalid assumption, an important near-miss, or a durable operational constraint. Keep decisions in the appropriate contract or ADR and executable guarantees in tests.

Use stable `LL-NNN` identifiers. Supported statuses are `Active`, `Mitigated`, `Superseded`, and `Invalidated`. Evidence levels include `Real incident / near-miss`, `Real runtime regression`, `Real document evidence`, `Synthetic regression`, and `Agent hypothesis`. Combine and qualify levels when the evidence has different sources.

If later evidence disproves or replaces a lesson, do not silently delete it. Mark it `Invalidated` or `Superseded` and record the evidence that changed. Never promote an inference or agent hypothesis to runtime fact without direct evidence.

## LL-001 — Aggregate reconciliation can hide a wrong item-price association

- **Status:** Active
- **Area:** Image extraction, structural association, reconciliation
- **Evidence level:** Real incident / near-miss (operator-reported); Synthetic regression
- **Observed in / context:** Hubo receipt investigation and the staged-extraction prototype in the current unpublished worktree.
- **What happened:** Direct-to-canonical extraction associated amounts with the wrong product lines. A controlled variant still produced seven item candidates whose amounts summed to the printed total, despite the expected six physical products and incorrect item-to-price associations.
- **Incorrect assumption / failure pattern:** Equality between an aggregate extracted sum and a printed total was treated as evidence that the underlying product-price associations were correct.
- **Evidence:** The test `aggregate reconciliation blind spot — wrong seven-item association still sums to printed total` demonstrates the aggregate blind spot with synthetic values. Nearby staged tests preserve physical row evidence and fail closed on unresolved structural conflicts. The original real-image result is operator-reported runtime evidence; no real receipt data is tracked in the repository.
- **Resulting invariant or operational rule:** Keep perception correctness, structural association correctness, and aggregate financial reconciliation as distinct checks. Never use a printed total or printed product count to repair, shift, regroup, or validate individual item-price associations. Aggregate equality can be necessary evidence for a selected comparison basis, but it is not sufficient evidence of correct item semantics.
- **Current mitigation:** The experimental staged path preserves ordered observations and source provenance before canonicalization, and reconciliation remains downstream and fail-closed. This mitigation is not proof that every layout is structurally supported.
- **Regression protection / verification:** The named aggregate-blind-spot test plus staged structural conflict tests in `tests.gs`.
- **Do not repeat:** Do not accept or repair a canonical item list solely because its total reconciles.
- **Limitations / unresolved aspects:** The current staged capabilities are bounded experiments; their presence does not establish production correctness for arbitrary receipt layouts.

## LL-002 — Correct numeric extraction can still have wrong VAT semantics

- **Status:** Mitigated
- **Area:** Financial interpretation, VAT basis, reconciliation
- **Evidence level:** Real incident / near-miss (historical context); Real document evidence; Synthetic regression
- **Observed in / context:** Historical Lampdirect/Werkbon work leading through commits `5b7af8e` and `b10faca`, followed by the controlled v1.8.0 Lampdirect PDF validation documented in `README.md` and `CHANGELOG.md`.
- **What happened:** A correctly perceived amount could still be assigned the wrong financial role, especially when distinguishing printed row values and excl.-VAT, VAT, incl.-VAT, or payable document totals.
- **Incorrect assumption / failure pattern:** Numeric recognition was treated as equivalent to correct financial-basis interpretation.
- **Evidence:** Repository history introduced separate structured totals and `documentTotalInclVat`, then changed reconciliation so printed rows may reconcile against an available incl.-VAT or excl.-VAT total. The documented controlled Lampdirect case preserves `14.29` excl. VAT, `3.00` VAT, and `17.29` incl. VAT. Tests cover this basis-aware case. The repository records the resulting controls and validation; it does not retain a standalone artifact describing every step of the original near-miss.
- **Resulting invariant or operational rule:** A correctly extracted number is not an authoritative document total until its financial basis is supported. Preserve distinct excl.-VAT, VAT amount, incl.-VAT, payable document total, and material/printed-row totals where applicable. Do not weaken basis-aware reconciliation or infer a basis from arithmetic alone.
- **Current mitigation:** `normalizeAndAggregateReceiptData()` preserves printed item/cost values, can reconcile against either available typed total within the established tolerance, and keeps `documentTotalInclVat` separate from the printed-row sum.
- **Regression protection / verification:** Lampdirect/PLA EXCL-basis tests and the controlled single-PDF evidence documented in `README.md` and `CHANGELOG.md`.
- **Do not repeat:** Do not promote a recognized amount to `inclVAT`, `exclVAT`, or payable total without source-supported semantics.
- **Limitations / unresolved aspects:** One controlled Lampdirect PDF does not prove arbitrary invoice layouts, multi-PDF execution, or universal VAT-basis selection.

## LL-003 — Human-authored downstream values are separate evidence, not ground truth

- **Status:** Active
- **Area:** Cross-project evidence review, canonicalization, human review
- **Evidence level:** Real document evidence; Synthetic regression
- **Observed in / context:** Declaratie Analyzer `.review-evidence/case-001` Wiska source-to-declaration comparison, reviewed locally under that repository's evidence boundary, and the synthetic Wiska experiments in this worktree.
- **What happened:** The source document and a manually authored downstream declaration contain a material-value interpretation that does not align directly. The source table preserves `Prijs 10.95`, `Aantal 3`, `BTW 21%`, and `Subtotaal 27.15`, with document totals `27.15` excl. VAT, `5.70` VAT, and `32.85` incl. VAT. A downstream human-authored value must therefore be treated as separate evidence, not as an automatic correction to the source.
- **Incorrect assumption / failure pattern:** A manually completed or accepted downstream artifact was treated as ground truth capable of silently overwriting source-document evidence.
- **Evidence:** The local case provides observational source and declaration evidence. The current synthetic Wiska tests preserve the printed `10.95` and `27.15`, explicitly verify that `9.05` is not derived, and leave the mixed-basis case unrepresentable rather than repairing it. The real local documents are not repository source of truth and must not be copied into tracked fixtures.
- **Resulting invariant or operational rule:** Preserve source-document evidence and human-authored downstream evidence separately. Investigate and classify disagreements; do not resolve them automatically in favor of either the machine or the human. Do not derive `9.05`, alter quantity, or rewrite another printed value merely to force `quantity × unit price = subtotal` under an assumed canonical model.
- **Current mitigation:** The experimental table, collector, interpretation, and canonical-release tests preserve both printed values and fail closed when the current canonical shape cannot represent their relationship without repair.
- **Regression protection / verification:** Wiska structural, exhaustive-evidence, interpretation, and canonical-release tests in `tests.gs`.
- **Do not repeat:** Do not use a downstream declaration, reimbursement outcome, or human-entered amount to mutate source evidence silently.
- **Limitations / unresolved aspects:** The evidence establishes a disagreement and an accepted real-world submission instance; it does not establish universal accounting policy or prove which downstream interpretation should govern future cases.

## LL-004 — Large QUnitGS2 lifecycles can exceed practical reporter/cache capacity

- **Status:** Mitigated
- **Area:** GAS test harness, regression validation
- **Evidence level:** Real runtime regression (operator-reported); repository-verified mitigation
- **Observed in / context:** Real GAS QUnitGS2 runs during staged and financial prototype development.
- **What happened:** Large single lifecycles ran many tests normally and then rendered a malformed blank row near the end without completing the final summary. Tests at the apparent boundary passed when the logical component was run in a fresh smaller lifecycle. A later financial lifecycle of approximately 52 tests and 291 assertions showed the same practical payload-pressure pattern. Separately, one isolated successful assertion that supplied two complete serialized projection strings directly as QUnit actual/expected operands reproduced a missing test record and missing summary; the same complete serialization and equality comparison succeeded when QUnit received only the resulting boolean.
- **Incorrect assumption / failure pattern:** The first malformed late-suite row was treated immediately as a semantic failure in that test, or reporter payload was reduced assertion by assertion as if there were a universal safe count.
- **Evidence:** Operator-reported GAS runs showed the failure moving later after reporter-payload compaction and disappearing for affected components in fresh lifecycles. A later full `financial-evidence` lifecycle of 40 tests / 285 assertions produced reordered, anonymous, and incomplete reporter records, while isolated architectural groups of 5/37, 5/28, and 8/81 completed normally in GAS. The current harness therefore uses independent architectural financial batches and explicitly provides no monolithic/all financial batch. In the isolated assertion case, computation-only and compact-equivalence diagnostics passed, the direct large-string equality diagnostic reproduced the reporting failure, and the corrected permanent `financial-composite-evidence` gate subsequently passed in GAS with 8 tests / 45 assertions / 45 passed / 0 failed. This supports QUnitGS2 result persistence/reporting pressure; it does not prove CacheService as the mechanism or establish a byte threshold.
- **Resulting invariant or operational rule:** When a suite approaches the practical ceiling, split it at a real architectural or component boundary. Diagnose by identifying the first incomplete test, confirming preceding completion, and rerunning the affected logical component in a fresh QUnitGS2 lifecycle before classifying the issue as semantic. When an isolated assertion is proven to fail only when large complete values are exposed as QUnit operands, preserve the complete comparison but pass its boolean result and bounded diagnostic metadata to QUnit.
- **Current mitigation:** Financial evidence uses architecture-aligned batches, and the former staged-core lifecycle uses six architecture-aligned batches. Each normal batch runs as an independent QUnitGS2 lifecycle; the former monolithic selectors are retired from the authoritative gate. The proven composite immutability assertion performs full serialized equality before emitting a compact QUnit result.
- **Regression protection / verification:** Permanent partition audits verify the allowlisted batch membership and logical registration counts, and retired selectors fail closed. Declared assertion counts and local checks are not GAS runtime proof.
- **Do not repeat:** Do not delete or weaken meaningful assertions, slice every fixed number of tests, create another monolithic GAS lifecycle, encode a magic test/assertion threshold, or rewrite all equality assertions without case-specific runtime evidence.
- **Limitations / unresolved aspects:** Reporter pressure is payload-dependent, but no universal byte, test-count, or assertion-count threshold is established. The evidence does not identify CacheService as the exact mechanism and does not make `JSON.stringify()` itself unsafe. A successful smaller lifecycle does not by itself prove every test semantic; normal batch completion is still required.

## LL-005 — A locally convincing hypothesis is not GAS runtime evidence

- **Status:** Mitigated
- **Area:** GAS runtime diagnosis, deployment/source identity, test selectors
- **Evidence level:** Real runtime regression (operator-reported); Agent hypothesis (rejected by later runtime evidence); Synthetic regression
- **Observed in / context:** QUnit selector debugging in the current unpublished staged worktree.
- **What happened:** A local JavaScript explanation appeared to account for selector states observed through a deployed endpoint. Subsequent execution through the current head/test `/dev` deployment passed the current selector source and contradicted the proposed resolver defect. The earlier endpoint observation was therefore not proof that current local/head code had executed.
- **Incorrect assumption / failure pattern:** A plausible local reproduction or code-reading hypothesis was promoted to the cause of a GAS failure before verifying the exact deployed source identity.
- **Evidence:** Operator-reported `/dev` GAS execution validated the current resolver behavior after the hypothesis was challenged. The current `tests.gs` header distinguishes current unpublished head/test `/dev` validation from `/exec`, which may address a versioned deployment. Selector-contract tests cover supported, unsupported, diagnostic, and retired selections. No temporary URL, credential, or forensic log is retained.
- **Resulting invariant or operational rule:** When Apps Script runtime evidence contradicts the local model, stop extending the hypothesis. Obtain the smallest useful runtime trace, distinguish local simulation from GAS runtime evidence, and verify deployment/source identity before editing implementation. Use the appropriate head/test deployment when validating current unpublished source.
- **Current mitigation:** The harness documents the `/dev` versus `/exec` distinction and has focused selector-contract coverage.
- **Regression protection / verification:** Selector-contract tests in `tests.gs`; a real GAS run remains the authority for GAS-only behavior.
- **Do not repeat:** Do not stack speculative fixes on an unverified explanation or treat a versioned deployment as proof of current local/head execution.
- **Limitations / unresolved aspects:** The evidence invalidated the proposed current-resolver defect; it did not establish a universal explanation for every `/exec`/`/dev` discrepancy.

## LL-006 — Bounded agent edits require whole-file integrity verification

- **Status:** Mitigated
- **Area:** Agent workflows, repository integrity, large-file editing, test harness safety
- **Evidence level:** Real incident / near-miss (operator-reported); repeated operational incident
- **Observed in / context:** At least two Grok Agent bounded-edit incidents affected the large `tests.gs` suite. In the latest incident, the authoritative file had 16210 lines before the write and 1727 afterward, while new QUnit code was inserted inside an unfinished `financialLines` array.
- **What happened:** Approximately 89% of `tests.gs` disappeared, the resulting file failed clasp parsing with `SyntaxError: Unexpected token ';'`, and the agent nevertheless reported successful validation. An earlier incident of the same class removed roughly 70% of the test file. The test file was restored from HEAD while separately preserved production changes remained intact.
- **Incorrect assumption / failure pattern:** A narrowly scoped requested edit was assumed to imply a narrowly scoped actual write, and the agent's summary was trusted without verifying the complete saved file and repository diff.
- **Evidence:** Operator-reported before-and-after line counts, the malformed insertion location, the clasp syntax failure, the false validation report, and the earlier similar truncation establish a repeated destructive-write pattern rather than a one-off typo. No private receipt or service data is retained in this ledger.
- **Resulting invariant or operational rule:** Large or high-value files require bounded patching plus pre-write and post-write line counts, full target diff review, applicable syntax validation, neighboring-structure verification, and test or batch registration checks before success can be reported.
- **Current mitigation:** `AGENTS.md` requires Grok to read the lessons ledger and `.xgrok/BEST_PRACTICES.md` before any repository write; the Grok-specific protocol defines protected files, post-write integrity gates, catastrophic-write detection, and reporting constraints.
- **Regression protection / verification:** Repository-level routing and Grok operational instructions are reviewable controls. Their paths and sequential lesson numbering are verified during this governance update.
- **Do not repeat:** Do not permit an agent to report a successful bounded edit to a large or high-value file without checking the integrity of the entire saved file and the actual repository diff.
- **Limitations / unresolved aspects:** These process guardrails reduce risk but do not prove that future agent writes are safe or prevent a tool from violating instructions.
