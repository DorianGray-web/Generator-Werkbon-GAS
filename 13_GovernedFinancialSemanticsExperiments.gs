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
