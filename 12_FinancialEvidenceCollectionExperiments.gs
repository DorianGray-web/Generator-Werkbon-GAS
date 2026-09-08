/**
 * Synthetic-only exhaustive financial evidence collector.
 *
 * The bounded structural layer supplies an explicit manifest of physical
 * monetary observations. The collector validates and inventories that
 * manifest; it does not discover values with lexical heuristics and does not
 * assign canonical financial meaning.
 */
function collectExhaustiveFinancialEvidenceExperiment_(extraction) {
  const sourceObservations = extraction && Array.isArray(
    extraction.financialSourceObservations,
  )
    ? extraction.financialSourceObservations
    : null;

  if (sourceObservations === null || sourceObservations.length === 0) {
    if (extraction && Array.isArray(extraction.observedLines)) {
      return collectObservedLineFinancialEvidenceExperiment_(extraction);
    }
    return buildFinancialProvenanceFailureExperiment_(
      "MISSING_FINANCIAL_SOURCE_MANIFEST",
      sourceObservations ? 0 : null,
    );
  }

  const provenanceKinds = {};
  sourceObservations.forEach(function (source) {
    const kind = source && source.provenanceKind;
    provenanceKinds[kind] = true;
  });
  const kinds = Object.keys(provenanceKinds);
  if (kinds.length !== 1) {
    return buildFinancialProvenanceFailureExperiment_(
      "AMBIGUOUS_FINANCIAL_PROVENANCE",
      sourceObservations.length,
    );
  }
  if (kinds[0] === "observed_line") {
    if (!Array.isArray(extraction.observedLines)) {
      return buildFinancialProvenanceFailureExperiment_(
        "MISSING_OBSERVED_LINE_PROVENANCE_SOURCE",
        sourceObservations.length,
      );
    }
    return collectObservedLineFinancialEvidenceExperiment_(extraction);
  }
  if (kinds[0] === "table_cell") {
    return collectTableCellFinancialEvidenceExperiment_(extraction);
  }
  return buildFinancialProvenanceFailureExperiment_(
    "UNSUPPORTED_FINANCIAL_PROVENANCE",
    sourceObservations.length,
  );
}

function buildFinancialProvenanceFailureExperiment_(code, declaredCount) {
  return {
    collectionComplete: false,
    observations: [],
    contextObservations: [],
    structuralEvidence: [],
    sourceAccounting: {
      declaredObservationCount: declaredCount === null ? 0 : declaredCount,
      collectedObservationCount: 0,
      validSourceReferenceCount: 0,
      uniqueObservationIdCount: 0,
      uniqueSourceConsumptionCount: 0,
      sourceOrderPreserved: false,
      sourceUnchanged: true,
    },
    conflicts: [{ code: code, observationId: null }],
    unresolved: [],
    canonicalReceipt: null,
  };
}

