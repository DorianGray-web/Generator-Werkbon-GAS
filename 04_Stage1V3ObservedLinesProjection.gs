// =========================================================================
// EXPERIMENTAL STAGE-1-V3 OBSERVED-LINES PROJECTION
// =========================================================================

/**
 * Deterministically projects validated Stage-1-v3 physical evidence into the
 * existing Stage-1-v2-shaped observedLines boundary.
 *
 * This adapter does not inspect the image and cannot establish that a
 * model-reported physical row is true. It copies only same-row evidence,
 * preserves ambiguity, and performs no grouping, arithmetic, normalization,
 * financial repair, or production routing.
 */
function projectStage1V3ToObservedLines_(evidence) {
  validateStage1V3PhysicalEvidence_(evidence);

  const conflicts = [];
  const rowById = {};
  const cellById = {};
  const rowMapById = {};
  const referencedSummaryRows = {};
  const projectedSummaryRows = {};
  const dispositionByCellId = {};
  const observedLines = [];
  const sourceMap = {
    rows: [],
    summaries: {
      printedProductCount: null,
      printedTotal: null,
    },
  };

  evidence.physicalRows.forEach(function (row) {
    rowById[row.rowId] = row;
    const rowMap = {
      sourceRowId: row.rowId,
      targetLineOrder: row.order,
      fieldSources: {
        leadingQuantityText: null,
        descriptionText: null,
        unitPriceText: null,
        lineTotalText: null,
      },
      summaryComponentCellIds: [],
      contextOnlyCellIds: [],
      unresolvedCellIds: [],
    };
    rowMapById[row.rowId] = rowMap;
    sourceMap.rows.push(rowMap);
    row.cells.forEach(function (cell) {
      cellById[cell.cellId] = { row: row, cell: cell };
    });
  });

  ["printedProductCount", "printedTotal"].forEach(function (fieldName) {
    const summary = evidence.summaryEvidence[fieldName];
    if (summary !== null) referencedSummaryRows[summary.sourceRowId] = true;
  });

  const projectedSummaryEvidence = {
    printedProductCount: projectOneStage1V3Summary_(
      "printedProductCount",
      evidence.summaryEvidence.printedProductCount,
      false,
      rowById,
      cellById,
      rowMapById,
      dispositionByCellId,
      sourceMap.summaries,
      projectedSummaryRows,
      conflicts,
    ),
    printedTotal: projectOneStage1V3Summary_(
      "printedTotal",
      evidence.summaryEvidence.printedTotal,
      true,
      rowById,
      cellById,
      rowMapById,
      dispositionByCellId,
      sourceMap.summaries,
      projectedSummaryRows,
      conflicts,
    ),
  };

  evidence.physicalRows.forEach(function (row) {
    const rowMap = rowMapById[row.rowId];
    const buckets = {
      leadingQuantityText: [],
      descriptionText: [],
      unitPriceText: [],
      lineTotalText: [],
    };
    const meaningTargets = {
      quantity: "leadingQuantityText",
      description: "descriptionText",
      unit_price: "unitPriceText",
      line_total: "lineTotalText",
    };

    row.cells.forEach(function (cell) {
      if (dispositionByCellId[cell.cellId]) return;

      if (row.roleEvidence === "header") {
        recordStage1V3CellDisposition_(
          cell.cellId,
          "context_only",
          rowMap,
          dispositionByCellId,
        );
        return;
      }

      const targetField = meaningTargets[cell.meaningEvidence];
      if (targetField) {
        buckets[targetField].push(cell);
        return;
      }

      const materiallyUnrepresentable =
        cell.rawText !== "" &&
        (row.roleEvidence === "product" ||
          referencedSummaryRows[row.rowId] === true);
      if (materiallyUnrepresentable) {
        conflicts.push({
          code: "UNREPRESENTABLE_CELL_EVIDENCE",
          rowId: row.rowId,
          cellIds: [cell.cellId],
        });
        recordStage1V3CellDisposition_(
          cell.cellId,
          "unresolved",
          rowMap,
          dispositionByCellId,
        );
        return;
      }

      recordStage1V3CellDisposition_(
        cell.cellId,
        "context_only",
        rowMap,
        dispositionByCellId,
      );
    });

    const projectedLine = {
      order: row.order,
      rawText: row.rawText,
      leadingQuantityText: null,
      descriptionText: null,
      unitPriceText: null,
      lineTotalText: null,
      indentation: row.indentationEvidence,
      roleEvidence: row.roleEvidence,
    };

    Object.keys(buckets).forEach(function (targetField) {
      const candidates = buckets[targetField];
      if (candidates.length > 1) {
        conflicts.push({
          code: "AMBIGUOUS_ROW_FIELD",
          rowId: row.rowId,
          field: targetField,
          cellIds: candidates.map(function (cell) {
            return cell.cellId;
          }),
        });
        candidates.forEach(function (cell) {
          recordStage1V3CellDisposition_(
            cell.cellId,
            "unresolved",
            rowMap,
            dispositionByCellId,
          );
        });
        return;
      }
      if (candidates.length === 0) return;

      const cell = candidates[0];
      projectedLine[targetField] = cell.rawText;
      rowMap.fieldSources[targetField] = {
        cellId: cell.cellId,
        headerCellRef: cell.headerCellRef,
      };
      recordStage1V3CellDisposition_(
        cell.cellId,
        "projected_field",
        rowMap,
        dispositionByCellId,
      );
    });

    observedLines.push(projectedLine);
  });

  const sourceCellCount = Object.keys(cellById).length;
  const accountedCellCount = Object.keys(dispositionByCellId).length;
  if (sourceCellCount !== accountedCellCount) {
    conflicts.push({
      code: "INCOMPLETE_CELL_ACCOUNTING",
      rowId: null,
      cellIds: [],
    });
  }

  const projectedEvidence = {
    observedLines: observedLines,
    summaryEvidence: projectedSummaryEvidence,
  };
  const resolved = conflicts.length === 0;
  if (resolved) validateStage1V2Evidence_(projectedEvidence);

  return {
    resolved: resolved,
    evidence: resolved ? projectedEvidence : null,
    conflicts: conflicts,
    sourceMap: sourceMap,
    accounting: {
      sourceRowCount: evidence.physicalRows.length,
      projectedLineCount: observedLines.length,
      sourceCellCount: sourceCellCount,
      accountedCellCount: accountedCellCount,
    },
  };
}

