/**
 * Synthetic-only TABULAR_CELL_ROW experiment.
 *
 * `observedLines` remains the physical-line source of truth. Optional table
 * regions add bounded cell boundaries and header associations without
 * assigning VAT basis, canonical financial meaning, or output eligibility.
 * This function is intentionally not called by production routing.
 */
function buildTabularCellRowExperiment_(extraction) {
  if (!extraction || !Array.isArray(extraction.observedLines)) {
    throw new Error(
      "ObservedReceiptExtraction must contain an observedLines array.",
    );
  }

  const partition = partitionObservedReceiptEvidencePrototype_(extraction);
  const conflicts = partition.conflicts.map(clonePrototypeIssue_);
  const observedByOrder = {};
  extraction.observedLines.forEach(function (line) {
    if (Number.isInteger(line.order) && !observedByOrder[line.order]) {
      observedByOrder[line.order] = cloneObservedReceiptRowPrototype_(line);
    }
  });

  const regions = Array.isArray(extraction.tableRegions)
    ? extraction.tableRegions
    : [];
  if (regions.length === 0) {
    conflicts.push({ code: "MISSING_TABLE_REGION", regionId: null });
  }

  const seenRegionIds = {};
  const seenTableLineOrders = {};
  const projectedRegions = [];
  const groups = [];
  const financialLines = [];
  let tableRowCount = 0;
  let tableCellCount = 0;

  regions.forEach(function (sourceRegion, regionIndex) {
    const region = cloneTabularRegionExperiment_(sourceRegion);
    const regionId = region.regionId;
    let regionValid = true;

    if (
      !hasExactObjectKeysExperiment_(sourceRegion, [
        "regionId",
        "sourceLineOrders",
        "headerRowId",
        "rows",
        "financialLines",
      ]) ||
      region.rows.some(function (_row, rowIndex) {
        return !hasExactObjectKeysExperiment_(sourceRegion.rows[rowIndex], [
          "rowId",
          "roleEvidence",
          "sourceLineOrders",
          "cells",
        ]);
      }) ||
      region.rows.some(function (row, rowIndex) {
        return row.cells.some(function (_cell, cellIndex) {
          return !hasExactObjectKeysExperiment_(
            sourceRegion.rows[rowIndex].cells[cellIndex],
            [
              "cellId",
              "columnOrder",
              "rawText",
              "sourceLineOrders",
              "headerCellRef",
            ],
          );
        });
      }) ||
      region.financialLines.some(function (_line, lineIndex) {
        return !hasExactObjectKeysExperiment_(
          sourceRegion.financialLines[lineIndex],
          [
            "evidenceId",
            "rowId",
            "descriptionCellIds",
            "valueCellIds",
            "uninterpretedCellIds",
            "adjacentUninterpretedCellIds",
          ],
        );
      })
    ) {
      conflicts.push({
        code: "INVALID_TABLE_REGION_SHAPE",
        regionId: regionId || "region-" + regionIndex,
      });
      regionValid = false;
    }

    if (!hasObservedTextPrototype_(regionId) || seenRegionIds[regionId]) {
      conflicts.push({
        code: seenRegionIds[regionId]
          ? "DUPLICATE_TABLE_REGION_ID"
          : "INVALID_TABLE_REGION_ID",
        regionId: regionId || null,
      });
      regionValid = false;
    } else {
      seenRegionIds[regionId] = true;
    }

    const regionLineOrders = region.sourceLineOrders;
    if (
      regionLineOrders.length === 0 ||
      !areContiguousObservedOrdersExperiment_(
        regionLineOrders,
        extraction.observedLines,
      )
    ) {
      conflicts.push({
        code: "NONCONTIGUOUS_TABLE_REGION",
        regionId: regionId || "region-" + regionIndex,
      });
      regionValid = false;
    }

    regionLineOrders.forEach(function (order) {
      if (seenTableLineOrders[order]) {
        conflicts.push({
          code: "DUPLICATE_TABLE_LINE_CONSUMPTION",
          regionId: regionId,
          rowOrder: order,
        });
        regionValid = false;
      } else {
        seenTableLineOrders[order] = true;
      }
    });

    const rowById = {};
    const cellById = {};
    const rowLineOrders = [];
    let headerRow = null;

    region.rows.forEach(function (row) {
      tableRowCount += 1;
      if (!hasObservedTextPrototype_(row.rowId) || rowById[row.rowId]) {
        conflicts.push({
          code: rowById[row.rowId]
            ? "DUPLICATE_TABLE_ROW_ID"
            : "INVALID_TABLE_ROW_ID",
          regionId: regionId,
        });
        regionValid = false;
        return;
      }
      rowById[row.rowId] = row;

      if (row.roleEvidence === "header") {
        if (headerRow !== null) {
          conflicts.push({
            code: "MULTIPLE_TABLE_HEADER_ROWS",
            regionId: regionId,
          });
          regionValid = false;
        } else {
          headerRow = row;
        }
      } else if (row.roleEvidence !== "product") {
        conflicts.push({
          code: "UNSUPPORTED_TABLE_ROW_ROLE",
          regionId: regionId,
          rowId: row.rowId,
        });
        regionValid = false;
      }

      row.sourceLineOrders.forEach(function (order) {
        rowLineOrders.push(order);
        const observed = observedByOrder[order];
        if (
          !observed ||
          observed.roleEvidence !== row.roleEvidence ||
          regionLineOrders.indexOf(order) < 0
        ) {
          conflicts.push({
            code: "CONTRADICTORY_TABLE_ROW_EVIDENCE",
            regionId: regionId,
            rowId: row.rowId,
            rowOrder: order,
          });
          regionValid = false;
        }
      });

      const seenColumnOrders = {};
      let previousColumnOrder = null;
      row.cells.forEach(function (cell) {
        tableCellCount += 1;
        if (!hasObservedTextPrototype_(cell.cellId) || cellById[cell.cellId]) {
          conflicts.push({
            code: cellById[cell.cellId]
              ? "DUPLICATE_TABLE_CELL_ID"
              : "INVALID_TABLE_CELL_ID",
            regionId: regionId,
            rowId: row.rowId,
          });
          regionValid = false;
          return;
        }
        cellById[cell.cellId] = { row: row, cell: cell };

        if (
          !Number.isInteger(cell.columnOrder) ||
          cell.columnOrder <= 0 ||
          seenColumnOrders[cell.columnOrder] ||
          (previousColumnOrder !== null &&
            cell.columnOrder <= previousColumnOrder)
        ) {
          conflicts.push({
            code: "INVALID_TABLE_COLUMN_ORDER",
            regionId: regionId,
            rowId: row.rowId,
            cellId: cell.cellId,
          });
          regionValid = false;
        } else {
          seenColumnOrders[cell.columnOrder] = true;
          previousColumnOrder = cell.columnOrder;
        }

        if (!hasObservedTextPrototype_(cell.rawText)) {
          conflicts.push({
            code: "MISSING_TABLE_CELL_RAW_TEXT",
            regionId: regionId,
            rowId: row.rowId,
            cellId: cell.cellId,
          });
          regionValid = false;
        }

        if (
          cell.sourceLineOrders.length === 0 ||
          cell.sourceLineOrders.some(function (order) {
            return row.sourceLineOrders.indexOf(order) < 0;
          }) ||
          cell.sourceLineOrders.some(function (order, index, orders) {
            return index > 0 && order <= orders[index - 1];
          })
        ) {
          conflicts.push({
            code: "INVALID_TABLE_CELL_SOURCE",
            regionId: regionId,
            rowId: row.rowId,
            cellId: cell.cellId,
          });
          regionValid = false;
        } else if (
          !tableCellRawTextMatchesSourcesExperiment_(
            cell,
            observedByOrder,
          )
        ) {
          conflicts.push({
            code: "INCONSISTENT_TABLE_CELL_RAW_TEXT",
            regionId: regionId,
            rowId: row.rowId,
            cellId: cell.cellId,
          });
          regionValid = false;
        }
      });
    });

    if (headerRow === null || region.headerRowId !== headerRow.rowId) {
      conflicts.push({
        code: "MISSING_TABLE_HEADER_ROW",
        regionId: regionId,
      });
      regionValid = false;
    }

    if (JSON.stringify(regionLineOrders) !== JSON.stringify(rowLineOrders)) {
      conflicts.push({
        code: "INCOMPLETE_TABLE_ROW_ALIGNMENT",
        regionId: regionId,
      });
      regionValid = false;
    }

    if (headerRow !== null) {
      const headerColumns = headerRow.cells.map(function (cell) {
        return cell.columnOrder;
      });
      headerRow.cells.forEach(function (cell) {
        if (cell.headerCellRef !== null) {
          conflicts.push({
            code: "CONTRADICTORY_TABLE_HEADER_ASSOCIATION",
            regionId: regionId,
            rowId: headerRow.rowId,
            cellId: cell.cellId,
          });
          regionValid = false;
        }
      });
      region.rows.forEach(function (row) {
        if (
          row.roleEvidence === "product" &&
          !sameIntegerSetExperiment_(
            headerColumns,
            row.cells.map(function (cell) {
              return cell.columnOrder;
            }),
          )
        ) {
          conflicts.push({
            code: "INCOMPLETE_TABLE_COLUMN_ALIGNMENT",
            regionId: regionId,
            rowId: row.rowId,
          });
          regionValid = false;
        }
      });
    }

    region.rows.forEach(function (row) {
      if (row.roleEvidence !== "product") return;
      row.cells.forEach(function (cell) {
        const headerEntry = cellById[cell.headerCellRef];
        if (
          !hasObservedTextPrototype_(cell.headerCellRef) ||
          !headerEntry ||
          headerEntry.row.rowId !== region.headerRowId ||
          headerEntry.cell.columnOrder !== cell.columnOrder
        ) {
          conflicts.push({
            code: "MISSING_TABLE_HEADER_ASSOCIATION",
            regionId: regionId,
            rowId: row.rowId,
            cellId: cell.cellId,
          });
          regionValid = false;
        }
      });
    });

    const seenFinancialEvidenceIds = {};
    const seenFinancialRowIds = {};
    region.financialLines.forEach(function (line) {
      if (
        !hasObservedTextPrototype_(line.evidenceId) ||
        seenFinancialEvidenceIds[line.evidenceId] ||
        seenFinancialRowIds[line.rowId]
      ) {
        conflicts.push({
          code: "DUPLICATE_TABULAR_FINANCIAL_LINE",
          regionId: regionId,
          rowId: line.rowId || null,
        });
        regionValid = false;
      } else {
        seenFinancialEvidenceIds[line.evidenceId] = true;
        seenFinancialRowIds[line.rowId] = true;
      }
    });

    if (regionValid) {
      region.financialLines.forEach(function (specification) {
        const built = buildTabularFinancialLineEvidenceExperiment_(
          region,
          rowById,
          cellById,
          specification,
        );
        built.conflicts.forEach(function (conflict) {
          conflicts.push(conflict);
          regionValid = false;
        });
        if (built.evidence) financialLines.push(built.evidence);
      });
    }

    const productRows = region.rows.filter(function (row) {
      return row.roleEvidence === "product";
    });
    if (region.financialLines.length !== productRows.length) {
      conflicts.push({
        code: "INCOMPLETE_TABLE_FINANCIAL_LINE_COVERAGE",
        regionId: regionId,
      });
      regionValid = false;
    }

    if (regionValid) {
      productRows.forEach(function (row) {
        groups.push({
          capability: "TABULAR_CELL_ROW",
          regionId: regionId,
          rowId: row.rowId,
          sourceRowOrders: row.sourceLineOrders.slice(),
          cellIds: row.cells.map(function (cell) {
            return cell.cellId;
          }),
        });
      });
    }
    projectedRegions.push(region);
  });

  const allPartitioned = partition.headerObservations
    .concat(partition.productObservations)
    .concat(partition.summaryObservations)
    .concat(partition.unclassifiedObservations);

  return {
    resolved: conflicts.length === 0,
    capability: "TABULAR_CELL_ROW",
    observedLines: extraction.observedLines.map(
      cloneObservedReceiptRowPrototype_,
    ),
    tableRegions: projectedRegions,
    groups: groups,
    financialLineEvidence: financialLines,
    conflicts: conflicts,
    accounting: {
      physicalObservationCount: extraction.observedLines.length,
      partitionedObservationCount: allPartitioned.length,
      tableRegionCount: projectedRegions.length,
      tableRowCount: tableRowCount,
      tableCellCount: tableCellCount,
      summaryObservationCount: partition.summaryObservations.length,
      uniqueTableLineCount: Object.keys(seenTableLineOrders).length,
    },
  };
}

