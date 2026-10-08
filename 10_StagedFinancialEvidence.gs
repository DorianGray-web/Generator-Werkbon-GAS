/**
 * Adapts the currently validated singular Stage-1-v2 printed-total evidence to
 * the experimental multi-observation financial boundary. A synthetic test may
 * instead provide financialEvidence.monetaryObservations directly.
 * Supplemental atomic Netto/BTW rows may accompany the separately linked
 * printed total; overlapping or other dual representations still fail closed.
 */
function collectFinancialEvidencePrototype_(
  extraction,
  printedTotalEvidence,
  groups,
) {
  const sourceFinancialEvidence =
    extraction && extraction.financialEvidence &&
    typeof extraction.financialEvidence === "object"
      ? extraction.financialEvidence
      : null;
  const suppliedFinancialEvidence =
    sourceFinancialEvidence &&
    Array.isArray(sourceFinancialEvidence.monetaryObservations)
      ? sourceFinancialEvidence.monetaryObservations
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
  const observationByOrder = {};
  (extraction && Array.isArray(extraction.observedLines)
    ? extraction.observedLines
    : []).forEach(function (line) {
    observationByOrder[line.order] = line;
  });
  const reservedOrders = {};
  const sourceSummaryEvidence = extraction && extraction.summaryEvidence;
  if (sourceSummaryEvidence) {
    [
      sourceSummaryEvidence.printedProductCount,
      sourceSummaryEvidence.printedTotal,
    ].forEach(function (item) {
      if (item) reservedOrders[item.sourceLineOrder] = true;
    });
  }
  (suppliedFinancialEvidence || []).forEach(function (observation) {
    (Array.isArray(observation && observation.sourceLineOrders)
      ? observation.sourceLineOrders
      : []).forEach(function (order) {
      reservedOrders[order] = true;
    });
  });
  const vatBreakdownValidation = validateVatBreakdownEvidencePrototype_(
    sourceFinancialEvidence,
    observationByOrder,
    reservedOrders,
  );

  const supplementalSummaryOnly =
    suppliedFinancialEvidence !== null && adaptedPrintedTotal.length > 0 &&
    suppliedFinancialEvidence.every(function (observation) {
      const label = normalizeFinancialLabelPrototype_(observation.labelText);
      return (label === "netto" || label === "btw") &&
        Array.isArray(observation.sourceLineOrders) &&
        observation.sourceLineOrders.length === 1 &&
        observation.sourceLineOrders[0] !== printedTotalEvidence.sourceLineOrder;
    });
  if (suppliedFinancialEvidence !== null && adaptedPrintedTotal.length > 0 &&
      !supplementalSummaryOnly) {
    const conflicted = interpretFinancialEvidencePrototype_(
      suppliedFinancialEvidence,
      candidateItemSumCents,
      vatBreakdownValidation.vatBreakdowns,
      vatBreakdownValidation.conflicts,
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
      : suppliedFinancialEvidence.concat(adaptedPrintedTotal),
    candidateItemSumCents,
    vatBreakdownValidation.vatBreakdowns,
    vatBreakdownValidation.conflicts,
  );
}

/**
 * Pure financial-evidence interpreter. Lexical amount parsing and numerical
 * comparison are deliberately separate from meaning and VAT-basis resolution.
 */
function interpretFinancialEvidencePrototype_(
  sourceObservations,
  candidateItemSumCents,
  sourceVatBreakdowns,
  initialConflicts,
) {
  const observations = [];
  const interpretations = [];
  const vatBreakdownInterpretations = [];
  const comparisons = [];
  const conflicts = (Array.isArray(initialConflicts) ? initialConflicts : [])
    .map(clonePrototypeIssue_);
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

  (Array.isArray(sourceVatBreakdowns) ? sourceVatBreakdowns : []).forEach(
    function (tuple) {
      const rateBasisPoints = parseVatBreakdownRatePrototype_(tuple.rateText);
      const taxableBase = parsePrototypeAmount_(tuple.taxableBaseText);
      const vatAmount = parsePrototypeAmount_(tuple.vatAmountText);
      const total = parsePrototypeAmount_(tuple.totalText);
      const interpretation = {
        evidenceId: tuple.evidenceId,
        status: "conflict",
        failureCode: null,
        rateBasisPoints: rateBasisPoints,
        taxableBaseCents: taxableBase && taxableBase.cents,
        vatAmountCents: vatAmount && vatAmount.cents,
        totalCents: total && total.cents,
        totalVatBasis: tuple.totalVatBasisEvidence,
        supportingEvidenceIds: [tuple.evidenceId],
        ruleId: null,
      };
      vatBreakdownInterpretations.push(interpretation);

      if (
        rateBasisPoints === null || taxableBase === null ||
        vatAmount === null || total === null
      ) {
        interpretation.failureCode = "INVALID_VAT_BREAKDOWN_EVIDENCE";
        conflicts.push({
          code: interpretation.failureCode,
          evidenceIds: [tuple.evidenceId],
        });
        return;
      }
      if (Math.abs(taxableBase.cents + vatAmount.cents - total.cents) > 2) {
        interpretation.failureCode = "CONTRADICTORY_VAT_BREAKDOWN";
        conflicts.push({
          code: interpretation.failureCode,
          evidenceIds: [tuple.evidenceId],
        });
        return;
      }

      mergeVatBreakdownAssignmentPrototype_(
        assignmentsByTarget,
        conflicts,
        "totals.vatAmount",
        vatAmount.cents,
        tuple.evidenceId,
        "EXPLICIT_VAT_BREAKDOWN_AMOUNT",
      );
      if (tuple.totalVatBasisEvidence !== "inclVAT") {
        interpretation.failureCode = "AMBIGUOUS_VAT_BREAKDOWN_TOTAL_BASIS";
        conflicts.push({
          code: interpretation.failureCode,
          evidenceIds: [tuple.evidenceId],
        });
        return;
      }
      mergeVatBreakdownAssignmentPrototype_(
        assignmentsByTarget,
        conflicts,
        "totals.inclVAT",
        total.cents,
        tuple.evidenceId,
        "EXPLICIT_VAT_BREAKDOWN_TOTAL_INCL_VAT",
      );
      interpretation.status = "resolved";
      interpretation.ruleId = "EXPLICIT_VAT_BREAKDOWN_TUPLE";

      const matchingBareTotals = interpretations.filter(function (item) {
        if (
          item.failureCode !== "AMBIGUOUS_PRINTED_TOTAL_TYPE" ||
          item.ruleId !== "BARE_DOCUMENT_TOTAL_LABEL"
        ) {
          return false;
        }
        const observation = observations.find(function (candidate) {
          return candidate.evidenceId === item.evidenceId;
        });
        return observation && observation.parsedAmountCents === total.cents;
      });
      if (matchingBareTotals.length === 1) {
        const bare = matchingBareTotals[0];
        bare.status = "resolved";
        bare.failureCode = null;
        bare.resolvedVatBasis = "inclVAT";
        bare.canonicalTarget = "totals.inclVAT";
        bare.supportingEvidenceIds = [tuple.evidenceId, bare.evidenceId];
        bare.ruleId = "EXPLICIT_VAT_BREAKDOWN_TOTAL_CORROBORATION";
        const inclAssignment = assignmentsByTarget["totals.inclVAT"];
        if (
          inclAssignment &&
          inclAssignment.supportingEvidenceIds.indexOf(bare.evidenceId) < 0
        ) {
          inclAssignment.supportingEvidenceIds.push(bare.evidenceId);
          inclAssignment.ruleIds.push(bare.ruleId);
        }
        const ambiguousIndex = conflicts.findIndex(function (item) {
          return item.code === "AMBIGUOUS_PRINTED_TOTAL_TYPE" &&
            item.evidenceIds.length === 1 &&
            item.evidenceIds[0] === bare.evidenceId;
        });
        if (ambiguousIndex >= 0) conflicts.splice(ambiguousIndex, 1);
      } else if (matchingBareTotals.length > 1) {
        conflicts.push({
          code: "MULTIPLE_CANDIDATE_TOTALS",
          evidenceIds: matchingBareTotals.map(function (item) {
            return item.evidenceId;
          }),
        });
      }
    },
  );

  // A bare Totaal acquires an inclVAT basis only from separately printed,
  // source-linked Netto and BTW amount rows whose arithmetic agrees.
  const net = assignmentsByTarget["totals.exclVAT"];
  const vat = assignmentsByTarget["totals.vatAmount"];
  const bareTotals = interpretations.filter(function (item) {
    return item.failureCode === "AMBIGUOUS_PRINTED_TOTAL_TYPE" &&
      item.ruleId === "BARE_DOCUMENT_TOTAL_LABEL";
  });
  if (net && vat && bareTotals.length === 1) {
    const bare = bareTotals[0];
    const totalObservation = observations.find(function (item) {
      return item.evidenceId === bare.evidenceId;
    });
    if (Math.abs(net.amountCents + vat.amountCents -
        totalObservation.parsedAmountCents) <= 2) {
      bare.status = "resolved";
      bare.failureCode = null;
      bare.resolvedVatBasis = "inclVAT";
      bare.canonicalTarget = "totals.inclVAT";
      bare.supportingEvidenceIds = net.supportingEvidenceIds.concat(
        vat.supportingEvidenceIds, [bare.evidenceId],
      );
      bare.ruleId = "EXPLICIT_NETTO_BTW_TOTAL_RECONCILIATION";
      assignmentsByTarget["totals.inclVAT"] = {
        canonicalTarget: "totals.inclVAT",
        amountCents: totalObservation.parsedAmountCents,
        scope: "document",
        supportingEvidenceIds: bare.supportingEvidenceIds.slice(),
        ruleIds: [bare.ruleId],
      };
      const ambiguousIndex = conflicts.findIndex(function (item) {
        return item.code === "AMBIGUOUS_PRINTED_TOTAL_TYPE" &&
          item.evidenceIds.length === 1 &&
          item.evidenceIds[0] === bare.evidenceId;
      });
      if (ambiguousIndex >= 0) conflicts.splice(ambiguousIndex, 1);
    } else {
      conflicts.push({
        code: "CONTRADICTORY_VAT_SUMMARY",
        evidenceIds: net.supportingEvidenceIds.concat(
          vat.supportingEvidenceIds, [bare.evidenceId],
        ),
      });
    }
  }
  const incl = assignmentsByTarget["totals.inclVAT"];
  if (net && vat && incl &&
      Math.abs(net.amountCents + vat.amountCents - incl.amountCents) > 2 &&
      !conflicts.some(function (item) {
        return item.code === "CONTRADICTORY_VAT_SUMMARY";
      })) {
    conflicts.push({
      code: "CONTRADICTORY_VAT_SUMMARY",
      evidenceIds: net.supportingEvidenceIds.concat(
        vat.supportingEvidenceIds, incl.supportingEvidenceIds,
      ),
    });
  }

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
    vatBreakdownInterpretations,
    canonicalAssignments,
    conflicts,
    unsupportedCapabilities,
  );

  return {
    monetaryObservations: observations,
    vatBreakdowns: (Array.isArray(sourceVatBreakdowns)
      ? sourceVatBreakdowns
      : []).map(cloneVatBreakdownEvidencePrototype_),
    interpretations: interpretations,
    vatBreakdownInterpretations: vatBreakdownInterpretations,
    canonicalAssignments: canonicalAssignments,
    candidateItemSumCents: candidateItemSumCents,
    comparisons: comparisons,
    conflicts: conflicts,
    unsupportedCapabilities: unsupportedCapabilities,
    status: status,
  };
}