function collectObservedLineFinancialEvidenceExperiment_(extraction) {
  if (!extraction || !Array.isArray(extraction.observedLines)) {
    throw new Error(
      "ObservedReceiptExtraction must contain an observedLines array.",
    );
  }

  const sourceSnapshot = JSON.stringify(extraction);
  const hasSourceManifest = Array.isArray(
    extraction.financialSourceObservations,
  );
  const sourceObservations = hasSourceManifest
    ? extraction.financialSourceObservations
    : [];
  const observedByOrder = {};
  const tableIndex = indexTabularEvidenceForCollectorExperiment_(
    extraction.tableRegions,
  );
  const observations = [];
  const contextObservations = [];
  const conflicts = tableIndex.conflicts.slice();
  if (!hasSourceManifest) {
    conflicts.push({
      code: "MISSING_FINANCIAL_SOURCE_MANIFEST",
      observationId: null,
    });
  }
  const unresolved = [];
  const seenIds = {};
  const seenConsumptionKeys = {};
  let previousSourceOrder = null;
  let validSourceReferenceCount = 0;

  extraction.observedLines.forEach(function (line) {
    if (Number.isInteger(line.order) && !observedByOrder[line.order]) {
      observedByOrder[line.order] = cloneObservedReceiptRowPrototype_(line);
    }
  });

  sourceObservations.forEach(function (source, index) {
    const observation = cloneFinancialSourceObservationExperiment_(source);
    const observationId = observation.observationId || "observation-" + index;
    const sourceOrder = buildFinancialSourceOrderExperiment_(
      observation.sourceRef,
    );
    let sourceReferenceValid = true;

    if (
      !hasExactObjectKeysExperiment_(source, [
        "provenanceKind",
        "observationId",
        "sourceContext",
        "rawValue",
        "structuralCapability",
        "sourceRef",
        "printedLabelText",
        "headerCellRef",
        "adjacentUninterpretedFragments",
      ]) ||
      !hasExactObjectKeysExperiment_(source && source.sourceRef, [
        "sourceLineOrders",
        "occurrenceOrder",
        "groupId",
        "regionId",
        "rowId",
        "cellId",
      ]) ||
      !Array.isArray(source && source.adjacentUninterpretedFragments) ||
      source.adjacentUninterpretedFragments.some(function (fragment) {
        return !hasExactObjectKeysExperiment_(fragment, [
          "rawText",
          "sourceLineOrders",
        ]);
      })
    ) {
      conflicts.push({
        code: "INVALID_FINANCIAL_SOURCE_SHAPE",
        observationId: observationId,
      });
      sourceReferenceValid = false;
    }

    if (!hasObservedTextPrototype_(observation.observationId)) {
      conflicts.push({
        code: "INVALID_FINANCIAL_OBSERVATION_ID",
        observationId: observationId,
      });
    } else if (seenIds[observation.observationId]) {
      conflicts.push({
        code: "DUPLICATE_FINANCIAL_OBSERVATION_ID",
        observationId: observation.observationId,
      });
    } else {
      seenIds[observation.observationId] = true;
    }

    if (
      [
        "product_group",
        "table_cell",
        "summary",
        "adjustment_like",
        "tender_like",
        "unknown",
      ].indexOf(observation.sourceContext) < 0
    ) {
      conflicts.push({
        code: "UNSUPPORTED_FINANCIAL_SOURCE_CONTEXT",
        observationId: observationId,
      });
    }

    if (
      [
        "FORWARD_PRICED_ANCHOR",
        "TERMINAL_PRICED_ANCHOR",
        "TABULAR_CELL_ROW",
        "SUMMARY_REGION",
        "UNRESOLVED_REGION",
      ].indexOf(observation.structuralCapability) < 0 ||
      (observation.sourceContext === "table_cell" &&
        observation.structuralCapability !== "TABULAR_CELL_ROW") ||
      (observation.sourceContext === "product_group" &&
        !hasObservedTextPrototype_(observation.sourceRef.groupId))
    ) {
      conflicts.push({
        code: "INVALID_FINANCIAL_STRUCTURAL_CAPABILITY",
        observationId: observationId,
      });
      sourceReferenceValid = false;
    }

    if (!hasObservedTextPrototype_(observation.rawValue)) {
      conflicts.push({
        code: "MISSING_FINANCIAL_RAW_VALUE",
        observationId: observationId,
      });
      sourceReferenceValid = false;
    }

    if (
      !sourceOrder ||
      observation.sourceRef.sourceLineOrders.some(function (order, orderIndex) {
        return !Number.isInteger(order) || order <= 0 ||
          (orderIndex > 0 &&
            order <= observation.sourceRef.sourceLineOrders[orderIndex - 1]);
      }) ||
      observation.sourceRef.sourceLineOrders.some(function (order) {
        return !observedByOrder[order];
      })
    ) {
      conflicts.push({
        code: "MISSING_FINANCIAL_SOURCE_REFERENCE",
        observationId: observationId,
      });
      sourceReferenceValid = false;
    }

    if (
      sourceOrder &&
      previousSourceOrder &&
      compareFinancialSourceOrderExperiment_(sourceOrder, previousSourceOrder) <= 0
    ) {
      conflicts.push({
        code: "INVALID_FINANCIAL_SOURCE_ORDER",
        observationId: observationId,
      });
    }
    if (sourceOrder) previousSourceOrder = sourceOrder;

    const consumptionKey = buildFinancialConsumptionKeyExperiment_(
      observation,
    );
    if (!consumptionKey || seenConsumptionKeys[consumptionKey]) {
      conflicts.push({
        code: consumptionKey
          ? "DUPLICATE_FINANCIAL_SOURCE_CONSUMPTION"
          : "MISSING_FINANCIAL_SOURCE_REFERENCE",
        observationId: observationId,
      });
      sourceReferenceValid = false;
    } else {
      seenConsumptionKeys[consumptionKey] = true;
    }

    if (
      sourceReferenceValid &&
      !financialRawValueMatchesSourceExperiment_(
        observation,
        observedByOrder,
        tableIndex,
      )
    ) {
      conflicts.push({
        code: "FINANCIAL_SOURCE_RAW_VALUE_MISMATCH",
        observationId: observationId,
      });
      sourceReferenceValid = false;
    }

    if (
      sourceReferenceValid &&
      !financialLabelMatchesSourceExperiment_(
        observation,
        observedByOrder,
        tableIndex,
      )
    ) {
      conflicts.push({
        code: "FINANCIAL_SOURCE_LABEL_MISMATCH",
        observationId: observationId,
      });
      sourceReferenceValid = false;
    }

    if (
      !validateAdjacentFinancialFragmentsExperiment_(
        observation.adjacentUninterpretedFragments,
        observedByOrder,
      )
    ) {
      conflicts.push({
        code: "INVALID_ADJACENT_FINANCIAL_FRAGMENT",
        observationId: observationId,
      });
      sourceReferenceValid = false;
    }

    if (sourceReferenceValid) validSourceReferenceCount += 1;
    if (observation.sourceContext === "unknown") {
      unresolved.push({
        observationId: observationId,
        code: "UNRESOLVED_FINANCIAL_SOURCE_CONTEXT",
      });
    }
    observations.push(observation);
  });

  const productCount =
    extraction.summaryEvidence &&
    extraction.summaryEvidence.printedProductCount
      ? extraction.summaryEvidence.printedProductCount
      : null;
  if (productCount) {
    const sourceLine = observedByOrder[productCount.sourceLineOrder];
    if (
      !sourceLine ||
      sourceLine.rawText !== productCount.rawText ||
      productCount.rawText.indexOf(productCount.valueText) < 0
    ) {
      conflicts.push({
        code: "INVALID_FINANCIAL_CONTEXT_SOURCE",
        observationId: "printed-product-count",
      });
    }
    contextObservations.push({
      contextId: "printed-product-count",
      sourceLineOrder: productCount.sourceLineOrder,
      rawText: productCount.rawText,
      printedLabelText: productCount.labelText,
      rawValue: productCount.valueText,
    });
  }

  const sourceUnchanged = JSON.stringify(extraction) === sourceSnapshot;
  if (!sourceUnchanged) {
    conflicts.push({
      code: "FINANCIAL_COLLECTOR_MUTATED_SOURCE",
      observationId: null,
    });
  }

  return {
    collectionComplete:
      conflicts.length === 0 &&
      observations.length === sourceObservations.length &&
      validSourceReferenceCount === sourceObservations.length,
    observations: observations,
    contextObservations: contextObservations,
    sourceAccounting: {
      declaredObservationCount: sourceObservations.length,
      collectedObservationCount: observations.length,
      validSourceReferenceCount: validSourceReferenceCount,
      uniqueObservationIdCount: Object.keys(seenIds).length,
      uniqueSourceConsumptionCount: Object.keys(seenConsumptionKeys).length,
      sourceOrderPreserved: !conflicts.some(function (conflict) {
        return conflict.code === "INVALID_FINANCIAL_SOURCE_ORDER";
      }),
      sourceUnchanged: sourceUnchanged,
    },
    conflicts: conflicts,
    unresolved: unresolved,
    canonicalReceipt: null,
  };
}