function cloneTabularRegionExperiment_(source) {
  const region = source && typeof source === "object" ? source : {};
  return {
    regionId: region.regionId,
    sourceLineOrders: Array.isArray(region.sourceLineOrders)
      ? region.sourceLineOrders.slice()
      : [],
    headerRowId: region.headerRowId,
    rows: (Array.isArray(region.rows) ? region.rows : []).map(function (row) {
      return {
        rowId: row && row.rowId,
        roleEvidence: row && row.roleEvidence,
        sourceLineOrders:
          row && Array.isArray(row.sourceLineOrders)
            ? row.sourceLineOrders.slice()
            : [],
        cells:
          row && Array.isArray(row.cells)
            ? row.cells.map(function (cell) {
                return {
                  cellId: cell && cell.cellId,
                  columnOrder: cell && cell.columnOrder,
                  rawText: cell && cell.rawText,
                  sourceLineOrders:
                    cell && Array.isArray(cell.sourceLineOrders)
                      ? cell.sourceLineOrders.slice()
                      : [],
                  headerCellRef:
                    cell && cell.headerCellRef === null
                      ? null
                      : cell && cell.headerCellRef,
                };
              })
            : [],
      };
    }),
    financialLines: (
      Array.isArray(region.financialLines) ? region.financialLines : []
    ).map(function (line) {
      return {
        evidenceId: line && line.evidenceId,
        rowId: line && line.rowId,
        descriptionCellIds:
          line && Array.isArray(line.descriptionCellIds)
            ? line.descriptionCellIds.slice()
            : [],
        valueCellIds:
          line && Array.isArray(line.valueCellIds)
            ? line.valueCellIds.slice()
            : [],
        uninterpretedCellIds:
          line && Array.isArray(line.uninterpretedCellIds)
            ? line.uninterpretedCellIds.slice()
            : [],
        adjacentUninterpretedCellIds:
          line && line.adjacentUninterpretedCellIds &&
          typeof line.adjacentUninterpretedCellIds === "object"
            ? Object.keys(line.adjacentUninterpretedCellIds).reduce(
                function (result, cellId) {
                  result[cellId] = Array.isArray(
                    line.adjacentUninterpretedCellIds[cellId],
                  )
                    ? line.adjacentUninterpretedCellIds[cellId].slice()
                    : [];
                  return result;
                },
                {},
              )
            : {},
      };
    }),
  };
}

