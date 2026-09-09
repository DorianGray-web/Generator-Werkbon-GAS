/**
 * Pure experimental contracts for comparing independently constructed source
 * topology with separately constructed Stage1V3 critical topology claims.
 *
 * This module performs no extraction, interpretation, repair, I/O, or
 * production release decision. Lexical fingerprints are opaque exact-match
 * values; lexical kinds and regions carry physical evidence only.
 */

const SOURCE_TOPOLOGY_EVIDENCE_SCHEMA_VERSION_ =
  "source-topology-evidence/1.0.0";
const SOURCE_TOPOLOGY_COMPARISON_INPUT_SCHEMA_VERSION_ =
  "source-topology-comparison-input/1.0.0";
const SOURCE_TOPOLOGY_COMPARISON_SCHEMA_VERSION_ =
  "source-topology-comparison/1.0.0";

const SOURCE_TOPOLOGY_STATUS_VALUES_ = ["RESOLVED", "UNRESOLVED", "FAILED"];
const SOURCE_TOPOLOGY_ROW_STATE_VALUES_ = ["RESOLVED", "UNRESOLVED"];
const SOURCE_TOPOLOGY_COVERAGE_VALUES_ = [
  "FULL_SOURCE",
  "FIXED_GEOMETRIC_REGION",
];
const SOURCE_TOPOLOGY_LEXICAL_KIND_VALUES_ = [
  "numeric_like",
  "non_numeric",
  "unknown",
];
const SOURCE_TOPOLOGY_HORIZONTAL_REGION_VALUES_ = [
  "leading",
  "body",
  "trailing",
  "unknown",
];

