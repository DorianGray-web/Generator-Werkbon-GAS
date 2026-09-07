// =========================================================================
// STAGED RECEIPT EXTRACTION
// =========================================================================

/**
 * Pure staged extraction boundary:
 * literal observations -> evidence partition -> structural groups ->
 * canonical receipt object.
 *
 * Supported layout only:
 * - zero or more explicitly classified header observations;
 * - one contiguous product region;
 * - zero or more explicitly classified summary observations.
 *
 * Transport and workflow routing are owned by 04_OpenAIClient.gs. This module
 * remains pure and does not invoke OpenAI, normalization, or output services.
 */
function buildStagedReceiptCandidate(extraction) {
  return buildStagedReceiptCandidateExperiment(extraction);
}

function buildStagedReceiptPrototype(extraction) {
  if (!extraction || !Array.isArray(extraction.observedLines)) {
    throw new Error(
      "ObservedReceiptExtraction must contain an observedLines array.",
    );
  }

  const partition = partitionObservedReceiptEvidencePrototype_(extraction);
  const grouping = groupObservedReceiptRowsPrototype_(
    partition.productObservations,
  );
  const conflicts = partition.conflicts.concat(grouping.conflicts);
  const productCountEvidence = partition.summaryEvidence.printedProductCount;
  const validation = validatePrintedProductCountPrototype_(
    productCountEvidence ? productCountEvidence.valueText : null,
    grouping.groups.length,
  );

  if (validation.conflict) {
    conflicts.push(validation.conflict);
  }

  const totalEvidence = partition.summaryEvidence.printedTotal;
  const canonicalExtraction = {
    printedTotalText: null,
    printedTotalType: null,
  };

  if (totalEvidence) {
    if (totalEvidence.totalTypeEvidence === "inclVAT") {
      canonicalExtraction.printedTotalText = totalEvidence.valueText;
      canonicalExtraction.printedTotalType = "inclVAT";
    } else if (totalEvidence.totalTypeEvidence === null) {
      conflicts.push({
        code: "AMBIGUOUS_PRINTED_TOTAL_TYPE",
        rowOrder: totalEvidence.sourceLineOrder,
      });
    } else {
      conflicts.push({
        code: "UNSUPPORTED_PRINTED_TOTAL_TYPE",
        rowOrder: totalEvidence.sourceLineOrder,
      });
    }
  }

  const canonicalBuild = buildCanonicalReceiptPrototype_(
    canonicalExtraction,
    grouping.groups,
  );
  canonicalBuild.conflicts.forEach(function (conflict) {
    conflicts.push(conflict);
  });

  const unconsumedRows = partition.unclassifiedObservations.concat(
    grouping.unconsumedRows,
  );
  const resolved = conflicts.length === 0 && unconsumedRows.length === 0;

  return {
    resolved: resolved,
    evidencePartition: partition,
    groups: grouping.groups,
    anomalies: grouping.anomalies,
    conflicts: conflicts,
    unconsumedRows: unconsumedRows,
    validation: {
      printedProductCount: validation.result,
    },
    boundaries: {
      additionalCosts: "unsupported",
      vat: "unsupported",
      anchorArithmetic: "bounded_layout_capability_only",
    },
    canonicalReceipt: resolved ? canonicalBuild.receipt : null,
  };
}

/**
 * Pure candidate-building experiment. It reuses the validated partition,
 * grouper, and bounded item builder, but deliberately does not resolve a
 * printed total or expose an authoritative canonical receipt.
 */
function buildStagedReceiptCandidateExperiment(extraction) {
  if (!extraction || !Array.isArray(extraction.observedLines)) {
    throw new Error(
      "ObservedReceiptExtraction must contain an observedLines array.",
    );
  }

  const partition = partitionObservedReceiptEvidencePrototype_(extraction);
  const grouping = groupObservedReceiptRowsPrototype_(
    partition.productObservations,
  );
  const candidateBuild = buildCanonicalReceiptPrototype_(
    { printedTotalText: null, printedTotalType: null },
    grouping.groups,
  );
  const productCountEvidence = partition.summaryEvidence.printedProductCount;
  const productCountValidation = validatePrintedProductCountPrototype_(
    productCountEvidence ? productCountEvidence.valueText : null,
    grouping.groups.length,
  );
  const conflicts = partition.conflicts
    .concat(grouping.conflicts)
    .concat(candidateBuild.conflicts);
  if (productCountValidation.conflict) {
    conflicts.push(productCountValidation.conflict);
  }
  const unconsumedRows = partition.unclassifiedObservations.concat(
    grouping.unconsumedRows,
  );
  const structuralResolved =
    conflicts.length === 0 && unconsumedRows.length === 0;
  const printedTotalEvidence = partition.summaryEvidence.printedTotal;
  const financialEvidence = collectFinancialEvidencePrototype_(
    extraction,
    printedTotalEvidence,
    grouping.groups,
  );
  const canonicalGate = buildCanonicalReceiptFromFinancialEvidencePrototype_(
    candidateBuild.receipt,
    financialEvidence,
    structuralResolved,
  );

  return {
    structuralStatus: {
      resolved: structuralResolved,
      accountedObservationCount: partition.accountedObservationCount,
      conflicts: conflicts.map(clonePrototypeIssue_),
      unconsumedRowOrders: unconsumedRows.map(function (row) {
        return row.order;
      }),
      validation: {
        printedProductCount: productCountValidation.result,
      },
    },
    financialStatus: clonePrototypeIssue_(financialEvidence.status),
    financialEvidence: financialEvidence,
    candidateReceipt: structuralResolved ? candidateBuild.receipt : null,
    canonicalReceipt: canonicalGate.canonicalReceipt,
    documentTotalInclVat: canonicalGate.documentTotalInclVat,
    evidenceTrace: {
      originalObservations: extraction.observedLines.map(
        cloneObservedReceiptRowPrototype_,
      ),
      headerObservations: partition.headerObservations.map(
        cloneObservedReceiptRowPrototype_,
      ),
      summaryObservations: partition.summaryObservations.map(
        cloneObservedReceiptRowPrototype_,
      ),
      summaryEvidence: {
        printedProductCount: cloneCandidateSummaryEvidencePrototype_(
          partition.summaryEvidence.printedProductCount,
          false,
        ),
        printedTotal: cloneCandidateSummaryEvidencePrototype_(
          printedTotalEvidence,
          true,
        ),
      },
      candidateItemSources: grouping.groups.map(function (group, index) {
        return {
          candidateItemIndex: index,
          sourceRowOrders: group.sourceRowOrders.slice(),
          anchorRowOrder: group.anchorRow.order,
          continuationRowOrders: group.continuationRows.map(function (row) {
            return row.order;
          }),
        };
      }),
      anomalies: grouping.anomalies.map(clonePrototypeIssue_),
      conflicts: conflicts.map(clonePrototypeIssue_),
      unconsumedRows: unconsumedRows.map(cloneObservedReceiptRowPrototype_),
    },
  };
}

/**
 * Bounded canonical release for the forward-priced-anchor layout.
 *
 * The plain printed total and product count are validation evidence only. They
 * never populate typed canonical totals, repair items, or assign VAT meaning.
 */
function buildForwardPricedAnchorCanonicalRelease_(stagedResult) {
  const inputSnapshot = JSON.stringify(stagedResult);
  const source =
    stagedResult && typeof stagedResult === "object" ? stagedResult : {};
  const structuralStatus = source.structuralStatus || {};
  const candidateReceipt = source.candidateReceipt || null;
  const trace = source.evidenceTrace || {};
  const originalObservations = Array.isArray(trace.originalObservations)
    ? trace.originalObservations
    : [];
  const candidateItemSources = Array.isArray(trace.candidateItemSources)
    ? trace.candidateItemSources
    : [];
  const candidateItems =
    candidateReceipt && Array.isArray(candidateReceipt.items)
      ? candidateReceipt.items
      : [];
  const conflicts = [];
  const observationByOrder = {};
  const productOrders = [];
  const consumedProductOrders = [];

  function addConflict(code, rowOrder) {
    conflicts.push({
      code: code,
      rowOrder: Number.isInteger(rowOrder) ? rowOrder : null,
    });
  }

  if (
    structuralStatus.resolved !== true ||
    !Array.isArray(structuralStatus.conflicts) ||
    structuralStatus.conflicts.length > 0 ||
    !Array.isArray(structuralStatus.unconsumedRowOrders) ||
    structuralStatus.unconsumedRowOrders.length > 0
  ) {
    addConflict("UNRESOLVED_HUBO_STRUCTURE", null);
  }

  if (
    !candidateReceipt ||
    candidateItems.length === 0 ||
    !Array.isArray(candidateReceipt.additionalCosts) ||
    candidateReceipt.additionalCosts.length > 0 ||
    candidateReceipt.vat !== null ||
    candidateReceipt.totals !== null
  ) {
    addConflict("INVALID_HUBO_CANDIDATE_RECEIPT", null);
  }

  originalObservations.forEach(function (observation) {
    if (
      !observation ||
      !Number.isInteger(observation.order) ||
      observation.order <= 0 ||
      observationByOrder[observation.order]
    ) {
      addConflict(
        "INVALID_HUBO_OBSERVATION_ORDER",
        observation && observation.order,
      );
      return;
    }
    observationByOrder[observation.order] = observation;
    if (observation.roleEvidence === "product") {
      productOrders.push(observation.order);
    }
  });

  if (
    originalObservations.length === 0 ||
    structuralStatus.accountedObservationCount !== originalObservations.length ||
    candidateItemSources.length !== candidateItems.length
  ) {
    addConflict("INCOMPLETE_HUBO_EVIDENCE_ACCOUNTING", null);
  }

  candidateItemSources.forEach(function (mapping, index) {
    const item = candidateItems[index];
    const anchor = mapping && observationByOrder[mapping.anchorRowOrder];
    const continuationOrders =
      mapping && Array.isArray(mapping.continuationRowOrders)
        ? mapping.continuationRowOrders
        : [];
    const expectedSourceOrders = anchor
      ? [anchor.order].concat(continuationOrders)
      : [];

    if (
      !mapping ||
      mapping.candidateItemIndex !== index ||
      !Array.isArray(mapping.sourceRowOrders) ||
      JSON.stringify(mapping.sourceRowOrders) !==
        JSON.stringify(expectedSourceOrders) ||
      !anchor ||
      anchor.roleEvidence !== "product" ||
      anchor.indentation !== "left_aligned" ||
      !hasObservedTextPrototype_(anchor.descriptionText)
    ) {
      addConflict(
        "INVALID_HUBO_CANDIDATE_MAPPING",
        mapping && mapping.anchorRowOrder,
      );
      return;
    }

    const quantity = parsePrototypeQuantity_(anchor.leadingQuantityText);
    const unitPrice = parsePrototypeAmount_(anchor.unitPriceText);
    const lineTotal = parsePrototypeAmount_(anchor.lineTotalText);
    const nameParts = [anchor.descriptionText.trim()];
    let continuationValid = true;

    continuationOrders.forEach(function (rowOrder) {
      const continuation = observationByOrder[rowOrder];
      if (
        !continuation ||
        continuation.roleEvidence !== "product" ||
        continuation.indentation !== "indented" ||
        !hasObservedTextPrototype_(continuation.descriptionText) ||
        hasObservedTextPrototype_(continuation.unitPriceText) ||
        hasObservedTextPrototype_(continuation.lineTotalText)
      ) {
        continuationValid = false;
        addConflict("INVALID_HUBO_CONTINUATION", rowOrder);
        return;
      }
      nameParts.push(continuation.descriptionText.trim());
    });

    if (
      quantity === null ||
      unitPrice === null ||
      lineTotal === null ||
      !continuationValid ||
      lineTotal.cents !== quantity * unitPrice.cents
    ) {
      addConflict("INVALID_HUBO_ANCHOR_VALUES", anchor.order);
      return;
    }

    if (
      !item ||
      item.name !== nameParts.join(" ") ||
      item.quantity !== quantity ||
      Math.round(Number(item.unitPrice) * 100) !== unitPrice.cents ||
      Math.round(Number(item.lineTotal) * 100) !== lineTotal.cents
    ) {
      addConflict("HUBO_CANDIDATE_SOURCE_MISMATCH", anchor.order);
      return;
    }

    mapping.sourceRowOrders.forEach(function (rowOrder) {
      consumedProductOrders.push(rowOrder);
    });
  });

  const uniqueConsumedProductOrders = {};
  consumedProductOrders.forEach(function (rowOrder) {
    if (uniqueConsumedProductOrders[rowOrder]) {
      addConflict("DUPLICATE_HUBO_PRODUCT_CONSUMPTION", rowOrder);
    }
    uniqueConsumedProductOrders[rowOrder] = true;
  });
  if (
    JSON.stringify(consumedProductOrders) !== JSON.stringify(productOrders)
  ) {
    addConflict("INCOMPLETE_HUBO_PRODUCT_ACCOUNTING", null);
  }

  const countEvidence =
    trace.summaryEvidence && trace.summaryEvidence.printedProductCount;
  const totalEvidence =
    trace.summaryEvidence && trace.summaryEvidence.printedTotal;
  const summaryObservations = Array.isArray(trace.summaryObservations)
    ? trace.summaryObservations
    : [];
  const summaryOrders = summaryObservations.map(function (observation) {
    return observation.order;
  });
  const parsedCount = countEvidence
    ? parsePrototypeQuantity_(countEvidence.valueText)
    : null;
  const parsedTotal = totalEvidence
    ? parsePrototypeAmount_(totalEvidence.valueText)
    : null;
  const candidateLineTotalSumCents = candidateItems.reduce(function (
    sum,
    item,
  ) {
    return sum + Math.round(Number(item.lineTotal) * 100);
  }, 0);

  if (
    !countEvidence ||
    parsedCount === null ||
    parsedCount !== candidateItems.length ||
    !structuralStatus.validation ||
    !structuralStatus.validation.printedProductCount ||
    structuralStatus.validation.printedProductCount.matches !== true
  ) {
    addConflict("HUBO_PRODUCT_COUNT_VALIDATION_FAILED", null);
  }

  if (
    !totalEvidence ||
    totalEvidence.totalTypeEvidence !== null ||
    parsedTotal === null ||
    parsedTotal.cents !== candidateLineTotalSumCents
  ) {
    addConflict("HUBO_PLAIN_TOTAL_VALIDATION_FAILED", null);
  }

  if (
    !countEvidence ||
    !totalEvidence ||
    countEvidence.sourceLineOrder === totalEvidence.sourceLineOrder ||
    summaryOrders.length !== 2 ||
    summaryOrders.indexOf(countEvidence.sourceLineOrder) < 0 ||
    summaryOrders.indexOf(totalEvidence.sourceLineOrder) < 0 ||
    !observationByOrder[countEvidence.sourceLineOrder] ||
    !observationByOrder[totalEvidence.sourceLineOrder] ||
    observationByOrder[countEvidence.sourceLineOrder].rawText !==
      countEvidence.rawText ||
    observationByOrder[totalEvidence.sourceLineOrder].rawText !==
      totalEvidence.rawText
  ) {
    addConflict("INVALID_HUBO_SUMMARY_PROVENANCE", null);
  }

  const monetaryObservations =
    source.financialEvidence &&
    Array.isArray(source.financialEvidence.monetaryObservations)
      ? source.financialEvidence.monetaryObservations
      : [];
  if (
    !source.financialStatus ||
    source.financialStatus.resolved !== false ||
    source.financialStatus.code !== "AMBIGUOUS_PRINTED_TOTAL_TYPE"
  ) {
    addConflict("UNSUPPORTED_HUBO_FINANCIAL_STATUS", null);
  }
  if (
    monetaryObservations.length !== 1 ||
    !totalEvidence ||
    JSON.stringify(monetaryObservations[0].sourceLineOrders) !==
      JSON.stringify([totalEvidence.sourceLineOrder]) ||
    monetaryObservations[0].rawText !== totalEvidence.rawText ||
    monetaryObservations[0].valueText !== totalEvidence.valueText ||
    monetaryObservations[0].reportedVatBasisEvidence !== null
  ) {
    addConflict("INVALID_HUBO_FINANCIAL_EVIDENCE", null);
  }

  const inputsUnchanged = JSON.stringify(stagedResult) === inputSnapshot;
  if (!inputsUnchanged) {
    addConflict("HUBO_REPLAY_MUTATED_INPUT", null);
  }

  const released = conflicts.length === 0;
  return {
    releaseStatus: {
      eligible: released,
      code: released
        ? "HUBO_CANONICAL_REPLAY_RELEASED"
        : "HUBO_CANONICAL_REPLAY_FAILED",
    },
    canonicalReceipt: released
      ? {
          items: candidateItems.map(function (item) {
            return {
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            };
          }),
          additionalCosts: [],
          vat: null,
          totals: null,
        }
      : null,
    validation: {
      productObservationCount: productOrders.length,
      consumedProductObservationCount: consumedProductOrders.length,
      candidateCount: candidateItems.length,
      printedProductCount: parsedCount,
      printedTotalCents: parsedTotal ? parsedTotal.cents : null,
      candidateLineTotalSumCents: candidateLineTotalSumCents,
      inputsUnchanged: inputsUnchanged,
    },
    evidenceTrace: JSON.parse(JSON.stringify(trace)),
    conflicts: conflicts,
  };
}