function buildTabularFinancialLineEvidenceExperiment_(
  region,
  rowById,
  cellById,
  specification,
) {
  const conflicts = [];
  const row = rowById[specification.rowId];
  if (
    !hasObservedTextPrototype_(specification.evidenceId) ||
    !row ||
    row.roleEvidence !== "product"
  ) {
    conflicts.push({
      code: "INVALID_TABULAR_FINANCIAL_LINE",
      regionId: region.regionId,
      rowId: specification.rowId || null,
    });
    return { evidence: null, conflicts: conflicts };
  }

  const categories = [
    specification.descriptionCellIds,
    specification.valueCellIds,
    specification.uninterpretedCellIds,
  ];
  const consumedCellIds = [];
  categories.forEach(function (cellIds) {
    cellIds.forEach(function (cellId) {
      if (consumedCellIds.indexOf(cellId) >= 0) {
        conflicts.push({
          code: "DUPLICATE_TABLE_CELL_CONSUMPTION",
          regionId: region.regionId,
          rowId: row.rowId,
          cellId: cellId,
        });
      } else {
        consumedCellIds.push(cellId);
      }
      if (!cellById[cellId] || cellById[cellId].row.rowId !== row.rowId) {
        conflicts.push({
          code: "INVALID_TABLE_CELL_REFERENCE",
          regionId: region.regionId,
          rowId: row.rowId,
          cellId: cellId,
        });
      }
    });
  });

  const rowCellIds = row.cells.map(function (cell) {
    return cell.cellId;
  });
  if (!sameStringSetExperiment_(rowCellIds, consumedCellIds)) {
    conflicts.push({
      code: "INCOMPLETE_TABLE_CELL_CONSUMPTION",
      regionId: region.regionId,
      rowId: row.rowId,
    });
  }
  if (conflicts.length > 0) {
    return { evidence: null, conflicts: conflicts };
  }

  function sourceReference(cell) {
    return {
      regionId: region.regionId,
      rowId: row.rowId,
      cellId: cell.cellId,
      sourceLineOrders: cell.sourceLineOrders.slice(),
    };
  }

  const sourceFragments = row.cells.map(function (cell) {
    return {
      sourceRef: sourceReference(cell),
      rawText: cell.rawText,
    };
  });
  const uninterpretedFragments = specification.uninterpretedCellIds.map(
    function (cellId) {
      const cell = cellById[cellId].cell;
      return {
        sourceRef: sourceReference(cell),
        rawText: cell.rawText,
      };
    },
  );
  const valueComponents = specification.valueCellIds.map(function (cellId) {
    const cell = cellById[cellId].cell;
    const headerCell = cellById[cell.headerCellRef].cell;
    const adjacentIds = specification.adjacentUninterpretedCellIds[cellId] || [];
    return {
      componentId: specification.evidenceId + ":" + cell.cellId,
      rawValue: cell.rawText,
      sourceRef: sourceReference(cell),
      printedLabel: {
        headerCellRef: cell.headerCellRef,
        rawText: headerCell.rawText,
      },
      structuralContext: {
        capability: "TABULAR_CELL_ROW",
        regionId: region.regionId,
        rowId: row.rowId,
        columnOrder: cell.columnOrder,
      },
      uninterpretedAdjacentFragments: adjacentIds.map(function (adjacentId) {
        const adjacentEntry = cellById[adjacentId];
        if (!adjacentEntry || adjacentEntry.row.rowId !== row.rowId) {
          conflicts.push({
            code: "INVALID_ADJACENT_FRAGMENT_REFERENCE",
            regionId: region.regionId,
            rowId: row.rowId,
            cellId: adjacentId,
          });
          return null;
        }
        return {
          sourceRef: sourceReference(adjacentEntry.cell),
          rawText: adjacentEntry.cell.rawText,
        };
      }).filter(function (fragment) {
        return fragment !== null;
      }),
    };
  });

  return {
    evidence:
      conflicts.length === 0
        ? {
            evidenceId: specification.evidenceId,
            sourceFragments: sourceFragments,
            descriptionCellRefs: specification.descriptionCellIds.slice(),
            valueComponents: valueComponents,
            uninterpretedFragments: uninterpretedFragments,
          }
        : null,
    conflicts: conflicts,
  };
}