function validateSourceTopologyEvidence_(evidence) {
  assertSourceTopologyPlainObject_(evidence, "evidence");
  assertSourceTopologyExactKeys_(
    evidence,
    ["schemaVersion", "source", "provenance", "coverage", "status", "rows", "issues"],
    [],
    "evidence",
  );
  if (evidence.schemaVersion !== SOURCE_TOPOLOGY_EVIDENCE_SCHEMA_VERSION_) {
    throw new Error("Source-topology evidence.schemaVersion is unsupported.");
  }

  validateSourceTopologySource_(evidence.source);
  validateSourceTopologyProvenance_(evidence.provenance);
  validateSourceTopologyCoverage_(evidence.coverage);
  assertSourceTopologyEnum_(
    evidence.status,
    SOURCE_TOPOLOGY_STATUS_VALUES_,
    "evidence.status",
  );
  if (!Array.isArray(evidence.rows)) {
    throw new Error("Source-topology evidence.rows must be an array.");
  }
  if (!Array.isArray(evidence.issues)) {
    throw new Error("Source-topology evidence.issues must be an array.");
  }

  const rowIds = {};
  const fragmentIds = {};
  let previousVerticalOrder = 0;
  evidence.rows.forEach(function (row, rowIndex) {
    const rowPath = "evidence.rows[" + rowIndex + "]";
    assertSourceTopologyPlainObject_(row, rowPath);
    assertSourceTopologyExactKeys_(
      row,
      ["rowId", "verticalOrder", "state", "fragments"],
      [],
      rowPath,
    );
    assertSourceTopologyId_(row.rowId, rowPath + ".rowId");
    if (rowIds[row.rowId]) {
      throw new Error("Source-topology " + rowPath + ".rowId is duplicated.");
    }
    rowIds[row.rowId] = true;
    if (
      !Number.isInteger(row.verticalOrder) ||
      row.verticalOrder <= previousVerticalOrder
    ) {
      throw new Error("Source-topology " + rowPath + ".verticalOrder is invalid.");
    }
    previousVerticalOrder = row.verticalOrder;
    assertSourceTopologyEnum_(
      row.state,
      SOURCE_TOPOLOGY_ROW_STATE_VALUES_,
      rowPath + ".state",
    );
    if (!Array.isArray(row.fragments)) {
      throw new Error("Source-topology " + rowPath + ".fragments must be an array.");
    }
    if (row.state === "RESOLVED" && row.fragments.length === 0) {
      throw new Error(
        "Source-topology " + rowPath + ".fragments must be non-empty when resolved.",
      );
    }

    let previousHorizontalOrder = 0;
    row.fragments.forEach(function (fragment, fragmentIndex) {
      const fragmentPath = rowPath + ".fragments[" + fragmentIndex + "]";
      validateSourceTopologyFragment_(fragment, fragmentPath, "fragmentId");
      if (fragmentIds[fragment.fragmentId]) {
        throw new Error(
          "Source-topology " + fragmentPath + ".fragmentId is duplicated.",
        );
      }
      fragmentIds[fragment.fragmentId] = true;
      if (fragment.horizontalOrder <= previousHorizontalOrder) {
        throw new Error(
          "Source-topology " + fragmentPath + ".horizontalOrder is invalid.",
        );
      }
      previousHorizontalOrder = fragment.horizontalOrder;
    });
  });

  evidence.issues.forEach(function (issue, issueIndex) {
    const issuePath = "evidence.issues[" + issueIndex + "]";
    assertSourceTopologyPlainObject_(issue, issuePath);
    assertSourceTopologyExactKeys_(
      issue,
      ["code", "rowId", "fragmentIds"],
      [],
      issuePath,
    );
    if (
      typeof issue.code !== "string" ||
      !/^[A-Z][A-Z0-9_]{0,79}$/.test(issue.code)
    ) {
      throw new Error("Source-topology " + issuePath + ".code is invalid.");
    }
    if (issue.rowId !== null && !rowIds[issue.rowId]) {
      throw new Error("Source-topology " + issuePath + ".rowId is invalid.");
    }
    if (!Array.isArray(issue.fragmentIds)) {
      throw new Error(
        "Source-topology " + issuePath + ".fragmentIds must be an array.",
      );
    }
    const seenIssueFragmentIds = {};
    issue.fragmentIds.forEach(function (fragmentId, fragmentIndex) {
      if (!fragmentIds[fragmentId] || seenIssueFragmentIds[fragmentId]) {
        throw new Error(
          "Source-topology " + issuePath + ".fragmentIds[" + fragmentIndex + "] is invalid.",
        );
      }
      seenIssueFragmentIds[fragmentId] = true;
    });
  });

  if (
    evidence.status === "RESOLVED" &&
    (evidence.rows.length === 0 ||
      evidence.issues.length !== 0 ||
      evidence.rows.some(function (row) { return row.state !== "RESOLVED"; }))
  ) {
    throw new Error("Source-topology resolved evidence is incomplete.");
  }
  if (evidence.status !== "RESOLVED" && evidence.issues.length === 0) {
    throw new Error("Source-topology non-resolved evidence requires an issue.");
  }

  return deepFreezeSourceTopologyValue_(cloneSourceTopologyValue_(evidence));
}

function validateSourceTopologySource_(source) {
  assertSourceTopologyPlainObject_(source, "evidence.source");
  assertSourceTopologyExactKeys_(
    source,
    ["sha256", "dimensions"],
    ["mimeType", "byteLength"],
    "evidence.source",
  );
  assertSourceTopologySha256_(source.sha256, "evidence.source.sha256");
  validateSourceTopologyDimensions_(source.dimensions, "evidence.source.dimensions");
  if (
    Object.prototype.hasOwnProperty.call(source, "mimeType") &&
    source.mimeType !== null &&
    (typeof source.mimeType !== "string" ||
      !/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(source.mimeType))
  ) {
    throw new Error("Source-topology evidence.source.mimeType is invalid.");
  }
  if (
    Object.prototype.hasOwnProperty.call(source, "byteLength") &&
    source.byteLength !== null &&
    (!Number.isInteger(source.byteLength) || source.byteLength <= 0)
  ) {
    throw new Error("Source-topology evidence.source.byteLength is invalid.");
  }
}

