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