function cloneFinancialSourceObservationExperiment_(source) {
  const observation = source && typeof source === "object" ? source : {};
  const sourceRef =
    observation.sourceRef && typeof observation.sourceRef === "object"
      ? observation.sourceRef
      : {};
  return {
    provenanceKind: observation.provenanceKind,
    observationId: observation.observationId,
    sourceContext: observation.sourceContext,
    rawValue: observation.rawValue,
    structuralCapability: observation.structuralCapability,
    sourceRef: {
      sourceLineOrders: Array.isArray(sourceRef.sourceLineOrders)
        ? sourceRef.sourceLineOrders.slice()
        : [],
      occurrenceOrder: sourceRef.occurrenceOrder,
      groupId: sourceRef.groupId === undefined ? null : sourceRef.groupId,
      regionId: sourceRef.regionId === undefined ? null : sourceRef.regionId,
      rowId: sourceRef.rowId === undefined ? null : sourceRef.rowId,
      cellId: sourceRef.cellId === undefined ? null : sourceRef.cellId,
    },
    printedLabelText:
      observation.printedLabelText === undefined
        ? null
        : observation.printedLabelText,
    headerCellRef:
      observation.headerCellRef === undefined
        ? null
        : observation.headerCellRef,
    adjacentUninterpretedFragments: Array.isArray(
      observation.adjacentUninterpretedFragments,
    )
      ? observation.adjacentUninterpretedFragments.map(function (fragment) {
          return {
            rawText: fragment && fragment.rawText,
            sourceLineOrders:
              fragment && Array.isArray(fragment.sourceLineOrders)
                ? fragment.sourceLineOrders.slice()
                : [],
          };
        })
      : [],
  };
}