function validateSourceTopologyProvenance_(provenance) {
  assertSourceTopologyPlainObject_(provenance, "evidence.provenance");
  assertSourceTopologyExactKeys_(
    provenance,
    ["extractorId", "extractorVersion", "lexicalFingerprintProfile", "transformation"],
    [],
    "evidence.provenance",
  );
  ["extractorId", "extractorVersion", "lexicalFingerprintProfile"].forEach(
    function (key) {
      assertSourceTopologyBoundedString_(
        provenance[key],
        "evidence.provenance." + key,
      );
    },
  );

  const transformation = provenance.transformation;
  assertSourceTopologyPlainObject_(transformation, "evidence.provenance.transformation");
  assertSourceTopologyExactKeys_(
    transformation,
    ["profile", "parameters", "derivedSha256", "derivedDimensions"],
    [],
    "evidence.provenance.transformation",
  );
  assertSourceTopologyBoundedString_(
    transformation.profile,
    "evidence.provenance.transformation.profile",
  );
  assertSourceTopologyPlainObject_(
    transformation.parameters,
    "evidence.provenance.transformation.parameters",
  );
  validateSourceTopologyJsonValue_(
    transformation.parameters,
    "evidence.provenance.transformation.parameters",
    [],
  );

  if (transformation.profile === "identity") {
    if (
      Object.keys(transformation.parameters).length !== 0 ||
      transformation.derivedSha256 !== null ||
      transformation.derivedDimensions !== null
    ) {
      throw new Error("Source-topology identity transformation provenance is invalid.");
    }
    return;
  }

  if (Object.keys(transformation.parameters).length === 0) {
    throw new Error(
      "Source-topology transformed provenance requires deterministic parameters.",
    );
  }
  assertSourceTopologySha256_(
    transformation.derivedSha256,
    "evidence.provenance.transformation.derivedSha256",
  );
  validateSourceTopologyDimensions_(
    transformation.derivedDimensions,
    "evidence.provenance.transformation.derivedDimensions",
  );
}

function validateSourceTopologyCoverage_(coverage) {
  assertSourceTopologyPlainObject_(coverage, "evidence.coverage");
  assertSourceTopologyExactKeys_(
    coverage,
    ["kind", "normalizedRegion"],
    [],
    "evidence.coverage",
  );
  assertSourceTopologyEnum_(
    coverage.kind,
    SOURCE_TOPOLOGY_COVERAGE_VALUES_,
    "evidence.coverage.kind",
  );
  if (coverage.kind === "FULL_SOURCE") {
    if (coverage.normalizedRegion !== null) {
      throw new Error(
        "Source-topology full-source coverage.normalizedRegion must be null.",
      );
    }
    return;
  }

  assertSourceTopologyPlainObject_(
    coverage.normalizedRegion,
    "evidence.coverage.normalizedRegion",
  );
  assertSourceTopologyExactKeys_(
    coverage.normalizedRegion,
    ["left", "top", "right", "bottom"],
    [],
    "evidence.coverage.normalizedRegion",
  );
  ["left", "top", "right", "bottom"].forEach(function (key) {
    const value = coverage.normalizedRegion[key];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(
        "Source-topology evidence.coverage.normalizedRegion." + key + " is invalid.",
      );
    }
  });
  if (
    coverage.normalizedRegion.left >= coverage.normalizedRegion.right ||
    coverage.normalizedRegion.top >= coverage.normalizedRegion.bottom
  ) {
    throw new Error("Source-topology fixed coverage region ordering is invalid.");
  }
}

