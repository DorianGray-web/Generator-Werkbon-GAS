function cloneCandidateSummaryEvidencePrototype_(source, includeTotalType) {
  if (!source) return null;

  const clone = {
    sourceLineOrder: source.sourceLineOrder,
    rawText: source.rawText,
    labelText: source.labelText,
    valueText: source.valueText,
  };
  if (includeTotalType) {
    clone.totalTypeEvidence = source.totalTypeEvidence;
  }
  return clone;
}

function clonePrototypeIssue_(issue) {
  const clone = {};
  Object.keys(issue || {}).forEach(function (key) {
    clone[key] = issue[key];
  });
  return clone;
}

/**
 * Partitions only explicit Stage-1 role evidence. It never infers a header,
 * product, summary, or informational role from text, indentation, or missing
 * prices.
 * roleEvidence remains non-authoritative perception evidence.
 */
function partitionObservedReceiptEvidencePrototype_(extraction) {
  const headerObservations = [];
  const productObservations = [];
  const summaryObservations = [];
  const informationalObservations = [];
  const unclassifiedObservations = [];
  const conflicts = [];
  const observationByOrder = {};
  const seenOrders = {};
  let phase = "header";
  let previousOrder = null;

  extraction.observedLines.forEach(function (sourceLine) {
    const line = cloneObservedReceiptRowPrototype_(sourceLine);
    let classifiable = true;

    if (!Number.isInteger(line.order) || line.order <= 0) {
      conflicts.push({
        code: "INVALID_OBSERVATION_ORDER",
        rowOrder: line.order,
      });
      classifiable = false;
    } else if (seenOrders[line.order]) {
      conflicts.push({
        code: "DUPLICATE_OBSERVATION_ORDER",
        rowOrder: line.order,
      });
      classifiable = false;
    } else if (previousOrder !== null && line.order <= previousOrder) {
      conflicts.push({
        code: "INVALID_OBSERVATION_ORDER",
        rowOrder: line.order,
      });
      classifiable = false;
    } else {
      seenOrders[line.order] = true;
      observationByOrder[line.order] = line;
      previousOrder = line.order;
    }

    if (!hasObservedTextPrototype_(line.rawText)) {
      conflicts.push({
        code: "MISSING_OBSERVATION_RAW_TEXT",
        rowOrder: line.order,
      });
      classifiable = false;
    }

    if (line.roleEvidence === "unknown") {
      conflicts.push({
        code: "UNKNOWN_OBSERVATION_ROLE",
        rowOrder: line.order,
      });
      classifiable = false;
    } else if (
      line.roleEvidence !== "header" &&
      line.roleEvidence !== "product" &&
      line.roleEvidence !== "summary" &&
      line.roleEvidence !== "informational"
    ) {
      conflicts.push({
        code: hasObservedTextPrototype_(line.roleEvidence)
          ? "UNSUPPORTED_OBSERVATION_ROLE"
          : "MISSING_OBSERVATION_ROLE",
        rowOrder: line.order,
      });
      classifiable = false;
    }

    if (!classifiable) {
      unclassifiedObservations.push(line);
      return;
    }

    if (line.roleEvidence === "header") {
      if (phase === "product") {
        conflicts.push({
          code: "HEADER_INSIDE_PRODUCT_REGION",
          rowOrder: line.order,
        });
      } else if (phase === "summary") {
        conflicts.push({
          code: "HEADER_AFTER_SUMMARY_REGION",
          rowOrder: line.order,
        });
      }
      headerObservations.push(line);
      return;
    }

    if (line.roleEvidence === "product") {
      if (phase === "summary") {
        conflicts.push({
          code: "PRODUCT_AFTER_SUMMARY_REGION",
          rowOrder: line.order,
        });
      } else {
        phase = "product";
      }
      productObservations.push(line);
      return;
    }

    if (line.roleEvidence === "informational") {
      if (phase !== "summary") {
        conflicts.push({
          code: "INFORMATIONAL_OUTSIDE_TERMINAL_REGION",
          rowOrder: line.order,
        });
      }
      informationalObservations.push(line);
      return;
    }

    phase = "summary";
    summaryObservations.push(line);
  });

  const summaryValidation = validateSummaryEvidencePrototype_(
    extraction.summaryEvidence,
    extraction.financialEvidence,
    summaryObservations,
    observationByOrder,
  );
  summaryValidation.conflicts.forEach(function (conflict) {
    conflicts.push(conflict);
  });

  const legacySummaryEvidence = {
    printedProductCountText: extraction.printedProductCountText,
    printedTotalText: extraction.printedTotalText,
    printedTotalType: extraction.printedTotalType,
  };
  if (
    hasObservedTextPrototype_(legacySummaryEvidence.printedProductCountText) ||
    hasObservedTextPrototype_(legacySummaryEvidence.printedTotalText) ||
    hasObservedTextPrototype_(legacySummaryEvidence.printedTotalType)
  ) {
    conflicts.push({
      code: "LEGACY_SUMMARY_EVIDENCE_UNPARTITIONED",
      rowOrder: null,
    });
  }

  return {
    headerObservations: headerObservations,
    productObservations: productObservations,
    summaryObservations: summaryObservations,
    informationalObservations: informationalObservations,
    unclassifiedObservations: unclassifiedObservations,
    summaryEvidence: summaryValidation.summaryEvidence,
    legacySummaryEvidence: legacySummaryEvidence,
    accountedObservationCount:
      headerObservations.length +
      productObservations.length +
      summaryObservations.length +
      informationalObservations.length +
      unclassifiedObservations.length,
    conflicts: conflicts,
  };
}