function projectOneStage1V3Summary_(
  fieldName,
  summary,
  includeTotalType,
  rowById,
  cellById,
  rowMapById,
  dispositionByCellId,
  summarySourceMap,
  projectedSummaryRows,
  conflicts,
) {
  if (summary === null) return null;

  const row = rowById[summary.sourceRowId];
  const labelCellIds = summary.labelCellRefs.slice();
  const valueCellIds = summary.valueCellRefs.slice();
  const referencedCellIds = labelCellIds.concat(valueCellIds);
  const sourceMapping = {
    sourceRowId: summary.sourceRowId,
    sourceLineOrder: row.order,
    labelCellIds: labelCellIds,
    valueCellIds: valueCellIds,
  };
  summarySourceMap[fieldName] = sourceMapping;

  const labelCell =
    labelCellIds.length === 1 ? cellById[labelCellIds[0]].cell : null;
  const valueCell =
    valueCellIds.length === 1 ? cellById[valueCellIds[0]].cell : null;
  const literalRelationshipValid =
    labelCell !== null &&
    valueCell !== null &&
    labelCell.rawText !== "" &&
    valueCell.rawText !== "" &&
    row.rawText.indexOf(labelCell.rawText) === 0 &&
    row.rawText.slice(labelCell.rawText.length).trim() === valueCell.rawText;
  const summaryMeaningsValid =
    labelCell !== null &&
    valueCell !== null &&
    labelCell.meaningEvidence === "summary_label" &&
    valueCell.meaningEvidence === "summary_value";
  const duplicateConsumption = referencedCellIds.some(function (cellId) {
    return dispositionByCellId[cellId] !== undefined;
  });
  const duplicateSourceRow = projectedSummaryRows[summary.sourceRowId] === true;

  if (
    row.roleEvidence !== "summary" ||
    labelCellIds.length !== 1 ||
    valueCellIds.length !== 1 ||
    !literalRelationshipValid ||
    !summaryMeaningsValid ||
    duplicateConsumption ||
    duplicateSourceRow
  ) {
    conflicts.push({
      code: "SUMMARY_PROJECTION_CONFLICT",
      field: fieldName,
      rowId: summary.sourceRowId,
      cellIds: referencedCellIds,
    });
    referencedCellIds.forEach(function (cellId) {
      if (dispositionByCellId[cellId] !== undefined) return;
      recordStage1V3CellDisposition_(
        cellId,
        "unresolved",
        rowMapById[cellById[cellId].row.rowId],
        dispositionByCellId,
      );
    });
    return null;
  }

  referencedCellIds.forEach(function (cellId) {
    recordStage1V3CellDisposition_(
      cellId,
      "summary_component",
      rowMapById[summary.sourceRowId],
      dispositionByCellId,
    );
  });
  projectedSummaryRows[summary.sourceRowId] = true;

  const projected = {
    sourceLineOrder: row.order,
    rawText: row.rawText,
    labelText: labelCell.rawText,
    valueText: valueCell.rawText,
  };
  if (includeTotalType) {
    projected.totalTypeEvidence = summary.totalTypeEvidence;
  }
  return projected;
}

function recordStage1V3CellDisposition_(
  cellId,
  disposition,
  rowMap,
  dispositionByCellId,
) {
  dispositionByCellId[cellId] = disposition;
  if (disposition === "summary_component") {
    rowMap.summaryComponentCellIds.push(cellId);
  } else if (disposition === "context_only") {
    rowMap.contextOnlyCellIds.push(cellId);
  } else if (disposition === "unresolved") {
    rowMap.unresolvedCellIds.push(cellId);
  }
}