function validateSourceTopologyFragment_(fragment, path, idKey) {
  assertSourceTopologyPlainObject_(fragment, path);
  assertSourceTopologyExactKeys_(
    fragment,
    [idKey, "lexicalFingerprint", "lexicalKind", "horizontalOrder", "horizontalRegion"],
    [],
    path,
  );
  assertSourceTopologyId_(fragment[idKey], path + "." + idKey);
  assertSourceTopologySha256_(fragment.lexicalFingerprint, path + ".lexicalFingerprint");
  assertSourceTopologyEnum_(fragment.lexicalKind, SOURCE_TOPOLOGY_LEXICAL_KIND_VALUES_, path + ".lexicalKind");
  if (!Number.isInteger(fragment.horizontalOrder) || fragment.horizontalOrder <= 0) {
    throw new Error("Source-topology " + path + ".horizontalOrder is invalid.");
  }
  assertSourceTopologyEnum_(fragment.horizontalRegion, SOURCE_TOPOLOGY_HORIZONTAL_REGION_VALUES_, path + ".horizontalRegion");
}

function validateSourceTopologyComparisonInput_(input) {
  assertSourceTopologyPlainObject_(input, "comparisonInput");
  assertSourceTopologyExactKeys_(
    input,
    ["schemaVersion", "sourceSha256", "lexicalFingerprintProfile", "status", "comparisonScope", "rows"],
    [],
    "comparisonInput",
  );
  if (input.schemaVersion !== SOURCE_TOPOLOGY_COMPARISON_INPUT_SCHEMA_VERSION_) {
    throw new Error("Source-topology comparisonInput.schemaVersion is unsupported.");
  }
  assertSourceTopologySha256_(input.sourceSha256, "comparisonInput.sourceSha256");
  assertSourceTopologyBoundedString_(input.lexicalFingerprintProfile, "comparisonInput.lexicalFingerprintProfile");
  assertSourceTopologyEnum_(input.status, ["RESOLVED", "UNRESOLVED"], "comparisonInput.status");
  assertSourceTopologyPlainObject_(input.comparisonScope, "comparisonInput.comparisonScope");
  assertSourceTopologyExactKeys_(input.comparisonScope, ["sourceCriticalRowIds"], [], "comparisonInput.comparisonScope");
  if (
    !Array.isArray(input.comparisonScope.sourceCriticalRowIds) ||
    input.comparisonScope.sourceCriticalRowIds.length === 0
  ) {
    throw new Error(
      "Source-topology comparisonInput.comparisonScope.sourceCriticalRowIds must be non-empty.",
    );
  }
  const criticalRowIds = {};
  input.comparisonScope.sourceCriticalRowIds.forEach(function (rowId, rowIndex) {
    assertSourceTopologyId_(rowId, "comparisonInput.comparisonScope.sourceCriticalRowIds[" + rowIndex + "]");
    if (criticalRowIds[rowId]) {
      throw new Error("Source-topology comparisonInput comparison scope contains a duplicate rowId.");
    }
    criticalRowIds[rowId] = true;
  });
  if (!Array.isArray(input.rows) || (input.status === "RESOLVED" && input.rows.length === 0)) {
    throw new Error("Source-topology comparisonInput.rows is invalid.");
  }

  const v3RowIds = {};
  const v3CellIds = {};
  let previousVerticalOrder = 0;
  input.rows.forEach(function (row, rowIndex) {
    const rowPath = "comparisonInput.rows[" + rowIndex + "]";
    assertSourceTopologyPlainObject_(row, rowPath);
    assertSourceTopologyExactKeys_(row, ["v3RowId", "verticalOrder", "fragments"], [], rowPath);
    assertSourceTopologyId_(row.v3RowId, rowPath + ".v3RowId");
    if (v3RowIds[row.v3RowId]) {
      throw new Error("Source-topology " + rowPath + ".v3RowId is duplicated.");
    }
    v3RowIds[row.v3RowId] = true;
    if (!Number.isInteger(row.verticalOrder) || row.verticalOrder <= previousVerticalOrder) {
      throw new Error("Source-topology " + rowPath + ".verticalOrder is invalid.");
    }
    previousVerticalOrder = row.verticalOrder;
    if (!Array.isArray(row.fragments) || row.fragments.length === 0) {
      throw new Error("Source-topology " + rowPath + ".fragments must be non-empty.");
    }
    let previousHorizontalOrder = 0;
    row.fragments.forEach(function (fragment, fragmentIndex) {
      const fragmentPath = rowPath + ".fragments[" + fragmentIndex + "]";
      validateSourceTopologyFragment_(fragment, fragmentPath, "v3CellId");
      if (v3CellIds[fragment.v3CellId]) {
        throw new Error("Source-topology " + fragmentPath + ".v3CellId is duplicated.");
      }
      v3CellIds[fragment.v3CellId] = true;
      if (fragment.horizontalOrder <= previousHorizontalOrder) {
        throw new Error("Source-topology " + fragmentPath + ".horizontalOrder is invalid.");
      }
      previousHorizontalOrder = fragment.horizontalOrder;
    });
  });
  return deepFreezeSourceTopologyValue_(cloneSourceTopologyValue_(input));
}