function validateSummaryEvidencePrototype_(
  sourceSummaryEvidence,
  sourceFinancialEvidence,
  summaryObservations,
  observationByOrder,
) {
  const conflicts = [];
  const summaryEvidence = {
    printedProductCount: null,
    printedTotal: null,
  };
  const referencedOrders = {};
  const source =
    sourceSummaryEvidence &&
    typeof sourceSummaryEvidence === "object" &&
    !Array.isArray(sourceSummaryEvidence)
      ? sourceSummaryEvidence
      : {};

  ["printedProductCount", "printedTotal"].forEach(function (fieldName) {
    if (source[fieldName] === undefined || source[fieldName] === null) return;

    const validated = validateOneSummaryEvidencePrototype_(
      fieldName,
      source[fieldName],
      observationByOrder,
    );
    summaryEvidence[fieldName] = validated.evidence;
    validated.conflicts.forEach(function (conflict) {
      conflicts.push(conflict);
    });

    if (validated.evidence) {
      const sourceLineOrder = validated.evidence.sourceLineOrder;
      if (referencedOrders[sourceLineOrder]) {
        conflicts.push({
          code: "DUPLICATE_SUMMARY_SOURCE_CLASSIFICATION",
          rowOrder: sourceLineOrder,
        });
      } else {
        referencedOrders[sourceLineOrder] = true;
      }
    }
  });

  const financialObservations =
    sourceFinancialEvidence &&
    Array.isArray(sourceFinancialEvidence.monetaryObservations)
      ? sourceFinancialEvidence.monetaryObservations
      : [];
  financialObservations.forEach(function (financialObservation) {
    const sourceLineOrders =
      financialObservation && Array.isArray(financialObservation.sourceLineOrders)
        ? financialObservation.sourceLineOrders
        : [];
    sourceLineOrders.forEach(function (sourceLineOrder) {
      const sourceLine = observationByOrder[sourceLineOrder];
      if (!sourceLine || sourceLine.roleEvidence !== "summary") {
        conflicts.push({
          code: "INVALID_FINANCIAL_SOURCE_LINE",
          rowOrder: sourceLineOrder,
        });
      } else if (referencedOrders[sourceLineOrder]) {
        conflicts.push({
          code: "DUPLICATE_SUMMARY_SOURCE_CLASSIFICATION",
          rowOrder: sourceLineOrder,
        });
      } else {
        referencedOrders[sourceLineOrder] = true;
        if (sourceLine.rawText !== financialObservation.rawText) {
          conflicts.push({
            code: "INCONSISTENT_FINANCIAL_SOURCE_EVIDENCE",
            rowOrder: sourceLineOrder,
          });
        }
      }
    });
  });

  const vatBreakdownValidation = validateVatBreakdownEvidencePrototype_(
    sourceFinancialEvidence,
    observationByOrder,
    referencedOrders,
  );
  vatBreakdownValidation.conflicts.forEach(function (conflict) {
    conflicts.push(conflict);
  });

  summaryObservations.forEach(function (line) {
    if (!referencedOrders[line.order]) {
      conflicts.push({
        code: "UNLINKED_SUMMARY_OBSERVATION",
        rowOrder: line.order,
      });
    }
  });

  return {
    summaryEvidence: summaryEvidence,
    conflicts: conflicts,
  };
}