function collectTableCellFinancialEvidenceExperiment_(extraction) {
  const sourceSnapshot = JSON.stringify(extraction);
  const sourceObservations = Array.isArray(extraction.financialSourceObservations)
    ? extraction.financialSourceObservations
    : [];
  const sourceStructuralEvidence = Array.isArray(
    extraction.structuralSourceEvidence,
  )
    ? extraction.structuralSourceEvidence
    : [];
  const sourceUnresolvedEvidence = Array.isArray(
    extraction.unresolvedSourceEvidence,
  )
    ? extraction.unresolvedSourceEvidence
    : [];
  const observations = sourceObservations.map(function (item) {
        return cloneTableCellEvidenceExperiment_(item, "value");
      });
  const structuralEvidence = sourceStructuralEvidence.map(function (item) {
        return cloneTableCellEvidenceExperiment_(item, "structural");
      });
  const unresolvedEvidence = sourceUnresolvedEvidence.map(function (item) {
        return cloneTableCellEvidenceExperiment_(item, "unresolved");
      });
  const assessment = extraction.tableAssessment;
  const sourceSha = extraction.sourceIntegrity && extraction.sourceIntegrity.sha256;
  const tableIndex = indexTableLocalEvidenceForCollectorExperiment_(
    extraction.tableEvidence,
    sourceSha,
  );
  const conflicts = tableIndex.conflicts.slice();
  const seenIds = {};
  const seenCellAttempts = {};
  const accountedCells = {};
  let validSourceReferenceCount = 0;

  if (!extraction.tableEvidence) {
    conflicts.push({ code: "NO_TABLE_EVIDENCE", observationId: null });
  }
  if (
    !assessment ||
    assessment.resolved !== true ||
    assessment.coordinateSystem !== "table-local" ||
    assessment.crossRepresentationAlignment !== "unresolved"
  ) {
    conflicts.push({
      code: "UNRESOLVED_TABLE_EVIDENCE",
      observationId: null,
    });
  }
  if (!hasObservedTextPrototype_(sourceSha)) {
    conflicts.push({ code: "MISSING_TABLE_SOURCE_SHA", observationId: null });
  }

  function validateEvidence(item, source, kind) {
    const id = kind === "value" ? item.occurrenceId : item.evidenceId;
    const expectedKeys = kind === "value"
      ? [
          "provenanceKind", "occurrenceId", "rawValue", "rawText",
          "emptyEvidence", "literalHeaderRawText", "headerCellRef",
          "tableLocalRef",
        ]
      : [
          "provenanceKind", "evidenceId", "rawText", "emptyEvidence",
          "literalHeaderRawText", "headerCellRef", "tableLocalRef",
        ].concat(kind === "unresolved" ? ["unresolvedCode"] : []);
    let valid = true;
    if (
      !hasExactObjectKeysExperiment_(source, expectedKeys) ||
      item.provenanceKind !== "table_cell" ||
      !hasObservedTextPrototype_(id) ||
      !hasExactObjectKeysExperiment_(source && source.tableLocalRef, [
        "sourceImageSha256", "regionId", "rowId", "tableRowOrder",
        "cellId", "columnOrder",
      ])
    ) {
      conflicts.push({
        code: "INVALID_TABLE_CELL_PROVENANCE_SHAPE",
        observationId: id || null,
      });
      return;
    }
    if (seenIds[id]) {
      conflicts.push({
        code: "DUPLICATE_FINANCIAL_OBSERVATION_ID",
        observationId: id,
      });
      valid = false;
    } else {
      seenIds[id] = true;
    }
    const ref = item.tableLocalRef;
    const cellKey = [ref.regionId, ref.rowId, ref.cellId].join("|");
    const indexed = tableIndex.cells[cellKey];
    const header = tableIndex.headers[
      [ref.regionId, item.headerCellRef].join("|")
    ];
    if (
      ref.sourceImageSha256 !== sourceSha ||
      !indexed ||
      indexed.row.rowKindEvidence !== "data" ||
      indexed.row.tableRowOrder !== ref.tableRowOrder ||
      indexed.cell.columnOrder !== ref.columnOrder ||
      indexed.cell.headerCellRef !== item.headerCellRef ||
      indexed.cell.rawText !== item.rawText ||
      indexed.cell.emptyEvidence !== item.emptyEvidence ||
      !header ||
      header.cell.columnOrder !== indexed.cell.columnOrder ||
      header.cell.rawText !== item.literalHeaderRawText
    ) {
      conflicts.push({
        code: "INVALID_TABLE_CELL_SOURCE_REFERENCE",
        observationId: id,
      });
      valid = false;
    }
    if (
      (kind === "value" &&
        (item.emptyEvidence ||
          !hasObservedTextPrototype_(item.rawValue) ||
          item.rawValue !== item.rawText)) ||
      (kind === "unresolved" && !hasObservedTextPrototype_(item.unresolvedCode))
    ) {
      conflicts.push({
        code: kind === "value"
          ? "INVALID_TABLE_VALUE_OCCURRENCE"
          : "INVALID_TABLE_UNRESOLVED_EVIDENCE",
        observationId: id,
      });
      valid = false;
    }
    if (seenCellAttempts[cellKey]) {
      conflicts.push({
        code: "DUPLICATE_FINANCIAL_SOURCE_CONSUMPTION",
        observationId: id,
      });
      valid = false;
    } else {
      seenCellAttempts[cellKey] = true;
    }
    if (valid) {
      validSourceReferenceCount += 1;
      accountedCells[cellKey] = true;
    }
  }

  observations.forEach(function (item, index) {
    validateEvidence(item, sourceObservations[index], "value");
  });
  structuralEvidence.forEach(function (item, index) {
    validateEvidence(item, sourceStructuralEvidence[index], "structural");
  });
  unresolvedEvidence.forEach(function (item, index) {
    validateEvidence(item, sourceUnresolvedEvidence[index], "unresolved");
  });

  Object.keys(tableIndex.dataCells).forEach(function (cellKey) {
    if (!accountedCells[cellKey]) {
      conflicts.push({
        code: "INCOMPLETE_TABLE_CELL_ACCOUNTING",
        observationId: null,
        cellId: tableIndex.dataCells[cellKey].cell.cellId,
      });
    }
  });

  const orderedEvidence = observations.concat(
    structuralEvidence,
    unresolvedEvidence,
  ).slice().sort(compareTableCellEvidenceExperiment_);
  const sourceUnchanged = JSON.stringify(extraction) === sourceSnapshot;
  if (!sourceUnchanged) {
    conflicts.push({
      code: "FINANCIAL_COLLECTOR_MUTATED_SOURCE",
      observationId: null,
    });
  }
  return {
    collectionComplete:
      conflicts.length === 0 &&
      unresolvedEvidence.length === 0 &&
      Object.keys(accountedCells).length ===
        Object.keys(tableIndex.dataCells).length,
    observations: observations.slice().sort(compareTableCellEvidenceExperiment_),
    contextObservations: tableIndex.headerContexts,
    structuralEvidence: structuralEvidence.slice().sort(
      compareTableCellEvidenceExperiment_,
    ),
    sourceAccounting: {
      provenanceKind: "table_cell",
      headerCellCount: tableIndex.headerContexts.length,
      dataCellCount: Object.keys(tableIndex.dataCells).length,
      accountedDataCellCount: Object.keys(accountedCells).filter(function (key) {
        return Boolean(tableIndex.dataCells[key]);
      }).length,
      declaredObservationCount: observations.length,
      collectedObservationCount: observations.length,
      structuralEvidenceCount: structuralEvidence.length,
      unresolvedEvidenceCount: unresolvedEvidence.length,
      validSourceReferenceCount: validSourceReferenceCount,
      uniqueObservationIdCount: Object.keys(seenIds).length,
      uniqueSourceConsumptionCount: Object.keys(accountedCells).length,
      sourceOrderPreserved: tableEvidenceOrderPreservedExperiment_(orderedEvidence),
      sourceUnchanged: sourceUnchanged,
    },
    conflicts: conflicts,
    unresolved: unresolvedEvidence,
    canonicalReceipt: null,
  };
}

