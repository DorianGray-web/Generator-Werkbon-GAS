# ADR-001: Container-bound Spreadsheet Runtime

- **Status:** Accepted
- **Scope:** Production execution context and deployment identity

## Context

Standalone and editor-oriented execution cannot reliably provide the active Google Spreadsheet, sheet, row, and UI context required for normal Werkbon selection and workflow execution.

## Decision

Production execution uses a container-bound Google Apps Script project attached to the target Spreadsheet. `onOpen()` installs the custom menu, and operators launch the workflow from that menu with the intended row active on the `Werkbonnen` sheet.

Editor execution remains a separate test-only context. It must not substitute stale cursor state when an active row is unavailable; explicit editor/test selection is configured separately and is absent from normal production configuration.

## Consequences

- The bound Spreadsheet supplies the canonical active Spreadsheet, sheet, range, and menu/UI context.
- Menu-initiated execution is the canonical production path.
- `SPREADSHEET_ID` remains an explicit identity guard and must match the parent bound Spreadsheet.
- Apps Script editor execution remains separate and test-only.
- The clasp Script ID and parent Spreadsheet identity must be verified before source synchronization.
- Script Properties are deployment configuration, not repository source.
- Removing a potentially redundant `SPREADSHEET_ID` dependency is not part of this decision.

## Evidence

Bounded v1.10.0 runtime validation confirmed:

- `onOpen()` and custom-menu startup;
- active-row workflow selection;
- the full bound workflow;
- new receipt extraction through OpenAI; and
- archival PDF packaging, including evidence association, page-count reconciliation, and temporary-document cleanup.

This evidence supports the container-bound runtime path for v1.10.0. It does not establish universal receipt or merchant compatibility.