function validateVatBreakdownEvidencePrototype_(
  sourceFinancialEvidence,
  observationByOrder,
  referencedOrders,
) {
  const source =
    sourceFinancialEvidence && typeof sourceFinancialEvidence === "object" &&
    !Array.isArray(sourceFinancialEvidence)
      ? sourceFinancialEvidence
      : {};
  const monetaryObservations = Array.isArray(source.monetaryObservations)
    ? source.monetaryObservations
    : [];
  const tuples = Array.isArray(source.vatBreakdowns)
    ? source.vatBreakdowns
    : [];
  const reserved = referencedOrders || {};
  const validated = [];
  const conflicts = [];
  const seenEvidenceIds = {};
  const seenTupleOrders = {};

  if (tuples.length > 0 && monetaryObservations.length > 0) {
    conflicts.push({
      code: "DUPLICATE_FINANCIAL_EVIDENCE_REPRESENTATION",
      rowOrder: null,
    });
  }

  tuples.forEach(function (sourceTuple) {
    const tuple = cloneVatBreakdownEvidencePrototype_(sourceTuple);
    const tupleOrders = {};
    const componentNames = ["rate", "taxableBase", "vatAmount", "total"];
    let invalid = false;

    if (!hasObservedTextPrototype_(tuple.evidenceId)) {
      conflicts.push({
        code: "INVALID_VAT_BREAKDOWN_EVIDENCE",
        rowOrder: null,
      });
      invalid = true;
    } else if (seenEvidenceIds[tuple.evidenceId]) {
      conflicts.push({
        code: "DUPLICATE_VAT_BREAKDOWN_EVIDENCE_ID",
        rowOrder: null,
      });
      invalid = true;
    } else {
      seenEvidenceIds[tuple.evidenceId] = true;
    }

    if (
      tuple.sourceLineOrders.length === 0 ||
      tuple.sourceLineOrders.some(function (order, index) {
        if (!Number.isInteger(order) || order <= 0 ||
            tuple.sourceLineOrders.indexOf(order) !== index) {
          return true;
        }
        tupleOrders[order] = true;
        const sourceLine = observationByOrder[order];
        return !sourceLine || sourceLine.roleEvidence !== "summary";
      })
    ) {
      conflicts.push({
        code: "INVALID_VAT_BREAKDOWN_SOURCE_LINE",
        rowOrder: null,
      });
      invalid = true;
    }

    if (
      !isVatBreakdownRateTextPrototype_(tuple.rateText) ||
      !isVatBreakdownAmountTextPrototype_(tuple.taxableBaseText) ||
      !isVatBreakdownAmountTextPrototype_(tuple.vatAmountText) ||
      !isVatBreakdownAmountTextPrototype_(tuple.totalText) ||
      tuple.reportedScopeEvidence !== "document" ||
      ["inclVAT", null].indexOf(tuple.totalVatBasisEvidence) < 0 ||
      tuple.associationEvidence !== "explicit_vat_summary_relationship"
    ) {
      conflicts.push({
        code: "INVALID_VAT_BREAKDOWN_EVIDENCE",
        rowOrder: null,
      });
      invalid = true;
    }

    const expectedComponentText = {
      rate: tuple.rateText,
      taxableBase: tuple.taxableBaseText,
      vatAmount: tuple.vatAmountText,
      total: tuple.totalText,
    };
    const usedOrders = {};
    const usedFragments = {};
    componentNames.forEach(function (componentName) {
      const provenance = tuple.componentProvenance[componentName];
      const sourceLine = provenance &&
        observationByOrder[provenance.sourceLineOrder];
      const fragmentKey = provenance
        ? String(provenance.sourceLineOrder) + "\n" +
          String(provenance.valueText)
        : "";
      if (
        !provenance || !tupleOrders[provenance.sourceLineOrder] ||
        provenance.valueText !== expectedComponentText[componentName] ||
        !sourceLine || sourceLine.roleEvidence !== "summary" ||
        sourceLine.rawText.indexOf(provenance.valueText) < 0 ||
        sourceLine.rawText.indexOf(provenance.valueText) !==
          sourceLine.rawText.lastIndexOf(provenance.valueText) ||
        usedFragments[fragmentKey]
      ) {
        conflicts.push({
          code: "AMBIGUOUS_VAT_BREAKDOWN_PROVENANCE",
          rowOrder: provenance ? provenance.sourceLineOrder : null,
        });
        invalid = true;
        return;
      }
      usedFragments[fragmentKey] = true;
      usedOrders[provenance.sourceLineOrder] = true;
    });
    if (tuple.sourceLineOrders.some(function (order) {
      return !usedOrders[order];
    })) {
      conflicts.push({
        code: "AMBIGUOUS_VAT_BREAKDOWN_ASSOCIATION",
        rowOrder: null,
      });
      invalid = true;
    }

    tuple.sourceLineOrders.forEach(function (order) {
      if (reserved[order] || seenTupleOrders[order]) {
        conflicts.push({
          code: "OVERLAPPING_VAT_BREAKDOWN_PROVENANCE",
          rowOrder: order,
        });
        invalid = true;
      }
    });

    if (!invalid) {
      tuple.sourceLineOrders.forEach(function (order) {
        reserved[order] = true;
        seenTupleOrders[order] = true;
      });
      validated.push(tuple);
    }
  });

  return {
    vatBreakdowns: validated,
    conflicts: conflicts,
  };
}