function cloneTableCellEvidenceExperiment_(source, kind) {
  const item = source && typeof source === "object" ? source : {};
  const ref = item.tableLocalRef && typeof item.tableLocalRef === "object"
    ? item.tableLocalRef
    : {};
  const clone = {
    provenanceKind: item.provenanceKind,
    rawText: item.rawText,
    emptyEvidence: item.emptyEvidence,
    literalHeaderRawText: item.literalHeaderRawText,
    headerCellRef: item.headerCellRef,
    tableLocalRef: {
      sourceImageSha256: ref.sourceImageSha256,
      regionId: ref.regionId,
      rowId: ref.rowId,
      tableRowOrder: ref.tableRowOrder,
      cellId: ref.cellId,
      columnOrder: ref.columnOrder,
    },
  };
  if (kind === "value") {
    clone.occurrenceId = item.occurrenceId;
    clone.rawValue = item.rawValue;
  } else {
    clone.evidenceId = item.evidenceId;
    if (kind === "unresolved") clone.unresolvedCode = item.unresolvedCode;
  }
  return clone;
}

function indexTableLocalEvidenceForCollectorExperiment_(tableEvidence, sourceSha) {
  const cells = {};
  const headers = {};
  const dataCells = {};
  const headerContexts = [];
  const conflicts = [];
  const seenCellIds = {};
  (tableEvidence && Array.isArray(tableEvidence.regions)
    ? tableEvidence.regions
    : []).forEach(function (region) {
    const regionId = region && region.regionId;
    let previousRowOrder = 0;
    (region && Array.isArray(region.rows) ? region.rows : []).forEach(
      function (row) {
        let previousColumnOrder = 0;
        if (
          !hasObservedTextPrototype_(regionId) ||
          !hasObservedTextPrototype_(row && row.rowId) ||
          !Number.isInteger(row && row.tableRowOrder) ||
          row.tableRowOrder <= previousRowOrder ||
          ["header", "data"].indexOf(row && row.rowKindEvidence) < 0
        ) {
          conflicts.push({ code: "INVALID_COLLECTOR_TABLE_INDEX", observationId: null });
        }
        previousRowOrder = row && row.tableRowOrder;
        (row && Array.isArray(row.cells) ? row.cells : []).forEach(function (cell) {
          const key = [regionId, row.rowId, cell && cell.cellId].join("|");
          if (
            !hasObservedTextPrototype_(cell && cell.cellId) ||
            seenCellIds[cell.cellId] ||
            !Number.isInteger(cell.columnOrder) ||
            cell.columnOrder <= previousColumnOrder
          ) {
            conflicts.push({ code: "INVALID_COLLECTOR_TABLE_INDEX", observationId: null });
          }
          previousColumnOrder = cell && cell.columnOrder;
          seenCellIds[cell && cell.cellId] = true;
          const indexed = { region: region, row: row, cell: cell };
          cells[key] = indexed;
          if (row.rowKindEvidence === "header") {
            headers[[regionId, cell.cellId].join("|")] = indexed;
            headerContexts.push({
              provenanceKind: "table_cell",
              tableLocalRef: {
                sourceImageSha256: sourceSha,
                regionId: regionId,
                rowId: row.rowId,
                tableRowOrder: row.tableRowOrder,
                cellId: cell.cellId,
                columnOrder: cell.columnOrder,
              },
              rawText: cell.rawText,
              emptyEvidence: cell.emptyEvidence,
            });
          } else if (row.rowKindEvidence === "data") {
            dataCells[key] = indexed;
          }
        });
      },
    );
  });
  return {
    cells: cells,
    headers: headers,
    dataCells: dataCells,
    headerContexts: headerContexts,
    conflicts: conflicts,
  };
}

function compareTableCellEvidenceExperiment_(left, right) {
  const leftRef = left.tableLocalRef;
  const rightRef = right.tableLocalRef;
  if (leftRef.regionId !== rightRef.regionId) {
    return leftRef.regionId < rightRef.regionId ? -1 : 1;
  }
  if (leftRef.tableRowOrder !== rightRef.tableRowOrder) {
    return leftRef.tableRowOrder - rightRef.tableRowOrder;
  }
  return leftRef.columnOrder - rightRef.columnOrder;
}

function tableEvidenceOrderPreservedExperiment_(items) {
  return items.every(function (item, index) {
    return index === 0 ||
      compareTableCellEvidenceExperiment_(items[index - 1], item) < 0;
  });
}