function compareStage1V3TopologyClaimsToSource_(sourceEvidence, comparisonInput) {
  const source = validateSourceTopologyEvidence_(sourceEvidence);
  const input = validateSourceTopologyComparisonInput_(comparisonInput);
  const conflicts = [];
  const conflictKeys = {};
  const accounting = {
    v3CriticalRowCount: input.rows.length,
    matchedV3CriticalRowCount: 0,
    sourceCriticalFragmentCount: 0,
    matchedSourceCriticalFragmentCount: 0,
  };

  function addConflict(code, sourceRowIds, v3RowIds, sourceFragmentIds, v3CellIds) {
    const conflict = {
      code: code,
      sourceRowIds: sourceRowIds.slice().sort(),
      v3RowIds: v3RowIds.slice().sort(),
      sourceFragmentIds: sourceFragmentIds.slice().sort(),
      v3CellIds: v3CellIds.slice().sort(),
    };
    const key = JSON.stringify(conflict);
    if (!conflictKeys[key]) {
      conflictKeys[key] = true;
      conflicts.push(conflict);
    }
  }

  if (source.source.sha256 !== input.sourceSha256) {
    addConflict("SOURCE_IDENTITY_MISMATCH", [], [], [], []);
    return buildSourceTopologyComparisonResult_(source.source.sha256, conflicts, accounting);
  }
  if (
    source.status !== "RESOLVED" ||
    input.status !== "RESOLVED" ||
    source.provenance.lexicalFingerprintProfile !== input.lexicalFingerprintProfile
  ) {
    addConflict("SOURCE_TOPOLOGY_INCOMPLETE", [], [], [], []);
    return buildSourceTopologyComparisonResult_(source.source.sha256, conflicts, accounting);
  }

  const sourceRowsById = {};
  source.rows.forEach(function (row) { sourceRowsById[row.rowId] = row; });
  const criticalRows = [];
  let incompleteScope = false;
  input.comparisonScope.sourceCriticalRowIds.forEach(function (rowId) {
    const row = sourceRowsById[rowId];
    if (!row || row.state !== "RESOLVED") {
      incompleteScope = true;
      return;
    }
    criticalRows.push(row);
    accounting.sourceCriticalFragmentCount += row.fragments.length;
  });
  if (incompleteScope) {
    addConflict("SOURCE_TOPOLOGY_INCOMPLETE", input.comparisonScope.sourceCriticalRowIds, [], [], []);
    return buildSourceTopologyComparisonResult_(source.source.sha256, conflicts, accounting);
  }

  const mappedRows = [];
  let hasAmbiguousRowMapping = false;
  input.rows.forEach(function (v3Row) {
    const unsupportedCells = v3Row.fragments.filter(function (v3Fragment) {
      return !criticalRows.some(function (sourceRow) {
        return sourceRow.fragments.some(function (sourceFragment) {
          return sourceTopologyFragmentsMatch_(sourceFragment, v3Fragment);
        });
      });
    });
    if (unsupportedCells.length > 0) {
      addConflict(
        "V3_ROW_NOT_SUPPORTED_BY_SOURCE",
        [],
        [v3Row.v3RowId],
        [],
        unsupportedCells.map(function (fragment) { return fragment.v3CellId; }),
      );
      return;
    }

    const candidateRows = criticalRows.filter(function (sourceRow) {
      return sourceTopologyRowCanContainClaims_(sourceRow, v3Row);
    });
    if (candidateRows.length === 0) {
      addConflict(
        "FRAGMENT_ROW_MISMATCH",
        [],
        [v3Row.v3RowId],
        [],
        v3Row.fragments.map(function (fragment) { return fragment.v3CellId; }),
      );
      return;
    }
    if (candidateRows.length > 1) {
      hasAmbiguousRowMapping = true;
      addConflict(
        "FRAGMENT_MATCH_UNRESOLVED",
        candidateRows.map(function (row) { return row.rowId; }),
        [v3Row.v3RowId],
        [],
        v3Row.fragments.map(function (fragment) { return fragment.v3CellId; }),
      );
      return;
    }
    mappedRows.push({ sourceRow: candidateRows[0], v3Row: v3Row, pairs: [] });
  });

  const mappingsBySourceRowId = {};
  mappedRows.forEach(function (mapping) {
    const rowId = mapping.sourceRow.rowId;
    if (!mappingsBySourceRowId[rowId]) mappingsBySourceRowId[rowId] = [];
    mappingsBySourceRowId[rowId].push(mapping);
  });
  Object.keys(mappingsBySourceRowId).forEach(function (rowId) {
    const mappings = mappingsBySourceRowId[rowId];
    if (mappings.length > 1) {
      addConflict(
        "ROW_RELATION_MISMATCH",
        [rowId],
        mappings.map(function (mapping) { return mapping.v3Row.v3RowId; }),
        [],
        [],
      );
    }
  });

  mappedRows.forEach(function (mapping) {
    mapping.pairs = pairSourceTopologyRowFragments_(mapping.sourceRow, mapping.v3Row);
    const sourceOrders = mapping.pairs
      .slice()
      .sort(function (a, b) {
        return a.v3Fragment.horizontalOrder - b.v3Fragment.horizontalOrder;
      })
      .map(function (pair) { return pair.sourceFragment.horizontalOrder; });
    const orderMismatch = sourceOrders.some(function (order, index) {
      return index > 0 && order <= sourceOrders[index - 1];
    });
    const regionMismatchPairs = mapping.pairs.filter(function (pair) {
      return pair.sourceFragment.horizontalRegion !== "unknown" &&
        pair.v3Fragment.horizontalRegion !== "unknown" &&
        pair.sourceFragment.horizontalRegion !== pair.v3Fragment.horizontalRegion;
    });
    if (orderMismatch || regionMismatchPairs.length > 0) {
      addConflict(
        "ROW_RELATION_MISMATCH",
        [mapping.sourceRow.rowId],
        [mapping.v3Row.v3RowId],
        regionMismatchPairs.map(function (pair) { return pair.sourceFragment.fragmentId; }),
        regionMismatchPairs.map(function (pair) { return pair.v3Fragment.v3CellId; }),
      );
    }
  });

  const orderedMappings = mappedRows.slice().sort(function (a, b) {
    return a.v3Row.verticalOrder - b.v3Row.verticalOrder;
  });
  orderedMappings.forEach(function (mapping, index) {
    if (
      index > 0 &&
      mapping.sourceRow.verticalOrder <= orderedMappings[index - 1].sourceRow.verticalOrder
    ) {
      addConflict(
        "ROW_RELATION_MISMATCH",
        [orderedMappings[index - 1].sourceRow.rowId, mapping.sourceRow.rowId],
        [orderedMappings[index - 1].v3Row.v3RowId, mapping.v3Row.v3RowId],
        [],
        [],
      );
    }
  });

  if (!hasAmbiguousRowMapping) {
    const matchedSourceFragmentIds = {};
    const matchedV3RowIds = {};
    mappedRows.forEach(function (mapping) {
      matchedV3RowIds[mapping.v3Row.v3RowId] = true;
      mapping.pairs.forEach(function (pair) {
        matchedSourceFragmentIds[pair.sourceFragment.fragmentId] = true;
      });
    });
    accounting.matchedV3CriticalRowCount = Object.keys(matchedV3RowIds).length;
    accounting.matchedSourceCriticalFragmentCount =
      Object.keys(matchedSourceFragmentIds).length;

    criticalRows.forEach(function (row) {
      const unaccountedFragments = row.fragments.filter(function (fragment) {
        return !matchedSourceFragmentIds[fragment.fragmentId];
      });
      if (unaccountedFragments.length > 0) {
        addConflict(
          "SOURCE_ROW_UNACCOUNTED",
          [row.rowId],
          [],
          unaccountedFragments.map(function (fragment) { return fragment.fragmentId; }),
          [],
        );
      }
    });
  }

  return buildSourceTopologyComparisonResult_(source.source.sha256, conflicts, accounting);
}