function cloneVatBreakdownEvidencePrototype_(sourceTuple) {
  const tuple = sourceTuple && typeof sourceTuple === "object" &&
      !Array.isArray(sourceTuple)
    ? sourceTuple
    : {};
  const sourceProvenance =
    tuple.componentProvenance &&
    typeof tuple.componentProvenance === "object" &&
    !Array.isArray(tuple.componentProvenance)
      ? tuple.componentProvenance
      : {};
  const componentProvenance = {};
  ["rate", "taxableBase", "vatAmount", "total"].forEach(function (name) {
    const source =
      sourceProvenance[name] && typeof sourceProvenance[name] === "object" &&
      !Array.isArray(sourceProvenance[name])
        ? sourceProvenance[name]
        : null;
    componentProvenance[name] = source
      ? {
          sourceLineOrder: source.sourceLineOrder,
          valueText: source.valueText,
        }
      : null;
  });
  return {
    evidenceId: tuple.evidenceId,
    sourceLineOrders: Array.isArray(tuple.sourceLineOrders)
      ? tuple.sourceLineOrders.slice()
      : [],
    rateText: tuple.rateText,
    taxableBaseText: tuple.taxableBaseText,
    vatAmountText: tuple.vatAmountText,
    totalText: tuple.totalText,
    reportedScopeEvidence: tuple.reportedScopeEvidence,
    totalVatBasisEvidence:
      tuple.totalVatBasisEvidence === undefined
        ? null
        : tuple.totalVatBasisEvidence,
    componentProvenance: componentProvenance,
    associationEvidence: tuple.associationEvidence,
  };
}