/**
 * Experimental package composer for independently collected provenance
 * domains from one source document. It does not align, flatten, interpret, or
 * deduplicate evidence across domains.
 */
function buildMultiDomainFinancialEvidencePackageExperiment_(
  sourceDocumentIdentity,
  evidenceDomains,
) {
  const sourceSnapshot = JSON.stringify({
    sourceDocumentIdentity: sourceDocumentIdentity,
    evidenceDomains: evidenceDomains,
  });
  const sourceIdentity = sourceDocumentIdentity &&
    typeof sourceDocumentIdentity === "object"
      ? JSON.parse(JSON.stringify(sourceDocumentIdentity))
      : {};
  const domains = Array.isArray(evidenceDomains)
    ? JSON.parse(JSON.stringify(evidenceDomains))
    : [];
  const conflicts = [];
  const domainIds = {};
  const provenanceKinds = {};
  let unresolvedDomainCount = 0;

  if (
    !hasExactObjectKeysExperiment_(sourceDocumentIdentity, ["sha256"]) ||
    !hasObservedTextPrototype_(sourceIdentity.sha256)
  ) {
    conflicts.push({ code: "INVALID_SOURCE_DOCUMENT_IDENTITY", domainId: null });
  }
  if (!Array.isArray(evidenceDomains) || domains.length < 2) {
    conflicts.push({ code: "MULTIPLE_EVIDENCE_DOMAINS_REQUIRED", domainId: null });
  }

  const domainAccounting = domains.map(function (domain) {
    const domainId = domain && domain.domainId;
    const provenanceKind = domain && domain.provenanceKind;
    const collection = domain && domain.collection;
    const scope = domain && domain.sourceScope;
    let domainValid = true;

    if (
      !hasExactObjectKeysExperiment_(domain, [
        "domainId",
        "provenanceKind",
        "sourceDocumentSha256",
        "sourceScope",
        "collection",
      ]) ||
      !hasExactObjectKeysExperiment_(scope, [
        "scopeKind",
        "includedSourceIds",
        "excludedSourceIds",
        "completeWithinScope",
      ])
    ) {
      conflicts.push({
        code: "INVALID_EVIDENCE_DOMAIN_SHAPE",
        domainId: domainId || null,
      });
      domainValid = false;
    }
    if (!hasObservedTextPrototype_(domainId) || domainIds[domainId]) {
      conflicts.push({
        code: "INVALID_OR_DUPLICATE_EVIDENCE_DOMAIN_ID",
        domainId: domainId || null,
      });
      domainValid = false;
    } else {
      domainIds[domainId] = true;
    }
    if (["observed_line", "table_cell"].indexOf(provenanceKind) < 0) {
      conflicts.push({
        code: "UNSUPPORTED_EVIDENCE_DOMAIN_PROVENANCE",
        domainId: domainId || null,
      });
      domainValid = false;
    } else if (provenanceKinds[provenanceKind]) {
      conflicts.push({
        code: "DUPLICATE_EVIDENCE_PROVENANCE_DOMAIN",
        domainId: domainId || null,
      });
      domainValid = false;
    } else {
      provenanceKinds[provenanceKind] = true;
    }
    if (
      !domain ||
      domain.sourceDocumentSha256 !== sourceIdentity.sha256 ||
      !hasObservedTextPrototype_(domain.sourceDocumentSha256)
    ) {
      conflicts.push({
        code: "SOURCE_DOCUMENT_IDENTITY_MISMATCH",
        domainId: domainId || null,
      });
      domainValid = false;
    }
    if (
      !scope ||
      !hasObservedTextPrototype_(scope.scopeKind) ||
      !Array.isArray(scope.includedSourceIds) ||
      scope.includedSourceIds.length === 0 ||
      scope.includedSourceIds.some(function (sourceId) {
        return !hasObservedTextPrototype_(sourceId);
      }) ||
      new Set(scope.includedSourceIds).size !== scope.includedSourceIds.length ||
      !Array.isArray(scope.excludedSourceIds) ||
      scope.excludedSourceIds.some(function (sourceId) {
        return !hasObservedTextPrototype_(sourceId);
      }) ||
      new Set(scope.excludedSourceIds).size !== scope.excludedSourceIds.length ||
      scope.completeWithinScope !== true
    ) {
      conflicts.push({
        code: "INCOMPLETE_EVIDENCE_DOMAIN_SCOPE",
        domainId: domainId || null,
      });
      domainValid = false;
    }
    if (
      !collection ||
      collection.collectionComplete !== true ||
      !Array.isArray(collection.conflicts) ||
      collection.conflicts.length > 0 ||
      !Array.isArray(collection.unresolved) ||
      collection.unresolved.length > 0 ||
      collection.canonicalReceipt !== null
    ) {
      conflicts.push({
        code: "INCOMPLETE_EVIDENCE_DOMAIN_COLLECTION",
        domainId: domainId || null,
      });
      domainValid = false;
    }

    const values = collection && Array.isArray(collection.observations)
      ? collection.observations
      : [];
    const structural = collection && Array.isArray(collection.structuralEvidence)
      ? collection.structuralEvidence
      : [];
    const context = collection && Array.isArray(collection.contextObservations)
      ? collection.contextObservations
      : [];
    const unresolved = collection && Array.isArray(collection.unresolved)
      ? collection.unresolved
      : [];
    const provenanceItems = values.concat(structural).filter(function (item) {
      return item && item.provenanceKind !== provenanceKind;
    });
    if (provenanceItems.length > 0) {
      conflicts.push({
        code: "EVIDENCE_DOMAIN_PROVENANCE_MISMATCH",
        domainId: domainId || null,
      });
      domainValid = false;
    }
    const scopeAccounting = buildEvidenceDomainScopeAccountingExperiment_(
      provenanceKind,
      values,
      structural,
      context,
      unresolved,
    );
    if (
      !scopeAccounting.valid ||
      !sameStringSetExperiment_(
        scope && Array.isArray(scope.includedSourceIds)
          ? scope.includedSourceIds
          : [],
        scopeAccounting.accountedSourceIds,
      ) ||
      (scope && Array.isArray(scope.excludedSourceIds)
        ? scope.excludedSourceIds
        : []).some(function (sourceId) {
          return scopeAccounting.accountedSourceIds.indexOf(sourceId) >= 0;
        })
    ) {
      conflicts.push({
        code: "INCOMPLETE_EVIDENCE_DOMAIN_ACCOUNTING",
        domainId: domainId || null,
      });
      domainValid = false;
    }
    if (!domainValid) unresolvedDomainCount += 1;
    return {
      domainId: domainId || null,
      provenanceKind: provenanceKind || null,
      sourceScopeKind: scope && scope.scopeKind ? scope.scopeKind : null,
      includedSourceCount:
        scope && Array.isArray(scope.includedSourceIds)
          ? scope.includedSourceIds.length
          : 0,
      excludedSourceCount:
        scope && Array.isArray(scope.excludedSourceIds)
          ? scope.excludedSourceIds.length
          : 0,
      accountedSourceCount: scopeAccounting.accountedSourceIds.length,
      valueOccurrenceCount: values.length,
      structuralEvidenceCount: structural.length,
      contextEvidenceCount: context.length,
      unresolvedEvidenceCount: unresolved.length,
      collectionComplete: domainValid,
    };
  });

  const sourceUnchanged = JSON.stringify({
    sourceDocumentIdentity: sourceDocumentIdentity,
    evidenceDomains: evidenceDomains,
  }) === sourceSnapshot;
  if (!sourceUnchanged) {
    conflicts.push({ code: "MULTI_DOMAIN_PACKAGE_MUTATED_SOURCE", domainId: null });
  }
  return {
    sourceDocumentIdentity: sourceIdentity,
    evidenceDomains: domains,
    crossRepresentationAlignment: "unresolved",
    collectionComplete:
      conflicts.length === 0 &&
      domains.length >= 2 &&
      unresolvedDomainCount === 0,
    sourceAccounting: {
      domainCount: domains.length,
      uniqueDomainIdCount: Object.keys(domainIds).length,
      provenanceDomainCount: Object.keys(provenanceKinds).length,
      unresolvedDomainCount: unresolvedDomainCount,
      valueOccurrenceCount: domainAccounting.reduce(function (total, item) {
        return total + item.valueOccurrenceCount;
      }, 0),
      structuralEvidenceCount: domainAccounting.reduce(function (total, item) {
        return total + item.structuralEvidenceCount;
      }, 0),
      contextEvidenceCount: domainAccounting.reduce(function (total, item) {
        return total + item.contextEvidenceCount;
      }, 0),
      sourceUnchanged: sourceUnchanged,
      domains: domainAccounting,
    },
    conflicts: conflicts,
    canonicalReceipt: null,
  };
}

