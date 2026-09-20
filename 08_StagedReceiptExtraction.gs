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
    countEvidence &&
    (
      parsedCount === null ||
      parsedCount !== candidateItems.length ||
      !structuralStatus.validation ||
      !structuralStatus.validation.printedProductCount ||
      structuralStatus.validation.printedProductCount.matches !== true
    )
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
    !totalEvidence ||
    summaryOrders.length !== (countEvidence ? 2 : 1) ||
    summaryOrders.indexOf(totalEvidence.sourceLineOrder) < 0 ||
    !observationByOrder[totalEvidence.sourceLineOrder] ||
    observationByOrder[totalEvidence.sourceLineOrder].rawText !==
      totalEvidence.rawText ||
    (countEvidence &&
      (countEvidence.sourceLineOrder === totalEvidence.sourceLineOrder ||
        summaryOrders.indexOf(countEvidence.sourceLineOrder) < 0 ||
        !observationByOrder[countEvidence.sourceLineOrder] ||
        observationByOrder[countEvidence.sourceLineOrder].rawText !==
          countEvidence.rawText))
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