function sourceTopologyRowCanContainClaims_(sourceRow, v3Row) {
  const sourceCounts = sourceTopologyFragmentSignatureCounts_(sourceRow.fragments);
  const v3Counts = sourceTopologyFragmentSignatureCounts_(v3Row.fragments);
  return Object.keys(v3Counts).every(function (signature) {
    return (sourceCounts[signature] || 0) >= v3Counts[signature];
  });
}

function pairSourceTopologyRowFragments_(sourceRow, v3Row) {
  const sourceGroups = sourceTopologyFragmentGroups_(sourceRow.fragments);
  const v3Groups = sourceTopologyFragmentGroups_(v3Row.fragments);
  const pairs = [];
  Object.keys(v3Groups).sort().forEach(function (signature) {
    const sourceFragments = (sourceGroups[signature] || []).slice().sort(
      function (a, b) { return a.horizontalOrder - b.horizontalOrder; },
    );
    const v3Fragments = v3Groups[signature].slice().sort(
      function (a, b) { return a.horizontalOrder - b.horizontalOrder; },
    );
    v3Fragments.forEach(function (v3Fragment, index) {
      pairs.push({ sourceFragment: sourceFragments[index], v3Fragment: v3Fragment });
    });
  });
  return pairs;
}

function sourceTopologyFragmentGroups_(fragments) {
  return fragments.reduce(function (groups, fragment) {
    const signature = fragment.lexicalFingerprint + ":" + fragment.lexicalKind;
    if (!groups[signature]) groups[signature] = [];
    groups[signature].push(fragment);
    return groups;
  }, {});
}