function buildEvidenceDomainScopeAccountingExperiment_(
  provenanceKind,
  values,
  structural,
  context,
  unresolved,
) {
  const sourceIds = {};
  let valid = true;
  const evidenceItems = values.concat(structural, context, unresolved);

  evidenceItems.forEach(function (item) {
    if (provenanceKind === "table_cell") {
      const ref = item && item.tableLocalRef;
      if (
        !ref ||
        !hasObservedTextPrototype_(ref.regionId) ||
        !hasObservedTextPrototype_(ref.rowId) ||
        !hasObservedTextPrototype_(ref.cellId)
      ) {
        valid = false;
        return;
      }
      sourceIds[
        ["table-cell", ref.regionId, ref.rowId, ref.cellId].join(":")
      ] = true;
      return;
    }
    if (provenanceKind === "observed_line") {
      const orders = item && item.sourceRef &&
        Array.isArray(item.sourceRef.sourceLineOrders)
          ? item.sourceRef.sourceLineOrders
          : item && Number.isInteger(item.sourceLineOrder)
            ? [item.sourceLineOrder]
            : [];
      if (
        orders.length === 0 ||
        orders.some(function (order) {
          return !Number.isInteger(order) || order <= 0;
        })
      ) {
        valid = false;
        return;
      }
      orders.forEach(function (order) {
        sourceIds["observed-line:" + order] = true;
      });
      return;
    }
    valid = false;
  });

  return {
    valid: valid,
    accountedSourceIds: Object.keys(sourceIds).sort(),
  };
}