/**
 * Bounded structural-only terminal-anchor experiment. Group boundaries are
 * explicit inputs; this validator does not infer them from totals or counts.
 */
function projectTerminalPricedGroupsExperiment_(rows, groupSpecifications) {
  const rowByOrder = {};
  const consumedOrders = {};
  const groups = [];
  const conflicts = [];

  (Array.isArray(rows) ? rows : []).forEach(function (sourceRow) {
    const row = cloneObservedReceiptRowPrototype_(sourceRow);
    if (!Number.isInteger(row.order) || rowByOrder[row.order]) {
      conflicts.push({
        code: rowByOrder[row.order]
          ? "DUPLICATE_OBSERVATION_ORDER"
          : "INVALID_OBSERVATION_ORDER",
        rowOrder: row.order,
      });
    } else {
      rowByOrder[row.order] = row;
    }
  });

  (Array.isArray(groupSpecifications) ? groupSpecifications : []).forEach(
    function (specification) {
      const orders = Array.isArray(specification.sourceRowOrders)
        ? specification.sourceRowOrders.slice()
        : [];
      const terminalOrder = specification.terminalRowOrder;
      let valid = orders.length >= 2 && orders[orders.length - 1] === terminalOrder;

      orders.forEach(function (order, index) {
        const row = rowByOrder[order];
        if (!row || consumedOrders[order]) valid = false;
        if (row && row.roleEvidence !== "product") valid = false;
        if (row) {
          const hasPrice =
            hasObservedTextPrototype_(row.unitPriceText) ||
            hasObservedTextPrototype_(row.lineTotalText);
          if (index < orders.length - 1) {
            if (!hasObservedTextPrototype_(row.descriptionText) || hasPrice) {
              valid = false;
            }
          } else if (!hasPrice) {
            valid = false;
          }
        }
      });

      if (!valid) {
        conflicts.push({
          code: "INVALID_TERMINAL_PRICED_GROUP",
          rowOrder: terminalOrder || null,
        });
        return;
      }
      orders.forEach(function (order) {
        consumedOrders[order] = true;
      });
      groups.push({
        capability: "TERMINAL_PRICED_ANCHOR",
        sourceRowOrders: orders,
        terminalRowOrder: terminalOrder,
      });
    },
  );

  const unconsumedRowOrders = Object.keys(rowByOrder)
    .map(Number)
    .filter(function (order) {
      return !consumedOrders[order];
    })
    .sort(function (left, right) {
      return left - right;
    });
  if (unconsumedRowOrders.length > 0) {
    conflicts.push({
      code: "UNCONSUMED_TERMINAL_GROUP_ROWS",
      rowOrders: unconsumedRowOrders,
    });
  }

  return {
    resolved: conflicts.length === 0,
    groups: groups,
    conflicts: conflicts,
    unconsumedRowOrders: unconsumedRowOrders,
  };
}