function sourceTopologyFragmentSignatureCounts_(fragments) {
  const groups = sourceTopologyFragmentGroups_(fragments);
  return Object.keys(groups).reduce(function (counts, signature) {
    counts[signature] = groups[signature].length;
    return counts;
  }, {});
}

function sourceTopologyFragmentsMatch_(sourceFragment, v3Fragment) {
  return sourceFragment.lexicalFingerprint === v3Fragment.lexicalFingerprint &&
    sourceFragment.lexicalKind === v3Fragment.lexicalKind;
}

function buildSourceTopologyComparisonResult_(sourceSha256, conflicts, accounting) {
  const disagreementCodes = [
    "SOURCE_IDENTITY_MISMATCH",
    "V3_ROW_NOT_SUPPORTED_BY_SOURCE",
    "SOURCE_ROW_UNACCOUNTED",
    "FRAGMENT_ROW_MISMATCH",
    "ROW_RELATION_MISMATCH",
  ];
  const hasDisagreement = conflicts.some(function (conflict) {
    return disagreementCodes.indexOf(conflict.code) >= 0;
  });
  const status = hasDisagreement
    ? "DISAGREES"
    : conflicts.length > 0
      ? "UNRESOLVED"
      : "AGREES";
  return deepFreezeSourceTopologyValue_({
    schemaVersion: SOURCE_TOPOLOGY_COMPARISON_SCHEMA_VERSION_,
    sourceSha256: sourceSha256,
    status: status,
    releaseEligible: status === "AGREES",
    conflicts: conflicts,
    accounting: accounting,
  });
}