function indexTabularEvidenceForCollectorExperiment_(sourceRegions) {
  const regions = {};
  const rows = {};
  const cells = {};
  const conflicts = [];
  (Array.isArray(sourceRegions) ? sourceRegions : []).forEach(function (region) {
    const regionId = region && region.regionId;
    if (!hasObservedTextPrototype_(regionId) || regions[regionId]) {
      conflicts.push({
        code: "INVALID_COLLECTOR_TABLE_INDEX",
        observationId: null,
      });
      return;
    }
    regions[regionId] = region;
    (Array.isArray(region.rows) ? region.rows : []).forEach(function (row) {
      const rowKey = regionId + "|" + (row && row.rowId);
      rows[rowKey] = row;
      (row && Array.isArray(row.cells) ? row.cells : []).forEach(function (cell) {
        const cellKey = rowKey + "|" + (cell && cell.cellId);
        if (cells[cellKey]) {
          conflicts.push({
            code: "INVALID_COLLECTOR_TABLE_INDEX",
            observationId: null,
          });
        } else {
          cells[cellKey] = cell;
        }
      });
    });
  });
  return { regions: regions, rows: rows, cells: cells, conflicts: conflicts };
}

function buildFinancialSourceOrderExperiment_(sourceRef) {
  if (
    !sourceRef ||
    !Array.isArray(sourceRef.sourceLineOrders) ||
    sourceRef.sourceLineOrders.length === 0 ||
    !Number.isInteger(sourceRef.occurrenceOrder) ||
    sourceRef.occurrenceOrder <= 0
  ) {
    return null;
  }
  return {
    lineOrder: sourceRef.sourceLineOrders[0],
    occurrenceOrder: sourceRef.occurrenceOrder,
  };
}

function compareFinancialSourceOrderExperiment_(left, right) {
  if (left.lineOrder !== right.lineOrder) {
    return left.lineOrder - right.lineOrder;
  }
  return left.occurrenceOrder - right.occurrenceOrder;
}

function buildFinancialConsumptionKeyExperiment_(observation) {
  const sourceRef = observation.sourceRef;
  if (observation.sourceContext === "table_cell") {
    if (
      !hasObservedTextPrototype_(sourceRef.regionId) ||
      !hasObservedTextPrototype_(sourceRef.rowId) ||
      !hasObservedTextPrototype_(sourceRef.cellId)
    ) {
      return null;
    }
    return [
      "cell",
      sourceRef.regionId,
      sourceRef.rowId,
      sourceRef.cellId,
    ].join("|");
  }
  if (!Number.isInteger(sourceRef.occurrenceOrder)) return null;
  return [
    "line",
    sourceRef.sourceLineOrders.join(","),
    sourceRef.occurrenceOrder,
  ].join("|");
}

function financialRawValueMatchesSourceExperiment_(
  observation,
  observedByOrder,
  tableIndex,
) {
  if (observation.sourceContext === "table_cell") {
    const key = [
      observation.sourceRef.regionId,
      observation.sourceRef.rowId,
      observation.sourceRef.cellId,
    ].join("|");
    const cell = tableIndex.cells[key];
    return Boolean(
      cell &&
      cell.rawText === observation.rawValue &&
      JSON.stringify(cell.sourceLineOrders) ===
        JSON.stringify(observation.sourceRef.sourceLineOrders),
    );
  }
  return observation.sourceRef.sourceLineOrders.some(function (order) {
    return observedByOrder[order].rawText.indexOf(observation.rawValue) >= 0;
  });
}

function financialLabelMatchesSourceExperiment_(
  observation,
  observedByOrder,
  tableIndex,
) {
  if (observation.sourceContext === "table_cell") {
    const dataKey = [
      observation.sourceRef.regionId,
      observation.sourceRef.rowId,
      observation.sourceRef.cellId,
    ].join("|");
    const dataCell = tableIndex.cells[dataKey];
    if (!dataCell || dataCell.headerCellRef !== observation.headerCellRef) {
      return false;
    }
    const region = tableIndex.regions[observation.sourceRef.regionId];
    const headerKey = [
      observation.sourceRef.regionId,
      region && region.headerRowId,
      observation.headerCellRef,
    ].join("|");
    const headerCell = tableIndex.cells[headerKey];
    return Boolean(
      headerCell &&
      headerCell.rawText === observation.printedLabelText,
    );
  }
  if (observation.headerCellRef !== null) return false;
  if (observation.printedLabelText === null) return true;
  if (!hasObservedTextPrototype_(observation.printedLabelText)) return false;
  return observation.sourceRef.sourceLineOrders.some(function (order) {
    return observedByOrder[order].rawText.indexOf(
      observation.printedLabelText,
    ) >= 0;
  });
}

function validateAdjacentFinancialFragmentsExperiment_(
  fragments,
  observedByOrder,
) {
  return fragments.every(function (fragment) {
    if (
      !hasExactObjectKeysExperiment_(fragment, [
        "rawText",
        "sourceLineOrders",
      ]) ||
      !hasObservedTextPrototype_(fragment.rawText) ||
      fragment.sourceLineOrders.length === 0
    ) {
      return false;
    }
    return fragment.sourceLineOrders.some(function (order) {
      const line = observedByOrder[order];
      return line && line.rawText.indexOf(fragment.rawText) >= 0;
    });
  });
}