function isVatBreakdownRateTextPrototype_(value) {
  if (!hasObservedTextPrototype_(value)) return false;
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?%$/.exec(value.trim());
  if (!match) return false;
  const basisPoints = Number(match[1]) * 100 +
    Number((match[2] || "").padEnd(2, "0") || 0);
  return basisPoints > 0 && basisPoints <= 10000;
}

function isVatBreakdownAmountTextPrototype_(value) {
  return hasObservedTextPrototype_(value) &&
    /^\d{1,6}[.,]\d{2}$/.test(value.trim());
}

function validateOneSummaryEvidencePrototype_(
  fieldName,
  sourceEvidence,
  observationByOrder,
) {
  const conflicts = [];
  const evidence = cloneSummaryEvidencePrototype_(sourceEvidence, fieldName);
  const sourceLine = observationByOrder[evidence.sourceLineOrder];

  if (
    !Number.isInteger(evidence.sourceLineOrder) ||
    !sourceLine ||
    sourceLine.roleEvidence !== "summary"
  ) {
    conflicts.push({
      code: "INVALID_SUMMARY_SOURCE_LINE",
      rowOrder: evidence.sourceLineOrder,
      field: fieldName,
    });
  }

  if (
    !hasObservedTextPrototype_(evidence.rawText) ||
    !hasObservedTextPrototype_(evidence.labelText) ||
    !hasObservedTextPrototype_(evidence.valueText)
  ) {
    conflicts.push({
      code: "INCOMPLETE_SUMMARY_EVIDENCE",
      rowOrder: evidence.sourceLineOrder,
      field: fieldName,
    });
    return { evidence: evidence, conflicts: conflicts };
  }

  const labelIndex = evidence.rawText.indexOf(evidence.labelText);
  const valueRemainder =
    labelIndex === 0
      ? evidence.rawText.slice(evidence.labelText.length).trim()
      : null;
  if (
    !sourceLine ||
    sourceLine.rawText !== evidence.rawText ||
    valueRemainder !== evidence.valueText
  ) {
    conflicts.push({
      code: "INCONSISTENT_SUMMARY_RAW_VALUE",
      rowOrder: evidence.sourceLineOrder,
      field: fieldName,
    });
  }

  return { evidence: evidence, conflicts: conflicts };
}

function cloneSummaryEvidencePrototype_(sourceEvidence, fieldName) {
  const source =
    sourceEvidence && typeof sourceEvidence === "object"
      ? sourceEvidence
      : {};

  return {
    sourceLineOrder: source.sourceLineOrder,
    rawText: source.rawText,
    labelText: source.labelText,
    valueText: source.valueText,
    totalTypeEvidence:
      fieldName === "printedTotal" ? source.totalTypeEvidence : undefined,
  };
}