function assertSourceTopologyExactKeys_(value, requiredKeys, optionalKeys, path) {
  const actualKeys = Object.keys(value).sort();
  const allowedKeys = requiredKeys.concat(optionalKeys).sort();
  const hasRequired = requiredKeys.every(function (key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  });
  const hasOnlyAllowed = actualKeys.every(function (key) {
    return allowedKeys.indexOf(key) >= 0;
  });
  if (!hasRequired || !hasOnlyAllowed) {
    throw new Error("Source-topology " + path + " has invalid fields.");
  }
}

function assertSourceTopologyPlainObject_(value, path) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.prototype.toString.call(value) !== "[object Object]"
  ) {
    throw new Error("Source-topology " + path + " must be an object.");
  }
}

function assertSourceTopologyId_(value, path) {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)
  ) {
    throw new Error("Source-topology " + path + " is invalid.");
  }
}

function assertSourceTopologyBoundedString_(value, path) {
  if (typeof value !== "string" || value.trim() === "" || value.length > 128) {
    throw new Error("Source-topology " + path + " is invalid.");
  }
}

function assertSourceTopologySha256_(value, path) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("Source-topology " + path + " must be canonical SHA-256.");
  }
}

function assertSourceTopologyEnum_(value, supportedValues, path) {
  if (supportedValues.indexOf(value) < 0) {
    throw new Error("Source-topology " + path + " is unsupported.");
  }
}

function validateSourceTopologyDimensions_(dimensions, path) {
  assertSourceTopologyPlainObject_(dimensions, path);
  assertSourceTopologyExactKeys_(dimensions, ["width", "height"], [], path);
  ["width", "height"].forEach(function (key) {
    if (!Number.isInteger(dimensions[key]) || dimensions[key] <= 0) {
      throw new Error("Source-topology " + path + "." + key + " is invalid.");
    }
  });
}

function validateSourceTopologyJsonValue_(value, path, ancestors) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Source-topology " + path + " contains a non-finite number.");
    }
    return;
  }
  if (!value || typeof value !== "object") {
    throw new Error("Source-topology " + path + " is not deterministic JSON.");
  }
  if (ancestors.indexOf(value) >= 0) {
    throw new Error("Source-topology " + path + " contains a cycle.");
  }
  const nextAncestors = ancestors.concat([value]);
  if (!Array.isArray(value)) {
    assertSourceTopologyPlainObject_(value, path);
  } else if (
    Object.keys(value).some(function (key, index) {
      return key !== String(index);
    })
  ) {
    throw new Error("Source-topology " + path + " is not deterministic JSON.");
  }
  Object.keys(value).forEach(function (key) {
    validateSourceTopologyJsonValue_(value[key], path + "." + key, nextAncestors);
  });
}

function cloneSourceTopologyValue_(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map(function (item) { return cloneSourceTopologyValue_(item); });
  }
  return Object.keys(value).reduce(function (clone, key) {
    clone[key] = cloneSourceTopologyValue_(value[key]);
    return clone;
  }, {});
}

function deepFreezeSourceTopologyValue_(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.keys(value).forEach(function (key) {
    deepFreezeSourceTopologyValue_(value[key]);
  });
  return Object.freeze(value);
}