function buildHuboForwardAnchorCanonicalReplayExperiment_(stagedResult) {
  return buildForwardPricedAnchorCanonicalRelease_(stagedResult);
}

/**
 * Adapts the currently validated singular Stage-1-v2 printed-total evidence to
 * the experimental multi-observation financial boundary. A synthetic test may
 * instead provide financialEvidence.monetaryObservations directly. Supplying
 * both representations is a blocking conflict; neither silently wins.
 */
function collectFinancialEvidencePrototype_(
  extraction,
  printedTotalEvidence,
  groups,
) {
  const suppliedFinancialEvidence =
    extraction &&
    extraction.financialEvidence &&
    Array.isArray(extraction.financialEvidence.monetaryObservations)
      ? extraction.financialEvidence.monetaryObservations
      : null;
  const adaptedPrintedTotal = printedTotalEvidence
    ? [
        {
          evidenceId:
            "summary-total-" + String(printedTotalEvidence.sourceLineOrder),
          sourceLineOrders: [printedTotalEvidence.sourceLineOrder],
          rawText: printedTotalEvidence.rawText,
          labelText: printedTotalEvidence.labelText,
          valueText: printedTotalEvidence.valueText,
          reportedMeaningEvidence: "document_total",
          reportedVatBasisEvidence:
            printedTotalEvidence.totalTypeEvidence,
          reportedScopeEvidence: "document",
        },
      ]
    : [];
  const candidateItemSumCents = groups.reduce(function (sum, group) {
    const parsed = parsePrototypeAmount_(group.anchorRow.lineTotalText);
    return parsed === null ? sum : sum + parsed.cents;
  }, 0);

  if (suppliedFinancialEvidence !== null && adaptedPrintedTotal.length > 0) {
    const conflicted = interpretFinancialEvidencePrototype_(
      suppliedFinancialEvidence,
      candidateItemSumCents,
    );
    conflicted.conflicts.push({
      code: "DUPLICATE_FINANCIAL_EVIDENCE_REPRESENTATION",
      evidenceIds: [],
    });
    conflicted.status = {
      resolved: false,
      code: "DUPLICATE_FINANCIAL_EVIDENCE_REPRESENTATION",
    };
    return conflicted;
  }

  return interpretFinancialEvidencePrototype_(
    suppliedFinancialEvidence === null
      ? adaptedPrintedTotal
      : suppliedFinancialEvidence,
    candidateItemSumCents,
  );
}

/**
 * Pure financial-evidence interpreter. Lexical amount parsing and numerical
 * comparison are deliberately separate from meaning and VAT-basis resolution.
 */
function interpretFinancialEvidencePrototype_(
  sourceObservations,
  candidateItemSumCents,
) {
  const observations = [];
  const interpretations = [];
  const comparisons = [];
  const conflicts = [];
  const unsupportedCapabilities = [];
  const assignmentsByTarget = {};
  const seenEvidenceIds = {};

  (Array.isArray(sourceObservations) ? sourceObservations : []).forEach(
    function (source, index) {
      const observation = cloneFinancialObservationPrototype_(source);
      const validationCode = validateFinancialObservationPrototype_(
        observation,
        seenEvidenceIds,
      );
      const parsed = parsePrototypeAmount_(observation.valueText);
      observation.parsedAmountCents = parsed === null ? null : parsed.cents;
      observations.push(observation);

      if (validationCode !== null) {
        conflicts.push({
          code: validationCode,
          evidenceIds: [observation.evidenceId || "observation-" + index],
        });
        interpretations.push({
          evidenceId: observation.evidenceId,
          status: "conflict",
          resolvedFinancialMeaning: null,
          resolvedVatBasis: null,
          canonicalTarget: null,
          supportingEvidenceIds: [observation.evidenceId],
          ruleId: null,
        });
        return;
      }

      seenEvidenceIds[observation.evidenceId] = true;

      if (parsed === null) {
        conflicts.push({
          code: "UNPARSEABLE_MONETARY_VALUE",
          evidenceIds: [observation.evidenceId],
        });
        interpretations.push({
          evidenceId: observation.evidenceId,
          status: "unresolved",
          resolvedFinancialMeaning: null,
          resolvedVatBasis: null,
          canonicalTarget: null,
          supportingEvidenceIds: [observation.evidenceId],
          ruleId: null,
        });
        return;
      }

      comparisons.push({
        evidenceId: observation.evidenceId,
        candidateItemSumCents: candidateItemSumCents,
        observedAmountCents: parsed.cents,
        relation:
          parsed.cents === candidateItemSumCents ? "equal" : "different",
      });

      const interpretation = interpretOneFinancialObservationPrototype_(
        observation,
      );
      interpretations.push(interpretation);

      if (interpretation.status === "unsupported") {
        unsupportedCapabilities.push({
          code: "UNSUPPORTED_FINANCIAL_COMPONENT",
          evidenceIds: [observation.evidenceId],
          financialMeaning: interpretation.resolvedFinancialMeaning,
        });
        return;
      }

      if (interpretation.status !== "resolved") {
        conflicts.push({
          code: interpretation.failureCode,
          evidenceIds: [observation.evidenceId],
        });
        return;
      }

      const target = interpretation.canonicalTarget;
      if (!assignmentsByTarget[target]) {
        assignmentsByTarget[target] = {
          canonicalTarget: target,
          amountCents: parsed.cents,
          scope: "document",
          supportingEvidenceIds: [observation.evidenceId],
          ruleIds: [interpretation.ruleId],
        };
        return;
      }

      const existing = assignmentsByTarget[target];
      if (
        existing.amountCents === parsed.cents &&
        existing.scope === "document" &&
        observation.reportedScopeEvidence === "document"
      ) {
        existing.supportingEvidenceIds.push(observation.evidenceId);
        existing.ruleIds.push(interpretation.ruleId);
      } else {
        conflicts.push({
          code: "CONFLICTING_TYPED_TOTALS",
          evidenceIds: existing.supportingEvidenceIds.concat([
            observation.evidenceId,
          ]),
          canonicalTarget: target,
        });
      }
    },
  );

  const ambiguousDocumentTotals = interpretations.filter(function (
    interpretation,
  ) {
    return (
      interpretation.resolvedFinancialMeaning === "document_total" &&
      interpretation.canonicalTarget === null
    );
  });
  if (ambiguousDocumentTotals.length > 1) {
    conflicts.push({
      code: "MULTIPLE_CANDIDATE_TOTALS",
      evidenceIds: ambiguousDocumentTotals.map(function (interpretation) {
        return interpretation.evidenceId;
      }),
    });
  }

  comparisons.forEach(function (comparison) {
    const interpretation = interpretations.find(function (candidate) {
      return candidate.evidenceId === comparison.evidenceId;
    });
    if (
      interpretation &&
      interpretation.resolvedFinancialMeaning === "document_total" &&
      interpretation.canonicalTarget === null &&
      comparison.relation === "different"
    ) {
      conflicts.push({
        code: "FINANCIAL_EVIDENCE_MISMATCH",
        evidenceIds: [comparison.evidenceId],
      });
    }
  });

  const canonicalAssignments = Object.keys(assignmentsByTarget)
    .sort()
    .map(function (target) {
      return assignmentsByTarget[target];
    });
  const status = buildFinancialEvidenceStatusPrototype_(
    observations,
    interpretations,
    canonicalAssignments,
    conflicts,
    unsupportedCapabilities,
  );

  return {
    monetaryObservations: observations,
    interpretations: interpretations,
    canonicalAssignments: canonicalAssignments,
    candidateItemSumCents: candidateItemSumCents,
    comparisons: comparisons,
    conflicts: conflicts,
    unsupportedCapabilities: unsupportedCapabilities,
    status: status,
  };
}

function cloneFinancialObservationPrototype_(source) {
  const observation = source && typeof source === "object" ? source : {};
  return {
    evidenceId: observation.evidenceId,
    sourceLineOrders: Array.isArray(observation.sourceLineOrders)
      ? observation.sourceLineOrders.slice()
      : [],
    rawText: observation.rawText,
    labelText: observation.labelText,
    valueText: observation.valueText,
    parsedAmountCents: null,
    reportedMeaningEvidence:
      observation.reportedMeaningEvidence === undefined
        ? null
        : observation.reportedMeaningEvidence,
    reportedVatBasisEvidence:
      observation.reportedVatBasisEvidence === undefined
        ? null
        : observation.reportedVatBasisEvidence,
    reportedScopeEvidence:
      observation.reportedScopeEvidence === undefined
        ? null
        : observation.reportedScopeEvidence,
  };
}

function validateFinancialObservationPrototype_(observation, seenEvidenceIds) {
  if (!hasObservedTextPrototype_(observation.evidenceId)) {
    return "INVALID_FINANCIAL_EVIDENCE";
  }
  if (seenEvidenceIds[observation.evidenceId]) {
    return "DUPLICATE_FINANCIAL_EVIDENCE_ID";
  }
  if (
    observation.sourceLineOrders.length === 0 ||
    observation.sourceLineOrders.some(function (order) {
      return !Number.isInteger(order) || order <= 0;
    })
  ) {
    return "INVALID_FINANCIAL_EVIDENCE";
  }
  if (
    !hasObservedTextPrototype_(observation.rawText) ||
    !hasObservedTextPrototype_(observation.labelText) ||
    !hasObservedTextPrototype_(observation.valueText)
  ) {
    return "INVALID_FINANCIAL_EVIDENCE";
  }
  return null;
}

function interpretOneFinancialObservationPrototype_(observation) {
  const normalizedLabel = normalizeFinancialLabelPrototype_(
    observation.labelText,
  );
  const supportedRules = {
    "total incl vat": {
      meaning: "document_total",
      vatBasis: "inclVAT",
      canonicalTarget: "totals.inclVAT",
      ruleId: "EXPLICIT_TOTAL_INCL_VAT_LABEL",
    },
    "total excl vat": {
      meaning: "document_total",
      vatBasis: "exclVAT",
      canonicalTarget: "totals.exclVAT",
      ruleId: "EXPLICIT_TOTAL_EXCL_VAT_LABEL",
    },
    "vat amount": {
      meaning: "vat_amount",
      vatBasis: null,
      canonicalTarget: "totals.vatAmount",
      ruleId: "EXPLICIT_VAT_AMOUNT_LABEL",
    },
  };
  const supported = supportedRules[normalizedLabel];

  if (supported) {
    const meaningConflicts =
      observation.reportedMeaningEvidence !== null &&
      observation.reportedMeaningEvidence !== supported.meaning;
    const basisConflicts =
      observation.reportedVatBasisEvidence !== null &&
      observation.reportedVatBasisEvidence !== supported.vatBasis;
    const scopeConflicts =
      observation.reportedScopeEvidence !== null &&
      observation.reportedScopeEvidence !== "document";

    if (meaningConflicts || basisConflicts || scopeConflicts) {
      return {
        evidenceId: observation.evidenceId,
        status: "conflict",
        failureCode: "CONFLICTING_REPORTED_FINANCIAL_EVIDENCE",
        resolvedFinancialMeaning: null,
        resolvedVatBasis: null,
        canonicalTarget: null,
        supportingEvidenceIds: [observation.evidenceId],
        ruleId: supported.ruleId,
      };
    }

    return {
      evidenceId: observation.evidenceId,
      status: "resolved",
      failureCode: null,
      resolvedFinancialMeaning: supported.meaning,
      resolvedVatBasis: supported.vatBasis,
      canonicalTarget: supported.canonicalTarget,
      supportingEvidenceIds: [observation.evidenceId],
      ruleId: supported.ruleId,
    };
  }

  if (normalizedLabel === "totaal" || normalizedLabel === "total") {
    return {
      evidenceId: observation.evidenceId,
      status: "unresolved",
      failureCode: "AMBIGUOUS_PRINTED_TOTAL_TYPE",
      resolvedFinancialMeaning: "document_total",
      resolvedVatBasis: null,
      canonicalTarget: null,
      supportingEvidenceIds: [observation.evidenceId],
      ruleId: "BARE_DOCUMENT_TOTAL_LABEL",
    };
  }

  const unsupportedMeanings = {
    subtotal: "subtotal",
    shipping: "shipping",
    fee: "fee",
    discount: "discount",
    deposit: "deposit",
  };
  if (unsupportedMeanings[normalizedLabel]) {
    return {
      evidenceId: observation.evidenceId,
      status: "unsupported",
      failureCode: "UNSUPPORTED_FINANCIAL_COMPONENT",
      resolvedFinancialMeaning: unsupportedMeanings[normalizedLabel],
      resolvedVatBasis: null,
      canonicalTarget: null,
      supportingEvidenceIds: [observation.evidenceId],
      ruleId: "EXPLICIT_UNSUPPORTED_COMPONENT_LABEL",
    };
  }

  if (normalizedLabel === "vat percentage") {
    return {
      evidenceId: observation.evidenceId,
      status: "unresolved",
      failureCode: "VAT_PERCENTAGE_NOT_AMOUNT",
      resolvedFinancialMeaning: "vat_rate",
      resolvedVatBasis: null,
      canonicalTarget: null,
      supportingEvidenceIds: [observation.evidenceId],
      ruleId: "EXPLICIT_VAT_PERCENTAGE_LABEL",
    };
  }

  return {
    evidenceId: observation.evidenceId,
    status: "unresolved",
    failureCode: "AMBIGUOUS_FINANCIAL_MEANING",
    resolvedFinancialMeaning: null,
    resolvedVatBasis: null,
    canonicalTarget: null,
    supportingEvidenceIds: [observation.evidenceId],
    ruleId: null,
  };
}