function groupObservedReceiptRowsPrototype_(rows) {
  const groups = [];
  const anomalies = [];
  const conflicts = [];
  const consumedIndexes = {};
  let currentGroup = null;
  let previousOrder = null;

  rows.forEach(function (sourceRow, index) {
    const row = cloneObservedReceiptRowPrototype_(sourceRow);

    if (
      !Number.isInteger(row.order) ||
      row.order <= 0 ||
      (previousOrder !== null && row.order <= previousOrder)
    ) {
      conflicts.push({
        code: "INVALID_SOURCE_ROW_ORDER",
        rowOrder: row.order,
      });
      currentGroup = null;
      return;
    }

    previousOrder = row.order;

    const hasDescription = hasObservedTextPrototype_(row.descriptionText);
    const hasQuantity = hasObservedTextPrototype_(row.leadingQuantityText);
    const hasUnitPrice = hasObservedTextPrototype_(row.unitPriceText);
    const hasLineTotal = hasObservedTextPrototype_(row.lineTotalText);
    const hasAnyPrice = hasUnitPrice || hasLineTotal;
    const hasBothPrices = hasUnitPrice && hasLineTotal;

    if (
      row.indentation === "left_aligned" &&
      hasDescription &&
      hasQuantity &&
      hasBothPrices
    ) {
      currentGroup = {
        anchorRow: row,
        continuationRows: [],
        sourceRowOrders: [row.order],
        anomalies: [],
      };
      groups.push(currentGroup);
      consumedIndexes[index] = true;
      return;
    }

    if (
      currentGroup &&
      row.indentation === "indented" &&
      hasDescription &&
      !hasAnyPrice
    ) {
      currentGroup.continuationRows.push(row);
      currentGroup.sourceRowOrders.push(row.order);
      consumedIndexes[index] = true;

      if (hasQuantity) {
        const anomaly = {
          code: "UNEXPECTED_QUANTITY_ON_CONTINUATION",
          rowOrder: row.order,
          rawValue: row.leadingQuantityText,
        };
        currentGroup.anomalies.push(anomaly);
        anomalies.push(anomaly);
      }
      return;
    }

    let conflictCode = "UNSUPPORTED_ROW_STRUCTURE";

    if (!hasAnyPrice && currentGroup === null) {
      conflictCode = "UNPRICED_ROW_BEFORE_ANCHOR";
    } else if (
      row.indentation === "left_aligned" &&
      hasDescription &&
      !hasAnyPrice
    ) {
      conflictCode = "UNPRICED_LEFT_ALIGNED_ROW";
    } else if (row.indentation === "indented" && hasAnyPrice) {
      conflictCode = "PRICED_INDENTED_ROW";
    } else if (
      row.indentation === "left_aligned" &&
      (!hasDescription || !hasQuantity || !hasBothPrices)
    ) {
      conflictCode = "INCOMPLETE_ANCHOR";
    }

    conflicts.push({
      code: conflictCode,
      rowOrder: row.order,
    });
    currentGroup = null;
  });

  const unconsumedRows = rows
    .filter(function (_row, index) {
      return consumedIndexes[index] !== true;
    })
    .map(cloneObservedReceiptRowPrototype_);

  if (rows.length === 0) {
    conflicts.push({ code: "NO_PRODUCT_ROWS", rowOrder: null });
  }

  return {
    groups: groups,
    anomalies: anomalies,
    conflicts: conflicts,
    unconsumedRows: unconsumedRows,
  };
}