function areContiguousObservedOrdersExperiment_(orders, observedLines) {
  if (!Array.isArray(orders) || orders.length === 0) return false;
  const indexes = orders.map(function (order) {
    return observedLines.findIndex(function (line) {
      return line.order === order;
    });
  });
  if (indexes.some(function (index) { return index < 0; })) return false;
  for (let index = 1; index < indexes.length; index++) {
    if (indexes[index] !== indexes[index - 1] + 1) return false;
  }
  return true;
}

function tableCellRawTextMatchesSourcesExperiment_(cell, observedByOrder) {
  const fragments = String(cell.rawText).split("\n");
  if (fragments.length !== cell.sourceLineOrders.length) return false;
  return fragments.every(function (fragment, index) {
    const observed = observedByOrder[cell.sourceLineOrders[index]];
    return observed &&
      hasObservedTextPrototype_(fragment) &&
      observed.rawText.indexOf(fragment) >= 0;
  });
}

function sameIntegerSetExperiment_(left, right) {
  const leftSorted = left.slice().sort(function (a, b) { return a - b; });
  const rightSorted = right.slice().sort(function (a, b) { return a - b; });
  return JSON.stringify(leftSorted) === JSON.stringify(rightSorted) &&
    new Set(leftSorted).size === leftSorted.length &&
    new Set(rightSorted).size === rightSorted.length;
}

function sameStringSetExperiment_(left, right) {
  const leftSorted = left.slice().sort();
  const rightSorted = right.slice().sort();
  return JSON.stringify(leftSorted) === JSON.stringify(rightSorted) &&
    new Set(leftSorted).size === leftSorted.length &&
    new Set(rightSorted).size === rightSorted.length;
}

function hasExactObjectKeysExperiment_(value, expectedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return JSON.stringify(Object.keys(value).sort()) ===
    JSON.stringify(expectedKeys.slice().sort());
}