function normalizeFinancialLabelPrototype_(labelText) {
  return String(labelText || "")
    .trim()
    .toLowerCase()
    .replace(/[.:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFinancialEvidenceStatusPrototype_(
  observations,
  interpretations,
  canonicalAssignments,
  conflicts,
  unsupportedCapabilities,
) {
  if (observations.length === 0) {
    return { resolved: false, code: "MISSING_PRINTED_TOTAL_EVIDENCE" };
  }

  const priorityCodes = [
    "DUPLICATE_FINANCIAL_EVIDENCE_REPRESENTATION",
    "INVALID_FINANCIAL_EVIDENCE",
    "DUPLICATE_FINANCIAL_EVIDENCE_ID",
    "CONFLICTING_REPORTED_FINANCIAL_EVIDENCE",
    "CONFLICTING_TYPED_TOTALS",
    "MULTIPLE_CANDIDATE_TOTALS",
    "UNPARSEABLE_MONETARY_VALUE",
    "AMBIGUOUS_PRINTED_TOTAL_TYPE",
    "VAT_PERCENTAGE_NOT_AMOUNT",
    "AMBIGUOUS_FINANCIAL_MEANING",
    "FINANCIAL_EVIDENCE_MISMATCH",
  ];
  for (let index = 0; index < priorityCodes.length; index++) {
    const code = priorityCodes[index];
    if (
      conflicts.some(function (conflict) {
        return conflict.code === code;
      })
    ) {
      return { resolved: false, code: code };
    }
  }

  if (unsupportedCapabilities.length > 0) {
    return { resolved: false, code: "UNSUPPORTED_FINANCIAL_COMPONENT" };
  }

  const hasTypedDocumentTotal = canonicalAssignments.some(function (
    assignment,
  ) {
    return (
      assignment.canonicalTarget === "totals.inclVAT" ||
      assignment.canonicalTarget === "totals.exclVAT"
    );
  });
  if (!hasTypedDocumentTotal) {
    return { resolved: false, code: "MISSING_TYPED_DOCUMENT_TOTAL" };
  }

  const everyInterpretationResolved = interpretations.every(function (
    interpretation,
  ) {
    return interpretation.status === "resolved";
  });
  return everyInterpretationResolved
    ? { resolved: true, code: "FINANCIAL_EVIDENCE_RESOLVED" }
    : { resolved: false, code: "AMBIGUOUS_FINANCIAL_MEANING" };
}

function buildCanonicalReceiptFromFinancialEvidencePrototype_(
  candidateReceipt,
  financialEvidence,
  structuralResolved,
) {
  if (
    !structuralResolved ||
    !candidateReceipt ||
    !financialEvidence ||
    !financialEvidence.status.resolved
  ) {
    return { canonicalReceipt: null, documentTotalInclVat: null };
  }

  const totals = {
    exclVAT: null,
    inclVAT: null,
    vatAmount: null,
  };
  financialEvidence.canonicalAssignments.forEach(function (assignment) {
    const value = assignment.amountCents / 100;
    if (assignment.canonicalTarget === "totals.inclVAT") {
      totals.inclVAT = value;
    } else if (assignment.canonicalTarget === "totals.exclVAT") {
      totals.exclVAT = value;
    } else if (assignment.canonicalTarget === "totals.vatAmount") {
      totals.vatAmount = value;
    }
  });

  return {
    canonicalReceipt: {
      items: candidateReceipt.items.map(function (item) {
        return {
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        };
      }),
      additionalCosts: [],
      vat:
        totals.vatAmount === null
          ? null
          : { rate: null, amount: totals.vatAmount },
      totals: totals,
    },
    documentTotalInclVat:
      totals.inclVAT === null ? null : totals.inclVAT,
  };
}

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
 * product, or summary role from text, indentation, or missing prices.
 * roleEvidence remains non-authoritative perception evidence.
 */
function partitionObservedReceiptEvidencePrototype_(extraction) {
  const headerObservations = [];
  const productObservations = [];
  const summaryObservations = [];
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
      line.roleEvidence !== "summary"
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
    unclassifiedObservations: unclassifiedObservations,
    summaryEvidence: summaryValidation.summaryEvidence,
    legacySummaryEvidence: legacySummaryEvidence,
    accountedObservationCount:
      headerObservations.length +
      productObservations.length +
      summaryObservations.length +
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

/**
 * Exact, case-sensitive vocabulary for the controlled recorded Bol evidence.
 * Roles and VAT bases are separate declarations; absence of a basis is
 * intentional and cannot be filled through value equality or arithmetic.
 */
function buildRecordedBolGovernedSemanticVocabularyExperiment_() {
  return {
    vocabularyId: "recorded-bol-governed-semantics-v1",
    rules: [
      governedSemanticRuleExperiment_(
        "BOL_TABLE_AANTAL_QUANTITY",
        "table_cell",
        "header_cell",
        "Aantal",
        "QUANTITY",
        null,
      ),
      governedSemanticRuleExperiment_(
        "BOL_TABLE_PRIJS_ST_UNIT_PRICE",
        "table_cell",
        "header_cell",
        "Prijs/st",
        "UNIT_PRICE",
        null,
      ),
      governedSemanticRuleExperiment_(
        "BOL_TABLE_BEDRAG_LINE_AMOUNT",
        "table_cell",
        "header_cell",
        "Bedrag",
        "LINE_AMOUNT",
        null,
      ),
      governedSemanticRuleExperiment_(
        "BOL_TABLE_BTW_PERCENT_VAT_RATE",
        "table_cell",
        "header_cell",
        "BTW%",
        "VAT_RATE",
        null,
      ),
      governedSemanticRuleExperiment_(
        "BOL_TABLE_BTW_VAT_AMOUNT",
        "table_cell",
        "header_cell",
        "BTW",
        "VAT_AMOUNT",
        null,
      ),
      governedSemanticRuleExperiment_(
        "BOL_SUMMARY_SUBTOTAL_EX_BTW",
        "observed_line",
        "printed_label",
        "Subtotaal ex. BTW",
        "DOCUMENT_SUBTOTAL",
        "EXCL_VAT",
      ),
      governedSemanticRuleExperiment_(
        "BOL_SUMMARY_BEDRAG_INCL_BTW",
        "observed_line",
        "printed_label",
        "Bedrag incl. BTW",
        "DOCUMENT_TOTAL",
        "INCL_VAT",
      ),
      governedSemanticRuleExperiment_(
        "BOL_SUMMARY_TOTAALBEDRAG_UNKNOWN_BASIS",
        "observed_line",
        "printed_label",
        "Totaalbedrag",
        "DOCUMENT_TOTAL",
        null,
      ),
    ],
  };
}

function governedSemanticRuleExperiment_(
  ruleId,
  provenanceKind,
  literalEvidenceKind,
  literalText,
  semanticRole,
  basis,
) {
  return {
    ruleId: ruleId,
    provenanceKind: provenanceKind,
    literalEvidenceKind: literalEvidenceKind,
    literalText: literalText,
    semanticRole: semanticRole,
    basis: basis,
  };
}

/**
 * Experimental semantic projection over independently collected domains.
 * The source package remains nested and unchanged. No cross-domain matching,
 * parsing, interpretation, or canonical release occurs here.
 */
function projectGovernedMultiDomainFinancialSemanticsExperiment_(
  financialEvidencePackage,
  governedVocabulary,
) {
  const packageSnapshot = JSON.stringify(financialEvidencePackage);
  const vocabularySnapshot = JSON.stringify(governedVocabulary);
  const sourcePackage = financialEvidencePackage &&
    typeof financialEvidencePackage === "object"
      ? JSON.parse(JSON.stringify(financialEvidencePackage))
      : {};
  const vocabulary = governedVocabulary &&
    typeof governedVocabulary === "object"
      ? JSON.parse(JSON.stringify(governedVocabulary))
      : {};
  const conflicts = [];
  const rules = Array.isArray(vocabulary.rules) ? vocabulary.rules : [];
  const rulesByLiteralKey = {};
  const seenRuleIds = {};
  const supportedRoles = [
    "QUANTITY",
    "UNIT_PRICE",
    "LINE_AMOUNT",
    "VAT_RATE",
    "VAT_AMOUNT",
    "DOCUMENT_SUBTOTAL",
    "DOCUMENT_TOTAL",
  ];
  const supportedBases = [null, "EXCL_VAT", "INCL_VAT"];

  const packageValid =
    sourcePackage.collectionComplete === true &&
    sourcePackage.crossRepresentationAlignment === "unresolved" &&
    sourcePackage.canonicalReceipt === null &&
    Array.isArray(sourcePackage.evidenceDomains) &&
    sourcePackage.evidenceDomains.length > 0 &&
    Array.isArray(sourcePackage.conflicts) &&
    sourcePackage.conflicts.length === 0;
  if (!packageValid) {
    conflicts.push({ code: "INCOMPLETE_MULTI_DOMAIN_EVIDENCE_PACKAGE" });
  }
  if (
    !hasExactObjectKeysExperiment_(governedVocabulary, [
      "vocabularyId",
      "rules",
    ]) ||
    !hasObservedTextPrototype_(vocabulary.vocabularyId) ||
    rules.length === 0
  ) {
    conflicts.push({ code: "INVALID_GOVERNED_SEMANTIC_VOCABULARY" });
  }

  rules.forEach(function (rule) {
    const validShape = hasExactObjectKeysExperiment_(rule, [
      "ruleId",
      "provenanceKind",
      "literalEvidenceKind",
      "literalText",
      "semanticRole",
      "basis",
    ]);
    const key = validShape
      ? [
          rule.provenanceKind,
          rule.literalEvidenceKind,
          rule.literalText,
        ].join("|")
      : "";
    if (
      !validShape ||
      !hasObservedTextPrototype_(rule.ruleId) ||
      ["table_cell", "observed_line"].indexOf(rule.provenanceKind) < 0 ||
      ["header_cell", "printed_label"].indexOf(
        rule.literalEvidenceKind,
      ) < 0 ||
      !hasObservedTextPrototype_(rule.literalText) ||
      supportedRoles.indexOf(rule.semanticRole) < 0 ||
      supportedBases.indexOf(rule.basis) < 0
    ) {
      conflicts.push({
        code: "INVALID_GOVERNED_SEMANTIC_RULE",
        ruleId: rule && rule.ruleId ? rule.ruleId : null,
      });
      return;
    }
    if (seenRuleIds[rule.ruleId]) {
      conflicts.push({
        code: "DUPLICATE_GOVERNED_SEMANTIC_RULE_ID",
        ruleId: rule.ruleId,
      });
    }
    seenRuleIds[rule.ruleId] = true;
    if (rulesByLiteralKey[key]) {
      conflicts.push({
        code: "CONFLICTING_GOVERNED_SEMANTIC_RULE",
        ruleId: rule.ruleId,
      });
      rulesByLiteralKey[key] = null;
    } else if (rulesByLiteralKey[key] !== null) {
      rulesByLiteralKey[key] = rule;
    }
  });

  const vocabularyValid = !conflicts.some(function (conflict) {
    return conflict.code.indexOf("GOVERNED_SEMANTIC") >= 0;
  });
  const unresolvedSemanticEvidence = [];
  let promotedOccurrenceCount = 0;
  let sourceValueOccurrenceCount = 0;
  const semanticDomains = (Array.isArray(sourcePackage.evidenceDomains)
    ? sourcePackage.evidenceDomains
    : []).map(function (domain) {
    const collection = domain && domain.collection;
    const observations = collection && Array.isArray(collection.observations)
      ? collection.observations
      : [];
    const semanticOccurrences = observations.map(function (observation) {
      const provenanceKind = domain.provenanceKind;
      const occurrenceId = provenanceKind === "table_cell"
        ? observation.occurrenceId
        : observation.observationId;
      const literalEvidenceKind = provenanceKind === "table_cell"
        ? "header_cell"
        : "printed_label";
      const literalText = provenanceKind === "table_cell"
        ? observation.literalHeaderRawText
        : observation.printedLabelText;
      const literalKey = [
        provenanceKind,
        literalEvidenceKind,
        literalText,
      ].join("|");
      const rule = packageValid && vocabularyValid &&
        hasObservedTextPrototype_(literalText)
          ? rulesByLiteralKey[literalKey] || null
          : null;
      const unresolvedCode = !packageValid
        ? "INPUT_PACKAGE_INCOMPLETE"
        : !vocabularyValid
          ? "GOVERNED_VOCABULARY_CONTRADICTORY"
          : "NO_EXACT_GOVERNED_LITERAL_RULE";
      sourceValueOccurrenceCount += 1;
      if (rule) {
        promotedOccurrenceCount += 1;
      } else {
        unresolvedSemanticEvidence.push({
          domainId: domain.domainId,
          occurrenceId: occurrenceId || null,
          code: unresolvedCode,
        });
      }
      return {
        occurrenceId: occurrenceId || null,
        provenanceKind: provenanceKind,
        sourceDocumentSha256: domain.sourceDocumentSha256,
        physicalReference: JSON.parse(JSON.stringify(
          provenanceKind === "table_cell"
            ? observation.tableLocalRef
            : observation.sourceRef,
        )),
        rawValue: observation.rawValue,
        literalEvidence: {
          kind: literalEvidenceKind,
          text: literalText === undefined ? null : literalText,
          headerCellRef:
            provenanceKind === "table_cell"
              ? observation.headerCellRef
              : null,
          adjacentUninterpretedFragments: JSON.parse(JSON.stringify(
            provenanceKind === "observed_line" &&
              Array.isArray(observation.adjacentUninterpretedFragments)
              ? observation.adjacentUninterpretedFragments
              : [],
          )),
        },
        semanticStatus: rule ? "PROMOTED" : "UNRESOLVED",
        governedSemanticRole: rule ? rule.semanticRole : null,
        governedBasis: rule ? rule.basis : null,
        promotionEvidence: rule
          ? {
              vocabularyId: vocabulary.vocabularyId,
              ruleId: rule.ruleId,
              literalEvidenceKind: rule.literalEvidenceKind,
              literalText: rule.literalText,
            }
          : null,
      };
    });

    return {
      domainId: domain.domainId,
      provenanceKind: domain.provenanceKind,
      sourceDocumentSha256: domain.sourceDocumentSha256,
      sourceScope: JSON.parse(JSON.stringify(domain.sourceScope)),
      sourceDomain: JSON.parse(JSON.stringify(domain)),
      semanticOccurrences: semanticOccurrences,
      semanticAccounting: {
        sourceValueOccurrenceCount: observations.length,
        promotedOccurrenceCount: semanticOccurrences.filter(function (item) {
          return item.semanticStatus === "PROMOTED";
        }).length,
        unresolvedOccurrenceCount: semanticOccurrences.filter(function (item) {
          return item.semanticStatus === "UNRESOLVED";
        }).length,
        structuralEvidenceCount:
          collection && Array.isArray(collection.structuralEvidence)
            ? collection.structuralEvidence.length
            : 0,
        contextEvidenceCount:
          collection && Array.isArray(collection.contextObservations)
            ? collection.contextObservations.length
            : 0,
      },
    };
  });

  const semanticResolutionStatus = !packageValid
    ? "BLOCKED_INPUT"
    : !vocabularyValid
      ? "CONTRADICTORY"
      : unresolvedSemanticEvidence.length > 0
        ? "PARTIAL"
        : "RESOLVED";
  return {
    sourceDocumentIdentity: JSON.parse(JSON.stringify(
      sourcePackage.sourceDocumentIdentity || {},
    )),
    sourceEvidencePackage: sourcePackage,
    semanticDomains: semanticDomains,
    collectionComplete: sourcePackage.collectionComplete === true,
    semanticComplete: semanticResolutionStatus === "RESOLVED",
    semanticResolutionStatus: semanticResolutionStatus,
    unresolvedSemanticEvidence: unresolvedSemanticEvidence,
    conflicts: conflicts,
    crossRepresentationAlignment: "unresolved",
    sourceAccounting: {
      domainCount: semanticDomains.length,
      sourceValueOccurrenceCount: sourceValueOccurrenceCount,
      promotedOccurrenceCount: promotedOccurrenceCount,
      unresolvedOccurrenceCount: unresolvedSemanticEvidence.length,
      sourcePackageUnchanged:
        JSON.stringify(financialEvidencePackage) === packageSnapshot,
      vocabularyUnchanged:
        JSON.stringify(governedVocabulary) === vocabularySnapshot,
    },
    interpreterInvoked: false,
    canonicalReleaseInvoked: false,
    canonicalReceipt: null,
  };
}

/**
 * Exact composite vocabulary for the two recorded Bol line-11 occurrences.
 * The lexical shapes validate already assigned ordered members; they do not
 * independently create VAT meaning.
 */
function buildRecordedBolCompositeLiteralVocabularyExperiment_() {
  return {
    vocabularyId: "recorded-bol-composite-literals-v1",
    rules: [{
      ruleId: "BOL_SUMMARY_ORDERED_BTW_RATE_AMOUNT",
      provenanceKind: "observed_line",
      sourceContext: "summary",
      structuralCapability: "SUMMARY_REGION",
      literalEvidenceKind: "ordered_same_line_composite",
      members: [
        {
          memberId: "rate",
          occurrenceOrder: 1,
          literalRelation: "printed_label",
          literalText: "BTW",
          adjacentLiteralTexts: [],
          rawValueShape: "percentage",
          semanticRole: "VAT_RATE",
          basis: null,
        },
        {
          memberId: "amount",
          occurrenceOrder: 2,
          literalRelation: "adjacent_fragment",
          literalText: "BTW",
          adjacentLiteralTexts: ["BTW"],
          rawValueShape: "euro_amount",
          semanticRole: "VAT_AMOUNT",
          basis: null,
        },
      ],
    }],
  };
}

/**
 * Experimental second semantic pass for exact ordered composite literals.
 * It decorates a cloned governed projection and never reads another domain
 * while deciding a match.
 */
function projectGovernedCompositeLiteralSemanticsExperiment_(
  governedProjection,
  compositeVocabulary,
) {
  const projectionSnapshot = JSON.stringify(governedProjection);
  const vocabularySnapshot = JSON.stringify(compositeVocabulary);
  const result = governedProjection && typeof governedProjection === "object"
    ? JSON.parse(JSON.stringify(governedProjection))
    : {};
  const vocabulary = compositeVocabulary &&
    typeof compositeVocabulary === "object"
      ? JSON.parse(JSON.stringify(compositeVocabulary))
      : {};
  const conflicts = Array.isArray(result.conflicts)
    ? result.conflicts.slice()
    : [];
  const promotions = [];
  const rules = Array.isArray(vocabulary.rules) ? vocabulary.rules : [];
  const validInput =
    result.collectionComplete === true &&
    result.crossRepresentationAlignment === "unresolved" &&
    result.canonicalReceipt === null &&
    Array.isArray(result.semanticDomains) &&
    Array.isArray(result.unresolvedSemanticEvidence) &&
    conflicts.length === 0;

  if (!validInput) {
    conflicts.push({ code: "INCOMPLETE_GOVERNED_SEMANTIC_PROJECTION" });
  }
  if (
    !hasExactObjectKeysExperiment_(compositeVocabulary, [
      "vocabularyId",
      "rules",
    ]) ||
    !hasObservedTextPrototype_(vocabulary.vocabularyId) ||
    rules.length === 0
  ) {
    conflicts.push({ code: "INVALID_COMPOSITE_LITERAL_VOCABULARY" });
  }

  const seenRuleIds = {};
  rules.forEach(function (rule) {
    const members = rule && Array.isArray(rule.members) ? rule.members : [];
    const validRule = hasExactObjectKeysExperiment_(rule, [
      "ruleId",
      "provenanceKind",
      "sourceContext",
      "structuralCapability",
      "literalEvidenceKind",
      "members",
    ]) &&
      hasObservedTextPrototype_(rule.ruleId) &&
      rule.provenanceKind === "observed_line" &&
      rule.sourceContext === "summary" &&
      rule.structuralCapability === "SUMMARY_REGION" &&
      rule.literalEvidenceKind === "ordered_same_line_composite" &&
      members.length > 1 &&
      members.every(validCompositeLiteralMemberExperiment_);
    if (!validRule || seenRuleIds[rule && rule.ruleId]) {
      conflicts.push({
        code: "INVALID_COMPOSITE_LITERAL_RULE",
        ruleId: rule && rule.ruleId ? rule.ruleId : null,
      });
      return;
    }
    seenRuleIds[rule.ruleId] = true;
    if (!validInput) return;

    const matches = [];
    result.semanticDomains.forEach(function (domain) {
      if (domain.provenanceKind !== rule.provenanceKind) return;
      const sourceObservations = domain.sourceDomain &&
        domain.sourceDomain.collection &&
        Array.isArray(domain.sourceDomain.collection.observations)
          ? domain.sourceDomain.collection.observations
          : [];
      const sourceById = {};
      sourceObservations.forEach(function (observation) {
        sourceById[observation.observationId] = observation;
      });
      const occurrencesByLine = {};
      domain.semanticOccurrences.forEach(function (occurrence) {
        const ref = occurrence.physicalReference;
        if (!ref || !Array.isArray(ref.sourceLineOrders) ||
            ref.sourceLineOrders.length !== 1) return;
        const lineOrder = ref.sourceLineOrders[0];
        if (!occurrencesByLine[lineOrder]) occurrencesByLine[lineOrder] = [];
        occurrencesByLine[lineOrder].push(occurrence);
      });
      Object.keys(occurrencesByLine).forEach(function (lineOrderText) {
        const occurrences = occurrencesByLine[lineOrderText].slice().sort(
          function (left, right) {
            return left.physicalReference.occurrenceOrder -
              right.physicalReference.occurrenceOrder;
          },
        );
        const lineOrder = Number(lineOrderText);
        if (
          occurrences.length === members.length &&
          occurrences.every(function (occurrence, index) {
            return compositeLiteralOccurrenceMatchesExperiment_(
              occurrence,
              sourceById[occurrence.occurrenceId],
              members[index],
              rule,
              lineOrder,
            );
          })
        ) {
          matches.push({
            domain: domain,
            lineOrder: lineOrder,
            occurrences: occurrences,
          });
        }
      });
    });

    if (matches.length > 1) {
      conflicts.push({
        code: "AMBIGUOUS_COMPOSITE_LITERAL_MATCH",
        ruleId: rule.ruleId,
      });
      return;
    }
    if (matches.length !== 1) return;

    const match = matches[0];
    const promotionId = [
      rule.ruleId,
      match.domain.domainId,
      match.lineOrder,
    ].join("|");
    const promotionMembers = match.occurrences.map(function (occurrence, index) {
      const member = members[index];
      return {
        memberId: member.memberId,
        occurrenceId: occurrence.occurrenceId,
        occurrenceOrder: occurrence.physicalReference.occurrenceOrder,
        rawValue: occurrence.rawValue,
        literalRelation: member.literalRelation,
        literalText: member.literalText,
        literalEvidence: JSON.parse(JSON.stringify(occurrence.literalEvidence)),
        semanticRole: member.semanticRole,
        basis: member.basis,
      };
    });
    match.occurrences.forEach(function (occurrence, index) {
      const member = members[index];
      occurrence.semanticStatus = "PROMOTED";
      occurrence.governedSemanticRole = member.semanticRole;
      occurrence.governedBasis = member.basis;
      occurrence.promotionEvidence = {
        vocabularyId: vocabulary.vocabularyId,
        ruleId: rule.ruleId,
        literalEvidenceKind: rule.literalEvidenceKind,
        compositePromotionId: promotionId,
        compositeMemberId: member.memberId,
      };
    });
    promotions.push({
      promotionId: promotionId,
      vocabularyId: vocabulary.vocabularyId,
      ruleId: rule.ruleId,
      domainId: match.domain.domainId,
      provenanceKind: rule.provenanceKind,
      sourceDocumentSha256: match.domain.sourceDocumentSha256,
      sourceLineOrder: match.lineOrder,
      orderedMembers: promotionMembers,
    });
  });

  const priorUnresolvedById = {};
  result.unresolvedSemanticEvidence.forEach(function (item) {
    priorUnresolvedById[item.occurrenceId] = item;
  });
  result.unresolvedSemanticEvidence = [];
  let promotedOccurrenceCount = 0;
  let sourceValueOccurrenceCount = 0;
  result.semanticDomains.forEach(function (domain) {
    const occurrences = domain.semanticOccurrences;
    const promoted = occurrences.filter(function (occurrence) {
      return occurrence.semanticStatus === "PROMOTED";
    }).length;
    promotedOccurrenceCount += promoted;
    sourceValueOccurrenceCount += occurrences.length;
    occurrences.forEach(function (occurrence) {
      if (occurrence.semanticStatus !== "UNRESOLVED") return;
      result.unresolvedSemanticEvidence.push(
        priorUnresolvedById[occurrence.occurrenceId] || {
          domainId: domain.domainId,
          occurrenceId: occurrence.occurrenceId,
          code: "NO_EXACT_GOVERNED_COMPOSITE_RULE",
        },
      );
    });
    domain.semanticAccounting.promotedOccurrenceCount = promoted;
    domain.semanticAccounting.unresolvedOccurrenceCount =
      occurrences.length - promoted;
  });
  result.conflicts = conflicts;
  result.semanticComplete = conflicts.length === 0 &&
    result.unresolvedSemanticEvidence.length === 0;
  result.semanticResolutionStatus = conflicts.length > 0
    ? "CONTRADICTORY"
    : result.semanticComplete
      ? "RESOLVED"
      : "PARTIAL";
  result.sourceAccounting.sourceValueOccurrenceCount =
    sourceValueOccurrenceCount;
  result.sourceAccounting.promotedOccurrenceCount = promotedOccurrenceCount;
  result.sourceAccounting.unresolvedOccurrenceCount =
    result.unresolvedSemanticEvidence.length;
  result.compositeEvidence = {
    vocabularyId: vocabulary.vocabularyId || null,
    promotions: promotions,
    sourceProjectionUnchanged:
      JSON.stringify(governedProjection) === projectionSnapshot,
    vocabularyUnchanged:
      JSON.stringify(compositeVocabulary) === vocabularySnapshot,
  };
  result.interpreterInvoked = false;
  result.canonicalReleaseInvoked = false;
  result.canonicalReceipt = null;
  return result;
}

function validCompositeLiteralMemberExperiment_(member) {
  return hasExactObjectKeysExperiment_(member, [
    "memberId",
    "occurrenceOrder",
    "literalRelation",
    "literalText",
    "adjacentLiteralTexts",
    "rawValueShape",
    "semanticRole",
    "basis",
  ]) &&
    hasObservedTextPrototype_(member.memberId) &&
    Number.isInteger(member.occurrenceOrder) &&
    member.occurrenceOrder > 0 &&
    ["printed_label", "adjacent_fragment"].indexOf(
      member.literalRelation,
    ) >= 0 &&
    member.literalText === "BTW" &&
    Array.isArray(member.adjacentLiteralTexts) &&
    ["percentage", "euro_amount"].indexOf(member.rawValueShape) >= 0 &&
    ["VAT_RATE", "VAT_AMOUNT"].indexOf(member.semanticRole) >= 0 &&
    member.basis === null;
}

function compositeLiteralOccurrenceMatchesExperiment_(
  occurrence,
  sourceObservation,
  member,
  rule,
  lineOrder,
) {
  if (
    !occurrence ||
    !sourceObservation ||
    occurrence.semanticStatus !== "UNRESOLVED" ||
    occurrence.provenanceKind !== rule.provenanceKind ||
    sourceObservation.sourceContext !== rule.sourceContext ||
    sourceObservation.structuralCapability !== rule.structuralCapability ||
    occurrence.physicalReference.occurrenceOrder !== member.occurrenceOrder ||
    sourceObservation.sourceRef.occurrenceOrder !== member.occurrenceOrder ||
    JSON.stringify(sourceObservation.sourceRef.sourceLineOrders) !==
      JSON.stringify([lineOrder]) ||
    JSON.stringify(occurrence.physicalReference.sourceLineOrders) !==
      JSON.stringify([lineOrder])
  ) {
    return false;
  }
  const adjacent = occurrence.literalEvidence.adjacentUninterpretedFragments;
  const adjacentTexts = adjacent.map(function (fragment) {
    return fragment.rawText;
  });
  if (
    JSON.stringify(adjacentTexts) !==
      JSON.stringify(member.adjacentLiteralTexts) ||
    adjacent.some(function (fragment) {
      return JSON.stringify(fragment.sourceLineOrders) !==
        JSON.stringify([lineOrder]);
    })
  ) {
    return false;
  }
  if (member.literalRelation === "printed_label") {
    if (
      occurrence.literalEvidence.text !== member.literalText ||
      sourceObservation.printedLabelText !== member.literalText
    ) return false;
  } else if (
    occurrence.literalEvidence.text !== null ||
    sourceObservation.printedLabelText !== null ||
    adjacentTexts.indexOf(member.literalText) < 0
  ) {
    return false;
  }
  return member.rawValueShape === "percentage"
    ? /^\s*[+-]?\d+(?:[.,]\d+)?%\s*$/.test(occurrence.rawValue)
    : /^\s*€\s*[+-]?\d+(?:[.,]\d{2})\s*$/.test(occurrence.rawValue);
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

/**
 * Experimental compatibility adapter from a governed multi-domain semantic
 * result to the existing flat interpretation boundary. It first preserves
 * each provenance domain without inventing a cross-domain coordinate system.
 * If the legacy interpreter contract cannot be met truthfully, it stops before
 * constructing InterpreterInput or invoking interpretation.
 */
function buildGovernedInterpretationInputExperiment_(governedSemanticResult) {
  const sourceSnapshot = JSON.stringify(governedSemanticResult);
  const source = governedSemanticResult &&
    typeof governedSemanticResult === "object"
      ? JSON.parse(JSON.stringify(governedSemanticResult))
      : {};
  const inputConflicts = [];
  const seenDomainIds = {};
  const seenOccurrenceIds = {};
  const adaptedDomains = [];
  const sourceSha = source.sourceDocumentIdentity &&
    source.sourceDocumentIdentity.sha256;
  let sourceOccurrenceCount = 0;
  let adaptedOccurrenceCount = 0;
  let unresolvedOccurrenceCount = 0;
  let tableCellWithoutObservedLineOrder = false;

  const validTopLevel =
    source.collectionComplete === true &&
    source.semanticComplete === true &&
    source.semanticResolutionStatus === "RESOLVED" &&
    source.crossRepresentationAlignment === "unresolved" &&
    source.canonicalReceipt === null &&
    Array.isArray(source.semanticDomains) &&
    source.semanticDomains.length > 0 &&
    Array.isArray(source.unresolvedSemanticEvidence) &&
    source.unresolvedSemanticEvidence.length === 0 &&
    Array.isArray(source.conflicts) &&
    source.conflicts.length === 0 &&
    source.sourceDocumentIdentity &&
    hasObservedTextPrototype_(source.sourceDocumentIdentity.sha256) &&
    source.sourceAccounting &&
    Number.isInteger(source.sourceAccounting.sourceValueOccurrenceCount);
  if (!validTopLevel) {
    inputConflicts.push({
      code: "INVALID_GOVERNED_SEMANTIC_RESULT",
      domainId: null,
      occurrenceId: null,
    });
  }

  (Array.isArray(source.semanticDomains) ? source.semanticDomains : [])
    .forEach(function (domain) {
      const domainId = domain && domain.domainId;
      const provenanceKind = domain && domain.provenanceKind;
      const occurrences = domain && Array.isArray(domain.semanticOccurrences)
        ? domain.semanticOccurrences
        : [];
      let domainValid =
        hasObservedTextPrototype_(domainId) &&
        !seenDomainIds[domainId] &&
        ["table_cell", "observed_line"].indexOf(provenanceKind) >= 0 &&
        domain.sourceDocumentSha256 === sourceSha &&
        domain.semanticAccounting &&
        domain.semanticAccounting.sourceValueOccurrenceCount ===
          occurrences.length;
      if (domainValid) seenDomainIds[domainId] = true;

      const adaptedOccurrences = occurrences.map(function (occurrence) {
        sourceOccurrenceCount += 1;
        const occurrenceId = occurrence && occurrence.occurrenceId;
        const ref = occurrence && occurrence.physicalReference;
        const promotion = occurrence && occurrence.promotionEvidence;
        const basisValid = occurrence &&
          [null, "EXCL_VAT", "INCL_VAT"].indexOf(
            occurrence.governedBasis,
          ) >= 0;
        let occurrenceValid =
          hasObservedTextPrototype_(occurrenceId) &&
          !seenOccurrenceIds[occurrenceId] &&
          occurrence.provenanceKind === provenanceKind &&
          occurrence.sourceDocumentSha256 === sourceSha &&
          typeof occurrence.rawValue === "string" &&
          occurrence.rawValue.trim() !== "" &&
          occurrence.semanticStatus === "PROMOTED" &&
          hasObservedTextPrototype_(occurrence.governedSemanticRole) &&
          basisValid &&
          promotion &&
          hasObservedTextPrototype_(promotion.vocabularyId) &&
          hasObservedTextPrototype_(promotion.ruleId) &&
          ref && typeof ref === "object";
        if (occurrenceValid) seenOccurrenceIds[occurrenceId] = true;

        let tableLocalRef = null;
        let sourceRef = null;
        if (provenanceKind === "table_cell") {
          const hasMixedLineReference =
            Array.isArray(ref && ref.sourceLineOrders) &&
            ref.sourceLineOrders.length > 0;
          occurrenceValid = occurrenceValid &&
            hasObservedTextPrototype_(ref.regionId) &&
            hasObservedTextPrototype_(ref.rowId) &&
            hasObservedTextPrototype_(ref.cellId) &&
            !hasMixedLineReference;
          if (hasMixedLineReference) {
            inputConflicts.push({
              code: "MIXED_GOVERNED_PROVENANCE_REFERENCE",
              domainId: domainId || null,
              occurrenceId: occurrenceId || null,
            });
          }
          tableLocalRef = JSON.parse(JSON.stringify(ref || {}));
          tableCellWithoutObservedLineOrder = true;
        } else if (provenanceKind === "observed_line") {
          const orders = ref && Array.isArray(ref.sourceLineOrders)
            ? ref.sourceLineOrders
            : [];
          const hasTableCoordinates = ref &&
            [ref.regionId, ref.rowId, ref.cellId].some(function (value) {
              return value !== null && value !== undefined;
            });
          occurrenceValid = occurrenceValid &&
            orders.length > 0 &&
            orders.every(function (order) {
              return Number.isInteger(order) && order > 0;
            }) &&
            Number.isInteger(ref.occurrenceOrder) &&
            ref.occurrenceOrder > 0 &&
            !hasTableCoordinates;
          if (hasTableCoordinates) {
            inputConflicts.push({
              code: "MIXED_GOVERNED_PROVENANCE_REFERENCE",
              domainId: domainId || null,
              occurrenceId: occurrenceId || null,
            });
          }
          sourceRef = JSON.parse(JSON.stringify(ref || {}));
        }

        if (!occurrenceValid) {
          domainValid = false;
          unresolvedOccurrenceCount += 1;
          inputConflicts.push({
            code: "INVALID_GOVERNED_SEMANTIC_OCCURRENCE",
            domainId: domainId || null,
            occurrenceId: occurrenceId || null,
          });
        }
        adaptedOccurrenceCount += 1;
        return {
          occurrenceId: occurrenceId || null,
          provenanceKind: provenanceKind || null,
          originalDomainIdentity: {
            domainId: domainId || null,
            provenanceKind: provenanceKind || null,
          },
          sourceDocumentSha256:
            occurrence && occurrence.sourceDocumentSha256
              ? occurrence.sourceDocumentSha256
              : null,
          tableLocalRef: tableLocalRef,
          sourceRef: sourceRef,
          rawValue:
            occurrence && occurrence.rawValue !== undefined
              ? occurrence.rawValue
              : null,
          governedSemanticRole:
            occurrence && occurrence.governedSemanticRole !== undefined
              ? occurrence.governedSemanticRole
              : null,
          governedBasis:
            occurrence && occurrence.governedBasis !== undefined
              ? occurrence.governedBasis
              : null,
          promotionEvidence: promotion
            ? JSON.parse(JSON.stringify(promotion))
            : null,
          compositeMembership:
            promotion && promotion.compositePromotionId
              ? {
                  promotionId: promotion.compositePromotionId,
                  memberId: promotion.compositeMemberId,
                }
              : null,
        };
      });

      if (!domainValid) {
        inputConflicts.push({
          code: "INVALID_GOVERNED_SEMANTIC_DOMAIN",
          domainId: domainId || null,
          occurrenceId: null,
        });
      }
      adaptedDomains.push({
        domainId: domainId || null,
        provenanceKind: provenanceKind || null,
        sourceDocumentSha256:
          domain && domain.sourceDocumentSha256
            ? domain.sourceDocumentSha256
            : null,
        sourceScope: JSON.parse(JSON.stringify(
          domain && domain.sourceScope ? domain.sourceScope : {},
        )),
        adaptedOccurrences: adaptedOccurrences,
      });
    });

  if (
    validTopLevel &&
    sourceOccurrenceCount !==
      source.sourceAccounting.sourceValueOccurrenceCount
  ) {
    inputConflicts.push({
      code: "GOVERNED_OCCURRENCE_ACCOUNTING_MISMATCH",
      domainId: null,
      occurrenceId: null,
    });
  }

  const structurallyValid = inputConflicts.length === 0;
  const firstUnresolvedBoundary = !structurallyValid
    ? inputConflicts[0].code
    : tableCellWithoutObservedLineOrder
      ? "INTERPRETER_REQUIRES_OBSERVED_LINE_ORDER_FOR_TABLE_CELL_PROVENANCE"
      : "INTERPRETER_INPUT_ADAPTATION_NOT_PROVEN";

  return {
    adapterResolved: false,
    adapterStatus: structurallyValid
      ? "BLOCKED_INTERPRETER_CONTRACT"
      : "BLOCKED_INVALID_GOVERNED_INPUT",
    sourceDocumentIdentity: JSON.parse(JSON.stringify(
      source.sourceDocumentIdentity || {},
    )),
    adaptedDomains: adaptedDomains,
    sourceOccurrenceCount: sourceOccurrenceCount,
    adaptedOccurrenceCount: adaptedOccurrenceCount,
    unresolvedOccurrenceCount: unresolvedOccurrenceCount,
    conflicts: inputConflicts,
    governedState: {
      unresolvedSemanticEvidence: JSON.parse(JSON.stringify(
        source.unresolvedSemanticEvidence || [],
      )),
      conflicts: JSON.parse(JSON.stringify(source.conflicts || [])),
      sourceAccounting: JSON.parse(JSON.stringify(
        source.sourceAccounting || {},
      )),
      compositeEvidence: JSON.parse(JSON.stringify(
        source.compositeEvidence || null,
      )),
    },
    crossRepresentationAlignment:
      source.crossRepresentationAlignment === undefined
        ? null
        : source.crossRepresentationAlignment,
    interpreterCompatible: false,
    interpreterInput: null,
    interpreterInvoked: false,
    interpretationResult: null,
    canonicalReleaseInvoked: false,
    canonicalReceipt: null,
    firstUnresolvedBoundary: firstUnresolvedBoundary,
    sourceUnchanged:
      JSON.stringify(governedSemanticResult) === sourceSnapshot,
  };
}

/**
 * Experimental provenance-aware interpretation over already governed
 * semantic occurrences. Each fact is domain-local and keeps its original
 * physical reference. Cross-domain identity, equivalence, and VAT-basis
 * relationships remain unresolved unless separately evidenced.
 */
function interpretGovernedFinancialEvidenceExperiment_(
  governedSemanticResult,
  relationshipRequests,
) {
  const sourceSnapshot = JSON.stringify(governedSemanticResult);
  const requestsSnapshot = JSON.stringify(relationshipRequests);
  const adapter = buildGovernedInterpretationInputExperiment_(
    governedSemanticResult,
  );
  const requests = relationshipRequests === undefined
    ? []
    : Array.isArray(relationshipRequests)
      ? JSON.parse(JSON.stringify(relationshipRequests))
      : null;
  const conflicts = [];
  const semanticConflicts = [];
  const requestConflicts = [];
  const occurrenceById = {};
  const interpretationFacts = [];
  const domains = [];

  const adapterInputValid =
    adapter.adapterStatus === "BLOCKED_INTERPRETER_CONTRACT" &&
    adapter.firstUnresolvedBoundary ===
      "INTERPRETER_REQUIRES_OBSERVED_LINE_ORDER_FOR_TABLE_CELL_PROVENANCE" &&
    adapter.conflicts.length === 0 &&
    adapter.sourceOccurrenceCount === adapter.adaptedOccurrenceCount &&
    adapter.unresolvedOccurrenceCount === 0 &&
    adapter.crossRepresentationAlignment === "unresolved";
  if (!adapterInputValid) {
    conflicts.push({
      code: "INVALID_PROVENANCE_AWARE_INTERPRETATION_INPUT",
      occurrenceIds: [],
    });
    adapter.conflicts.forEach(function (conflict) {
      conflicts.push({
        code: conflict.code,
        occurrenceIds: conflict.occurrenceId
          ? [conflict.occurrenceId]
          : [],
      });
    });
  }
  if (requests === null) {
    requestConflicts.push({
      code: "INVALID_INTERPRETATION_RELATIONSHIP_REQUESTS",
      occurrenceIds: [],
    });
  }

  adapter.adaptedDomains.forEach(function (domain) {
    const factIds = [];
    domain.adaptedOccurrences.forEach(function (occurrence) {
      const occurrenceId = occurrence.occurrenceId;
      if (occurrenceById[occurrenceId]) {
        semanticConflicts.push({
          code: "DUPLICATE_GOVERNED_OCCURRENCE_IDENTITY",
          occurrenceIds: [occurrenceId],
        });
      }
      occurrenceById[occurrenceId] = occurrence;
      factIds.push(occurrenceId);
      interpretationFacts.push({
        occurrenceId: occurrenceId,
        provenanceKind: occurrence.provenanceKind,
        domainId: occurrence.originalDomainIdentity.domainId,
        sourceDocumentIdentity: JSON.parse(JSON.stringify(
          adapter.sourceDocumentIdentity,
        )),
        tableLocalRef: occurrence.tableLocalRef === null
          ? null
          : JSON.parse(JSON.stringify(occurrence.tableLocalRef)),
        sourceRef: occurrence.sourceRef === null
          ? null
          : JSON.parse(JSON.stringify(occurrence.sourceRef)),
        rawValue: occurrence.rawValue,
        governedSemanticRole: occurrence.governedSemanticRole,
        governedBasis: occurrence.governedBasis,
        promotionEvidence: JSON.parse(JSON.stringify(
          occurrence.promotionEvidence,
        )),
        compositeMembership: JSON.parse(JSON.stringify(
          occurrence.compositeMembership,
        )),
        interpretationStatus: adapterInputValid
          ? "SUPPORTED_DOMAIN_LOCAL"
          : "BLOCKED_INPUT",
        alignmentRequirement: "NOT_REQUIRED_DOMAIN_LOCAL",
      });
    });
    domains.push({
      domainId: domain.domainId,
      provenanceKind: domain.provenanceKind,
      sourceDocumentSha256: domain.sourceDocumentSha256,
      interpretationFactIds: factIds,
    });
  });

  validateGovernedInterpretationFactsExperiment_(
    interpretationFacts,
    semanticConflicts,
  );
  validateGovernedCompositeInterpretationExperiment_(
    interpretationFacts,
    adapter.governedState.compositeEvidence,
    semanticConflicts,
  );
  semanticConflicts.forEach(function (conflict) {
    conflicts.push(conflict);
  });

  const unresolvedRelationships = adapterInputValid &&
    semanticConflicts.length === 0
      ? buildGovernedUnresolvedRelationshipsExperiment_(interpretationFacts)
      : [];
  if (requests !== null) {
    requests.forEach(function (request) {
      evaluateGovernedRelationshipRequestExperiment_(
        request,
        occurrenceById,
        adapter.crossRepresentationAlignment,
        unresolvedRelationships,
        requestConflicts,
      );
    });
  }
  requestConflicts.forEach(function (conflict) {
    conflicts.push(conflict);
  });

  if (conflicts.length > 0) {
    const conflictingIds = {};
    conflicts.forEach(function (conflict) {
      conflict.occurrenceIds.forEach(function (occurrenceId) {
        conflictingIds[occurrenceId] = true;
      });
    });
    interpretationFacts.forEach(function (fact) {
      if (conflictingIds[fact.occurrenceId]) {
        fact.interpretationStatus = semanticConflicts.length > 0
          ? "CONTRADICTORY"
          : "BLOCKED_RELATIONSHIP_REQUEST";
      }
    });
  }

  const interpretedOccurrenceCount = interpretationFacts.filter(
    function (fact) {
      return fact.interpretationStatus === "SUPPORTED_DOMAIN_LOCAL";
    },
  ).length;
  const conflictingOccurrenceIds = {};
  conflicts.forEach(function (conflict) {
    conflict.occurrenceIds.forEach(function (occurrenceId) {
      conflictingOccurrenceIds[occurrenceId] = true;
    });
  });
  const interpretationStatus = !adapterInputValid
    ? "BLOCKED"
    : semanticConflicts.length > 0
      ? "CONTRADICTORY"
      : requestConflicts.length > 0
        ? "BLOCKED"
        : unresolvedRelationships.length > 0
          ? "PARTIAL"
          : "RESOLVED";

  return {
    sourceDocumentIdentity: JSON.parse(JSON.stringify(
      adapter.sourceDocumentIdentity,
    )),
    sourceOccurrenceCount: adapter.sourceOccurrenceCount,
    interpretedOccurrenceCount: interpretedOccurrenceCount,
    unresolvedOccurrenceCount:
      adapter.sourceOccurrenceCount - interpretedOccurrenceCount,
    conflictingOccurrenceCount: Object.keys(conflictingOccurrenceIds).length,
    domains: domains,
    interpretationFacts: interpretationFacts,
    interpretationFactOrder: "DOMAIN_SERIALIZATION_ORDER_ONLY",
    unresolvedRelationships: unresolvedRelationships,
    conflicts: conflicts,
    crossRepresentationAlignment: adapter.crossRepresentationAlignment,
    interpretationStatus: interpretationStatus,
    semanticInputUnchanged:
      JSON.stringify(governedSemanticResult) === sourceSnapshot,
    relationshipRequestsUnchanged:
      JSON.stringify(relationshipRequests) === requestsSnapshot,
    legacyInterpreterInvoked: false,
    canonicalReleaseInvoked: false,
    canonicalReceipt: null,
  };
}

function validateGovernedInterpretationFactsExperiment_(facts, conflicts) {
  const supportedRoles = [
    "QUANTITY",
    "UNIT_PRICE",
    "LINE_AMOUNT",
    "VAT_RATE",
    "VAT_AMOUNT",
    "DOCUMENT_SUBTOTAL",
    "DOCUMENT_TOTAL",
  ];
  facts.forEach(function (fact) {
    if (supportedRoles.indexOf(fact.governedSemanticRole) < 0) {
      conflicts.push({
        code: "INVALID_GOVERNED_INTERPRETATION_ROLE",
        occurrenceIds: [fact.occurrenceId],
      });
    }
    if (
      ["QUANTITY", "VAT_RATE"].indexOf(fact.governedSemanticRole) >= 0 &&
      fact.governedBasis !== null
    ) {
      conflicts.push({
        code: "CONTRADICTORY_GOVERNED_INTERPRETATION_BASIS",
        occurrenceIds: [fact.occurrenceId],
      });
    }
    const validProvenance =
      (fact.provenanceKind === "table_cell" &&
        fact.tableLocalRef !== null && fact.sourceRef === null) ||
      (fact.provenanceKind === "observed_line" &&
        fact.sourceRef !== null && fact.tableLocalRef === null);
    if (!validProvenance) {
      conflicts.push({
        code: "INVALID_GOVERNED_INTERPRETATION_PROVENANCE",
        occurrenceIds: [fact.occurrenceId],
      });
    }
  });
}

function validateGovernedCompositeInterpretationExperiment_(
  facts,
  compositeEvidence,
  conflicts,
) {
  const promotions = compositeEvidence &&
    Array.isArray(compositeEvidence.promotions)
      ? compositeEvidence.promotions
      : [];
  const promotionById = {};
  promotions.forEach(function (promotion) {
    if (
      !hasObservedTextPrototype_(promotion.promotionId) ||
      promotionById[promotion.promotionId]
    ) {
      conflicts.push({
        code: "CONFLICTING_COMPOSITE_MEMBERSHIP",
        occurrenceIds: [],
      });
      return;
    }
    promotionById[promotion.promotionId] = promotion;
  });
  facts.forEach(function (fact) {
    if (fact.compositeMembership === null) return;
    const promotion = promotionById[fact.compositeMembership.promotionId];
    const members = promotion && Array.isArray(promotion.orderedMembers)
      ? promotion.orderedMembers
      : [];
    const member = members.filter(function (candidate) {
      return candidate.memberId === fact.compositeMembership.memberId;
    });
    if (
      member.length !== 1 ||
      member[0].occurrenceId !== fact.occurrenceId ||
      member[0].rawValue !== fact.rawValue ||
      member[0].semanticRole !== fact.governedSemanticRole ||
      member[0].basis !== fact.governedBasis
    ) {
      conflicts.push({
        code: "CONFLICTING_COMPOSITE_MEMBERSHIP",
        occurrenceIds: [fact.occurrenceId],
      });
    }
  });
}

function buildGovernedUnresolvedRelationshipsExperiment_(facts) {
  const relationships = [];
  function addRelationship(code, selectedFacts, alignmentState) {
    relationships.push({
      code: code,
      occurrenceIds: selectedFacts.map(function (fact) {
        return fact.occurrenceId;
      }),
      domainIds: selectedFacts.map(function (fact) {
        return fact.domainId;
      }),
      status: "UNRESOLVED",
      alignmentState: alignmentState,
    });
  }
  facts.forEach(function (fact) {
    if (
      fact.provenanceKind === "table_cell" &&
      ["UNIT_PRICE", "LINE_AMOUNT"].indexOf(
        fact.governedSemanticRole,
      ) >= 0 &&
      fact.governedBasis === null
    ) {
      addRelationship(
        "TABLE_AMOUNT_VAT_BASIS_UNRESOLVED",
        [fact],
        "NOT_REQUIRED_FOR_DOMAIN_LOCAL_ROLE",
      );
    }
  });
  ["VAT_RATE", "VAT_AMOUNT"].forEach(function (role) {
    const roleFacts = facts.filter(function (fact) {
      return fact.governedSemanticRole === role;
    });
    if (new Set(roleFacts.map(function (fact) {
      return fact.domainId;
    })).size > 1) {
      addRelationship(
        "CROSS_DOMAIN_" + role + "_RELATIONSHIP_UNRESOLVED",
        roleFacts,
        "REQUIRED_BUT_UNAVAILABLE",
      );
    }
  });
  const documentTotals = facts.filter(function (fact) {
    return fact.governedSemanticRole === "DOCUMENT_TOTAL";
  });
  if (documentTotals.length > 1) {
    addRelationship(
      "DOCUMENT_TOTAL_EQUIVALENCE_UNRESOLVED",
      documentTotals,
      "NOT_REQUIRED_FOR_DOMAIN_LOCAL_ROLE",
    );
  }
  const tableLineAmounts = facts.filter(function (fact) {
    return fact.provenanceKind === "table_cell" &&
      fact.governedSemanticRole === "LINE_AMOUNT";
  });
  const documentAmounts = facts.filter(function (fact) {
    return ["DOCUMENT_SUBTOTAL", "DOCUMENT_TOTAL"].indexOf(
      fact.governedSemanticRole,
    ) >= 0;
  });
  if (tableLineAmounts.length > 0 && documentAmounts.length > 0) {
    addRelationship(
      "ITEM_DOCUMENT_AMOUNT_RELATIONSHIP_UNRESOLVED",
      tableLineAmounts.concat(documentAmounts),
      "REQUIRED_BUT_UNAVAILABLE",
    );
  }
  return relationships;
}

function evaluateGovernedRelationshipRequestExperiment_(
  request,
  occurrenceById,
  crossRepresentationAlignment,
  unresolvedRelationships,
  conflicts,
) {
  const occurrenceIds = request && Array.isArray(request.occurrenceIds)
    ? request.occurrenceIds.slice()
    : [];
  if (
    !hasExactObjectKeysExperiment_(request, [
      "requestId",
      "relationshipType",
      "occurrenceIds",
      "evidenceKind",
      "proposedBasis",
    ]) ||
    !hasObservedTextPrototype_(request.requestId) ||
    !hasObservedTextPrototype_(request.relationshipType) ||
    occurrenceIds.length === 0 ||
    occurrenceIds.some(function (occurrenceId) {
      return !occurrenceById[occurrenceId];
    })
  ) {
    conflicts.push({
      code: "INVALID_INTERPRETATION_RELATIONSHIP_REQUEST",
      occurrenceIds: occurrenceIds,
    });
    return;
  }
  if (request.evidenceKind === "EQUAL_RAW_VALUE") {
    conflicts.push({
      code: "EQUAL_RAW_VALUE_IDENTITY_INFERENCE_FORBIDDEN",
      occurrenceIds: occurrenceIds,
    });
    return;
  }
  if (request.evidenceKind === "ARITHMETIC") {
    conflicts.push({
      code: "ARITHMETIC_SEMANTIC_INFERENCE_FORBIDDEN",
      occurrenceIds: occurrenceIds,
    });
    return;
  }
  const domainIds = occurrenceIds.map(function (occurrenceId) {
    return occurrenceById[occurrenceId].originalDomainIdentity.domainId;
  });
  const crossDomain = new Set(domainIds).size > 1;
  unresolvedRelationships.push({
    code: crossDomain && crossRepresentationAlignment === "unresolved"
      ? "CROSS_REPRESENTATION_ALIGNMENT_REQUIRED_BUT_UNAVAILABLE"
      : "FINANCIAL_RELATIONSHIP_NOT_PROVEN",
    occurrenceIds: occurrenceIds,
    domainIds: domainIds,
    status: "UNRESOLVED",
    alignmentState: crossDomain
      ? "REQUIRED_BUT_UNAVAILABLE"
      : "NOT_REQUIRED_FOR_DOMAIN_LOCAL_ROLE",
    requestId: request.requestId,
  });
}

/**
 * Synthetic-only interpretation overlay for an exhaustive financial evidence
 * collection. Structural slots identify physical provenance; deterministic
 * rules add meaning and disposition without producing a canonical receipt.
 */
function interpretCollectedFinancialEvidenceExperiment_(
  financialEvidenceCollection,
  validatedStructuralProjection,
) {
  if (
    !financialEvidenceCollection ||
    !Array.isArray(financialEvidenceCollection.observations)
  ) {
    throw new Error(
      "FinancialEvidenceCollection must contain an observations array.",
    );
  }

  const collectionSnapshot = JSON.stringify(financialEvidenceCollection);
  const projectionSnapshot = JSON.stringify(validatedStructuralProjection);
  const projection =
    validatedStructuralProjection &&
    typeof validatedStructuralProjection === "object"
      ? validatedStructuralProjection
      : {};
  const slots = Array.isArray(projection.slots) ? projection.slots : [];
  const observations = financialEvidenceCollection.observations;
  const observationById = {};
  const bindingsByObservationId = {};
  const invalidBindingIds = {};
  const consumedSlotKeys = {};
  const conflicts = [];
  const validations = [];

  if (
    financialEvidenceCollection.collectionComplete !== true ||
    (Array.isArray(financialEvidenceCollection.conflicts) &&
      financialEvidenceCollection.conflicts.length > 0)
  ) {
    conflicts.push({
      code: "INCOMPLETE_FINANCIAL_EVIDENCE_COLLECTION",
      sourceObservationIds: [],
    });
  }
  if (projection.resolved !== true || !Array.isArray(projection.slots)) {
    conflicts.push({
      code: "INVALID_STRUCTURAL_SLOT_PROJECTION",
      sourceObservationIds: [],
    });
  }

  observations.forEach(function (observation) {
    if (
      !observation ||
      !hasObservedTextPrototype_(observation.observationId) ||
      observationById[observation.observationId]
    ) {
      conflicts.push({
        code: "INVALID_INTERPRETATION_SOURCE_OBSERVATION",
        sourceObservationIds: [
          observation && observation.observationId
            ? observation.observationId
            : null,
        ],
      });
      return;
    }
    observationById[observation.observationId] = observation;
  });

  slots.forEach(function (binding) {
    const observationId = binding && binding.sourceObservationId;
    const slotRef = cloneStructuralSlotRefExperiment_(
      binding && binding.structuralSlotRef,
    );
    const slotKey = buildStructuralSlotKeyExperiment_(slotRef);

    if (
      !hasExactObjectKeysExperiment_(binding, [
        "sourceObservationId",
        "structuralSlotRef",
      ]) ||
      !hasObservedTextPrototype_(observationId) ||
      !observationById[observationId] ||
      !slotKey ||
      !validateStructuralSlotForObservationExperiment_(
        observationById[observationId],
        slotRef,
      )
    ) {
      conflicts.push({
        code: "INVALID_STRUCTURAL_SLOT_REFERENCE",
        sourceObservationIds: [observationId || null],
      });
      if (observationId) invalidBindingIds[observationId] = true;
      return;
    }

    if (bindingsByObservationId[observationId]) {
      conflicts.push({
        code: "MULTIPLE_STRUCTURAL_SLOTS_FOR_OBSERVATION",
        sourceObservationIds: [observationId],
      });
      invalidBindingIds[observationId] = true;
      return;
    }
    if (consumedSlotKeys[slotKey]) {
      conflicts.push({
        code: "MULTIPLY_CONSUMED_STRUCTURAL_SLOT",
        sourceObservationIds: [
          consumedSlotKeys[slotKey],
          observationId,
        ],
      });
      invalidBindingIds[consumedSlotKeys[slotKey]] = true;
      invalidBindingIds[observationId] = true;
      return;
    }

    bindingsByObservationId[observationId] = slotRef;
    consumedSlotKeys[slotKey] = observationId;
  });

  const interpretations = observations.map(function (observation) {
    const observationId = observation.observationId;
    const slotRef = bindingsByObservationId[observationId];
    if (!slotRef) {
      conflicts.push({
        code: "MISSING_STRUCTURAL_SLOT",
        sourceObservationIds: [observationId],
      });
      return buildBlockedInterpretationExperiment_(
        observationId,
        null,
        "CONTRADICTORY",
        "MISSING_STRUCTURAL_SLOT",
      );
    }
    if (invalidBindingIds[observationId]) {
      return buildBlockedInterpretationExperiment_(
        observationId,
        slotRef,
        "CONTRADICTORY",
        "CONTRADICTORY_STRUCTURAL_SLOT",
      );
    }
    return interpretCollectedObservationExperiment_(observation, slotRef);
  });

  applyVatLineCorroborationExperiment_(
    observations,
    interpretations,
  );
  applyBareTotalDispositionExperiment_(interpretations, conflicts);
  applyAdjustmentPolicyBoundaryExperiment_(
    observations,
    interpretations,
  );
  applyCurrentCanonicalRepresentabilityExperiment_(
    interpretations,
    validations,
  );

  interpretations.forEach(function (interpretation) {
    if (!hasObservedTextPrototype_(interpretation.canonicalDisposition)) {
      conflicts.push({
        code: "MISSING_FINANCIAL_DISPOSITION",
        sourceObservationIds: [interpretation.sourceObservationId],
      });
      interpretation.status = "CONTRADICTORY";
      interpretation.canonicalDisposition = "BLOCKED_UNRESOLVED";
      interpretation.ruleId = null;
    }
  });

  const releaseStatus = buildInterpretationReleaseStatusExperiment_(
    interpretations,
    conflicts,
  );
  const accounting = {
    sourceObservationCount: observations.length,
    interpretationCount: interpretations.length,
    uniqueInterpretedObservationCount: Object.keys(
      interpretations.reduce(function (seen, interpretation) {
        seen[interpretation.sourceObservationId] = true;
        return seen;
      }, {}),
    ).length,
    structuralSlotCount: slots.length,
    uniqueConsumedSlotCount: Object.keys(consumedSlotKeys).length,
    everyObservationInterpreted:
      interpretations.length === observations.length,
    collectionUnchanged:
      JSON.stringify(financialEvidenceCollection) === collectionSnapshot,
    projectionUnchanged:
      JSON.stringify(validatedStructuralProjection) === projectionSnapshot,
  };

  return {
    interpretations: interpretations,
    validations: validations,
    conflicts: conflicts,
    releaseStatus: releaseStatus,
    accounting: accounting,
  };
}

function cloneStructuralSlotRefExperiment_(source) {
  const slot = source && typeof source === "object" ? source : {};
  return {
    kind: slot.kind,
    lineOrder: slot.lineOrder === undefined ? null : slot.lineOrder,
    occurrenceOrder:
      slot.occurrenceOrder === undefined ? null : slot.occurrenceOrder,
    field: slot.field === undefined ? null : slot.field,
    regionId: slot.regionId === undefined ? null : slot.regionId,
    rowId: slot.rowId === undefined ? null : slot.rowId,
    cellId: slot.cellId === undefined ? null : slot.cellId,
    headerCellRef:
      slot.headerCellRef === undefined ? null : slot.headerCellRef,
  };
}

function buildStructuralSlotKeyExperiment_(slotRef) {
  if (!slotRef || !hasObservedTextPrototype_(slotRef.kind)) return null;
  if (slotRef.kind === "observed_line_field") {
    if (
      !Number.isInteger(slotRef.lineOrder) ||
      ["leadingQuantityText", "unitPriceText", "lineTotalText"].indexOf(
        slotRef.field,
      ) < 0
    ) {
      return null;
    }
    return ["line-field", slotRef.lineOrder, slotRef.field].join("|");
  }
  if (
    slotRef.kind === "labelled_line_value" ||
    slotRef.kind === "summary_value"
  ) {
    return Number.isInteger(slotRef.lineOrder) &&
      Number.isInteger(slotRef.occurrenceOrder) &&
      slotRef.occurrenceOrder > 0
      ? [slotRef.kind, slotRef.lineOrder, slotRef.occurrenceOrder].join("|")
      : null;
  }
  if (slotRef.kind === "table_cell") {
    if (
      !hasObservedTextPrototype_(slotRef.regionId) ||
      !hasObservedTextPrototype_(slotRef.rowId) ||
      !hasObservedTextPrototype_(slotRef.cellId) ||
      !hasObservedTextPrototype_(slotRef.headerCellRef)
    ) {
      return null;
    }
    return [
      "table-cell",
      slotRef.regionId,
      slotRef.rowId,
      slotRef.cellId,
    ].join("|");
  }
  return null;
}

function validateStructuralSlotForObservationExperiment_(
  observation,
  slotRef,
) {
  const sourceRef = observation && observation.sourceRef;
  if (
    !sourceRef ||
    !Array.isArray(sourceRef.sourceLineOrders) ||
    sourceRef.sourceLineOrders.indexOf(slotRef.lineOrder) < 0
  ) {
    return false;
  }

  if (slotRef.kind === "table_cell") {
    return (
      observation.sourceContext === "table_cell" &&
      sourceRef.regionId === slotRef.regionId &&
      sourceRef.rowId === slotRef.rowId &&
      sourceRef.cellId === slotRef.cellId &&
      observation.headerCellRef === slotRef.headerCellRef
    );
  }
  if (
    slotRef.regionId !== null ||
    slotRef.rowId !== null ||
    slotRef.cellId !== null ||
    slotRef.headerCellRef !== null
  ) {
    return false;
  }
  if (slotRef.kind === "observed_line_field") {
    return observation.sourceContext === "product_group";
  }
  if (slotRef.occurrenceOrder !== sourceRef.occurrenceOrder) return false;
  if (slotRef.kind === "summary_value") {
    return [
      "summary",
      "adjustment_like",
      "tender_like",
      "unknown",
    ].indexOf(observation.sourceContext) >= 0;
  }
  return slotRef.kind === "labelled_line_value";
}

function buildBlockedInterpretationExperiment_(
  observationId,
  slotRef,
  status,
  ruleId,
) {
  return {
    sourceObservationId: observationId,
    structuralSlotRef: slotRef,
    status: status,
    semanticRole: "other_unresolved",
    scope: null,
    vatBasis: null,
    parsedValue: null,
    ruleId: ruleId,
    supportingObservationIds: [observationId],
    conflictingObservationIds: [observationId],
    canonicalDisposition: "BLOCKED_UNRESOLVED",
  };
}

function interpretCollectedObservationExperiment_(observation, slotRef) {
  const normalizedLabel = normalizeFinancialLabelPrototype_(
    observation.printedLabelText,
  );
  const base = {
    sourceObservationId: observation.observationId,
    structuralSlotRef: slotRef,
    status: "AMBIGUOUS",
    semanticRole: "other_unresolved",
    scope: null,
    vatBasis: null,
    parsedValue: parseCollectedMoneyExperiment_(observation.rawValue),
    ruleId: null,
    supportingObservationIds: [observation.observationId],
    conflictingObservationIds: [],
    canonicalDisposition: "BLOCKED_UNRESOLVED",
  };

  if (slotRef.kind === "observed_line_field") {
    if (isDocumentTotalLabelExperiment_(normalizedLabel)) {
      base.status = "CONTRADICTORY";
      base.ruleId = "LABEL_CONTRADICTS_PRODUCT_SLOT";
      base.conflictingObservationIds = [observation.observationId];
      return base;
    }
    const fieldRules = {
      leadingQuantityText: {
        role: "quantity",
        target: "items[].quantity",
        ruleId: "EXPLICIT_PRODUCT_QUANTITY_SLOT",
      },
      unitPriceText: {
        role: "product_unit_amount",
        target: "items[].unitPrice",
        ruleId: "EXPLICIT_PRODUCT_UNIT_AMOUNT_SLOT",
      },
      lineTotalText: {
        role: "product_line_amount",
        target: "items[].lineTotal",
        ruleId: "EXPLICIT_PRODUCT_LINE_AMOUNT_SLOT",
      },
    };
    const fieldRule = fieldRules[slotRef.field];
    base.status = "SUPPORTED";
    base.semanticRole = fieldRule.role;
    base.scope = "product_group";
    base.ruleId = fieldRule.ruleId;
    base.canonicalDisposition = fieldRule.target;
    base.parsedValue =
      fieldRule.role === "quantity"
        ? parseCollectedQuantityExperiment_(observation.rawValue)
        : parseCollectedMoneyExperiment_(observation.rawValue);
    if (base.parsedValue === null) {
      base.status = "CONTRADICTORY";
      base.canonicalDisposition = "BLOCKED_UNRESOLVED";
      base.ruleId = "UNPARSEABLE_SLOT_VALUE";
      base.conflictingObservationIds = [observation.observationId];
    }
    return base;
  }

  if (slotRef.kind === "table_cell") {
    const tableRules = {
      aantal: ["quantity", "items[].quantity", "EXPLICIT_QUANTITY_HEADER"],
      prijs: [
        "product_unit_amount",
        "items[].unitPrice",
        "EXPLICIT_PRICE_HEADER",
      ],
      btw: ["vat_rate", "EVIDENCE_ONLY", "EXPLICIT_VAT_RATE_HEADER"],
      subtotaal: [
        "product_line_amount",
        "items[].lineTotal",
        "EXPLICIT_SUBTOTAL_HEADER",
      ],
    };
    const tableRule = tableRules[normalizedLabel];
    if (!tableRule) return base;
    base.status = "SUPPORTED";
    base.semanticRole = tableRule[0];
    base.scope = "product_group";
    base.ruleId = tableRule[2];
    base.canonicalDisposition = tableRule[1];
    base.parsedValue =
      tableRule[0] === "quantity"
        ? parseCollectedQuantityExperiment_(observation.rawValue)
        : tableRule[0] === "vat_rate"
          ? parseCollectedRateExperiment_(observation.rawValue)
          : parseCollectedMoneyExperiment_(observation.rawValue);
    return base;
  }

  const labelRules = {
    "subtotal excl vat": [
      "document_total_excl_vat",
      "document",
      "exclVAT",
      "totals.exclVAT",
      "EXPLICIT_DOCUMENT_EXCL_VAT_LABEL",
    ],
    "total excl vat": [
      "document_total_excl_vat",
      "document",
      "exclVAT",
      "totals.exclVAT",
      "EXPLICIT_DOCUMENT_EXCL_VAT_LABEL",
    ],
    "total incl vat": [
      "document_total_incl_vat",
      "document",
      "inclVAT",
      "totals.inclVAT",
      "EXPLICIT_DOCUMENT_INCL_VAT_LABEL",
    ],
    "vat amount": [
      "vat_amount",
      "document",
      null,
      "vat.amount",
      "EXPLICIT_VAT_AMOUNT_LABEL",
    ],
    aanbieding: [
      "discount_or_adjustment",
      "product_group",
      null,
      "POLICY_REQUIRED",
      "EXPLICIT_ADJUSTMENT_LABEL",
    ],
    nettoprijs: [
      "product_line_amount",
      "product_group",
      null,
      "POLICY_REQUIRED",
      "EXPLICIT_NET_PRICE_LABEL",
    ],
    contant: [
      "tender",
      "payment",
      null,
      "EVIDENCE_ONLY",
      "EXPLICIT_TENDER_LABEL",
    ],
    terug: [
      "change",
      "payment",
      null,
      "EVIDENCE_ONLY",
      "EXPLICIT_CHANGE_LABEL",
    ],
    "totaal prijsvoordeel": [
      "discount_or_adjustment",
      "document",
      null,
      "EVIDENCE_ONLY",
      "EXPLICIT_PRICE_ADVANTAGE_LABEL",
    ],
    "tot btw": [
      "vat_amount",
      "document",
      null,
      "vat.amount",
      "EXPLICIT_TOTAL_VAT_LABEL",
    ],
  };
  const labelRule = labelRules[normalizedLabel];
  if (labelRule) {
    base.status = "SUPPORTED";
    base.semanticRole = labelRule[0];
    base.scope = labelRule[1];
    base.vatBasis = labelRule[2];
    base.canonicalDisposition = labelRule[3];
    base.ruleId = labelRule[4];
    base.parsedValue = parseCollectedMoneyExperiment_(observation.rawValue);
    return base;
  }

  if (normalizedLabel === "vat" || normalizedLabel === "btw") {
    const hasPercentageEvidence =
      String(observation.rawValue).indexOf("%") >= 0 ||
      observation.adjacentUninterpretedFragments.some(function (fragment) {
        return fragment.rawText === "%";
      });
    if (hasPercentageEvidence) {
      base.status = "SUPPORTED";
      base.semanticRole = "vat_rate";
      base.scope = "document";
      base.parsedValue = parseCollectedRateExperiment_(observation.rawValue);
      base.ruleId = "EXPLICIT_VAT_PERCENTAGE_EVIDENCE";
      base.canonicalDisposition = "vat.rate";
    }
    return base;
  }

  if (normalizedLabel === "totaal" || normalizedLabel === "total") {
    base.semanticRole = "document_total_unknown_basis";
    base.scope = "document";
    base.ruleId = "BARE_DOCUMENT_TOTAL_LABEL";
    return base;
  }

  if (normalizedLabel === "tot omzet") {
    base.semanticRole = "other_unresolved";
    base.scope = "document";
    base.ruleId = "UNRESOLVED_TURNOVER_LABEL";
    return base;
  }

  if (
    observation.adjacentUninterpretedFragments.some(function (fragment) {
      return fragment.rawText.toLowerCase() === "over";
    })
  ) {
    base.status = "SUPPORTED";
    base.semanticRole = "vat_base";
    base.scope = "document";
    base.ruleId = "EXPLICIT_VAT_BASE_RELATION";
    base.canonicalDisposition = "EVIDENCE_ONLY";
    return base;
  }
  if (observation.sourceContext === "unknown") {
    base.ruleId = "UNKNOWN_FINANCIAL_EVIDENCE";
  }
  return base;
}

function isDocumentTotalLabelExperiment_(normalizedLabel) {
  return (
    normalizedLabel === "totaal" ||
    normalizedLabel === "total" ||
    normalizedLabel.indexOf("total incl") === 0 ||
    normalizedLabel.indexOf("total excl") === 0
  );
}

function applyVatLineCorroborationExperiment_(observations, interpretations) {
  interpretations.forEach(function (interpretation, index) {
    if (
      interpretation.status !== "AMBIGUOUS" ||
      interpretation.semanticRole !== "other_unresolved"
    ) {
      return;
    }
    const observation = observations[index];
    const lineOrder = observation.sourceRef.sourceLineOrders[0];
    const precedingRate = interpretations.some(function (candidate, otherIndex) {
      return (
        otherIndex < index &&
        candidate.status === "SUPPORTED" &&
        candidate.semanticRole === "vat_rate" &&
        observations[otherIndex].sourceRef.sourceLineOrders[0] === lineOrder
      );
    });
    const hasVatAmountRelationEvidence =
      observation.adjacentUninterpretedFragments.some(
      function (fragment) {
        const normalized = normalizeFinancialLabelPrototype_(fragment.rawText);
        return (
          fragment.rawText === "=" ||
          normalized === "vat" ||
          normalized === "btw"
        );
      },
    );
    if (precedingRate && hasVatAmountRelationEvidence) {
      interpretation.status = "SUPPORTED";
      interpretation.semanticRole = "vat_amount";
      interpretation.scope = "document";
      interpretation.ruleId = "EXPLICIT_VAT_LINE_AMOUNT_RELATION";
      interpretation.canonicalDisposition = "vat.amount";
      interpretation.supportingObservationIds = interpretations
        .filter(function (candidate, otherIndex) {
          return (
            candidate.semanticRole === "vat_rate" &&
            observations[otherIndex].sourceRef.sourceLineOrders[0] === lineOrder
          );
        })
        .map(function (candidate) {
          return candidate.sourceObservationId;
        })
        .concat([interpretation.sourceObservationId]);
    }
  });
}

function applyBareTotalDispositionExperiment_(interpretations, conflicts) {
  const typedTotals = interpretations.filter(function (interpretation) {
    return (
      interpretation.status === "SUPPORTED" &&
      (interpretation.semanticRole === "document_total_incl_vat" ||
        interpretation.semanticRole === "document_total_excl_vat")
    );
  });
  interpretations.forEach(function (interpretation) {
    if (interpretation.semanticRole !== "document_total_unknown_basis") return;
    if (typedTotals.length === 0) return;
    const equalTypedTotals = typedTotals.filter(function (typed) {
      return (
        typed.parsedValue &&
        interpretation.parsedValue &&
        typed.parsedValue.value === interpretation.parsedValue.value
      );
    });
    if (equalTypedTotals.length > 0) {
      interpretation.status = "SUPPORTED";
      interpretation.canonicalDisposition = "EVIDENCE_ONLY";
      interpretation.ruleId = "BARE_TOTAL_CORROBORATES_TYPED_TOTAL";
      interpretation.supportingObservationIds = [
        interpretation.sourceObservationId,
      ].concat(equalTypedTotals.map(function (typed) {
        return typed.sourceObservationId;
      }));
      return;
    }
    interpretation.status = "CONTRADICTORY";
    interpretation.canonicalDisposition = "BLOCKED_UNRESOLVED";
    interpretation.ruleId = "BARE_TOTAL_CONTRADICTS_TYPED_TOTAL";
    interpretation.conflictingObservationIds = typedTotals.map(function (typed) {
      return typed.sourceObservationId;
    });
    conflicts.push({
      code: "CONFLICTING_DOCUMENT_TOTAL_EVIDENCE",
      sourceObservationIds: [interpretation.sourceObservationId].concat(
        interpretation.conflictingObservationIds,
      ),
    });
  });
}

function applyAdjustmentPolicyBoundaryExperiment_(
  observations,
  interpretations,
) {
  const adjustmentGroupIds = {};
  observations.forEach(function (observation, index) {
    if (
      interpretations[index].semanticRole === "discount_or_adjustment" &&
      hasObservedTextPrototype_(observation.sourceRef.groupId)
    ) {
      adjustmentGroupIds[observation.sourceRef.groupId] = true;
    }
  });
  observations.forEach(function (observation, index) {
    const groupId = observation.sourceRef.groupId;
    if (
      adjustmentGroupIds[groupId] &&
      ["product_unit_amount", "product_line_amount"].indexOf(
        interpretations[index].semanticRole,
      ) >= 0
    ) {
      interpretations[index].canonicalDisposition = "POLICY_REQUIRED";
      interpretations[index].supportingObservationIds = observations
        .filter(function (candidate) {
          return candidate.sourceRef.groupId === groupId;
        })
        .map(function (candidate) {
          return candidate.observationId;
        });
    }
  });
}

function applyCurrentCanonicalRepresentabilityExperiment_(
  interpretations,
  validations,
) {
  const byTableRow = {};
  interpretations.forEach(function (interpretation) {
    const slot = interpretation.structuralSlotRef;
    if (!slot || slot.kind !== "table_cell") return;
    const key = [slot.regionId, slot.rowId].join("|");
    if (!byTableRow[key]) byTableRow[key] = [];
    byTableRow[key].push(interpretation);
  });
  Object.keys(byTableRow).forEach(function (key) {
    const rowInterpretations = byTableRow[key];
    function findRole(role) {
      return rowInterpretations.find(function (interpretation) {
        return interpretation.semanticRole === role;
      });
    }
    const quantity = findRole("quantity");
    const unitAmount = findRole("product_unit_amount");
    const lineAmount = findRole("product_line_amount");
    if (
      !quantity ||
      !unitAmount ||
      !lineAmount ||
      !quantity.parsedValue ||
      !unitAmount.parsedValue ||
      !lineAmount.parsedValue
    ) {
      return;
    }
    const compatible =
      quantity.parsedValue.value * unitAmount.parsedValue.value ===
      lineAmount.parsedValue.value;
    validations.push({
      code: compatible
        ? "CURRENT_CANONICAL_PRODUCT_REPRESENTABLE"
        : "CURRENT_CANONICAL_PRODUCT_UNREPRESENTABLE",
      sourceObservationIds: [
        quantity.sourceObservationId,
        unitAmount.sourceObservationId,
        lineAmount.sourceObservationId,
      ],
      relation: compatible ? "equal" : "different",
    });
    if (!compatible) {
      [quantity, unitAmount, lineAmount].forEach(function (interpretation) {
        interpretation.status = "UNSUPPORTED";
        interpretation.canonicalDisposition = "UNREPRESENTABLE";
        interpretation.ruleId = "CURRENT_CANONICAL_PRODUCT_MODEL_LIMIT";
      });
    }
  });
}

function buildInterpretationReleaseStatusExperiment_(
  interpretations,
  conflicts,
) {
  if (
    conflicts.length > 0 ||
    interpretations.some(function (interpretation) {
      return interpretation.status === "CONTRADICTORY";
    })
  ) {
    return {
      eligible: false,
      code: "CONTRADICTORY_FINANCIAL_INTERPRETATION",
    };
  }
  if (interpretations.some(function (interpretation) {
    return interpretation.status === "UNSUPPORTED";
  })) {
    return {
      eligible: false,
      code: "UNSUPPORTED_CANONICAL_REPRESENTATION",
    };
  }
  if (interpretations.some(function (interpretation) {
    return interpretation.canonicalDisposition === "POLICY_REQUIRED";
  })) {
    return { eligible: false, code: "BUSINESS_POLICY_REQUIRED" };
  }
  if (interpretations.some(function (interpretation) {
    return interpretation.status === "AMBIGUOUS";
  })) {
    return {
      eligible: false,
      code: "AMBIGUOUS_FINANCIAL_INTERPRETATION",
    };
  }
  return { eligible: true, code: "RELEASE_ELIGIBLE" };
}

function parseCollectedQuantityExperiment_(rawValue) {
  const normalized = String(rawValue || "").trim();
  if (!/^[1-9]\d*$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isSafeInteger(value)
    ? { kind: "quantity", value: value }
    : null;
}

function parseCollectedRateExperiment_(rawValue) {
  const normalized = String(rawValue || "")
    .trim()
    .replace(/%$/, "")
    .trim()
    .replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const basisPoints = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(basisPoints)
    ? { kind: "rate_basis_points", value: basisPoints }
    : null;
}

function parseCollectedMoneyExperiment_(rawValue) {
  const normalized = String(rawValue || "")
    .trim()
    .replace(/^EUR\s*/i, "")
    .replace(/^€\s*/, "")
    .replace(/\s/g, "");
  const match = /^([+-]?)(\d+)(?:[.,](\d{2}))?$/.exec(normalized);
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const minorUnits = sign * (Number(match[2]) * 100 + Number(match[3] || 0));
  return Number.isSafeInteger(minorUnits)
    ? { kind: "money_minor_units", value: minorUnits }
    : null;
}

/**
 * Synthetic-only canonical release experiment.
 *
 * This boundary consumes already validated structural product groups, a
 * complete financial evidence collection, and its interpretation result. It
 * does not reinterpret source values or call downstream reconciliation.
 */
function buildCanonicalReceiptFromFinancialInterpretationExperiment_(
  validatedStructuralProductProjection,
  financialEvidenceCollection,
  interpretationResult,
) {
  const structuralSnapshot = JSON.stringify(
    validatedStructuralProductProjection,
  );
  const collectionSnapshot = JSON.stringify(financialEvidenceCollection);
  const interpretationSnapshot = JSON.stringify(interpretationResult);
  const structuralProjection =
    validatedStructuralProductProjection &&
    typeof validatedStructuralProductProjection === "object"
      ? validatedStructuralProductProjection
      : {};
  const collection =
    financialEvidenceCollection &&
    typeof financialEvidenceCollection === "object"
      ? financialEvidenceCollection
      : {};
  const interpreted =
    interpretationResult && typeof interpretationResult === "object"
      ? interpretationResult
      : {};
  const productGroups = Array.isArray(structuralProjection.productGroups)
    ? structuralProjection.productGroups
    : [];
  const observations = Array.isArray(collection.observations)
    ? collection.observations
    : [];
  const interpretations = Array.isArray(interpreted.interpretations)
    ? interpreted.interpretations
    : [];
  const conflicts = [];
  const blockingEvidence = [];
  const evidenceOnlyDispositions = [];
  const canonicalTargetProvenance = [];
  const structuralGroupProvenance = [];
  const supportingFinancialObservationIds = [];
  const observationById = {};
  const interpretationById = {};
  const claimedObservationIds = {};
  const accountedObservationIds = {};
  const seenProductGroupIds = {};
  const canonicalItems = [];

  function addConflict(code, sourceObservationIds, groupId) {
    conflicts.push({
      code: code,
      sourceObservationIds: Array.isArray(sourceObservationIds)
        ? sourceObservationIds.slice()
        : [],
      groupId: groupId || null,
    });
  }

  function addBlockingEvidence(interpretation, code) {
    const observationId =
      interpretation && interpretation.sourceObservationId
        ? interpretation.sourceObservationId
        : null;
    if (
      !blockingEvidence.some(function (blocked) {
        return (
          blocked.sourceObservationId === observationId &&
          blocked.code === code
        );
      })
    ) {
      blockingEvidence.push({
        sourceObservationId: observationId,
        status: interpretation ? interpretation.status : null,
        semanticRole: interpretation ? interpretation.semanticRole : null,
        canonicalDisposition: interpretation
          ? interpretation.canonicalDisposition
          : null,
        code: code,
      });
    }
    if (observationId) accountedObservationIds[observationId] = true;
  }

  function claimObservation(observationId, purpose, groupId) {
    if (!observationById[observationId] || !interpretationById[observationId]) {
      addConflict("MISSING_CANONICAL_SOURCE_OBSERVATION", [observationId], groupId);
      return false;
    }
    if (claimedObservationIds[observationId]) {
      addConflict("MULTIPLY_CONSUMED_CANONICAL_SOURCE", [observationId], groupId);
      return false;
    }
    claimedObservationIds[observationId] = purpose;
    accountedObservationIds[observationId] = true;
    return true;
  }

  if (
    structuralProjection.resolved !== true ||
    !Array.isArray(structuralProjection.productGroups)
  ) {
    addConflict("UNRESOLVED_CANONICAL_PRODUCT_PROJECTION", [], null);
  }

  const sourceAccounting = collection.sourceAccounting || {};
  if (
    collection.collectionComplete !== true ||
    !Array.isArray(collection.conflicts) ||
    collection.conflicts.length > 0 ||
    sourceAccounting.declaredObservationCount !== observations.length ||
    sourceAccounting.collectedObservationCount !== observations.length ||
    sourceAccounting.validSourceReferenceCount !== observations.length ||
    sourceAccounting.uniqueObservationIdCount !== observations.length ||
    sourceAccounting.uniqueSourceConsumptionCount !== observations.length ||
    sourceAccounting.sourceOrderPreserved !== true ||
    sourceAccounting.sourceUnchanged !== true
  ) {
    addConflict("INCOMPLETE_CANONICAL_FINANCIAL_ACCOUNTING", [], null);
  }

  if (
    !interpreted.releaseStatus ||
    interpreted.releaseStatus.eligible !== true ||
    interpreted.releaseStatus.code !== "RELEASE_ELIGIBLE" ||
    !Array.isArray(interpreted.conflicts) ||
    interpreted.conflicts.length > 0
  ) {
    addConflict("FINANCIAL_INTERPRETATION_NOT_RELEASE_ELIGIBLE", [], null);
  }

  const interpretationAccounting = interpreted.accounting || {};
  if (
    interpretationAccounting.sourceObservationCount !== observations.length ||
    interpretationAccounting.interpretationCount !== observations.length ||
    interpretationAccounting.uniqueInterpretedObservationCount !==
      observations.length ||
    interpretationAccounting.everyObservationInterpreted !== true ||
    interpretationAccounting.collectionUnchanged !== true ||
    interpretationAccounting.projectionUnchanged !== true
  ) {
    addConflict("INCOMPLETE_CANONICAL_INTERPRETATION_ACCOUNTING", [], null);
  }

  observations.forEach(function (observation) {
    const observationId = observation && observation.observationId;
    if (!hasObservedTextPrototype_(observationId) || observationById[observationId]) {
      addConflict("INVALID_CANONICAL_SOURCE_OBSERVATION", [observationId || null], null);
      return;
    }
    observationById[observationId] = observation;
  });

  interpretations.forEach(function (interpretation) {
    const observationId = interpretation && interpretation.sourceObservationId;
    if (
      !hasObservedTextPrototype_(observationId) ||
      interpretationById[observationId]
    ) {
      addConflict("INVALID_CANONICAL_INTERPRETATION", [observationId || null], null);
      return;
    }
    interpretationById[observationId] = interpretation;
    const observation = observationById[observationId];
    if (!observation) return;

    const expectedParsedValue =
      interpretation.semanticRole === "quantity"
        ? parseCollectedQuantityExperiment_(observation.rawValue)
        : interpretation.semanticRole === "vat_rate"
          ? parseCollectedRateExperiment_(observation.rawValue)
          : parseCollectedMoneyExperiment_(observation.rawValue);
    if (
      !expectedParsedValue ||
      !interpretation.parsedValue ||
      expectedParsedValue.kind !== interpretation.parsedValue.kind ||
      expectedParsedValue.value !== interpretation.parsedValue.value ||
      !interpretation.structuralSlotRef ||
      !validateStructuralSlotForObservationExperiment_(
        observation,
        interpretation.structuralSlotRef,
      ) ||
      !Array.isArray(interpretation.supportingObservationIds) ||
      interpretation.supportingObservationIds.some(function (supportingId) {
        return !observations.some(function (candidate) {
          return candidate.observationId === supportingId;
        });
      })
    ) {
      addConflict("INCONSISTENT_CANONICAL_PROVENANCE", [observationId], null);
    }
  });

  productGroups.forEach(function (group, itemIndex) {
    const groupStartConflictCount = conflicts.length;
    const sourceRowOrders =
      group && Array.isArray(group.sourceRowOrders)
        ? group.sourceRowOrders.slice()
        : [];
    const financialSlots =
      group && group.financialSlots && typeof group.financialSlots === "object"
        ? group.financialSlots
        : {};
    const groupId = group && group.groupId;
    const requiredSlots = [
      ["quantity", "items[].quantity", "quantity", "quantity"],
      [
        "unitPrice",
        "items[].unitPrice",
        "money_minor_units",
        "product_unit_amount",
      ],
      [
        "lineTotal",
        "items[].lineTotal",
        "money_minor_units",
        "product_line_amount",
      ],
    ];
    const groupInterpretations = {};

    if (
      !hasObservedTextPrototype_(groupId) ||
      group.structuralCapability !== "TERMINAL_PRICED_ANCHOR" ||
      !hasObservedTextPrototype_(group.description) ||
      sourceRowOrders.length === 0 ||
      sourceRowOrders.some(function (order, index) {
        return (
          !Number.isInteger(order) ||
          order <= 0 ||
          (index > 0 && order <= sourceRowOrders[index - 1])
        );
      }) ||
      seenProductGroupIds[groupId]
    ) {
      addConflict("INVALID_CANONICAL_PRODUCT_GROUP", [], groupId);
    }
    if (hasObservedTextPrototype_(groupId)) seenProductGroupIds[groupId] = true;

    requiredSlots.forEach(function (slotRule) {
      const slotName = slotRule[0];
      const requiredDisposition = slotRule[1];
      const requiredKind = slotRule[2];
      const requiredRole = slotRule[3];
      const observationId = financialSlots[slotName];
      const observation = observationById[observationId];
      const interpretation = interpretationById[observationId];

      if (!hasObservedTextPrototype_(observationId)) {
        addConflict("MISSING_CANONICAL_PRODUCT_SLOT", [], groupId);
        return;
      }
      if (!claimObservation(observationId, "product:" + groupId + ":" + slotName, groupId)) {
        return;
      }
      if (
        !observation ||
        !interpretation ||
        observation.sourceRef.groupId !== groupId ||
        observation.structuralCapability !== group.structuralCapability ||
        observation.sourceRef.sourceLineOrders.some(function (order) {
          return sourceRowOrders.indexOf(order) < 0;
        }) ||
        interpretation.status !== "SUPPORTED" ||
        interpretation.semanticRole !== requiredRole ||
        interpretation.canonicalDisposition !== requiredDisposition ||
        !interpretation.parsedValue ||
        interpretation.parsedValue.kind !== requiredKind
      ) {
        addConflict("CROSS_GROUP_OR_INVALID_PRODUCT_SLOT", [observationId], groupId);
        return;
      }
      groupInterpretations[slotName] = interpretation;
    });

    if (
      groupInterpretations.quantity &&
      groupInterpretations.unitPrice &&
      groupInterpretations.lineTotal &&
      groupInterpretations.quantity.parsedValue.value *
        groupInterpretations.unitPrice.parsedValue.value !==
        groupInterpretations.lineTotal.parsedValue.value
    ) {
      addConflict(
        "CANONICAL_PRODUCT_ARITHMETIC_MISMATCH",
        [
          financialSlots.quantity,
          financialSlots.unitPrice,
          financialSlots.lineTotal,
        ],
        groupId,
      );
    }

    if (conflicts.length !== groupStartConflictCount) return;

    canonicalItems.push({
      name: group.description,
      quantity: groupInterpretations.quantity.parsedValue.value,
      unitPrice: groupInterpretations.unitPrice.parsedValue.value / 100,
      lineTotal: groupInterpretations.lineTotal.parsedValue.value / 100,
    });
    structuralGroupProvenance.push({
      canonicalItemIndex: itemIndex,
      groupId: groupId,
      structuralCapability: group.structuralCapability,
      sourceRowOrders: sourceRowOrders,
      description: group.description,
      financialSlots: {
        quantity: financialSlots.quantity,
        unitPrice: financialSlots.unitPrice,
        lineTotal: financialSlots.lineTotal,
      },
    });
    canonicalTargetProvenance.push({
      canonicalTarget: "items[" + itemIndex + "].name",
      supportingObservationIds: [],
      structuralGroupIds: [groupId],
      structuralSlotRefs: [],
    });
    requiredSlots.forEach(function (slotRule) {
      const slotName = slotRule[0];
      const interpretation = groupInterpretations[slotName];
      const canonicalField =
        slotName === "unitPrice" ? "unitPrice" : slotName;
      canonicalTargetProvenance.push({
        canonicalTarget: "items[" + itemIndex + "]." + canonicalField,
        supportingObservationIds: [interpretation.sourceObservationId],
        structuralGroupIds: [groupId],
        structuralSlotRefs: [
          cloneStructuralSlotRefExperiment_(interpretation.structuralSlotRef),
        ],
      });
      supportingFinancialObservationIds.push(
        interpretation.sourceObservationId,
      );
    });
  });

  const singletonTargets = {};
  interpretations.forEach(function (interpretation) {
    const observationId = interpretation.sourceObservationId;
    const target = interpretation.canonicalDisposition;
    if (
      target === "items[].quantity" ||
      target === "items[].unitPrice" ||
      target === "items[].lineTotal"
    ) {
      return;
    }
    if (target === "EVIDENCE_ONLY") {
      let evidenceOnlySafe = false;
      if (
        interpretation.semanticRole === "tender" ||
        interpretation.semanticRole === "change"
      ) {
        evidenceOnlySafe = true;
      } else if (
        interpretation.semanticRole === "document_total_unknown_basis" &&
        interpretation.ruleId === "BARE_TOTAL_CORROBORATES_TYPED_TOTAL"
      ) {
        evidenceOnlySafe = interpretation.supportingObservationIds.some(
          function (supportingId) {
            if (supportingId === observationId) return false;
            const supporting = interpretationById[supportingId];
            return (
              supporting &&
              supporting.status === "SUPPORTED" &&
              (supporting.canonicalDisposition === "totals.inclVAT" ||
                supporting.canonicalDisposition === "totals.exclVAT") &&
              supporting.parsedValue &&
              interpretation.parsedValue &&
              supporting.parsedValue.value === interpretation.parsedValue.value
            );
          },
        );
      }

      if (!evidenceOnlySafe) {
        addConflict("UNSAFE_EVIDENCE_ONLY_DISPOSITION", [observationId], null);
        addBlockingEvidence(interpretation, "UNSAFE_EVIDENCE_ONLY_DISPOSITION");
        return;
      }
      if (!claimObservation(observationId, "evidence-only", null)) return;
      evidenceOnlyDispositions.push({
        sourceObservationId: observationId,
        semanticRole: interpretation.semanticRole,
        ruleId: interpretation.ruleId,
        supportingObservationIds: interpretation.supportingObservationIds.slice(),
        structuralSlotRef: cloneStructuralSlotRefExperiment_(
          interpretation.structuralSlotRef,
        ),
      });
      return;
    }

    if (
      interpretation.status !== "SUPPORTED" ||
      target === "POLICY_REQUIRED" ||
      target === "UNREPRESENTABLE" ||
      target === "BLOCKED_UNRESOLVED"
    ) {
      addConflict("BLOCKING_CANONICAL_FINANCIAL_EVIDENCE", [observationId], null);
      addBlockingEvidence(
        interpretation,
        "BLOCKING_CANONICAL_FINANCIAL_EVIDENCE",
      );
      return;
    }

    if (
      ["totals.exclVAT", "totals.inclVAT", "vat.rate", "vat.amount"].indexOf(
        target,
      ) < 0
    ) {
      addConflict("UNSUPPORTED_CANONICAL_TARGET", [observationId], null);
      addBlockingEvidence(interpretation, "UNSUPPORTED_CANONICAL_TARGET");
      return;
    }
    const singletonSemantics = {
      "totals.exclVAT": ["document_total_excl_vat", "exclVAT"],
      "totals.inclVAT": ["document_total_incl_vat", "inclVAT"],
      "vat.rate": ["vat_rate", null],
      "vat.amount": ["vat_amount", null],
    };
    const requiredSemantics = singletonSemantics[target];
    if (
      interpretation.semanticRole !== requiredSemantics[0] ||
      interpretation.vatBasis !== requiredSemantics[1]
    ) {
      addConflict("CANONICAL_TARGET_SEMANTIC_MISMATCH", [observationId], null);
      addBlockingEvidence(
        interpretation,
        "CANONICAL_TARGET_SEMANTIC_MISMATCH",
      );
      return;
    }
    if (!claimObservation(observationId, "singleton:" + target, null)) return;

    if (!singletonTargets[target]) singletonTargets[target] = [];
    singletonTargets[target].push(interpretation);
  });

  Object.keys(singletonTargets).forEach(function (target) {
    const assignments = singletonTargets[target];
    const first = assignments[0];
    const equivalent = assignments.every(function (candidate) {
      return (
        candidate.status === "SUPPORTED" &&
        candidate.semanticRole === first.semanticRole &&
        candidate.scope === first.scope &&
        candidate.vatBasis === first.vatBasis &&
        candidate.parsedValue &&
        first.parsedValue &&
        candidate.parsedValue.kind === first.parsedValue.kind &&
        candidate.parsedValue.value === first.parsedValue.value
      );
    });
    const observationIds = assignments.map(function (assignment) {
      return assignment.sourceObservationId;
    });
    if (!equivalent) {
      addConflict("CONFLICTING_CANONICAL_SINGLETON_TARGET", observationIds, null);
      assignments.forEach(function (assignment) {
        addBlockingEvidence(
          assignment,
          "CONFLICTING_CANONICAL_SINGLETON_TARGET",
        );
      });
      return;
    }
    canonicalTargetProvenance.push({
      canonicalTarget: target,
      supportingObservationIds: observationIds,
      structuralGroupIds: [],
      structuralSlotRefs: assignments.map(function (assignment) {
        return cloneStructuralSlotRefExperiment_(assignment.structuralSlotRef);
      }),
    });
    observationIds.forEach(function (observationId) {
      supportingFinancialObservationIds.push(observationId);
    });
  });

  interpretations.forEach(function (interpretation) {
    const observationId = interpretation.sourceObservationId;
    if (!accountedObservationIds[observationId]) {
      addConflict("UNACCOUNTED_CANONICAL_FINANCIAL_EVIDENCE", [observationId], null);
      addBlockingEvidence(
        interpretation,
        "UNACCOUNTED_CANONICAL_FINANCIAL_EVIDENCE",
      );
    }
  });

  if (!singletonTargets["totals.inclVAT"] && !singletonTargets["totals.exclVAT"]) {
    addConflict("MISSING_TYPED_CANONICAL_DOCUMENT_TOTAL", [], null);
  }
  if (canonicalItems.length !== productGroups.length || canonicalItems.length === 0) {
    addConflict("INCOMPLETE_CANONICAL_PRODUCT_SET", [], null);
  }

  const inputsUnchanged =
    JSON.stringify(validatedStructuralProductProjection) === structuralSnapshot &&
    JSON.stringify(financialEvidenceCollection) === collectionSnapshot &&
    JSON.stringify(interpretationResult) === interpretationSnapshot;
  if (!inputsUnchanged) {
    addConflict("CANONICALIZATION_MUTATED_INPUT", [], null);
  }

  const upstreamReleaseCode =
    interpreted.releaseStatus && interpreted.releaseStatus.code
      ? interpreted.releaseStatus.code
      : null;
  const released = conflicts.length === 0;
  const totalValue = function (target) {
    return singletonTargets[target] && singletonTargets[target][0]
      ? singletonTargets[target][0].parsedValue.value / 100
      : null;
  };
  const rateValue = singletonTargets["vat.rate"]
    ? singletonTargets["vat.rate"][0].parsedValue.value / 10000
    : null;
  const vatAmount = totalValue("vat.amount");

  return {
    releaseStatus: {
      eligible: released,
      code: released
        ? "CANONICAL_RELEASED"
        : upstreamReleaseCode && upstreamReleaseCode !== "RELEASE_ELIGIBLE"
          ? upstreamReleaseCode
          : "CANONICALIZATION_FAILED",
    },
    canonicalReceipt: released
      ? {
          items: canonicalItems,
          additionalCosts: [],
          vat:
            rateValue === null && vatAmount === null
              ? null
              : { rate: rateValue, amount: vatAmount },
          totals: {
            exclVAT: totalValue("totals.exclVAT"),
            inclVAT: totalValue("totals.inclVAT"),
            vatAmount: null,
          },
        }
      : null,
    canonicalTargetProvenance: canonicalTargetProvenance,
    supportingFinancialObservationIds: supportingFinancialObservationIds,
    structuralGroupProvenance: structuralGroupProvenance,
    evidenceOnlyDispositions: evidenceOnlyDispositions,
    blockingEvidence: blockingEvidence,
    conflicts: conflicts,
    accounting: {
      sourceObservationCount: observations.length,
      interpretationCount: interpretations.length,
      canonicalSupportingObservationCount:
        supportingFinancialObservationIds.length,
      evidenceOnlyObservationCount: evidenceOnlyDispositions.length,
      blockedObservationCount: blockingEvidence.length,
      uniqueClaimedObservationCount: Object.keys(claimedObservationIds).length,
      uniqueAccountedObservationCount: Object.keys(accountedObservationIds)
        .length,
      everyObservationAccounted:
        Object.keys(accountedObservationIds).length === observations.length,
      inputsUnchanged: inputsUnchanged,
    },
  };
}