function buildCanonicalReceiptPrototype_(extraction, groups) {
  const items = [];
  const conflicts = [];

  groups.forEach(function (group) {
    const anchor = group.anchorRow;
    const quantity = parsePrototypeQuantity_(anchor.leadingQuantityText);
    const unitPrice = parsePrototypeAmount_(anchor.unitPriceText);
    const lineTotal = parsePrototypeAmount_(anchor.lineTotalText);

    if (quantity === null) {
      conflicts.push({
        code: "UNPARSEABLE_ANCHOR_QUANTITY",
        rowOrder: anchor.order,
      });
    }
    if (unitPrice === null) {
      conflicts.push({
        code: "UNPARSEABLE_UNIT_PRICE",
        rowOrder: anchor.order,
      });
    }
    if (lineTotal === null) {
      conflicts.push({
        code: "UNPARSEABLE_LINE_TOTAL",
        rowOrder: anchor.order,
      });
    }

    if (quantity === null || unitPrice === null || lineTotal === null) {
      return;
    }

    // This equality is a capability of the supported prototype layout only.
    // It is not asserted as a universal receipt invariant.
    if (lineTotal.cents !== quantity * unitPrice.cents) {
      conflicts.push({
        code: "INCONSISTENT_ANCHOR_AMOUNTS",
        rowOrder: anchor.order,
      });
      return;
    }

    const nameParts = [anchor.descriptionText.trim()];
    group.continuationRows.forEach(function (row) {
      nameParts.push(row.descriptionText.trim());
    });

    items.push({
      name: nameParts.join(" "),
      quantity: quantity,
      unitPrice: unitPrice.value,
      lineTotal: lineTotal.value,
    });
  });

  let totals = null;
  const hasPrintedTotal = hasObservedTextPrototype_(
    extraction.printedTotalText,
  );

  if (hasPrintedTotal) {
    if (extraction.printedTotalType !== "inclVAT") {
      conflicts.push({
        code: "UNSUPPORTED_PRINTED_TOTAL_TYPE",
        rowOrder: null,
      });
    } else {
      const printedTotal = parsePrototypeAmount_(extraction.printedTotalText);
      if (printedTotal === null) {
        conflicts.push({
          code: "UNPARSEABLE_PRINTED_TOTAL",
          rowOrder: null,
        });
      } else {
        totals = {
          exclVAT: null,
          inclVAT: printedTotal.value,
          vatAmount: null,
        };
      }
    }
  }

  return {
    receipt: {
      items: items,
      additionalCosts: [],
      vat: null,
      totals: totals,
    },
    conflicts: conflicts,
  };
}

function validatePrintedProductCountPrototype_(rawValue, groupedCount) {
  const result = {
    rawValue: rawValue,
    parsedValue: null,
    groupedCount: groupedCount,
    matches: null,
  };

  if (!hasObservedTextPrototype_(rawValue)) {
    return { result: result, conflict: null };
  }

  const parsedValue = parsePrototypeQuantity_(rawValue);
  result.parsedValue = parsedValue;

  if (parsedValue === null) {
    return {
      result: result,
      conflict: {
        code: "UNPARSEABLE_PRINTED_PRODUCT_COUNT",
        rowOrder: null,
      },
    };
  }

  result.matches = parsedValue === groupedCount;
  return {
    result: result,
    conflict: result.matches
      ? null
      : {
          code: "PRINTED_PRODUCT_COUNT_MISMATCH",
          rowOrder: null,
        },
  };
}

function parsePrototypeQuantity_(rawValue) {
  if (!hasObservedTextPrototype_(rawValue)) return null;

  const trimmed = rawValue.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parsePrototypeAmount_(rawValue) {
  if (!hasObservedTextPrototype_(rawValue)) return null;

  const trimmed = rawValue.trim();
  const match =
    /^(?:(?:€\/stuk[ \t]+)|(?:€[ \t]*))?(\d+)(?:[.,](\d{2}))?$/.exec(
      trimmed,
    );
  if (!match) return null;

  const euros = Number(match[1]);
  const centsPart = match[2] ? Number(match[2]) : 0;
  const cents = euros * 100 + centsPart;

  if (!Number.isSafeInteger(cents)) return null;

  return {
    value: cents / 100,
    cents: cents,
  };
}

function hasObservedTextPrototype_(value) {
  return typeof value === "string" && value.trim() !== "";
}

function cloneObservedReceiptRowPrototype_(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return {
      order: null,
      rawText: null,
      leadingQuantityText: null,
      descriptionText: null,
      unitPriceText: null,
      lineTotalText: null,
      indentation: null,
      roleEvidence: null,
    };
  }

  return {
    order: row.order,
    rawText: row.rawText,
    leadingQuantityText: row.leadingQuantityText,
    descriptionText: row.descriptionText,
    unitPriceText: row.unitPriceText,
    lineTotalText: row.lineTotalText,
    indentation: row.indentation,
    roleEvidence: row.roleEvidence,
  };
}
