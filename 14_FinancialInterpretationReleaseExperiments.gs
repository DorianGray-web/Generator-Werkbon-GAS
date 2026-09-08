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