function parseVatBreakdownRatePrototype_(value) {
  if (!hasObservedTextPrototype_(value)) return null;
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?%$/.exec(value.trim());
  if (!match) return null;
  const basisPoints = Number(match[1]) * 100 +
    Number((match[2] || "").padEnd(2, "0") || 0);
  return basisPoints > 0 && basisPoints <= 10000 ? basisPoints : null;
}

function mergeVatBreakdownAssignmentPrototype_(
  assignmentsByTarget,
  conflicts,
  target,
  amountCents,
  evidenceId,
  ruleId,
) {
  const existing = assignmentsByTarget[target];
  if (!existing) {
    assignmentsByTarget[target] = {
      canonicalTarget: target,
      amountCents: amountCents,
      scope: "document",
      supportingEvidenceIds: [evidenceId],
      ruleIds: [ruleId],
    };
    return;
  }
  if (existing.amountCents === amountCents && existing.scope === "document") {
    existing.supportingEvidenceIds.push(evidenceId);
    existing.ruleIds.push(ruleId);
    return;
  }
  conflicts.push({
    code: "CONFLICTING_TYPED_TOTALS",
    evidenceIds: existing.supportingEvidenceIds.concat([evidenceId]),
    canonicalTarget: target,
  });
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
    netto: {
      meaning: "document_total",
      vatBasis: "exclVAT",
      canonicalTarget: "totals.exclVAT",
      ruleId: "EXPLICIT_NETTO_LABEL",
    },
    btw: {
      meaning: "vat_amount",
      vatBasis: null,
      canonicalTarget: "totals.vatAmount",
      ruleId: "EXPLICIT_BTW_AMOUNT_LABEL",
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
  vatBreakdownInterpretations,
  canonicalAssignments,
  conflicts,
  unsupportedCapabilities,
) {
  if (
    observations.length === 0 &&
    vatBreakdownInterpretations.length === 0
  ) {
    return { resolved: false, code: "MISSING_PRINTED_TOTAL_EVIDENCE" };
  }

  const priorityCodes = [
    "DUPLICATE_FINANCIAL_EVIDENCE_REPRESENTATION",
    "DUPLICATE_VAT_BREAKDOWN_EVIDENCE_ID",
    "INVALID_VAT_BREAKDOWN_SOURCE_LINE",
    "OVERLAPPING_VAT_BREAKDOWN_PROVENANCE",
    "AMBIGUOUS_VAT_BREAKDOWN_PROVENANCE",
    "AMBIGUOUS_VAT_BREAKDOWN_ASSOCIATION",
    "INVALID_VAT_BREAKDOWN_EVIDENCE",
    "INVALID_FINANCIAL_EVIDENCE",
    "DUPLICATE_FINANCIAL_EVIDENCE_ID",
    "CONFLICTING_REPORTED_FINANCIAL_EVIDENCE",
    "CONFLICTING_TYPED_TOTALS",
    "CONTRADICTORY_VAT_BREAKDOWN",
    "AMBIGUOUS_VAT_BREAKDOWN_TOTAL_BASIS",
    "CONTRADICTORY_VAT_SUMMARY",
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
  }) && vatBreakdownInterpretations.every(function (interpretation) {
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
