/**
 * QUnitGS2 tests for Generator-Werkbon-GAS v1.8.0.
 *
 * Run the allowlisted normal batches as independent QUnitGS2 lifecycles;
 * there is no monolithic or "all" batch. Validate current unpublished source
 * through the head/test /dev deployment. An /exec URL may target a versioned
 * deployment and does not prove that current local/head source was executed.
 */

var QUnit = QUnitGS2.QUnit;

const QUNIT_BATCH_NAMES = [
  "legacy-production",
  "staged-selector-harness",
  "staged-prototype-candidate",
  "staged-financial-evidence",
  "staged-image-integration",
  "staged-stage1-diagnostics",
  "staged-table-evidence-diagnostics",
  "financial-structure",
  "financial-collector",
  "financial-provenance",
  "financial-semantic-governance",
  "financial-composite-evidence",
  "financial-interpretation-adapter",
  "financial-governed-interpretation",
  "financial-interpretation",
  "canonical-release",
];
const QUNIT_RETIRED_BATCH_NAMES = [
  "staged-core",
  "staged-diagnostic",
  "financial-experiments",
  "financial-evidence",
];
const QUNIT_STAGED_BATCH_PARTITION = [
  {
    batchName: "staged-selector-harness",
    testNamePrefixes: ["QUnit selector —"],
    expectedTestCount: 8,
    expectedAssertionCount: 35,
  },
  {
    batchName: "staged-prototype-candidate",
    testNamePrefixes: [
      "staged prototype —",
      "staged candidate experiment —",
      "aggregate reconciliation blind spot —",
    ],
    expectedTestCount: 31,
    expectedAssertionCount: 232,
  },
  {
    batchName: "staged-financial-evidence",
    testNamePrefixes: ["financial evidence —"],
    expectedTestCount: 16,
    expectedAssertionCount: 16,
  },
  {
    batchName: "staged-image-integration",
    testNamePrefixes: [
      "staged image integration —",
      "staged production-path diagnostic —",
    ],
    expectedTestCount: 21,
    expectedAssertionCount: 21,
  },
  {
    batchName: "staged-stage1-diagnostics",
    testNamePrefixes: [
      "Stage-1-v2 diagnostic",
      "Stage-1-v3 contract",
      "Stage-1-v3 projection",
      "Stage-1-v3 request diagnostic",
    ],
    expectedTestCount: 35,
    expectedAssertionCount: 208,
  },
  {
    batchName: "staged-table-evidence-diagnostics",
    testNamePrefixes: ["Stage-1 table"],
    expectedTestCount: 6,
    expectedAssertionCount: 32,
  },
];
const QUNIT_FINANCIAL_BATCH_PARTITION = [
  {
    batchName: "financial-structure",
    testNamePrefixes: [
      "tabular structural experiment —",
      "structural capability matrix —",
      "terminal structural experiment —",
    ],
    expectedTestCount: 11,
    expectedAssertionCount: 61,
  },
  {
    batchName: "financial-collector",
    testNamePrefixes: ["financial collector —"],
    expectedTestCount: 11,
    expectedAssertionCount: 78,
  },
  {
    batchName: "financial-provenance",
    testNamePrefixes: [
      "table-local handoff —",
      "financial collector provenance —",
    ],
    expectedTestCount: 15,
    expectedAssertionCount: 95,
  },
  {
    batchName: "financial-semantic-governance",
    testNamePrefixes: ["financial semantic governance —"],
    expectedTestCount: 8,
    expectedAssertionCount: 50,
  },
  {
    batchName: "financial-composite-evidence",
    testNamePrefixes: ["financial composite evidence —"],
    expectedTestCount: 8,
    expectedAssertionCount: 45,
  },
  {
    batchName: "financial-interpretation-adapter",
    testNamePrefixes: ["financial interpretation adapter —"],
    expectedTestCount: 10,
    expectedAssertionCount: 66,
  },
  {
    batchName: "financial-governed-interpretation",
    testNamePrefixes: ["financial governed interpretation —"],
    expectedTestCount: 19,
    expectedAssertionCount: 115,
  },
  {
    batchName: "financial-interpretation",
    testNamePrefixes: ["financial interpretation —"],
    expectedTestCount: 8,
    expectedAssertionCount: 81,
  },
];
const QUNIT_DIAGNOSTIC_TESTS = {
  "collector-wiska": {
    batchName: "financial-collector",
    testName:
      "financial collector — Wiska preserves mixed-basis cells and provenance",
  },
};

function resolvePermanentFinancialBatchForTest_(testName) {
  const matches = QUNIT_FINANCIAL_BATCH_PARTITION.filter(function (partition) {
    return partition.testNamePrefixes.some(function (prefix) {
      return testName.indexOf(prefix) === 0;
    });
  });
  return matches.length === 1 ? matches[0].batchName : null;
}

function resolvePermanentStagedBatchForTest_(testName) {
  const matches = QUNIT_STAGED_BATCH_PARTITION.filter(function (partition) {
    return partition.testNamePrefixes.some(function (prefix) {
      return testName.indexOf(prefix) === 0;
    });
  });
  return matches.length === 1 ? matches[0].batchName : null;
}

function validatePermanentStagedPartition_(registrations) {
  const names = registrations.map(function (item) {
    return item.testName;
  });
  const actualPartition = QUNIT_STAGED_BATCH_PARTITION.map(
    function (partition) {
      return {
        batchName: partition.batchName,
        testCount: registrations.filter(function (item) {
          return item.batchName === partition.batchName;
        }).length,
        expectedAssertionCount: partition.expectedAssertionCount,
      };
    },
  );
  const expectedPartition = QUNIT_STAGED_BATCH_PARTITION.map(
    function (partition) {
      return {
        batchName: partition.batchName,
        testCount: partition.expectedTestCount,
        expectedAssertionCount: partition.expectedAssertionCount,
      };
    },
  );
  const expectedAssertionTotal = QUNIT_STAGED_BATCH_PARTITION.reduce(
    function (total, partition) {
      return total + partition.expectedAssertionCount;
    },
    0,
  );
  const selections = QUNIT_STAGED_BATCH_PARTITION.map(function (partition) {
    return resolveQUnitBatchRequest_({
      parameter: { batch: partition.batchName },
    });
  });
  const retiredSelection = resolveQUnitBatchRequest_({
    parameter: { batch: "staged-core" },
  });
  if (
    registrations.length !== 117 ||
    new Set(names).size !== 117 ||
    expectedAssertionTotal !== 544 ||
    JSON.stringify(actualPartition) !== JSON.stringify(expectedPartition) ||
    selections.some(function (selection) {
      return !selection.supported || selection.retired;
    }) ||
    !retiredSelection.supported ||
    retiredSelection.retired !== true ||
    QUNIT_BATCH_NAMES.indexOf("staged-core") >= 0
  ) {
    throw new Error("Invalid permanent staged QUnit partition.");
  }
}

function resolveQUnitBatchRequest_(request) {
  const diagnosticsOnly = Boolean(
    request && request.diagnosticsOnly === true,
  );
  let batchName = "";
  let diagnosticName = "";

  if (
    diagnosticsOnly &&
    Object.prototype.hasOwnProperty.call(request, "batch") &&
    typeof request.batch === "string"
  ) {
    batchName = request.batch.trim();
  } else if (
    request &&
    request.parameter &&
    Object.prototype.hasOwnProperty.call(request.parameter, "batch") &&
    typeof request.parameter.batch === "string"
  ) {
    batchName = request.parameter.batch.trim();
  }

  if (
    diagnosticsOnly &&
    Object.prototype.hasOwnProperty.call(request, "diagnostic") &&
    typeof request.diagnostic === "string"
  ) {
    diagnosticName = request.diagnostic.trim();
  } else if (
    request &&
    request.parameter &&
    Object.prototype.hasOwnProperty.call(request.parameter, "diagnostic") &&
    typeof request.parameter.diagnostic === "string"
  ) {
    diagnosticName = request.parameter.diagnostic.trim();
  }

  const hasBatch = batchName !== "";
  const hasDiagnostic = diagnosticName !== "";
  const diagnosticSelection = QUNIT_DIAGNOSTIC_TESTS[diagnosticName] || null;
  const retiredBatch = hasBatch && batchName === "staged-core";
  const supportedBatch = hasBatch &&
    (QUNIT_BATCH_NAMES.indexOf(batchName) >= 0 || retiredBatch);
  const supportedDiagnostic = hasDiagnostic && diagnosticSelection !== null;
  const supported =
    (supportedBatch && !hasDiagnostic) ||
    (supportedDiagnostic && !hasBatch);
  return {
    batchName: supportedDiagnostic
      ? diagnosticSelection.batchName
      : batchName,
    diagnosticName: diagnosticName,
    testFilter: supportedDiagnostic ? diagnosticSelection.testName : "",
    diagnosticsOnly: diagnosticsOnly,
    supported: supported,
    retired: retiredBatch,
    missing: !hasBatch && !hasDiagnostic,
  };
}

function getQUnitBatchSelectionMessage_(selection) {
  const supportedNames = QUNIT_BATCH_NAMES.join(", ");
  const supportedDiagnostics = Object.keys(QUNIT_DIAGNOSTIC_TESTS).join(", ");
  if (
    (!selection.supported || selection.retired) &&
    selection.diagnosticName === "" &&
    QUNIT_RETIRED_BATCH_NAMES.indexOf(selection.batchName) >= 0
  ) {
    return (
      "Retired QUnit batch: " +
      selection.batchName +
      ". Supported batches: " +
      supportedNames +
      "."
    );
  }
  return selection.missing
    ? "Select one QUnit batch or diagnostic. Supported batches: " +
        supportedNames +
        ". Supported diagnostics: " +
        supportedDiagnostics +
        "."
    : "Unsupported QUnit selection. Supported batches: " +
        supportedNames +
        ". Supported diagnostics: " +
        supportedDiagnostics +
        ".";
}

function buildQUnitBatchLauncher_(selection) {
  const message = getQUnitBatchSelectionMessage_(selection);
  const links = QUNIT_BATCH_NAMES.map(function (batchName) {
    return (
      '<li><a href="?batch=' + batchName + '">' + batchName + "</a></li>"
    );
  }).join("");
  const diagnosticLinks = Object.keys(QUNIT_DIAGNOSTIC_TESTS)
    .map(function (diagnosticName) {
      return (
        '<li><a href="?diagnostic=' +
        diagnosticName +
        '">' +
        diagnosticName +
        "</a></li>"
      );
    })
    .join("");

  return HtmlService.createHtmlOutput(
    "<!doctype html><html><head><base target=\"_top\"></head><body>" +
      "<h1>QUnitGS2 batch selection</h1><p>" +
      message +
      "</p><p>Open one batch per request. Each selection starts an independent " +
      "QUnitGS2 lifecycle; results are not aggregated across batches.</p>" +
      "<ul>" +
      links +
      diagnosticLinks +
      "</ul></body></html>",
  ).setTitle("QUnitGS2 batch selection");
}

function doGet(options) {
  const selection = resolveQUnitBatchRequest_(options);
  if (!selection.supported || selection.retired) {
    if (selection.diagnosticsOnly) {
      throw new Error(getQUnitBatchSelectionMessage_(selection));
    }
    return buildQUnitBatchLauncher_(selection);
  }

  QUnitGS2.init();
  QUnit.config.filter = selection.testFilter;
  QUnit.config.module = selection.batchName;

  const financialTestRegistrations = [];
  let currentFinancialRegistrationBatch = null;
  function registerPermanentFinancialTest_(
    expectedAssertionCount,
    testName,
    callback,
  ) {
    const batchName = resolvePermanentFinancialBatchForTest_(testName);
    if (!batchName) {
      throw new Error(
        "Financial test must match exactly one permanent batch: " + testName,
      );
    }
    financialTestRegistrations.push({
      batchName: batchName,
      testName: testName,
      expectedAssertionCount: expectedAssertionCount,
    });
    if (currentFinancialRegistrationBatch !== batchName) {
      QUnit.module(batchName);
      currentFinancialRegistrationBatch = batchName;
    }
    QUnit.test(testName, callback);
  }

  const stagedTestRegistrations = [];
  const registerQUnitTest = QUnit.test;
  let currentStagedRegistrationBatch = null;
  QUnit.test = function (testName, callback) {
    const stagedBatchName = resolvePermanentStagedBatchForTest_(testName);
    if (stagedBatchName) {
      if (currentStagedRegistrationBatch !== stagedBatchName) {
        QUnit.module(stagedBatchName);
        currentStagedRegistrationBatch = stagedBatchName;
      }
      stagedTestRegistrations.push({
        batchName: stagedBatchName,
        testName: testName,
      });
    }
    return registerQUnitTest.call(QUnit, testName, callback);
  };

  QUnit.test(
    "QUnit selector — collector Wiska diagnostic resolves to one allowlisted test",
    function (assert) {
      const selection = resolveQUnitBatchRequest_({
        parameter: { diagnostic: "collector-wiska" },
      });

      assert.ok(selection.supported);
      assert.notOk(selection.missing);
      assert.equal(selection.batchName, "financial-collector");
      assert.equal(selection.diagnosticName, "collector-wiska");
      assert.equal(
        selection.testFilter,
        "financial collector — Wiska preserves mixed-basis cells and provenance",
      );
    },
  );

  QUnit.test(
    "QUnit selector — legacy production batch remains unfiltered",
    function (assert) {
      const selection = resolveQUnitBatchRequest_({
        parameter: { batch: "legacy-production" },
      });

      assert.ok(selection.supported);
      assert.equal(selection.batchName, "legacy-production");
      assert.equal(selection.diagnosticName, "");
      assert.equal(selection.testFilter, "");
    },
  );

  QUnit.test(
    "QUnit selector — retired staged core remains recognized without filter",
    function (assert) {
      const selection = resolveQUnitBatchRequest_({
        parameter: { batch: "staged-core" },
      });

      assert.ok(selection.supported);
      assert.equal(selection.batchName, "staged-core");
      assert.equal(selection.diagnosticName, "");
      assert.equal(selection.testFilter, "");
    },
  );

  QUnit.test(
    "QUnit selector — permanent financial batches form one complete partition",
    function (assert) {
      const selections = QUNIT_FINANCIAL_BATCH_PARTITION.map(function (item) {
        return resolveQUnitBatchRequest_({
          parameter: { batch: item.batchName },
        });
      });
      const retired = resolveQUnitBatchRequest_({
        parameter: { batch: "financial-evidence" },
      });
      const names = financialTestRegistrations.map(function (item) {
        return item.testName;
      });
      const assertionTotal = financialTestRegistrations.reduce(
        function (total, item) {
          return total + item.expectedAssertionCount;
        },
        0,
      );
      const actualPartition = QUNIT_FINANCIAL_BATCH_PARTITION.map(
        function (partition) {
          const registrations = financialTestRegistrations.filter(
            function (item) {
              return item.batchName === partition.batchName;
            },
          );
          return {
            batchName: partition.batchName,
            testCount: registrations.length,
            assertionCount: registrations.reduce(function (total, item) {
              return total + item.expectedAssertionCount;
            }, 0),
          };
        },
      );

      assert.ok(selections.every(function (selection) {
        return selection.supported && selection.testFilter === "";
      }));
      assert.notOk(retired.supported);
      assert.equal(financialTestRegistrations.length, 90);
      assert.equal(new Set(names).size, 90);
      assert.equal(assertionTotal, 591);
      assert.ok(JSON.stringify(actualPartition) === JSON.stringify([
        { batchName: "financial-structure", testCount: 11, assertionCount: 61 },
        { batchName: "financial-collector", testCount: 11, assertionCount: 78 },
        { batchName: "financial-provenance", testCount: 15, assertionCount: 95 },
        { batchName: "financial-semantic-governance", testCount: 8, assertionCount: 50 },
        { batchName: "financial-composite-evidence", testCount: 8, assertionCount: 45 },
        { batchName: "financial-interpretation-adapter", testCount: 10, assertionCount: 66 },
        { batchName: "financial-governed-interpretation", testCount: 19, assertionCount: 115 },
        { batchName: "financial-interpretation", testCount: 8, assertionCount: 81 },
      ]));
    },
  );

  QUnit.test(
    "QUnit selector — canonical release batch remains unfiltered",
    function (assert) {
      const selection = resolveQUnitBatchRequest_({
        parameter: { batch: "canonical-release" },
      });

      assert.ok(selection.supported);
      assert.equal(selection.batchName, "canonical-release");
      assert.equal(selection.diagnosticName, "");
      assert.equal(selection.testFilter, "");
    },
  );

  QUnit.test(
    "QUnit selector — unsupported diagnostic cannot select a suite",
    function (assert) {
      const selection = resolveQUnitBatchRequest_({
        parameter: { diagnostic: "unsupported-diagnostic" },
      });

      assert.notOk(selection.supported);
      assert.notOk(selection.missing);
      assert.equal(selection.batchName, "");
      assert.equal(selection.testFilter, "");
    },
  );

  QUnit.test(
    "QUnit selector — retired staged diagnostic cannot select a suite",
    function (assert) {
      const selection = resolveQUnitBatchRequest_({
        parameter: { batch: "staged-diagnostic" },
      });

      assert.notOk(selection.supported);
      assert.notOk(selection.missing);
      assert.equal(selection.testFilter, "");
      assert.ok(
        getQUnitBatchSelectionMessage_(selection).indexOf(
          "Retired QUnit batch: staged-diagnostic.",
        ) === 0,
      );
    },
  );

  QUnit.test(
    "QUnit selector — retired financial experiments cannot select a suite",
    function (assert) {
      const selection = resolveQUnitBatchRequest_({
        parameter: { batch: "financial-experiments" },
      });

      assert.notOk(selection.supported);
      assert.notOk(selection.missing);
      assert.equal(selection.testFilter, "");
      assert.ok(
        getQUnitBatchSelectionMessage_(selection).indexOf(
          "Retired QUnit batch: financial-experiments.",
        ) === 0,
      );
    },
  );

  QUnit.module("legacy-production"); // 47 tests / 115 assertions

  // ==================================================
  // CONFIG HELPERS
  // ==================================================

  QUnit.test(
    "getRequiredConfigValue — trims configured values",
    function (assert) {
      assert.equal(
        getRequiredConfigValue("  example-value  ", "TEST_PROPERTY"),
        "example-value",
      );
    },
  );

  QUnit.test(
    "getRequiredConfigValue — throws for missing values",
    function (assert) {
      assert.throws(function () {
        getRequiredConfigValue("", "TEST_PROPERTY");
      }, /Missing required script property/);

      assert.throws(function () {
        getRequiredConfigValue(null, "TEST_PROPERTY");
      }, /Missing required script property/);
    },
  );

  QUnit.test(
    "isDebugEnabled — recognizes true case-insensitively",
    function (assert) {
      assert.ok(isDebugEnabled("true"));
      assert.ok(isDebugEnabled(" TRUE "));
      assert.notOk(isDebugEnabled("false"));
      assert.notOk(isDebugEnabled(""));
      assert.notOk(isDebugEnabled(null));
    },
  );

  QUnit.test("CONFIG — exposes editorTestWerkbonId", function (assert) {
    assert.ok("editorTestWerkbonId" in CONFIG);
  });

  QUnit.test(
    "safeToast — swallows toast exceptions from editor context",
    function (assert) {
      const throwingMock = {
        toast: function () {
          throw new Error(
            "Cannot call SpreadsheetApp.showNotification() from this context.",
          );
        },
      };

      safeToast(throwingMock, "test message", "Test", 5);
      assert.ok(true, "safeToast did not propagate the toast error");
    },
  );

  // ==================================================
  // cleanId()
  // ==================================================

  QUnit.test("cleanId — normalizes Werkbon identifiers", function (assert) {
    assert.equal(cleanId(" ENG-20260518-004 "), "ENG-20260518-004");

    assert.equal(cleanId("ENG - 20260518 - 004"), "ENG-20260518-004");

    assert.equal(
      cleanId("ENG\u00A0-\u00A020260518\u00A0-\u00A0004"),
      "ENG-20260518-004",
    );

    assert.equal(cleanId("123.0"), "123");
    assert.equal(cleanId("123.5"), "123.5");
    assert.equal(cleanId(""), "");
    assert.equal(cleanId(null), "");
    assert.equal(cleanId(undefined), "");
  });

  // ==================================================
  // formatEuro()
  // ==================================================

  QUnit.test("formatEuro — formats euro values", function (assert) {
    assert.equal(formatEuro(10), "€ 10,00");
    assert.equal(formatEuro(1234.5), "€ 1234,50");
    assert.equal(formatEuro(0), "€ 0,00");
    assert.equal(formatEuro(99.999), "€ 100,00");
    assert.equal(formatEuro("12.5"), "€ 12,50");
  });

  QUnit.test(
    "formatEuro — handles empty and invalid values",
    function (assert) {
      assert.equal(formatEuro(null), "€ 0,00");
      assert.equal(formatEuro(undefined), "€ 0,00");
      assert.equal(formatEuro(""), "€ 0,00");
      assert.equal(formatEuro("invalid"), "invalid");
    },
  );

  // ==================================================
  // formatOptionalDocumentTotal()
  // ==================================================

  QUnit.test(
    "formatOptionalDocumentTotal — absent vs zero semantics",
    function (assert) {
      assert.equal(formatOptionalDocumentTotal(""), "");
      assert.equal(formatOptionalDocumentTotal(null), "");
      assert.equal(formatOptionalDocumentTotal(undefined), "");

      assert.equal(formatOptionalDocumentTotal(0), formatEuro(0));

      assert.equal(formatOptionalDocumentTotal(44.17), formatEuro(44.17));

      assert.equal(formatOptionalDocumentTotal("21.49"), formatEuro("21.49"));
    },
  );

  // ==================================================
  // formatWerkbonDate()
  // ==================================================

  QUnit.test(
    "formatWerkbonDate — keeps non-Date values unchanged",
    function (assert) {
      assert.equal(formatWerkbonDate("2024-01-05"), "2024-01-05");

      assert.equal(formatWerkbonDate("05-01-2024"), "05-01-2024");
      assert.equal(formatWerkbonDate(12345), "12345");
    },
  );

  QUnit.test("formatWerkbonDate — formats Date objects", function (assert) {
    const date = new Date(2024, 0, 5, 12, 0, 0);

    assert.equal(formatWerkbonDate(date), "05-01-2024");
  });

  // ==================================================
  // filterDataInMemory()
  // ==================================================

  QUnit.test(
    "filterDataInMemory — filters rows by Werkbon ID",
    function (assert) {
      const data = [
        ["Werkbon ID", "Material", "Price"],
        ["ENG-20260518-004", "Paint", 10],
        ["ENG-20260518-005", "Brush", 5],
        [" ENG-20260518-004 ", "Primer", 15],
      ];

      const result = filterDataInMemory(data, "ENG-20260518-004");

      assert.deepEqual(result, [
        ["ENG-20260518-004", "Paint", 10],
        [" ENG-20260518-004 ", "Primer", 15],
      ]);
    },
  );

  QUnit.test(
    "filterDataInMemory — returns empty array for empty input",
    function (assert) {
      assert.deepEqual(filterDataInMemory([], "ENG-20260518-004"), []);

      assert.deepEqual(filterDataInMemory(null, "ENG-20260518-004"), []);
    },
  );

  // ==================================================
  // filterCompleteMaterialRows
  // ==================================================

  QUnit.test(
    "filterCompleteMaterialRows — removes incomplete material rows",
    function (assert) {
      const rows = [
        ["ENG-001", "Paint", 12.5, 2, 25],
        ["ENG-001", "", 5, 1, 5],
        ["ENG-001", "Brush", "", 1, ""],
        ["ENG-001", "Tape", 3, "", ""],
      ];

      const result = filterCompleteMaterialRows(rows);

      assert.deepEqual(result, [["ENG-001", "Paint", 12.5, 2, 25]]);
    },
  );

  // ==================================================
  // getLocatieDataFast()
  // ==================================================

  QUnit.test(
    "getLocatieDataFast — finds location data by code",
    function (assert) {
      const locaties = [
        [
          "Code",
          "Unused 1",
          "Name",
          "Unused 3",
          "Unused 4",
          "Address",
          "Postcode",
          "City",
        ],
        [
          "A1",
          "",
          "Amsterdam Office",
          "",
          "",
          "Damrak 1",
          "1012LG",
          "Amsterdam",
        ],
        [
          "B2",
          "",
          "Rotterdam Office",
          "",
          "",
          "Coolsingel 1",
          "3012AG",
          "Rotterdam",
        ],
      ];

      assert.deepEqual(getLocatieDataFast(locaties, "A1"), {
        naamLocatie: "Amsterdam Office",
        adres: "Damrak 1",
        postcode: "1012LG",
        woonplaats: "Amsterdam",
      });
    },
  );

  QUnit.test(
    "getLocatieDataFast — returns fallback for unknown code",
    function (assert) {
      const locaties = [
        ["Code", "", "Name", "", "", "Address", "Postcode", "City"],
        [
          "A1",
          "",
          "Amsterdam Office",
          "",
          "",
          "Damrak 1",
          "1012LG",
          "Amsterdam",
        ],
      ];

      assert.deepEqual(getLocatieDataFast(locaties, "X9"), {
        naamLocatie: "X9",
        adres: "",
        postcode: "",
        woonplaats: "",
      });
    },
  );

  // ==================================================
  // calculateTotalHours()
  // ==================================================

  QUnit.test(
    "calculateTotalHours — sums HH:MM duration values",
    function (assert) {
      const rows = [
        ["ID", "", "", "", "1:30"],
        ["ID", "", "", "", "0:45"],
        ["ID", "", "", "", "2:15"],
      ];

      assert.equal(calculateTotalHours(rows), "4:30");
    },
  );

  QUnit.test("calculateTotalHours — supports decimal hours", function (assert) {
    const rows = [
      ["ID", "", "", "", "1.5"],
      ["ID", "", "", "", "0.25"],
    ];

    assert.equal(calculateTotalHours(rows), "1:45");
  });

  QUnit.test("calculateTotalHours — handles empty values", function (assert) {
    const rows = [
      ["ID", "", "", "", ""],
      ["ID", "", "", "", null],
    ];

    assert.equal(calculateTotalHours(rows), "0:00");
  });

  // ==================================================
  // findWerkbonRowIndex()
  // ==================================================

  QUnit.test("findWerkbonRowIndex — finds Werkbon row", function (assert) {
    const data = [
      ["Werkbon ID", "Date"],
      ["ENG-20260518-004", "2026-05-18"],
      ["NDK-20260610-005", "2026-06-10"],
    ];

    assert.equal(findWerkbonRowIndex(data, "ENG-20260518-004"), 1);

    assert.equal(findWerkbonRowIndex(data, "NDK-20260610-005"), 2);
  });

  QUnit.test(
    "findWerkbonRowIndex — returns -1 for unknown ID",
    function (assert) {
      const data = [
        ["Werkbon ID", "Date"],
        ["ENG-20260518-004", "2026-05-18"],
      ];

      assert.equal(findWerkbonRowIndex(data, "UNKNOWN-001"), -1);
    },
  );

  // ==================================================
  // buildWerkbonDescription()
  // ==================================================

  QUnit.test(
    "buildWerkbonDescription — combines multiline rows",
    function (assert) {
      const data = [
        ["ID", "Date", "Location", "Description", "Work"],
        [
          "ENG-20260518-004",
          "2026-05-18",
          "A1",
          "Wall damaged",
          "Prepared surface",
        ],
        ["", "", "", "Additional damage", "Applied primer"],
        ["", "", "", "", "Painted wall"],
        ["ENG-20260519-005", "2026-05-19", "B2", "Other job", "Other work"],
      ];

      assert.deepEqual(buildWerkbonDescription(data, 1), {
        omschrijvingText: "Wall damaged\nAdditional damage",
        werkzaamhedenText: "Prepared surface\nApplied primer\nPainted wall",
      });
    },
  );

  // ==================================================
  // parseOpenAIReceiptResponse() - updated for structured return
  // ==================================================

  QUnit.test(
    "parseOpenAIReceiptResponse — returns structured object with items",
    function (assert) {
      const materials = [{ name: "Primer", quantity: 2, price: 12.5 }];

      const response = createMockOpenAIResponse(JSON.stringify(materials));

      const result = parseOpenAIReceiptResponse(response);

      assert.ok(Array.isArray(result.items));
      assert.deepEqual(result.items, [
        {
          name: "Primer",
          quantity: 2,
          unitPrice: 12.5,
          lineTotal: 25,
          price: 12.5,
        },
      ]);
      assert.deepEqual(result.additionalCosts, []);
    },
  );

  QUnit.test(
    "parseOpenAIReceiptResponse — accepts materials wrapper",
    function (assert) {
      const materials = [{ name: "Paint", quantity: 1, price: 35 }];

      const response = createMockOpenAIResponse(
        JSON.stringify({ materials: materials }),
      );

      const result = parseOpenAIReceiptResponse(response);
      assert.equal(result.items.length, 1);
      assert.equal(result.items[0].name, "Paint");
    },
  );

  QUnit.test(
    "parseOpenAIReceiptResponse — removes markdown fences",
    function (assert) {
      const response = createMockOpenAIResponse(
        "```json\n" + '[{"name":"Primer","quantity":1,"price":10}]\n' + "```",
      );

      const result = parseOpenAIReceiptResponse(response);
      assert.equal(result.items[0].name, "Primer");
    },
  );

  QUnit.test(
    "parseOpenAIReceiptResponse — accepts multi-line items with unitPrice and lineTotal",
    function (assert) {
      const response = createMockOpenAIResponse(
        JSON.stringify([
          {
            name: "Schüt Aqua2save handd 4stnd wstop chr",
            quantity: 1,
            unitPrice: 16.99,
            lineTotal: 16.99,
          },
          {
            name: "Saniv plugbekersifon 5/4x32mm chr",
            quantity: 2,
            unitPrice: 29.89,
            lineTotal: 59.78,
          },
        ]),
      );

      const result = parseOpenAIReceiptResponse(response);
      assert.equal(result.items.length, 2);
      assert.equal(result.items[0].price, 16.99);
      assert.equal(result.items[1].price, 29.89);
    },
  );

  // ==================================================
  // normalizeAndAggregateReceiptData()
  // ==================================================

  QUnit.test(
    "normalizeAndAggregateReceiptData — keeps product items as printed (no per-line VAT)",
    function (assert) {
      const raw = {
        items: [{ name: "Lamp", quantity: 2, unitPrice: 4.6, lineTotal: 9.2 }],
        additionalCosts: [],
        vat: { rate: 0.21, amount: 3.0 },
        totals: { exclVAT: 14.29, inclVAT: 17.29 },
      };

      const result = normalizeAndAggregateReceiptData(raw);

      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0].name, "Lamp");
      assert.equal(result.rows[0].price, 4.6);
      // Total should still be based on printed product value
      assert.ok(Math.abs(result.finalSum - 9.2) < 0.01);
      assert.equal(result.documentTotalInclVat, 17.29);
    },
  );

  QUnit.test(
    "normalizeAndAggregateReceiptData — aggregates fees and shipping using printed amounts (no cross-category VAT)",
    function (assert) {
      const raw = {
        items: [
          { name: "Material", quantity: 1, unitPrice: 9.2, lineTotal: 9.2 },
        ],
        additionalCosts: [
          { name: "Verwijderingsbijdrage", type: "fee", amount: 0.14 },
          { name: "Vrachtkosten", type: "shipping", amount: 4.95 },
        ],
        vat: { rate: 0.21, amount: 3.0 },
        totals: { exclVAT: 14.29, inclVAT: 17.29 },
      };

      const result = normalizeAndAggregateReceiptData(raw);

      // Should have 1 material + 2 aggregated rows
      assert.equal(result.rows.length, 3);

      const toeslagen = result.rows.find((r) => r.name === "Toeslagen");
      const vracht = result.rows.find((r) => r.name === "Vrachtkosten");

      assert.ok(toeslagen, "Toeslagen row should exist");
      assert.ok(vracht, "Vrachtkosten row should exist");

      // Must use printed amounts — no VAT from materials may be given to additional categories
      assert.ok(Math.abs(toeslagen.price - 0.14) < 0.01);
      assert.ok(Math.abs(vracht.price - 4.95) < 0.01);

      // Final sum uses printed values (reconciles to exclVAT when available)
      assert.ok(Math.abs(result.finalSum - 14.29) < 0.01);
      assert.ok(result.reconciled);
      assert.equal(result.documentTotalInclVat, 17.29);
    },
  );

  QUnit.test(
    "normalizeAndAggregateReceiptData — excludes discounts and payment metadata",
    function (assert) {
      const raw = {
        items: [
          { name: "Screw", quantity: 10, unitPrice: 0.5, lineTotal: 5.0 },
        ],
        additionalCosts: [
          { name: "Korting", type: "discount_or_reward", amount: -2.0 }, // should be ignored
          { name: "Reeds betaald", type: "payment_information", amount: 10.0 },
        ],
        vat: null,
        totals: { inclVAT: 5.0 },
      };

      const result = normalizeAndAggregateReceiptData(raw);

      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0].name, "Screw");
      assert.equal(result.documentTotalInclVat, 5.0);
    },
  );

  QUnit.test(
    "normalizeAndAggregateReceiptData — fails reconciliation when totals cannot be matched",
    function (assert) {
      const raw = {
        items: [{ name: "Item", quantity: 1, unitPrice: 10, lineTotal: 10 }],
        additionalCosts: [],
        vat: { amount: 2 },
        totals: { inclVAT: 999.99 }, // deliberately wrong
      };

      const result = normalizeAndAggregateReceiptData(raw);

      assert.notOk(result.reconciled);
    },
  );

  QUnit.test(
    "normalizeAndAggregateReceiptData — PLA EXCL-basis 14.29 regression",
    function (assert) {
      const raw = {
        items: [
          {
            name: "CorePro LED PLC 5.9W 840 2P G24d-1",
            quantity: 2,
            unitPrice: 4.6,
            lineTotal: 9.2,
          },
        ],
        additionalCosts: [
          { name: "Verwijderingsbijdrage", type: "fee", amount: 0.14 },
          { name: "Vrachtkosten", type: "shipping", amount: 4.95 },
        ],
        vat: {
          rate: 0.21,
          amount: 3.0,
        },
        totals: {
          exclVAT: 14.29,
          inclVAT: 17.29,
          vatAmount: 3.0,
        },
      };

      const result = normalizeAndAggregateReceiptData(raw);

      assert.ok(Math.abs(result.finalSum - 14.29) < 0.01);
      assert.ok(result.reconciled);
      assert.equal(result.documentTotalInclVat, 17.29);
    },
  );

  QUnit.test(
    "normalizeAndAggregateReceiptData — Hubo s-Heerenberg 21.49 regression",
    function (assert) {
      const raw = {
        items: [
          {
            name: "1 HG oven/grill vernieuwingskit",
            quantity: 1,
            unitPrice: 21.49,
            lineTotal: 21.49,
          },
        ],
        additionalCosts: [],
        vat: {
          rate: 0.21,
          amount: 3.73,
        },
        totals: {
          exclVAT: 17.76,
          inclVAT: 21.49,
          vatAmount: 3.73,
        },
      };

      const result = normalizeAndAggregateReceiptData(raw);

      assert.ok(Math.abs(result.finalSum - 21.49) < 0.01);
      assert.ok(result.reconciled);
      assert.equal(result.documentTotalInclVat, 21.49);
    },
  );

  QUnit.test(
    "normalizeAndAggregateReceiptData — Hubo Didam 44.17 regression",
    function (assert) {
      const raw = {
        items: [
          { name: "Item1", quantity: 1, unitPrice: 19.29, lineTotal: 19.29 },
          { name: "Item2", quantity: 1, unitPrice: 15.49, lineTotal: 15.49 },
          { name: "Item3", quantity: 1, unitPrice: 9.39, lineTotal: 9.39 },
        ],
        additionalCosts: [],
        vat: null,
        totals: { inclVAT: 44.17 },
      };

      const result = normalizeAndAggregateReceiptData(raw);

      assert.ok(Math.abs(result.finalSum - 44.17) < 0.01);
      assert.ok(result.reconciled);
      assert.equal(result.documentTotalInclVat, 44.17);
    },
  );

  QUnit.test(
    "stripQuantityPrefix — removes leading quantity from names",
    function (assert) {
      assert.equal(
        stripQuantityPrefix("1 Tiger doucheglijstang chr"),
        "Tiger doucheglijstang chr",
      );
      assert.equal(stripQuantityPrefix("2x LED bulb"), "LED bulb");
      assert.equal(stripQuantityPrefix("10 - Screw set"), "Screw set");
      assert.equal(stripQuantityPrefix("CorePro LED"), "CorePro LED");
      assert.equal(stripQuantityPrefix("  3×  Item "), "Item");
    },
  );

  // ==================================================
  // calculateMaterialTotalFromRows() - new for column G support
  // ==================================================

  QUnit.test(
    "calculateMaterialTotalFromRows — legacy rows (no receiptKey) use column E",
    function (assert) {
      const rows = [
        ["ID", "Item1", 10, 1, 10, "", ""], // no receiptKey, use E=10
        ["ID", "Item2", 20, 1, 20, "", ""], // no receiptKey, use E=20
      ];

      assert.equal(calculateMaterialTotalFromRows(rows), 30);
    },
  );

  QUnit.test(
    "calculateMaterialTotalFromRows — uses G when present (only once)",
    function (assert) {
      const rows = [
        ["ID", "Item1", 10, 1, 10, "REC-001", 44.28],
        ["ID", "Item2", 15, 1, 15, "REC-001", 44.28],
      ];

      assert.equal(calculateMaterialTotalFromRows(rows), 44.28);
    },
  );

  QUnit.test(
    "calculateMaterialTotalFromRows — falls back to eSum on conflicting G values",
    function (assert) {
      const rows = [
        ["ID", "Item1", 10, 1, 10, "REC-002", 50],
        ["ID", "Item2", 15, 1, 15, "REC-002", 60],
      ];

      assert.equal(calculateMaterialTotalFromRows(rows), 25);
    },
  );

  QUnit.test(
    "calculateMaterialTotalFromRows — sums multiple receipt groups",
    function (assert) {
      const rows = [
        ["ID", "Item1", 10, 1, 10, "REC-A", 30],
        ["ID", "Item2", 5, 1, 5, "REC-B", 12],
      ];

      assert.equal(calculateMaterialTotalFromRows(rows), 42);
    },
  );

  QUnit.test(
    "calculateMaterialTotalFromRows — keyed group without G falls back to SUM(E)",
    function (assert) {
      const rows = [
        ["ID", "Item1", 10, 1, 10, "REC-NO-G", ""],
        ["ID", "Item2", 15, 1, 15, "REC-NO-G", ""],
      ];

      assert.equal(calculateMaterialTotalFromRows(rows), 25);
    },
  );

  QUnit.test(
    "calculateMaterialTotalFromRows — combines legacy and keyed receipt groups",
    function (assert) {
      const rows = [
        ["ID", "Legacy", 5, 1, 5, "", ""],
        ["ID", "Item1", 10, 1, 10, "REC-MIXED", ""],
        ["ID", "Item2", 12, 1, 12, "REC-MIXED", 22.5],
      ];

      assert.equal(calculateMaterialTotalFromRows(rows), 27.5);
    },
  );

  // ==================================================
  // PDF / Responses API support (new for PDF ingestion)
  // ==================================================

  QUnit.test(
    "parseOpenAIPdfReceiptResponse — returns canonical shape from Responses output",
    function (assert) {
      const inner = JSON.stringify({
        items: [{ name: "Screw", quantity: 10, unitPrice: 0.5, lineTotal: 5 }],
        additionalCosts: [],
        vat: null,
        totals: { inclVAT: 5.5 },
      });
      const mock = JSON.stringify({
        output: [
          {
            type: "reasoning",
            summary: [],
          },
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: inner,
              },
            ],
          },
        ],
      });

      const result = parseOpenAIPdfReceiptResponse(mock);
      assert.ok(Array.isArray(result.items));
      assert.equal(result.items.length, 1);
      assert.equal(result.items[0].name, "Screw");
      assert.equal(result.items[0].unitPrice, 0.5);
      assert.equal(result.items[0].lineTotal, 5);
      assert.deepEqual(result.additionalCosts, []);
      assert.equal(result.totals.inclVAT, 5.5);
    },
  );

  QUnit.test(
    "parseOpenAIPdfReceiptResponse — strips markdown and parses",
    function (assert) {
      const inner =
        '```json\n[{"name":"Bolt","quantity":4,"unitPrice":1.25,"lineTotal":5}]\n```';
      const mock = JSON.stringify({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: inner,
              },
            ],
          },
        ],
      });

      const result = parseOpenAIPdfReceiptResponse(mock);
      assert.equal(result.items.length, 1);
      assert.equal(result.items[0].name, "Bolt");
      assert.equal(result.items[0].unitPrice, 1.25);
      assert.equal(result.items[0].lineTotal, 5);
    },
  );

  QUnit.test(
    "parseOpenAIPdfReceiptResponse — throws when Responses output has no output_text",
    function (assert) {
      const mock = JSON.stringify({
        output: [
          { type: "reasoning", summary: [] },
          {
            type: "message",
            content: [{ type: "refusal", refusal: "Unable to process." }],
          },
        ],
      });

      assert.throws(function () {
        parseOpenAIPdfReceiptResponse(mock);
      }, /did not contain output_text/);
    },
  );

  QUnit.test(
    "buildOpenAIPdfPayload — uses the Responses input_file file_data contract",
    function (assert) {
      const payload = buildOpenAIPdfPayload("application/pdf", "BASE64_DATA");
      const filePart = payload.input[0].content[1];

      assert.equal(filePart.type, "input_file");
      assert.equal(filePart.filename, "receipt.pdf");
      assert.equal(
        filePart.file_data,
        "data:application/pdf;base64,BASE64_DATA",
      );
    },
  );

  QUnit.test(
    "analyzeReceiptWithOpenAI — rejects unsupported MIME before fetch",
    function (assert) {
      const originalApiKey = CONFIG.openAIApiKey;
      CONFIG.openAIApiKey = "test-key";

      try {
        assert.throws(function () {
          analyzeReceiptWithOpenAI({
            getMimeType: function () {
              return "text/plain";
            },
          });
        }, /Unsupported MIME type/);
      } finally {
        CONFIG.openAIApiKey = originalApiKey;
      }
    },
  );

  QUnit.test(
    "analyzeReceiptWithOpenAI — rejects PDF above the raw-size limit before fetch",
    function (assert) {
      const originalApiKey = CONFIG.openAIApiKey;
      CONFIG.openAIApiKey = "test-key";

      try {
        assert.throws(function () {
          analyzeReceiptWithOpenAI({
            getMimeType: function () {
              return "application/pdf";
            },
            getSize: function () {
              return MAX_PDF_SIZE_BYTES + 1;
            },
          });
        }, /PDF file is too large/);
      } finally {
        CONFIG.openAIApiKey = originalApiKey;
      }
    },
  );

  QUnit.test(
    "parseOpenAIPdfReceiptResponse — output is compatible with normalizeAndAggregateReceiptData",
    function (assert) {
      const inner = JSON.stringify({
        items: [{ name: "Item", quantity: 1, unitPrice: 10, lineTotal: 10 }],
        additionalCosts: [],
        vat: null,
        totals: { inclVAT: 10 },
      });
      const mock = JSON.stringify({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: inner,
              },
            ],
          },
        ],
      });

      const parsed = parseOpenAIPdfReceiptResponse(mock);
      const normalized = normalizeAndAggregateReceiptData(parsed);
      assert.ok(normalized.reconciled);
      assert.ok(Math.abs(normalized.finalSum - 10) < 0.01);
    },
  );

  // ==================================================
  // EXPERIMENTAL STAGED RECEIPT EXTRACTION PROTOTYPE
  // ==================================================

  function observedPrototypeRow(
    order,
    descriptionText,
    leadingQuantityText,
    unitPriceText,
    lineTotalText,
    indentation,
  ) {
    return {
      order: order,
      rawText: descriptionText,
      leadingQuantityText: leadingQuantityText,
      descriptionText: descriptionText,
      unitPriceText: unitPriceText,
      lineTotalText: lineTotalText,
      indentation: indentation,
      roleEvidence: "product",
    };
  }

  function observedPrototypeEvidenceLine(order, rawText, roleEvidence) {
    return {
      order: order,
      rawText: rawText,
      leadingQuantityText: null,
      descriptionText: rawText,
      unitPriceText: null,
      lineTotalText: null,
      indentation: "unclear",
      roleEvidence: roleEvidence,
    };
  }

  function observedPrototypeExtraction(observedLines, summaryEvidence) {
    return {
      observedLines: observedLines,
      summaryEvidence: summaryEvidence || {},
    };
  }

  function tabularCellExperimentFixture(
    cellId,
    columnOrder,
    rawText,
    sourceLineOrders,
    headerCellRef,
  ) {
    return {
      cellId: cellId,
      columnOrder: columnOrder,
      rawText: rawText,
      sourceLineOrders: sourceLineOrders,
      headerCellRef: headerCellRef,
    };
  }

  function wiskaStyleTabularExtractionFixture() {
    const observedLines = [
      observedPrototypeEvidenceLine(
        1,
        "Productnaam | Referentie | Prijs | Aantal | BTW | Subtotaal",
        "header",
      ),
      observedPrototypeEvidenceLine(
        2,
        "Synthetic Wiska product | SYN-REF | 10.95 | 3 | 21% | 27.15",
        "product",
      ),
      observedPrototypeEvidenceLine(3, "wrapped dimensions", "product"),
      observedPrototypeEvidenceLine(4, "Total excl VAT 27.15", "summary"),
      observedPrototypeEvidenceLine(5, "VAT amount 5.70", "summary"),
      observedPrototypeEvidenceLine(6, "Total incl VAT 32.85", "summary"),
    ];
    observedLines[1].descriptionText = "Synthetic Wiska product";
    observedLines[2].descriptionText = "wrapped dimensions";

    return {
      observedLines: observedLines,
      summaryEvidence: {
        printedProductCount: null,
        printedTotal: null,
      },
      financialEvidence: {
        monetaryObservations: [
          syntheticFinancialObservation(
            "wiska-excl",
            4,
            "Total excl VAT",
            "27.15",
            "document_total",
            "exclVAT",
            "document",
          ),
          syntheticFinancialObservation(
            "wiska-vat",
            5,
            "VAT amount",
            "5.70",
            "vat_amount",
            null,
            "document",
          ),
          syntheticFinancialObservation(
            "wiska-incl",
            6,
            "Total incl VAT",
            "32.85",
            "document_total",
            "inclVAT",
            "document",
          ),
        ],
      },
      tableRegions: [
        {
          regionId: "synthetic-table-1",
          sourceLineOrders: [1, 2, 3],
          headerRowId: "header-row",
          rows: [
            {
              rowId: "header-row",
              roleEvidence: "header",
              sourceLineOrders: [1],
              cells: [
                tabularCellExperimentFixture("h-description", 1, "Productnaam", [1], null),
                tabularCellExperimentFixture("h-reference", 2, "Referentie", [1], null),
                tabularCellExperimentFixture("h-price", 3, "Prijs", [1], null),
                tabularCellExperimentFixture("h-quantity", 4, "Aantal", [1], null),
                tabularCellExperimentFixture("h-vat", 5, "BTW", [1], null),
                tabularCellExperimentFixture("h-subtotal", 6, "Subtotaal", [1], null),
              ],
            },
            {
              rowId: "data-row-1",
              roleEvidence: "product",
              sourceLineOrders: [2, 3],
              cells: [
                tabularCellExperimentFixture(
                  "d-description",
                  1,
                  "Synthetic Wiska product\nwrapped dimensions",
                  [2, 3],
                  "h-description",
                ),
                tabularCellExperimentFixture("d-reference", 2, "SYN-REF", [2], "h-reference"),
                tabularCellExperimentFixture("d-price", 3, "10.95", [2], "h-price"),
                tabularCellExperimentFixture("d-quantity", 4, "3", [2], "h-quantity"),
                tabularCellExperimentFixture("d-vat", 5, "21%", [2], "h-vat"),
                tabularCellExperimentFixture("d-subtotal", 6, "27.15", [2], "h-subtotal"),
              ],
            },
          ],
          financialLines: [
            {
              evidenceId: "synthetic-financial-line-1",
              rowId: "data-row-1",
              descriptionCellIds: ["d-description"],
              valueCellIds: [
                "d-price",
                "d-quantity",
                "d-vat",
                "d-subtotal",
              ],
              uninterpretedCellIds: ["d-reference"],
              adjacentUninterpretedCellIds: {
                "d-price": ["d-reference"],
              },
            },
          ],
        },
      ],
    };
  }

  function prototypeConflictCodes(result) {
    return result.conflicts.map(function (conflict) {
      return conflict.code;
    });
  }

  function compactJsonEquality(actual, expected) {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  function financialSourceObservationFixture(
    observationId,
    sourceContext,
    rawValue,
    structuralCapability,
    sourceLineOrders,
    occurrenceOrder,
    options,
  ) {
    const settings = options || {};
    return {
      provenanceKind: "observed_line",
      observationId: observationId,
      sourceContext: sourceContext,
      rawValue: rawValue,
      structuralCapability: structuralCapability,
      sourceRef: {
        sourceLineOrders: sourceLineOrders,
        occurrenceOrder: occurrenceOrder,
        groupId: settings.groupId || null,
        regionId: settings.regionId || null,
        rowId: settings.rowId || null,
        cellId: settings.cellId || null,
      },
      printedLabelText:
        settings.printedLabelText === undefined
          ? null
          : settings.printedLabelText,
      headerCellRef: settings.headerCellRef || null,
      adjacentUninterpretedFragments:
        settings.adjacentUninterpretedFragments || [],
    };
  }

  function financialCollectionConflictCodes(result) {
    return result.conflicts.map(function (conflict) {
      return conflict.code;
    });
  }

  function huboFinancialCollectionFixture() {
    const extraction = observedPrototypeExtraction(
      [
        observedPrototypeEvidenceLine(1, "1 Synthetic item 15,99 15,99", "product"),
        observedPrototypeEvidenceLine(2, "wrapped detail", "product"),
        observedPrototypeEvidenceLine(3, "Aantal producten: 1", "summary"),
        observedPrototypeEvidenceLine(4, "Totaal 15,99", "summary"),
      ],
      {
        printedProductCount: {
          sourceLineOrder: 3,
          rawText: "Aantal producten: 1",
          labelText: "Aantal producten:",
          valueText: "1",
        },
        printedTotal: {
          sourceLineOrder: 4,
          rawText: "Totaal 15,99",
          labelText: "Totaal",
          valueText: "15,99",
          totalTypeEvidence: null,
        },
      },
    );
    extraction.financialSourceObservations = [
      financialSourceObservationFixture(
        "hubo-unit",
        "product_group",
        "15,99",
        "FORWARD_PRICED_ANCHOR",
        [1],
        1,
        { groupId: "hubo-group-1" },
      ),
      financialSourceObservationFixture(
        "hubo-line",
        "product_group",
        "15,99",
        "FORWARD_PRICED_ANCHOR",
        [1],
        2,
        { groupId: "hubo-group-1" },
      ),
      financialSourceObservationFixture(
        "hubo-total",
        "summary",
        "15,99",
        "SUMMARY_REGION",
        [4],
        1,
        { printedLabelText: "Totaal" },
      ),
    ];
    return extraction;
  }

  function gammaFinancialCollectionFixture() {
    const rawLines = [
      "Synthetic product 28,99",
      "Aanbieding -7,25",
      "Nettoprijs 21,74",
      "Totaal 21,74",
      "Contant 50,00",
      "Terug 28,25",
      "Totaal prijsvoordeel 7,25",
      "BTW 21,00 % over 17,97 = 3,77",
      "TOT.OMZET 17,97",
      "TOT.BTW 3,77",
    ];
    const extraction = observedPrototypeExtraction(
      rawLines.map(function (rawText, index) {
        return observedPrototypeEvidenceLine(
          index + 1,
          rawText,
          index < 3 ? "product" : "summary",
        );
      }),
    );
    extraction.financialSourceObservations = [
      financialSourceObservationFixture("gamma-original", "product_group", "28,99", "TERMINAL_PRICED_ANCHOR", [1], 1, { groupId: "gamma-group-1" }),
      financialSourceObservationFixture("gamma-discount", "adjustment_like", "-7,25", "TERMINAL_PRICED_ANCHOR", [2], 1, { groupId: "gamma-group-1", printedLabelText: "Aanbieding" }),
      financialSourceObservationFixture("gamma-net", "product_group", "21,74", "TERMINAL_PRICED_ANCHOR", [3], 1, { groupId: "gamma-group-1", printedLabelText: "Nettoprijs" }),
      financialSourceObservationFixture("gamma-total", "summary", "21,74", "SUMMARY_REGION", [4], 1, { printedLabelText: "Totaal" }),
      financialSourceObservationFixture("gamma-tender", "tender_like", "50,00", "SUMMARY_REGION", [5], 1, { printedLabelText: "Contant" }),
      financialSourceObservationFixture("gamma-change", "tender_like", "28,25", "SUMMARY_REGION", [6], 1, { printedLabelText: "Terug" }),
      financialSourceObservationFixture("gamma-advantage", "adjustment_like", "7,25", "SUMMARY_REGION", [7], 1, { printedLabelText: "Totaal prijsvoordeel" }),
      financialSourceObservationFixture("gamma-vat-rate", "summary", "21,00", "SUMMARY_REGION", [8], 1, {
        printedLabelText: "BTW",
        adjacentUninterpretedFragments: [
          { rawText: "%", sourceLineOrders: [8] },
        ],
      }),
      financialSourceObservationFixture("gamma-vat-base", "summary", "17,97", "SUMMARY_REGION", [8], 2, {
        adjacentUninterpretedFragments: [
          { rawText: "over", sourceLineOrders: [8] },
          { rawText: "=", sourceLineOrders: [8] },
        ],
      }),
      financialSourceObservationFixture("gamma-vat-amount", "summary", "3,77", "SUMMARY_REGION", [8], 3, {
        adjacentUninterpretedFragments: [
          { rawText: "=", sourceLineOrders: [8] },
        ],
      }),
      financialSourceObservationFixture("gamma-turnover", "summary", "17,97", "SUMMARY_REGION", [9], 1, { printedLabelText: "TOT.OMZET" }),
      financialSourceObservationFixture("gamma-vat-total", "summary", "3,77", "SUMMARY_REGION", [10], 1, { printedLabelText: "TOT.BTW" }),
    ];
    return extraction;
  }

  function bolFinancialCollectionFixture() {
    const extraction = observedPrototypeExtraction([
      observedPrototypeEvidenceLine(1, "2 Synthetic product 10,95 21,90", "product"),
      observedPrototypeEvidenceLine(2, "Subtotal excl VAT 21,90", "summary"),
      observedPrototypeEvidenceLine(3, "VAT 21% 4,60", "summary"),
      observedPrototypeEvidenceLine(4, "Total incl VAT 26,50", "summary"),
      observedPrototypeEvidenceLine(5, "Total 26,50", "summary"),
    ]);
    extraction.financialSourceObservations = [
      financialSourceObservationFixture("bol-quantity", "product_group", "2", "TERMINAL_PRICED_ANCHOR", [1], 1, { groupId: "bol-group-1" }),
      financialSourceObservationFixture("bol-unit", "product_group", "10,95", "TERMINAL_PRICED_ANCHOR", [1], 2, { groupId: "bol-group-1" }),
      financialSourceObservationFixture("bol-line", "product_group", "21,90", "TERMINAL_PRICED_ANCHOR", [1], 3, { groupId: "bol-group-1" }),
      financialSourceObservationFixture("bol-excl", "summary", "21,90", "SUMMARY_REGION", [2], 1, { printedLabelText: "Subtotal excl VAT" }),
      financialSourceObservationFixture("bol-vat-rate", "summary", "21%", "SUMMARY_REGION", [3], 1, { printedLabelText: "VAT" }),
      financialSourceObservationFixture("bol-vat-amount", "summary", "4,60", "SUMMARY_REGION", [3], 2, {
        adjacentUninterpretedFragments: [
          { rawText: "VAT", sourceLineOrders: [3] },
        ],
      }),
      financialSourceObservationFixture("bol-incl", "summary", "26,50", "SUMMARY_REGION", [4], 1, { printedLabelText: "Total incl VAT" }),
      financialSourceObservationFixture("bol-total", "summary", "26,50", "SUMMARY_REGION", [5], 1, { printedLabelText: "Total" }),
    ];
    return extraction;
  }

  function wiskaFinancialCollectionFixture() {
    const extraction = wiskaStyleTabularExtractionFixture();
    extraction.financialSourceObservations = [
      financialSourceObservationFixture("wiska-price", "table_cell", "10.95", "TABULAR_CELL_ROW", [2], 1, { regionId: "synthetic-table-1", rowId: "data-row-1", cellId: "d-price", headerCellRef: "h-price", printedLabelText: "Prijs" }),
      financialSourceObservationFixture("wiska-quantity", "table_cell", "3", "TABULAR_CELL_ROW", [2], 2, { regionId: "synthetic-table-1", rowId: "data-row-1", cellId: "d-quantity", headerCellRef: "h-quantity", printedLabelText: "Aantal" }),
      financialSourceObservationFixture("wiska-vat-rate", "table_cell", "21%", "TABULAR_CELL_ROW", [2], 3, { regionId: "synthetic-table-1", rowId: "data-row-1", cellId: "d-vat", headerCellRef: "h-vat", printedLabelText: "BTW" }),
      financialSourceObservationFixture("wiska-subtotal", "table_cell", "27.15", "TABULAR_CELL_ROW", [2], 4, { regionId: "synthetic-table-1", rowId: "data-row-1", cellId: "d-subtotal", headerCellRef: "h-subtotal", printedLabelText: "Subtotaal" }),
      financialSourceObservationFixture("wiska-excl", "summary", "27.15", "SUMMARY_REGION", [4], 1, { printedLabelText: "Total excl VAT" }),
      financialSourceObservationFixture("wiska-vat", "summary", "5.70", "SUMMARY_REGION", [5], 1, { printedLabelText: "VAT amount" }),
      financialSourceObservationFixture("wiska-incl", "summary", "32.85", "SUMMARY_REGION", [6], 1, { printedLabelText: "Total incl VAT" }),
    ];
    return extraction;
  }

  function structuralSlotRefFixture(
    kind,
    lineOrder,
    occurrenceOrder,
    field,
    options,
  ) {
    const settings = options || {};
    return {
      kind: kind,
      lineOrder: lineOrder,
      occurrenceOrder:
        occurrenceOrder === undefined ? null : occurrenceOrder,
      field: field === undefined ? null : field,
      regionId: settings.regionId || null,
      rowId: settings.rowId || null,
      cellId: settings.cellId || null,
      headerCellRef: settings.headerCellRef || null,
    };
  }

  function structuralBindingFixture(observationId, slotRef) {
    return {
      sourceObservationId: observationId,
      structuralSlotRef: slotRef,
    };
  }

  function huboInterpretationProjectionFixture() {
    return {
      resolved: true,
      slots: [
        structuralBindingFixture("hubo-unit", structuralSlotRefFixture("observed_line_field", 1, null, "unitPriceText")),
        structuralBindingFixture("hubo-line", structuralSlotRefFixture("observed_line_field", 1, null, "lineTotalText")),
        structuralBindingFixture("hubo-total", structuralSlotRefFixture("summary_value", 4, 1)),
      ],
    };
  }

  function gammaInterpretationProjectionFixture() {
    return {
      resolved: true,
      slots: [
        structuralBindingFixture("gamma-original", structuralSlotRefFixture("observed_line_field", 1, null, "unitPriceText")),
        structuralBindingFixture("gamma-discount", structuralSlotRefFixture("labelled_line_value", 2, 1)),
        structuralBindingFixture("gamma-net", structuralSlotRefFixture("observed_line_field", 3, null, "lineTotalText")),
        structuralBindingFixture("gamma-total", structuralSlotRefFixture("summary_value", 4, 1)),
        structuralBindingFixture("gamma-tender", structuralSlotRefFixture("summary_value", 5, 1)),
        structuralBindingFixture("gamma-change", structuralSlotRefFixture("summary_value", 6, 1)),
        structuralBindingFixture("gamma-advantage", structuralSlotRefFixture("summary_value", 7, 1)),
        structuralBindingFixture("gamma-vat-rate", structuralSlotRefFixture("summary_value", 8, 1)),
        structuralBindingFixture("gamma-vat-base", structuralSlotRefFixture("summary_value", 8, 2)),
        structuralBindingFixture("gamma-vat-amount", structuralSlotRefFixture("summary_value", 8, 3)),
        structuralBindingFixture("gamma-turnover", structuralSlotRefFixture("summary_value", 9, 1)),
        structuralBindingFixture("gamma-vat-total", structuralSlotRefFixture("summary_value", 10, 1)),
      ],
    };
  }

  function bolInterpretationProjectionFixture() {
    return {
      resolved: true,
      slots: [
        structuralBindingFixture("bol-quantity", structuralSlotRefFixture("observed_line_field", 1, null, "leadingQuantityText")),
        structuralBindingFixture("bol-unit", structuralSlotRefFixture("observed_line_field", 1, null, "unitPriceText")),
        structuralBindingFixture("bol-line", structuralSlotRefFixture("observed_line_field", 1, null, "lineTotalText")),
        structuralBindingFixture("bol-excl", structuralSlotRefFixture("summary_value", 2, 1)),
        structuralBindingFixture("bol-vat-rate", structuralSlotRefFixture("summary_value", 3, 1)),
        structuralBindingFixture("bol-vat-amount", structuralSlotRefFixture("summary_value", 3, 2)),
        structuralBindingFixture("bol-incl", structuralSlotRefFixture("summary_value", 4, 1)),
        structuralBindingFixture("bol-total", structuralSlotRefFixture("summary_value", 5, 1)),
      ],
    };
  }

  function wiskaInterpretationProjectionFixture() {
    function tableSlot(observationId, cellId, headerCellRef) {
      return structuralBindingFixture(
        observationId,
        structuralSlotRefFixture("table_cell", 2, null, null, {
          regionId: "synthetic-table-1",
          rowId: "data-row-1",
          cellId: cellId,
          headerCellRef: headerCellRef,
        }),
      );
    }
    return {
      resolved: true,
      slots: [
        tableSlot("wiska-price", "d-price", "h-price"),
        tableSlot("wiska-quantity", "d-quantity", "h-quantity"),
        tableSlot("wiska-vat-rate", "d-vat", "h-vat"),
        tableSlot("wiska-subtotal", "d-subtotal", "h-subtotal"),
        structuralBindingFixture("wiska-excl", structuralSlotRefFixture("summary_value", 4, 1)),
        structuralBindingFixture("wiska-vat", structuralSlotRefFixture("summary_value", 5, 1)),
        structuralBindingFixture("wiska-incl", structuralSlotRefFixture("summary_value", 6, 1)),
      ],
    };
  }

  function canonicalProductProjectionFixture(
    groupId,
    structuralCapability,
    description,
    sourceRowOrders,
    quantityObservationId,
    unitPriceObservationId,
    lineTotalObservationId,
  ) {
    return {
      resolved: true,
      productGroups: [
        {
          groupId: groupId,
          structuralCapability: structuralCapability,
          description: description,
          sourceRowOrders: sourceRowOrders,
          financialSlots: {
            quantity: quantityObservationId,
            unitPrice: unitPriceObservationId,
            lineTotal: lineTotalObservationId,
          },
        },
      ],
    };
  }

  function bolCanonicalReleaseInputsFixture() {
    const productRows = [
      observedPrototypeRow(
        1,
        "Synthetic product",
        null,
        null,
        null,
        "left_aligned",
      ),
      observedPrototypeRow(
        2,
        "wrapped detail",
        null,
        null,
        null,
        "indented",
      ),
      observedPrototypeRow(3, null, "2", "10,95", "21,90", "indented"),
    ];
    productRows[2].rawText = "2 10,95 21,90";
    const extraction = observedPrototypeExtraction(
      productRows.concat([
        observedPrototypeEvidenceLine(4, "Subtotal excl VAT 21,90", "summary"),
        observedPrototypeEvidenceLine(5, "VAT 21% 4,60", "summary"),
        observedPrototypeEvidenceLine(6, "Total incl VAT 26,50", "summary"),
        observedPrototypeEvidenceLine(7, "Total 26,50", "summary"),
      ]),
    );
    extraction.financialSourceObservations = [
      financialSourceObservationFixture("bol-quantity", "product_group", "2", "TERMINAL_PRICED_ANCHOR", [3], 1, { groupId: "bol-group-1" }),
      financialSourceObservationFixture("bol-unit", "product_group", "10,95", "TERMINAL_PRICED_ANCHOR", [3], 2, { groupId: "bol-group-1" }),
      financialSourceObservationFixture("bol-line", "product_group", "21,90", "TERMINAL_PRICED_ANCHOR", [3], 3, { groupId: "bol-group-1" }),
      financialSourceObservationFixture("bol-excl", "summary", "21,90", "SUMMARY_REGION", [4], 1, { printedLabelText: "Subtotal excl VAT" }),
      financialSourceObservationFixture("bol-vat-rate", "summary", "21%", "SUMMARY_REGION", [5], 1, { printedLabelText: "VAT" }),
      financialSourceObservationFixture("bol-vat-amount", "summary", "4,60", "SUMMARY_REGION", [5], 2, {
        adjacentUninterpretedFragments: [
          { rawText: "VAT", sourceLineOrders: [5] },
        ],
      }),
      financialSourceObservationFixture("bol-incl", "summary", "26,50", "SUMMARY_REGION", [6], 1, { printedLabelText: "Total incl VAT" }),
      financialSourceObservationFixture("bol-total", "summary", "26,50", "SUMMARY_REGION", [7], 1, { printedLabelText: "Total" }),
    ];

    const terminalProjection = projectTerminalPricedGroupsExperiment_(
      productRows,
      [{ sourceRowOrders: [1, 2, 3], terminalRowOrder: 3 }],
    );
    const interpretationProjection = {
      resolved: true,
      slots: [
        structuralBindingFixture("bol-quantity", structuralSlotRefFixture("observed_line_field", 3, null, "leadingQuantityText")),
        structuralBindingFixture("bol-unit", structuralSlotRefFixture("observed_line_field", 3, null, "unitPriceText")),
        structuralBindingFixture("bol-line", structuralSlotRefFixture("observed_line_field", 3, null, "lineTotalText")),
        structuralBindingFixture("bol-excl", structuralSlotRefFixture("summary_value", 4, 1)),
        structuralBindingFixture("bol-vat-rate", structuralSlotRefFixture("summary_value", 5, 1)),
        structuralBindingFixture("bol-vat-amount", structuralSlotRefFixture("summary_value", 5, 2)),
        structuralBindingFixture("bol-incl", structuralSlotRefFixture("summary_value", 6, 1)),
        structuralBindingFixture("bol-total", structuralSlotRefFixture("summary_value", 7, 1)),
      ],
    };
    const collection = collectExhaustiveFinancialEvidenceExperiment_(extraction);
    const interpretation = interpretCollectedFinancialEvidenceExperiment_(
      collection,
      interpretationProjection,
    );
    const structuralProjection = canonicalProductProjectionFixture(
      "bol-group-1",
      terminalProjection.groups[0].capability,
      "Synthetic product wrapped detail",
      terminalProjection.groups[0].sourceRowOrders.slice(),
      "bol-quantity",
      "bol-unit",
      "bol-line",
    );

    return {
      extraction: extraction,
      terminalProjection: terminalProjection,
      interpretationProjection: interpretationProjection,
      structuralProjection: structuralProjection,
      collection: collection,
      interpretation: interpretation,
    };
  }

  function buildCanonicalReleaseEnvelopeFixture(inputs) {
    return buildCanonicalReceiptFromFinancialInterpretationExperiment_(
      inputs.structuralProjection,
      inputs.collection,
      inputs.interpretation,
    );
  }

  function addBolCanonicalTotalObservationFixture(
    inputs,
    observationId,
    rawValue,
  ) {
    const lineOrder = inputs.extraction.observedLines.length + 1;
    inputs.extraction.observedLines.push(
      observedPrototypeEvidenceLine(
        lineOrder,
        "Total incl VAT " + rawValue,
        "summary",
      ),
    );
    inputs.extraction.financialSourceObservations.push(
      financialSourceObservationFixture(
        observationId,
        "summary",
        rawValue,
        "SUMMARY_REGION",
        [lineOrder],
        1,
        { printedLabelText: "Total incl VAT" },
      ),
    );
    inputs.interpretationProjection.slots.push(
      structuralBindingFixture(
        observationId,
        structuralSlotRefFixture("summary_value", lineOrder, 1),
      ),
    );
    inputs.collection = collectExhaustiveFinancialEvidenceExperiment_(
      inputs.extraction,
    );
    inputs.interpretation = interpretCollectedFinancialEvidenceExperiment_(
      inputs.collection,
      inputs.interpretationProjection,
    );
    return inputs;
  }

  function historicalControlledProbeRecordedEvidenceFixture() {
    // This layer contains only fields recorded by the historical Stage-1
    // contract. It intentionally has no rawText, roleEvidence, or decomposed
    // summaryEvidence because the historical response did not return them.
    return {
      observedLines: [
        { order: 1, descriptionText: "AFHAALBEWIJS" },
        { order: 2, descriptionText: "€/stuk €" },
        observedPrototypeRow(3, "S2 b. deur", "1", "15,99", "15,99", "left_aligned"),
        observedPrototypeRow(4, "loopslot rvs", "1", null, null, "indented"),
        observedPrototypeRow(5, "Veilig dkp duim f1", "1", "9,79", "9,79", "left_aligned"),
        observedPrototypeRow(6, "deurd. 38-45mm", null, null, null, "indented"),
        observedPrototypeRow(7, "Veilig bbw 180/41h", "1", "5,49", "5,49", "left_aligned"),
        observedPrototypeRow(8, "Saniv isolatiemat", "1", "9,99", "9,99", "left_aligned"),
        observedPrototypeRow(9, "voor wandcloset", null, null, null, "indented"),
        observedPrototypeRow(10, "Bison siliconenkit", "1", "15,29", "15,29", "left_aligned"),
        observedPrototypeRow(11, "sanitr super wt 0, 311", null, null, null, "indented"),
        observedPrototypeRow(12, "Saniv aansluitset", "1", "24,99", "24,99", "left_aligned"),
        observedPrototypeRow(13, "tbv inbouwreservoir", null, null, null, "indented"),
      ].map(function (line) {
        const historicalLine = {
          order: line.order,
          leadingQuantityText: line.leadingQuantityText,
          descriptionText: line.descriptionText,
          unitPriceText: line.unitPriceText,
          lineTotalText: line.lineTotalText,
          indentation: line.indentation,
        };
        return historicalLine;
      }),
      printedProductCountText: "Aantal producten: 6",
      printedTotalText: "Totaal 81,54",
    };
  }

  function controlledProbeStage1V2AnnotationFixture() {
    // Sanitized exact response from the controlled live Stage-1-v2 probe.
    return {
      observedLines: [
        {
          order: 1,
          rawText: "**AFHAALBEWIJS**",
          leadingQuantityText: null,
          descriptionText: "**AFHAALBEWIJS**",
          unitPriceText: null,
          lineTotalText: null,
          indentation: "left_aligned",
          roleEvidence: "header",
        },
        {
          order: 2,
          rawText: "€ /stuk €",
          leadingQuantityText: null,
          descriptionText: "€ /stuk",
          unitPriceText: "€",
          lineTotalText: null,
          indentation: "left_aligned",
          roleEvidence: "header",
        },
        {
          order: 3,
          rawText: "1 S2 b. deur 15,99 15,99",
          leadingQuantityText: "1",
          descriptionText: "S2 b. deur",
          unitPriceText: "15,99",
          lineTotalText: "15,99",
          indentation: "left_aligned",
          roleEvidence: "product",
        },
        {
          order: 4,
          rawText: "1 loopslot rvs",
          leadingQuantityText: "1",
          descriptionText: "loopslot rvs",
          unitPriceText: null,
          lineTotalText: null,
          indentation: "indented",
          roleEvidence: "product",
        },
        {
          order: 5,
          rawText: "1 Veilig dkp duim f1 9,79 9,79",
          leadingQuantityText: "1",
          descriptionText: "Veilig dkp duim f1",
          unitPriceText: "9,79",
          lineTotalText: "9,79",
          indentation: "left_aligned",
          roleEvidence: "product",
        },
        {
          order: 6,
          rawText: "deurd. 38-45mm",
          leadingQuantityText: null,
          descriptionText: "deurd. 38-45mm",
          unitPriceText: null,
          lineTotalText: null,
          indentation: "indented",
          roleEvidence: "product",
        },
        {
          order: 7,
          rawText: "1 Veilig bbw 180/41h 5,49 5,49",
          leadingQuantityText: "1",
          descriptionText: "Veilig bbw 180/41h",
          unitPriceText: "5,49",
          lineTotalText: "5,49",
          indentation: "left_aligned",
          roleEvidence: "product",
        },
        {
          order: 8,
          rawText: "blf 19",
          leadingQuantityText: null,
          descriptionText: "blf 19",
          unitPriceText: null,
          lineTotalText: null,
          indentation: "indented",
          roleEvidence: "product",
        },
        {
          order: 9,
          rawText: "1 Saniv isolatiemmat 9,99 9,99",
          leadingQuantityText: "1",
          descriptionText: "Saniv isolatiemmat",
          unitPriceText: "9,99",
          lineTotalText: "9,99",
          indentation: "left_aligned",
          roleEvidence: "product",
        },
        {
          order: 10,
          rawText: "voor wandcloset",
          leadingQuantityText: null,
          descriptionText: "voor wandcloset",
          unitPriceText: null,
          lineTotalText: null,
          indentation: "indented",
          roleEvidence: "product",
        },
        {
          order: 11,
          rawText: "1 Bison siliconenkit 15,29 15,29",
          leadingQuantityText: "1",
          descriptionText: "Bison siliconenkit",
          unitPriceText: "15,29",
          lineTotalText: "15,29",
          indentation: "left_aligned",
          roleEvidence: "product",
        },
        {
          order: 12,
          rawText: "sanitr super wt 0, 311",
          leadingQuantityText: null,
          descriptionText: "sanitr super wt 0, 311",
          unitPriceText: null,
          lineTotalText: null,
          indentation: "indented",
          roleEvidence: "product",
        },
        {
          order: 13,
          rawText: "1 Saniv aansluitset 24,99 24,99",
          leadingQuantityText: "1",
          descriptionText: "Saniv aansluitset",
          unitPriceText: "24,99",
          lineTotalText: "24,99",
          indentation: "left_aligned",
          roleEvidence: "product",
        },
        {
          order: 14,
          rawText: "tbv inbouwreservoir",
          leadingQuantityText: null,
          descriptionText: "tbv inbouwreservoir",
          unitPriceText: null,
          lineTotalText: null,
          indentation: "indented",
          roleEvidence: "product",
        },
        {
          order: 15,
          rawText: "Totaal 81,54",
          leadingQuantityText: null,
          descriptionText: "Totaal",
          unitPriceText: null,
          lineTotalText: "81,54",
          indentation: "left_aligned",
          roleEvidence: "summary",
        },
        {
          order: 16,
          rawText: "Aantal producten: 6",
          leadingQuantityText: null,
          descriptionText: "Aantal producten:",
          unitPriceText: null,
          lineTotalText: "6",
          indentation: "left_aligned",
          roleEvidence: "summary",
        },
      ],
      summaryEvidence: {
        printedProductCount: {
          sourceLineOrder: 16,
          rawText: "Aantal producten: 6",
          labelText: "Aantal producten:",
          valueText: "6",
        },
        printedTotal: {
          sourceLineOrder: 15,
          rawText: "Totaal 81,54",
          labelText: "Totaal",
          valueText: "81,54",
          totalTypeEvidence: null,
        },
      },
    };
  }

  function shiftedStage1V2PriceAssociationFixture() {
    // Sanitized from a repeatedly observed real Stage-1-v2 failure class.
    function productRow(
      order,
      rawText,
      descriptionText,
      leadingQuantityText,
      unitPriceText,
      lineTotalText,
      indentation,
    ) {
      const row = observedPrototypeRow(
        order,
        descriptionText,
        leadingQuantityText,
        unitPriceText,
        lineTotalText,
        indentation,
      );
      row.rawText = rawText;
      return row;
    }

    return {
      observedLines: [
        productRow(2, "1 S2 b. deur €/stuk 15,99 15,99", "S2 b. deur", "1", "15,99", "15,99", "left_aligned"),
        productRow(3, "1 loopslot rvs 9,79 9,79", "loopslot rvs", "1", "9,79", "9,79", "left_aligned"),
        productRow(4, "1 Veilig dkp duim f1 5,49 5,49", "Veilig dkp duim f1", "1", "5,49", "5,49", "left_aligned"),
        productRow(5, "deurd. 38-45mm", "deurd. 38-45mm", null, null, null, "indented"),
        productRow(6, "1 Veilig bbw 180/41h 9,99 9,99", "Veilig bbw 180/41h", "1", "9,99", "9,99", "left_aligned"),
        productRow(7, "1 Saniv isolatiemat 15,29 15,29", "Saniv isolatiemat", "1", "15,29", "15,29", "left_aligned"),
        productRow(8, "voor wandcloset", "voor wandcloset", null, null, null, "indented"),
        productRow(9, "1 Bison siliconenkit 24,99 24,99", "Bison siliconenkit", "1", "24,99", "24,99", "left_aligned"),
        productRow(10, "sanitr super wt 0, 311", "sanitr super wt 0, 311", null, null, null, "indented"),
        productRow(11, "1 Saniv aansluitset", "Saniv aansluitset", "1", null, null, "left_aligned"),
        productRow(12, "tbv inbouwreservoir", "tbv inbouwreservoir", null, null, null, "indented"),
        {
          order: 13,
          rawText: "Totaal 81,54",
          leadingQuantityText: null,
          descriptionText: "Totaal",
          unitPriceText: null,
          lineTotalText: "81,54",
          indentation: "left_aligned",
          roleEvidence: "summary",
        },
        {
          order: 14,
          rawText: "Aantal producten: 6",
          leadingQuantityText: null,
          descriptionText: "Aantal producten:",
          unitPriceText: null,
          lineTotalText: "6",
          indentation: "left_aligned",
          roleEvidence: "summary",
        },
      ],
      summaryEvidence: {
        printedProductCount: {
          sourceLineOrder: 14,
          rawText: "Aantal producten: 6",
          labelText: "Aantal producten:",
          valueText: "6",
        },
        printedTotal: {
          sourceLineOrder: 13,
          rawText: "Totaal 81,54",
          labelText: "Totaal",
          valueText: "81,54",
          totalTypeEvidence: null,
        },
      },
    };
  }

  function stage1V3CellFixture(
    cellId,
    columnOrder,
    rawText,
    headerCellRef,
    meaningEvidence,
  ) {
    return {
      cellId: cellId,
      columnOrder: columnOrder,
      rawText: rawText,
      emptyEvidence: rawText === "",
      headerCellRef: headerCellRef,
      meaningEvidence: meaningEvidence,
    };
  }

  function stage1V3RowFixture(
    rowId,
    order,
    rawText,
    indentationEvidence,
    roleEvidence,
    cells,
  ) {
    return {
      rowId: rowId,
      order: order,
      rawText: rawText,
      indentationEvidence: indentationEvidence,
      roleEvidence: roleEvidence,
      cells: cells,
    };
  }

  function minimalStage1V3PhysicalEvidenceFixture() {
    return {
      schemaVersion: "stage1-v3",
      physicalRows: [
        stage1V3RowFixture(
          "row-1",
          1,
          "  literal evidence  ",
          "unclear",
          "unknown",
          [
            stage1V3CellFixture(
              "cell-1",
              1,
              "  literal evidence  ",
              null,
              "other",
            ),
          ],
        ),
      ],
      summaryEvidence: {
        printedProductCount: null,
        printedTotal: null,
      },
    };
  }

  function multiRowStage1V3PhysicalEvidenceFixture() {
    return {
      schemaVersion: "stage1-v3",
      physicalRows: [
        stage1V3RowFixture(
          "header-row",
          1,
          "Aantal Omschrijving €/stuk €",
          "left_aligned",
          "header",
          [
            stage1V3CellFixture("h-quantity", 1, "Aantal", null, "other"),
            stage1V3CellFixture("h-description", 2, "Omschrijving", null, "other"),
            stage1V3CellFixture("h-unit", 3, "€/stuk", null, "other"),
            stage1V3CellFixture("h-total", 4, "€", null, "other"),
          ],
        ),
        stage1V3RowFixture(
          "product-row",
          2,
          "1 Synthetic item 15,99 15,99",
          "left_aligned",
          "product",
          [
            stage1V3CellFixture("p-quantity", 1, "1", "h-quantity", "quantity"),
            stage1V3CellFixture("p-description", 2, "Synthetic item", "h-description", "description"),
            stage1V3CellFixture("p-unit", 3, "15,99", "h-unit", "unit_price"),
            stage1V3CellFixture("p-total", 4, "15,99", "h-total", "line_total"),
          ],
        ),
        stage1V3RowFixture(
          "uncertain-row",
          3,
          "detail",
          "indented",
          "unknown",
          [
            stage1V3CellFixture("u-empty-quantity", 1, "", "h-quantity", "unknown"),
            stage1V3CellFixture("u-description", 2, "detail", "h-description", "unknown"),
            stage1V3CellFixture("u-empty-unit", 3, "", "h-unit", "unknown"),
            stage1V3CellFixture("u-empty-total", 4, "", "h-total", "unknown"),
          ],
        ),
        stage1V3RowFixture(
          "total-row",
          4,
          "Totaal 81,54",
          "left_aligned",
          "summary",
          [
            stage1V3CellFixture("total-label", 1, "Totaal", null, "summary_label"),
            stage1V3CellFixture("total-value", 2, "81,54", null, "summary_value"),
          ],
        ),
        stage1V3RowFixture(
          "count-row",
          5,
          "Aantal producten: 6",
          "left_aligned",
          "summary",
          [
            stage1V3CellFixture("count-label", 1, "Aantal producten:", null, "summary_label"),
            stage1V3CellFixture("count-value", 2, "6", null, "summary_value"),
          ],
        ),
      ],
      summaryEvidence: {
        printedProductCount: {
          sourceRowId: "count-row",
          labelCellRefs: ["count-label"],
          valueCellRefs: ["count-value"],
        },
        printedTotal: {
          sourceRowId: "total-row",
          labelCellRefs: ["total-label"],
          valueCellRefs: ["total-value"],
          totalTypeEvidence: null,
        },
      },
    };
  }

  function stage1V3OpenAIResponseFixture(evidence) {
    return JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify(evidence),
          },
        },
      ],
    });
  }

  function assertStage1V3ValidationRejects(
    assert,
    evidence,
    expectedMessageFragment,
  ) {
    let caught = null;
    try {
      validateStage1V3PhysicalEvidence_(evidence);
    } catch (error) {
      caught = error;
    }
    assert.ok(
      Boolean(
        caught &&
          caught.message.indexOf(expectedMessageFragment) >= 0,
      ),
    );
  }

  function stage1V3ProjectionEvidenceFixture(rows, summaryEvidence) {
    return {
      schemaVersion: "stage1-v3",
      physicalRows: rows,
      summaryEvidence: summaryEvidence || {
        printedProductCount: null,
        printedTotal: null,
      },
    };
  }

  function stage1V3ProjectionRowFixture(
    rowId,
    order,
    rawText,
    indentationEvidence,
    roleEvidence,
    cellSpecifications,
  ) {
    return stage1V3RowFixture(
      rowId,
      order,
      rawText,
      indentationEvidence,
      roleEvidence,
      cellSpecifications.map(function (specification, index) {
        return stage1V3CellFixture(
          specification[0],
          index + 1,
          specification[1],
          specification.length > 3 ? specification[3] : null,
          specification[2],
        );
      }),
    );
  }

  function simpleStage1V3ProjectionFixture() {
    return stage1V3ProjectionEvidenceFixture([
      stage1V3ProjectionRowFixture(
        "product-1",
        1,
        "  1 Synthetic part 15,99 15,99  ",
        "left_aligned",
        "product",
        [
          ["p1-q", "1", "quantity"],
          ["p1-d", "Synthetic part", "description"],
          ["p1-u", "15,99", "unit_price"],
          ["p1-t", "15,99", "line_total"],
        ],
      ),
    ]);
  }

  function stage1V3AnchorContinuationProjectionFixture() {
    return stage1V3ProjectionEvidenceFixture([
      stage1V3ProjectionRowFixture(
        "anchor-1",
        1,
        "1 Synthetic anchor 15,99 15,99",
        "left_aligned",
        "product",
        [
          ["a1-q", "1", "quantity"],
          ["a1-d", "Synthetic anchor", "description"],
          ["a1-u", "15,99", "unit_price"],
          ["a1-t", "15,99", "line_total"],
        ],
      ),
      stage1V3ProjectionRowFixture(
        "continuation-1",
        2,
        "1 continuation detail",
        "indented",
        "product",
        [
          ["c1-q", "1", "quantity"],
          ["c1-d", "continuation detail", "description"],
        ],
      ),
    ]);
  }

  function stage1V3SummaryProjectionFixture(totalTypeEvidence) {
    const rows = [
      stage1V3ProjectionRowFixture(
        "total-row-v3",
        1,
        "Totaal 81,54",
        "left_aligned",
        "summary",
        [
          ["total-label-v3", "Totaal", "summary_label"],
          ["total-value-v3", "81,54", "summary_value"],
        ],
      ),
      stage1V3ProjectionRowFixture(
        "count-row-v3",
        2,
        "Aantal producten: 6",
        "left_aligned",
        "summary",
        [
          ["count-label-v3", "Aantal producten:", "summary_label"],
          ["count-value-v3", "6", "summary_value"],
        ],
      ),
    ];
    return stage1V3ProjectionEvidenceFixture(rows, {
      printedProductCount: {
        sourceRowId: "count-row-v3",
        labelCellRefs: ["count-label-v3"],
        valueCellRefs: ["count-value-v3"],
      },
      printedTotal: {
        sourceRowId: "total-row-v3",
        labelCellRefs: ["total-label-v3"],
        valueCellRefs: ["total-value-v3"],
        totalTypeEvidence: totalTypeEvidence,
      },
    });
  }

  function sanitizedSixProductStage1V3ProjectionFixture() {
    const rows = [
      stage1V3ProjectionRowFixture(
        "title-row",
        1,
        "**COLLECTION RECEIPT**",
        "left_aligned",
        "header",
        [["title-cell", "**COLLECTION RECEIPT**", "other"]],
      ),
      stage1V3ProjectionRowFixture(
        "columns-row",
        2,
        "€/unit €",
        "left_aligned",
        "header",
        [
          ["header-empty-q", "", "unknown"],
          ["header-empty-d", "", "unknown"],
          ["header-unit", "€/unit", "other"],
          ["header-total", "€", "other"],
        ],
      ),
    ];
    const products = [
      ["Part A", "detail A", "15,99"],
      ["Part B", "detail B", "9,79"],
      ["Part C", "detail C", "5,49"],
      ["Part D", "detail D", "9,99"],
      ["Part E", "detail E", "15,29"],
      ["Part F", "detail F", "24,99"],
    ];
    products.forEach(function (product, index) {
      const anchorOrder = 3 + index * 2;
      const suffix = String(index + 1);
      rows.push(stage1V3ProjectionRowFixture(
        "anchor-" + suffix,
        anchorOrder,
        "1 " + product[0] + " " + product[2] + " " + product[2],
        "left_aligned",
        "product",
        [
          ["q-" + suffix, "1", "quantity"],
          ["d-" + suffix, product[0], "description"],
          ["u-" + suffix, product[2], "unit_price"],
          ["t-" + suffix, product[2], "line_total"],
        ],
      ));
      const continuationCells = [];
      if (index === 0) {
        continuationCells.push(["cq-" + suffix, "1", "quantity"]);
      }
      continuationCells.push([
        "cd-" + suffix,
        product[1],
        "description",
      ]);
      rows.push(stage1V3ProjectionRowFixture(
        "continuation-" + suffix,
        anchorOrder + 1,
        (index === 0 ? "1 " : "") + product[1],
        "indented",
        "product",
        continuationCells,
      ));
    });
    rows.push(stage1V3ProjectionRowFixture(
      "total-row-six",
      15,
      "Totaal 81,54",
      "left_aligned",
      "summary",
      [
        ["total-label-six", "Totaal", "summary_label"],
        ["total-value-six", "81,54", "summary_value"],
      ],
    ));
    rows.push(stage1V3ProjectionRowFixture(
      "count-row-six",
      16,
      "Aantal producten: 6",
      "left_aligned",
      "summary",
      [
        ["count-label-six", "Aantal producten:", "summary_label"],
        ["count-value-six", "6", "summary_value"],
      ],
    ));
    return stage1V3ProjectionEvidenceFixture(rows, {
      printedProductCount: {
        sourceRowId: "count-row-six",
        labelCellRefs: ["count-label-six"],
        valueCellRefs: ["count-value-six"],
      },
      printedTotal: {
        sourceRowId: "total-row-six",
        labelCellRefs: ["total-label-six"],
        valueCellRefs: ["total-value-six"],
        totalTypeEvidence: null,
      },
    });
  }

  function controlledHuboOneItemStage1V2Fixture() {
    // Sanitized exact response from the controlled live Hubo-1 diagnostic.
    return {
      observedLines: [
        {
          order: 1,
          rawText: "**AFHAALBEWIJS**",
          leadingQuantityText: null,
          descriptionText: "**AFHAALBEWIJS**",
          unitPriceText: null,
          lineTotalText: null,
          indentation: "left_aligned",
          roleEvidence: "header",
        },
        {
          order: 2,
          rawText: "1 Veilig 2300 ak €/stuk 69,99 € 69,99",
          leadingQuantityText: "1",
          descriptionText: "Veilig 2300 ak",
          unitPriceText: "€/stuk 69,99",
          lineTotalText: "€ 69,99",
          indentation: "left_aligned",
          roleEvidence: "product",
        },
        {
          order: 3,
          rawText: "gr/kr 72 f1 skg3 (b)",
          leadingQuantityText: null,
          descriptionText: "gr/kr 72 f1 skg3 (b)",
          unitPriceText: null,
          lineTotalText: null,
          indentation: "indented",
          roleEvidence: "product",
        },
        {
          order: 4,
          rawText: "Totaal 69,99",
          leadingQuantityText: null,
          descriptionText: "Totaal",
          unitPriceText: null,
          lineTotalText: "69,99",
          indentation: "left_aligned",
          roleEvidence: "summary",
        },
        {
          order: 5,
          rawText: "Aantal producten: 1",
          leadingQuantityText: null,
          descriptionText: "Aantal producten:",
          unitPriceText: null,
          lineTotalText: "1",
          indentation: "left_aligned",
          roleEvidence: "summary",
        },
      ],
      summaryEvidence: {
        printedProductCount: {
          sourceLineOrder: 5,
          rawText: "Aantal producten: 1",
          labelText: "Aantal producten:",
          valueText: "1",
        },
        printedTotal: {
          sourceLineOrder: 4,
          rawText: "Totaal 69,99",
          labelText: "Totaal",
          valueText: "69,99",
          totalTypeEvidence: null,
        },
      },
    };
  }

  function syntheticFinancialObservation(
    evidenceId,
    sourceLineOrder,
    labelText,
    valueText,
    reportedMeaningEvidence,
    reportedVatBasisEvidence,
    reportedScopeEvidence,
  ) {
    return {
      evidenceId: evidenceId,
      sourceLineOrders: [sourceLineOrder],
      rawText: labelText + " " + valueText,
      labelText: labelText,
      valueText: valueText,
      reportedMeaningEvidence:
        reportedMeaningEvidence === undefined
          ? null
          : reportedMeaningEvidence,
      reportedVatBasisEvidence:
        reportedVatBasisEvidence === undefined
          ? null
          : reportedVatBasisEvidence,
      reportedScopeEvidence:
        reportedScopeEvidence === undefined
          ? "document"
          : reportedScopeEvidence,
    };
  }

  function syntheticFinancialCandidateReceipt() {
    return {
      items: [
        {
          name: "Synthetic item",
          quantity: 1,
          unitPrice: 10,
          lineTotal: 10,
        },
      ],
      additionalCosts: [],
      vat: null,
      totals: null,
    };
  }

  function syntheticStagedInclExtraction(totalValueText) {
    return observedPrototypeExtraction(
      [
        observedPrototypeRow(
          1,
          "Synthetic item",
          "1",
          "10,00",
          "10,00",
          "left_aligned",
        ),
        observedPrototypeEvidenceLine(
          2,
          "Total incl VAT " + totalValueText,
          "summary",
        ),
      ],
      {
        printedTotal: {
          sourceLineOrder: 2,
          rawText: "Total incl VAT " + totalValueText,
          labelText: "Total incl VAT",
          valueText: totalValueText,
          totalTypeEvidence: "inclVAT",
        },
      },
    );
  }

  function financialConflictCodes(financialEvidence) {
    return financialEvidence.conflicts.map(function (conflict) {
      return conflict.code;
    });
  }

  QUnit.test(
    "staged prototype — groups six priced anchors with continuations",
    function (assert) {
      const extraction = observedPrototypeExtraction(
        [
          observedPrototypeRow(1, "Item alpha", "1", "15,99", "15,99", "left_aligned"),
          observedPrototypeRow(2, "alpha detail", null, null, null, "indented"),
          observedPrototypeRow(3, "Item beta", "1", "9,79", "9,79", "left_aligned"),
          observedPrototypeRow(4, "beta detail", null, null, null, "indented"),
          observedPrototypeRow(5, "Item gamma", "1", "5,49", "5,49", "left_aligned"),
          observedPrototypeRow(6, "Item delta", "1", "9,99", "9,99", "left_aligned"),
          observedPrototypeRow(7, "delta detail", null, null, null, "indented"),
          observedPrototypeRow(8, "Item epsilon", "1", "15,29", "15,29", "left_aligned"),
          observedPrototypeRow(9, "epsilon detail", null, null, null, "indented"),
          observedPrototypeRow(10, "Item zeta", "1", "24,99", "24,99", "left_aligned"),
          observedPrototypeRow(11, "zeta detail", null, null, null, "indented"),
          observedPrototypeEvidenceLine(12, "Product count: 6", "summary"),
          observedPrototypeEvidenceLine(13, "Total 81,54", "summary"),
        ],
        {
          printedProductCount: {
            sourceLineOrder: 12,
            rawText: "Product count: 6",
            labelText: "Product count:",
            valueText: "6",
          },
          printedTotal: {
            sourceLineOrder: 13,
            rawText: "Total 81,54",
            labelText: "Total",
            valueText: "81,54",
            totalTypeEvidence: "inclVAT",
          },
        },
      );

      const result = buildStagedReceiptPrototype(extraction);
      const normalized = normalizeAndAggregateReceiptData(
        result.canonicalReceipt,
      );

      assert.ok(result.resolved);
      assert.equal(result.groups.length, 6);
      assert.ok(compactJsonEquality(
        result.canonicalReceipt.items.map(function (item) {
          return item.name;
        }),
        [
          "Item alpha alpha detail",
          "Item beta beta detail",
          "Item gamma",
          "Item delta delta detail",
          "Item epsilon epsilon detail",
          "Item zeta zeta detail",
        ],
      ));
      assert.equal(result.canonicalReceipt.totals.inclVAT, 81.54);
      assert.ok(normalized.reconciled);
      assert.equal(normalized.finalSum, 81.54);
    },
  );

  QUnit.test(
    "staged prototype — tolerates false quantity only on an otherwise valid continuation",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([
          observedPrototypeRow(1, "Anchor", "1", "4,25", "4,25", "left_aligned"),
          observedPrototypeRow(2, "continuation", "1", null, null, "indented"),
        ]),
      );

      assert.ok(result.resolved);
      assert.equal(result.groups.length, 1);
      assert.equal(result.anomalies.length, 1);
      assert.equal(
        result.anomalies[0].code,
        "UNEXPECTED_QUANTITY_ON_CONTINUATION",
      );
      assert.equal(result.anomalies[0].rowOrder, 2);
      assert.equal(result.canonicalReceipt.items[0].name, "Anchor continuation");
    },
  );

  QUnit.test(
    "staged prototype — resolves an ordinary single-line item",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([
          observedPrototypeRow(1, "Single item", "1", "3.40", "3.40", "left_aligned"),
        ]),
      );

      assert.ok(result.resolved);
      assert.equal(result.groups.length, 1);
      assert.equal(result.canonicalReceipt.items[0].name, "Single item");
      assert.equal(result.canonicalReceipt.items[0].lineTotal, 3.4);
    },
  );

  QUnit.test(
    "staged prototype — appends multiple adjacent continuations in source order",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([
          observedPrototypeRow(1, "Anchor", "1", "8,00", "8,00", "left_aligned"),
          observedPrototypeRow(2, "first detail", null, null, null, "indented"),
          observedPrototypeRow(3, "second detail", null, null, null, "indented"),
        ]),
      );

      assert.ok(result.resolved);
      assert.equal(result.groups[0].continuationRows.length, 2);
      assert.ok(
        compactJsonEquality(result.groups[0].sourceRowOrders, [1, 2, 3]),
      );
      assert.equal(
        result.canonicalReceipt.items[0].name,
        "Anchor first detail second detail",
      );
    },
  );

  QUnit.test(
    "staged prototype — validates quantity times unit price against line total",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([
          observedPrototypeRow(1, "Two units", "2", "7,50", "15,00", "left_aligned"),
        ]),
      );

      assert.ok(result.resolved);
      assert.equal(result.canonicalReceipt.items[0].quantity, 2);
      assert.equal(result.canonicalReceipt.items[0].unitPrice, 7.5);
      assert.equal(result.canonicalReceipt.items[0].lineTotal, 15);
    },
  );

  QUnit.test(
    "staged prototype — fails closed for an unpriced left-aligned row",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([
          observedPrototypeRow(1, "Anchor", "1", "2,00", "2,00", "left_aligned"),
          observedPrototypeRow(2, "Ambiguous row", null, null, null, "left_aligned"),
        ]),
      );

      assert.notOk(result.resolved);
      assert.ok(
        prototypeConflictCodes(result).indexOf("UNPRICED_LEFT_ALIGNED_ROW") >= 0,
      );
      assert.equal(result.unconsumedRows.length, 1);
      assert.equal(result.canonicalReceipt, null);
    },
  );

  QUnit.test(
    "staged prototype — fails closed for an unpriced row before the first anchor",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([
          observedPrototypeRow(1, "Orphan detail", null, null, null, "indented"),
          observedPrototypeRow(2, "Anchor", "1", "2,00", "2,00", "left_aligned"),
        ]),
      );

      assert.notOk(result.resolved);
      assert.ok(
        prototypeConflictCodes(result).indexOf("UNPRICED_ROW_BEFORE_ANCHOR") >= 0,
      );
      assert.equal(result.unconsumedRows[0].order, 1);
      assert.equal(result.canonicalReceipt, null);
    },
  );

  QUnit.test(
    "staged prototype — fails closed for a priced indented row",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([
          observedPrototypeRow(1, "Indented priced row", "1", "2,00", "2,00", "indented"),
        ]),
      );

      assert.notOk(result.resolved);
      assert.ok(
        compactJsonEquality(prototypeConflictCodes(result), [
          "PRICED_INDENTED_ROW",
        ]),
      );
      assert.equal(result.unconsumedRows.length, 1);
      assert.equal(result.canonicalReceipt, null);
    },
  );

  QUnit.test(
    "staged prototype — fails closed for an incomplete anchor",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([
          observedPrototypeRow(1, "Incomplete", "1", "2,00", null, "left_aligned"),
        ]),
      );

      assert.notOk(result.resolved);
      assert.ok(
        compactJsonEquality(prototypeConflictCodes(result), [
          "INCOMPLETE_ANCHOR",
        ]),
      );
      assert.equal(result.unconsumedRows[0].lineTotalText, null);
      assert.equal(result.canonicalReceipt, null);
    },
  );

  QUnit.test(
    "staged prototype — fails closed for an unsupported numeric string",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([
          observedPrototypeRow(1, "Bad amount", "1", "EUR 2,00", "2,00", "left_aligned"),
        ]),
      );

      assert.notOk(result.resolved);
      assert.ok(
        compactJsonEquality(prototypeConflictCodes(result), [
          "UNPARSEABLE_UNIT_PRICE",
        ]),
      );
      assert.equal(result.groups.length, 1);
      assert.equal(result.canonicalReceipt, null);
    },
  );

  QUnit.test(
    "staged prototype — product count mismatch validates without regrouping",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction(
          [
            observedPrototypeRow(1, "First", "1", "2,00", "2,00", "left_aligned"),
            observedPrototypeRow(2, "Second", "1", "3,00", "3,00", "left_aligned"),
            observedPrototypeEvidenceLine(3, "Product count: 3", "summary"),
          ],
          {
            printedProductCount: {
              sourceLineOrder: 3,
              rawText: "Product count: 3",
              labelText: "Product count:",
              valueText: "3",
            },
          },
        ),
      );

      assert.notOk(result.resolved);
      assert.equal(result.groups.length, 2);
      assert.equal(result.validation.printedProductCount.groupedCount, 2);
      assert.equal(result.validation.printedProductCount.matches, false);
      assert.ok(
        compactJsonEquality(prototypeConflictCodes(result), [
          "PRINTED_PRODUCT_COUNT_MISMATCH",
        ]),
      );
      assert.equal(result.canonicalReceipt, null);
    },
  );

  QUnit.test(
    "staged prototype — consumes each row once and never moves or duplicates prices",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([
          observedPrototypeRow(1, "First", "1", "2,25", "2,25", "left_aligned"),
          observedPrototypeRow(2, "first detail", null, null, null, "indented"),
          observedPrototypeRow(3, "Second", "1", "4,75", "4,75", "left_aligned"),
        ]),
      );
      const consumedOrders = result.groups.reduce(function (orders, group) {
        return orders.concat(group.sourceRowOrders);
      }, []);

      assert.ok(result.resolved);
      assert.ok(compactJsonEquality(consumedOrders, [1, 2, 3]));
      assert.equal(
        consumedOrders.filter(function (order, index) {
          return consumedOrders.indexOf(order) !== index;
        }).length,
        0,
      );
      assert.ok(compactJsonEquality(
        result.groups.map(function (group) {
          return group.anchorRow.lineTotalText;
        }),
        ["2,25", "4,75"],
      ));
      assert.equal(result.groups[0].continuationRows[0].lineTotalText, null);
      assert.ok(compactJsonEquality(
        result.canonicalReceipt.items.map(function (item) {
          return item.lineTotal;
        }),
        [2.25, 4.75],
      ));
    },
  );

  QUnit.test(
    "staged prototype — preserves raw strings while parsing trimmed lexical values",
    function (assert) {
      const sourceRow = observedPrototypeRow(
        1,
        "  Synthetic item  ",
        " 2 ",
        " 7,50 ",
        " 15,00 ",
        "left_aligned",
      );
      const sourceSnapshot = JSON.stringify(sourceRow);
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([sourceRow]),
      );

      assert.ok(result.resolved);
      assert.equal(result.groups[0].anchorRow.descriptionText, "  Synthetic item  ");
      assert.equal(result.groups[0].anchorRow.rawText, "  Synthetic item  ");
      assert.equal(result.groups[0].anchorRow.leadingQuantityText, " 2 ");
      assert.equal(result.groups[0].anchorRow.unitPriceText, " 7,50 ");
      assert.equal(result.groups[0].anchorRow.lineTotalText, " 15,00 ");
      assert.ok(JSON.stringify(sourceRow) === sourceSnapshot);
      assert.ok(compactJsonEquality(result.canonicalReceipt.items[0], {
        name: "Synthetic item",
        quantity: 2,
        unitPrice: 7.5,
        lineTotal: 15,
      }));
    },
  );

  QUnit.test(
    "staged prototype — historical Stage-1 response is not silently accepted",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        historicalControlledProbeRecordedEvidenceFixture(),
      );

      assert.notOk(result.resolved);
      assert.ok(
        prototypeConflictCodes(result).indexOf("MISSING_OBSERVATION_ROLE") >= 0,
      );
      assert.ok(
        prototypeConflictCodes(result).indexOf(
          "LEGACY_SUMMARY_EVIDENCE_UNPARTITIONED",
        ) >= 0,
      );
      assert.equal(result.canonicalReceipt, null);
      assert.equal(result.evidencePartition.accountedObservationCount, 13);
    },
  );

  QUnit.test(
    "staged prototype — exact live Stage-1-v2 evidence partitions and groups without repair",
    function (assert) {
      const input = controlledProbeStage1V2AnnotationFixture();
      const result = buildStagedReceiptPrototype(input);
      const productOrders = result.evidencePartition.productObservations.map(
        function (line) {
          return line.order;
        },
      );
      const accountedOrders = result.evidencePartition.headerObservations
        .concat(result.evidencePartition.productObservations)
        .concat(result.evidencePartition.summaryObservations)
        .concat(result.evidencePartition.unclassifiedObservations)
        .map(function (line) {
          return line.order;
        });

      assert.notOk(result.resolved);
      assert.ok(compactJsonEquality(
        result.evidencePartition.headerObservations.map(function (line) {
          return line.rawText;
        }),
        ["**AFHAALBEWIJS**", "€ /stuk €"],
      ));
      assert.equal(result.evidencePartition.headerObservations.length, 2);
      assert.equal(result.evidencePartition.productObservations.length, 12);
      assert.equal(result.evidencePartition.summaryObservations.length, 2);
      assert.ok(compactJsonEquality(
        result.evidencePartition.summaryObservations.map(function (line) {
          return line.order;
        }),
        [15, 16],
      ));
      assert.ok(compactJsonEquality(
        productOrders,
        [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      ));
      assert.equal(result.groups.length, 6);
      assert.equal(result.anomalies.length, 1);
      assert.equal(result.anomalies[0].rowOrder, 4);
      assert.ok(compactJsonEquality(
        result.groups.map(function (group) {
          return group.anchorRow.lineTotalText;
        }),
        ["15,99", "9,79", "5,49", "9,99", "15,29", "24,99"],
      ));
      assert.ok(compactJsonEquality(
        result.groups.reduce(function (orders, group) {
          return orders.concat(group.sourceRowOrders);
        }, []),
        productOrders,
      ));
      assert.equal(
        result.evidencePartition.summaryEvidence.printedProductCount.rawText,
        "Aantal producten: 6",
      );
      assert.equal(
        result.evidencePartition.summaryEvidence.printedTotal.rawText,
        "Totaal 81,54",
      );
      assert.equal(
        result.evidencePartition.summaryEvidence.printedTotal.valueText,
        "81,54",
      );
      assert.equal(
        result.evidencePartition.summaryEvidence.printedTotal
          .totalTypeEvidence,
        null,
      );
      assert.ok(
        prototypeConflictCodes(result).indexOf(
          "AMBIGUOUS_PRINTED_TOTAL_TYPE",
        ) >= 0,
      );
      assert.equal(result.canonicalReceipt, null);
      assert.equal(result.unconsumedRows.length, 0);
      assert.equal(result.evidencePartition.accountedObservationCount, 16);
      assert.ok(compactJsonEquality(
        accountedOrders,
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      ));
      assert.equal(
        accountedOrders.filter(function (order, index) {
          return accountedOrders.indexOf(order) !== index;
        }).length,
        0,
      );
    },
  );

  QUnit.test(
    "staged candidate experiment — exact live evidence builds six auditable candidates",
    function (assert) {
      const input = controlledProbeStage1V2AnnotationFixture();
      const inputSnapshot = JSON.stringify(input);
      const result = buildStagedReceiptCandidateExperiment(input);
      const candidateItems = result.candidateReceipt.items;
      const sources = result.evidenceTrace.candidateItemSources;

      assert.equal(input.observedLines.length, 16);
      assert.ok(result.structuralStatus.resolved);
      assert.equal(result.structuralStatus.accountedObservationCount, 16);
      assert.equal(result.structuralStatus.conflicts.length, 0);
      assert.equal(result.structuralStatus.unconsumedRowOrders.length, 0);
      assert.ok(
        result.structuralStatus.validation.printedProductCount.matches,
      );
      assert.equal(result.evidenceTrace.headerObservations.length, 2);
      assert.equal(result.evidenceTrace.summaryObservations.length, 2);
      assert.equal(candidateItems.length, 6);
      assert.ok(compactJsonEquality(
        sources.map(function (source) {
          return source.sourceRowOrders;
        }),
        [[3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14]],
      ));
      assert.ok(compactJsonEquality(
        sources.map(function (source) {
          return source.anchorRowOrder;
        }),
        [3, 5, 7, 9, 11, 13],
      ));
      assert.ok(compactJsonEquality(
        sources.map(function (source) {
          return source.continuationRowOrders;
        }),
        [[4], [6], [8], [10], [12], [14]],
      ));
      assert.ok(compactJsonEquality(
        candidateItems.map(function (item) {
          return item.name;
        }),
        [
          "S2 b. deur loopslot rvs",
          "Veilig dkp duim f1 deurd. 38-45mm",
          "Veilig bbw 180/41h blf 19",
          "Saniv isolatiemmat voor wandcloset",
          "Bison siliconenkit sanitr super wt 0, 311",
          "Saniv aansluitset tbv inbouwreservoir",
        ],
      ));
      assert.ok(compactJsonEquality(
        candidateItems.map(function (item) {
          return item.quantity;
        }),
        [1, 1, 1, 1, 1, 1],
      ));
      assert.ok(compactJsonEquality(
        candidateItems.map(function (item) {
          return item.unitPrice;
        }),
        [15.99, 9.79, 5.49, 9.99, 15.29, 24.99],
      ));
      assert.ok(compactJsonEquality(
        candidateItems.map(function (item) {
          return item.lineTotal;
        }),
        [15.99, 9.79, 5.49, 9.99, 15.29, 24.99],
      ));
      assert.ok(compactJsonEquality(
        sources.map(function (source) {
          const anchor = input.observedLines[source.anchorRowOrder - 1];
          return anchor.lineTotalText;
        }),
        ["15,99", "9,79", "5,49", "9,99", "15,29", "24,99"],
      ));
      assert.ok(
        sources.every(function (source) {
          return source.continuationRowOrders.every(function (rowOrder) {
            const row = input.observedLines[rowOrder - 1];
            return row.unitPriceText === null && row.lineTotalText === null;
          });
        }),
      );
      assert.equal(result.evidenceTrace.anomalies.length, 1);
      assert.equal(
        result.evidenceTrace.anomalies[0].code,
        "UNEXPECTED_QUANTITY_ON_CONTINUATION",
      );
      assert.equal(result.evidenceTrace.anomalies[0].rowOrder, 4);
      assert.equal(result.evidenceTrace.anomalies[0].rawValue, "1");
      assert.equal(
        result.evidenceTrace.originalObservations[3].leadingQuantityText,
        "1",
      );
      assert.equal(
        result.evidenceTrace.summaryEvidence.printedTotal.rawText,
        "Totaal 81,54",
      );
      assert.equal(
        result.evidenceTrace.summaryEvidence.printedTotal.totalTypeEvidence,
        null,
      );
      assert.notOk(result.financialStatus.resolved);
      assert.equal(
        result.financialStatus.code,
        "AMBIGUOUS_PRINTED_TOTAL_TYPE",
      );
      assert.equal(result.candidateReceipt.totals, null);
      assert.equal(result.canonicalReceipt, null);
      assert.ok(compactJsonEquality(
        {
          observationCount:
            result.financialEvidence.monetaryObservations.length,
          parsedAmountCents:
            result.financialEvidence.monetaryObservations[0]
              .parsedAmountCents,
          candidateItemSumCents:
            result.financialEvidence.candidateItemSumCents,
          comparison: result.financialEvidence.comparisons[0].relation,
          canonicalTarget:
            result.financialEvidence.interpretations[0].canonicalTarget,
          documentTotalInclVat: result.documentTotalInclVat,
        },
        {
          observationCount: 1,
          parsedAmountCents: 8154,
          candidateItemSumCents: 8154,
          comparison: "equal",
          canonicalTarget: null,
          documentTotalInclVat: null,
        },
      ));
      assert.ok(compactJsonEquality(
        {
          sourceLineOrders:
            result.financialEvidence.monetaryObservations[0].sourceLineOrders,
          rawText: result.financialEvidence.monetaryObservations[0].rawText,
          labelText:
            result.financialEvidence.monetaryObservations[0].labelText,
          valueText:
            result.financialEvidence.monetaryObservations[0].valueText,
          reportedMeaningEvidence:
            result.financialEvidence.monetaryObservations[0]
              .reportedMeaningEvidence,
          reportedVatBasisEvidence:
            result.financialEvidence.monetaryObservations[0]
              .reportedVatBasisEvidence,
        },
        {
          sourceLineOrders: [15],
          rawText: "Totaal 81,54",
          labelText: "Totaal",
          valueText: "81,54",
          reportedMeaningEvidence: "document_total",
          reportedVatBasisEvidence: null,
        },
      ));
      // Keep exact comparisons compact in QUnitGS2's cumulative result cache.
      assert.ok(JSON.stringify(input) === inputSnapshot);
      assert.ok(
        JSON.stringify(result.evidenceTrace.originalObservations) ===
          JSON.stringify(input.observedLines),
      );
    },
  );

  QUnit.test(
    "staged candidate experiment — shifted Stage-1 prices with matching aggregate fail closed without repair",
    function (assert) {
      const input = shiftedStage1V2PriceAssociationFixture();
      const inputSnapshot = JSON.stringify(input);
      const pricedRows = input.observedLines.filter(function (row) {
        return row.unitPriceText !== null || row.lineTotalText !== null;
      }).filter(function (row) {
        return row.roleEvidence === "product";
      });
      const shiftedLineTotalCents = pricedRows.reduce(function (total, row) {
        return total + Math.round(
          parsePrototypeAmount_(row.lineTotalText).value * 100,
        );
      }, 0);
      const result = buildStagedReceiptCandidateExperiment(input);
      const calls = [];
      let caught = null;

      try {
        executeImageReceiptAnalysisRoute_(
          true,
          function () {
            calls.push("staged");
            return buildStagedCanonicalReceiptOrThrow_(input);
          },
          function () {
            calls.push("legacy");
            return "legacy-result";
          },
        );
      } catch (error) {
        caught = error;
      }

      assert.ok(compactJsonEquality(
        pricedRows.map(function (row) {
          return row.order;
        }),
        [2, 3, 4, 6, 7, 9],
      ));
      assert.ok(compactJsonEquality(
        pricedRows.map(function (row) {
          return row.rawText;
        }),
        [
          "1 S2 b. deur €/stuk 15,99 15,99",
          "1 loopslot rvs 9,79 9,79",
          "1 Veilig dkp duim f1 5,49 5,49",
          "1 Veilig bbw 180/41h 9,99 9,99",
          "1 Saniv isolatiemat 15,29 15,29",
          "1 Bison siliconenkit 24,99 24,99",
        ],
      ));
      assert.ok(compactJsonEquality(
        pricedRows.map(function (row) {
          return row.unitPriceText;
        }),
        ["15,99", "9,79", "5,49", "9,99", "15,29", "24,99"],
      ));
      assert.ok(compactJsonEquality(
        pricedRows.map(function (row) {
          return row.lineTotalText;
        }),
        ["15,99", "9,79", "5,49", "9,99", "15,29", "24,99"],
      ));
      assert.equal(shiftedLineTotalCents, 8154);
      assert.equal(input.summaryEvidence.printedProductCount.valueText, "6");
      assert.ok(compactJsonEquality(input.summaryEvidence.printedTotal, {
        sourceLineOrder: 13,
        rawText: "Totaal 81,54",
        labelText: "Totaal",
        valueText: "81,54",
        totalTypeEvidence: null,
      }));
      assert.ok(compactJsonEquality(
        result.evidenceTrace.candidateItemSources.map(function (source) {
          return source.sourceRowOrders;
        }),
        [[2], [3], [4, 5], [6], [7, 8], [9, 10]],
      ));
      assert.ok(compactJsonEquality(
        result.evidenceTrace.candidateItemSources.map(function (source) {
          return input.observedLines.filter(function (row) {
            return row.order === source.anchorRowOrder;
          })[0].lineTotalText;
        }),
        ["15,99", "9,79", "5,49", "9,99", "15,29", "24,99"],
      ));
      assert.ok(compactJsonEquality(
        result.structuralStatus.validation.printedProductCount,
        { rawValue: "6", parsedValue: 6, groupedCount: 6, matches: true },
      ));
      assert.ok(compactJsonEquality(
        {
          parsedAmountCents:
            result.financialEvidence.monetaryObservations[0].parsedAmountCents,
          candidateItemSumCents: result.financialEvidence.candidateItemSumCents,
          comparison: result.financialEvidence.comparisons[0].relation,
        },
        {
          parsedAmountCents: 8154,
          candidateItemSumCents: 8154,
          comparison: "equal",
        },
      ));
      assert.notOk(result.structuralStatus.resolved);
      assert.ok(result.structuralStatus.conflicts.some(function (conflict) {
        return conflict.code === "UNPRICED_LEFT_ALIGNED_ROW" &&
          conflict.rowOrder === 11;
      }));
      assert.ok(compactJsonEquality(
        result.structuralStatus.unconsumedRowOrders,
        [11, 12],
      ));
      assert.equal(result.candidateReceipt, null);
      assert.equal(result.canonicalReceipt, null);
      assert.ok(
        JSON.stringify(result.evidenceTrace.originalObservations) ===
          JSON.stringify(input.observedLines),
      );
      assert.ok(JSON.stringify(input) === inputSnapshot);
      assert.ok(compactJsonEquality(
        {
          name: caught && caught.name,
          stage: caught && caught.stage,
          code: caught && caught.code,
        },
        {
          name: "StagedImageExtractionError",
          stage: "structure",
          code: "UNPRICED_LEFT_ALIGNED_ROW",
        },
      ));
      assert.ok(compactJsonEquality(calls, ["staged"]));
    },
  );

  QUnit.test(
    "staged prototype — accepts only bounded Hubo monetary wrappers",
    function (assert) {
      const rawValue = "  €/stuk 69,99  ";

      assert.equal(parsePrototypeAmount_("69,99").value, 69.99);
      assert.equal(parsePrototypeAmount_("69.99").value, 69.99);
      assert.equal(parsePrototypeAmount_("€69,99").value, 69.99);
      assert.equal(parsePrototypeAmount_("€ 69,99").value, 69.99);
      assert.equal(parsePrototypeAmount_(rawValue).value, 69.99);
      assert.equal(rawValue, "  €/stuk 69,99  ");
      assert.equal(parsePrototypeAmount_("EUR 2,00"), null);
      assert.equal(parsePrototypeAmount_("€ 1,00 2,00"), null);
      assert.equal(parsePrototypeAmount_("-1,00"), null);
      assert.equal(parsePrototypeAmount_("€ 1,00 each"), null);
      assert.equal(parsePrototypeAmount_("€/stuk"), null);
    },
  );

  QUnit.test(
    "staged candidate experiment — exact Hubo one-item evidence releases one auditable item",
    function (assert) {
      const input = controlledHuboOneItemStage1V2Fixture();
      const inputSnapshot = JSON.stringify(input);
      const prototype = buildStagedReceiptPrototype(input);
      const candidate = buildStagedReceiptCandidateExperiment(input);
      const replay = buildHuboForwardAnchorCanonicalReplayExperiment_(candidate);
      const item = candidate.candidateReceipt.items[0];

      assert.ok(compactJsonEquality(prototype.groups[0].sourceRowOrders, [2, 3]));
      assert.ok(candidate.structuralStatus.resolved);
      assert.equal(candidate.structuralStatus.accountedObservationCount, 5);
      assert.equal(candidate.candidateReceipt.items.length, 1);
      assert.ok(compactJsonEquality(item, {
        name: "Veilig 2300 ak gr/kr 72 f1 skg3 (b)",
        quantity: 1,
        unitPrice: 69.99,
        lineTotal: 69.99,
      }));
      assert.equal(candidate.evidenceTrace.originalObservations[1].unitPriceText, "€/stuk 69,99");
      assert.equal(candidate.evidenceTrace.originalObservations[1].lineTotalText, "€ 69,99");
      assert.ok(candidate.structuralStatus.validation.printedProductCount.matches);
      assert.notOk(candidate.financialStatus.resolved);
      assert.equal(candidate.financialStatus.code, "AMBIGUOUS_PRINTED_TOTAL_TYPE");
      assert.ok(compactJsonEquality(candidate.evidenceTrace.originalObservations, input.observedLines));
      assert.ok(replay.releaseStatus.eligible);
      assert.ok(compactJsonEquality(replay.canonicalReceipt, {
        items: [item],
        additionalCosts: [],
        vat: null,
        totals: null,
      }));
      assert.equal(replay.validation.printedProductCount, 1);
      assert.equal(replay.validation.printedTotalCents, 6999);
      assert.equal(replay.validation.candidateLineTotalSumCents, 6999);
      assert.equal(replay.validation.productObservationCount, 2);
      assert.equal(replay.validation.consumedProductObservationCount, 2);
      assert.equal(replay.canonicalReceipt.totals, null);
      assert.equal(replay.canonicalReceipt.vat, null);
      assert.ok(compactJsonEquality(replay.evidenceTrace, candidate.evidenceTrace));
      assert.ok(JSON.stringify(input) === inputSnapshot);
    },
  );

  QUnit.test(
    "staged candidate experiment — exact Hubo six-item replay preserves physical price associations",
    function (assert) {
      const candidate = buildStagedReceiptCandidateExperiment(
        controlledProbeStage1V2AnnotationFixture(),
      );
      const replay = buildHuboForwardAnchorCanonicalReplayExperiment_(candidate);
      const items = replay.canonicalReceipt.items;

      assert.ok(replay.releaseStatus.eligible);
      assert.equal(items.length, 6);
      assert.ok(compactJsonEquality(items.map(function (item) {
        return item.lineTotal;
      }), [15.99, 9.79, 5.49, 9.99, 15.29, 24.99]));
      assert.ok(compactJsonEquality(
        replay.evidenceTrace.candidateItemSources.map(function (source) {
          return source.sourceRowOrders;
        }),
        [[3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14]],
      ));
      assert.ok(items.every(function (item) {
        return item.quantity === 1;
      }));
      assert.equal(
        replay.evidenceTrace.originalObservations[3].leadingQuantityText,
        "1",
      );
      assert.equal(replay.validation.candidateLineTotalSumCents, 8154);
      assert.equal(replay.validation.printedProductCount, 6);
      assert.equal(replay.validation.printedTotalCents, 8154);
      assert.equal(replay.canonicalReceipt.totals, null);
      assert.equal(replay.canonicalReceipt.vat, null);
    },
  );

  QUnit.test(
    "staged candidate experiment — Hubo replay rejects count and total mismatches without repair",
    function (assert) {
      const countInput = controlledHuboOneItemStage1V2Fixture();
      countInput.observedLines[4].rawText = "Aantal producten: 2";
      countInput.observedLines[4].lineTotalText = "2";
      countInput.summaryEvidence.printedProductCount.rawText =
        "Aantal producten: 2";
      countInput.summaryEvidence.printedProductCount.valueText = "2";
      const countPrototype = buildStagedReceiptPrototype(countInput);
      const countCandidate = buildStagedReceiptCandidateExperiment(countInput);
      const countReplay =
        buildHuboForwardAnchorCanonicalReplayExperiment_(countCandidate);

      assert.equal(countPrototype.groups.length, 1);
      assert.notOk(countPrototype.validation.printedProductCount.matches);
      assert.equal(countPrototype.canonicalReceipt, null);
      assert.notOk(countReplay.releaseStatus.eligible);
      assert.ok(countReplay.conflicts.some(function (conflict) {
        return conflict.code === "HUBO_PRODUCT_COUNT_VALIDATION_FAILED";
      }));

      const totalInput = controlledHuboOneItemStage1V2Fixture();
      totalInput.observedLines[3].rawText = "Totaal 70,00";
      totalInput.observedLines[3].lineTotalText = "70,00";
      totalInput.summaryEvidence.printedTotal.rawText = "Totaal 70,00";
      totalInput.summaryEvidence.printedTotal.valueText = "70,00";
      const totalCandidate = buildStagedReceiptCandidateExperiment(totalInput);
      const totalReplay =
        buildHuboForwardAnchorCanonicalReplayExperiment_(totalCandidate);

      assert.ok(totalCandidate.structuralStatus.resolved);
      assert.equal(totalCandidate.candidateReceipt.items[0].lineTotal, 69.99);
      assert.notOk(totalReplay.releaseStatus.eligible);
      assert.equal(totalReplay.canonicalReceipt, null);
      assert.ok(totalReplay.conflicts.some(function (conflict) {
        return conflict.code === "HUBO_PLAIN_TOTAL_VALIDATION_FAILED";
      }));
    },
  );

  QUnit.test(
    "staged candidate experiment — Hubo replay rejects cross-group price movement",
    function (assert) {
      const candidate = buildStagedReceiptCandidateExperiment(
        controlledProbeStage1V2AnnotationFixture(),
      );
      candidate.candidateReceipt.items[0].unitPrice = 9.79;
      const replay = buildHuboForwardAnchorCanonicalReplayExperiment_(candidate);

      assert.notOk(replay.releaseStatus.eligible);
      assert.equal(replay.canonicalReceipt, null);
      assert.ok(replay.conflicts.some(function (conflict) {
        return conflict.code === "HUBO_CANDIDATE_SOURCE_MISMATCH";
      }));
      assert.equal(
        candidate.evidenceTrace.originalObservations[2].unitPriceText,
        "15,99",
      );
    },
  );

  QUnit.test(
    "financial evidence — ambiguous total mismatch does not assign VAT basis",
    function (assert) {
      const evidence = interpretFinancialEvidencePrototype_(
        [
          syntheticFinancialObservation(
            "synthetic-total",
            2,
            "Totaal",
            "9,99",
            "document_total",
            null,
          ),
        ],
        1000,
      );
      const gate = buildCanonicalReceiptFromFinancialEvidencePrototype_(
        syntheticFinancialCandidateReceipt(),
        evidence,
        true,
      );

      assert.ok(compactJsonEquality(
        {
          status: evidence.status,
          comparison: evidence.comparisons[0].relation,
          conflicts: financialConflictCodes(evidence),
          resolvedVatBasis:
            evidence.interpretations[0].resolvedVatBasis,
          canonicalTarget: evidence.interpretations[0].canonicalTarget,
          canonicalReceipt: gate.canonicalReceipt,
        },
        {
          status: {
            resolved: false,
            code: "AMBIGUOUS_PRINTED_TOTAL_TYPE",
          },
          comparison: "different",
          conflicts: [
            "AMBIGUOUS_PRINTED_TOTAL_TYPE",
            "FINANCIAL_EVIDENCE_MISMATCH",
          ],
          resolvedVatBasis: null,
          canonicalTarget: null,
          canonicalReceipt: null,
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — explicit synthetic inclVAT maps only to inclVAT",
    function (assert) {
      const evidence = interpretFinancialEvidencePrototype_(
        [
          syntheticFinancialObservation(
            "synthetic-incl",
            2,
            "Total incl. VAT",
            "10,00",
            "document_total",
            "inclVAT",
          ),
        ],
        1000,
      );
      const gate = buildCanonicalReceiptFromFinancialEvidencePrototype_(
        syntheticFinancialCandidateReceipt(),
        evidence,
        true,
      );

      assert.ok(compactJsonEquality(
        {
          status: evidence.status,
          assignments: evidence.canonicalAssignments,
          totals: gate.canonicalReceipt.totals,
          documentTotalInclVat: gate.documentTotalInclVat,
        },
        {
          status: {
            resolved: true,
            code: "FINANCIAL_EVIDENCE_RESOLVED",
          },
          assignments: [
            {
              canonicalTarget: "totals.inclVAT",
              amountCents: 1000,
              scope: "document",
              supportingEvidenceIds: ["synthetic-incl"],
              ruleIds: ["EXPLICIT_TOTAL_INCL_VAT_LABEL"],
            },
          ],
          totals: { exclVAT: null, inclVAT: 10, vatAmount: null },
          documentTotalInclVat: 10,
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — explicit synthetic exclVAT maps only to exclVAT",
    function (assert) {
      const evidence = interpretFinancialEvidencePrototype_(
        [
          syntheticFinancialObservation(
            "synthetic-excl",
            2,
            "Total excl. VAT",
            "10,00",
            "document_total",
            "exclVAT",
          ),
        ],
        1000,
      );
      const gate = buildCanonicalReceiptFromFinancialEvidencePrototype_(
        syntheticFinancialCandidateReceipt(),
        evidence,
        true,
      );

      assert.ok(compactJsonEquality(
        {
          status: evidence.status,
          canonicalTarget:
            evidence.canonicalAssignments[0].canonicalTarget,
          totals: gate.canonicalReceipt.totals,
          documentTotalInclVat: gate.documentTotalInclVat,
        },
        {
          status: {
            resolved: true,
            code: "FINANCIAL_EVIDENCE_RESOLVED",
          },
          canonicalTarget: "totals.exclVAT",
          totals: { exclVAT: 10, inclVAT: null, vatAmount: null },
          documentTotalInclVat: null,
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — explicit synthetic VAT amount maps only to VAT amount fields",
    function (assert) {
      const evidence = interpretFinancialEvidencePrototype_(
        [
          syntheticFinancialObservation(
            "synthetic-incl",
            2,
            "Total incl VAT",
            "12,10",
            "document_total",
            "inclVAT",
          ),
          syntheticFinancialObservation(
            "synthetic-vat",
            3,
            "VAT amount",
            "2,10",
            "vat_amount",
            null,
          ),
        ],
        1000,
      );
      const gate = buildCanonicalReceiptFromFinancialEvidencePrototype_(
        syntheticFinancialCandidateReceipt(),
        evidence,
        true,
      );
      const vatInterpretation = evidence.interpretations[1];

      assert.ok(compactJsonEquality(
        {
          target: vatInterpretation.canonicalTarget,
          basis: vatInterpretation.resolvedVatBasis,
          totalsVatAmount: gate.canonicalReceipt.totals.vatAmount,
          vat: gate.canonicalReceipt.vat,
        },
        {
          target: "totals.vatAmount",
          basis: null,
          totalsVatAmount: 2.1,
          vat: { rate: null, amount: 2.1 },
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — synthetic VAT percentage alone does not become vatAmount",
    function (assert) {
      const evidence = interpretFinancialEvidencePrototype_(
        [
          syntheticFinancialObservation(
            "synthetic-vat-rate",
            2,
            "VAT percentage",
            "21%",
            "vat_rate",
            null,
          ),
        ],
        1000,
      );
      const gate = buildCanonicalReceiptFromFinancialEvidencePrototype_(
        syntheticFinancialCandidateReceipt(),
        evidence,
        true,
      );

      assert.ok(compactJsonEquality(
        {
          status: evidence.status,
          parsedAmountCents:
            evidence.monetaryObservations[0].parsedAmountCents,
          assignments: evidence.canonicalAssignments,
          canonicalReceipt: gate.canonicalReceipt,
        },
        {
          status: {
            resolved: false,
            code: "UNPARSEABLE_MONETARY_VALUE",
          },
          parsedAmountCents: null,
          assignments: [],
          canonicalReceipt: null,
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — synthetic exclVAT VAT and inclVAT remain distinct",
    function (assert) {
      const evidence = interpretFinancialEvidencePrototype_(
        [
          syntheticFinancialObservation(
            "synthetic-excl",
            2,
            "Total excl VAT",
            "10,00",
            "document_total",
            "exclVAT",
          ),
          syntheticFinancialObservation(
            "synthetic-vat",
            3,
            "VAT amount",
            "2,10",
            "vat_amount",
            null,
          ),
          syntheticFinancialObservation(
            "synthetic-incl",
            4,
            "Total incl VAT",
            "12,10",
            "document_total",
            "inclVAT",
          ),
        ],
        1000,
      );
      const gate = buildCanonicalReceiptFromFinancialEvidencePrototype_(
        syntheticFinancialCandidateReceipt(),
        evidence,
        true,
      );

      assert.ok(compactJsonEquality(
        {
          observationIds: evidence.monetaryObservations.map(function (item) {
            return item.evidenceId;
          }),
          targets: evidence.canonicalAssignments.map(function (item) {
            return item.canonicalTarget;
          }),
          totals: gate.canonicalReceipt.totals,
          vat: gate.canonicalReceipt.vat,
        },
        {
          observationIds: ["synthetic-excl", "synthetic-vat", "synthetic-incl"],
          targets: ["totals.exclVAT", "totals.inclVAT", "totals.vatAmount"],
          totals: { exclVAT: 10, inclVAT: 12.1, vatAmount: 2.1 },
          vat: { rate: null, amount: 2.1 },
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — multiple linked synthetic summaries pass the full experimental gate",
    function (assert) {
      const extraction = observedPrototypeExtraction(
        [
          observedPrototypeRow(
            1,
            "Synthetic item",
            "1",
            "10,00",
            "10,00",
            "left_aligned",
          ),
          observedPrototypeEvidenceLine(2, "Total excl VAT 10,00", "summary"),
          observedPrototypeEvidenceLine(3, "VAT amount 2,10", "summary"),
          observedPrototypeEvidenceLine(4, "Total incl VAT 12,10", "summary"),
        ],
        {},
      );
      extraction.financialEvidence = {
        monetaryObservations: [
          syntheticFinancialObservation(
            "synthetic-excl",
            2,
            "Total excl VAT",
            "10,00",
            "document_total",
            "exclVAT",
          ),
          syntheticFinancialObservation(
            "synthetic-vat",
            3,
            "VAT amount",
            "2,10",
            "vat_amount",
            null,
          ),
          syntheticFinancialObservation(
            "synthetic-incl",
            4,
            "Total incl VAT",
            "12,10",
            "document_total",
            "inclVAT",
          ),
        ],
      };

      const result = buildStagedReceiptCandidateExperiment(extraction);

      assert.ok(compactJsonEquality(
        {
          structuralStatus: result.structuralStatus,
          financialStatus: result.financialStatus,
          observationCount:
            result.financialEvidence.monetaryObservations.length,
          candidateItemSumCents:
            result.financialEvidence.candidateItemSumCents,
          totals: result.canonicalReceipt.totals,
          vat: result.canonicalReceipt.vat,
          documentTotalInclVat: result.documentTotalInclVat,
        },
        {
          structuralStatus: {
            resolved: true,
            accountedObservationCount: 4,
            conflicts: [],
            unconsumedRowOrders: [],
            validation: {
              printedProductCount: {
                rawValue: null,
                parsedValue: null,
                groupedCount: 1,
                matches: null,
              },
            },
          },
          financialStatus: {
            resolved: true,
            code: "FINANCIAL_EVIDENCE_RESOLVED",
          },
          observationCount: 3,
          candidateItemSumCents: 1000,
          totals: { exclVAT: 10, inclVAT: 12.1, vatAmount: 2.1 },
          vat: { rate: null, amount: 2.1 },
          documentTotalInclVat: 12.1,
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — synthetic subtotal remains unsupported evidence",
    function (assert) {
      const evidence = interpretFinancialEvidencePrototype_(
        [
          syntheticFinancialObservation(
            "synthetic-subtotal",
            2,
            "Subtotal",
            "10,00",
            "subtotal",
            null,
          ),
        ],
        1000,
      );

      assert.ok(compactJsonEquality(
        {
          status: evidence.status,
          observedRawText: evidence.monetaryObservations[0].rawText,
          meaning:
            evidence.interpretations[0].resolvedFinancialMeaning,
          target: evidence.interpretations[0].canonicalTarget,
        },
        {
          status: {
            resolved: false,
            code: "UNSUPPORTED_FINANCIAL_COMPONENT",
          },
          observedRawText: "Subtotal 10,00",
          meaning: "subtotal",
          target: null,
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — multiple ambiguous synthetic totals fail closed",
    function (assert) {
      const evidence = interpretFinancialEvidencePrototype_(
        [
          syntheticFinancialObservation(
            "synthetic-total-a",
            2,
            "Total",
            "10,00",
            "document_total",
            null,
          ),
          syntheticFinancialObservation(
            "synthetic-total-b",
            3,
            "Totaal",
            "12,00",
            "document_total",
            null,
          ),
        ],
        1000,
      );
      const gate = buildCanonicalReceiptFromFinancialEvidencePrototype_(
        syntheticFinancialCandidateReceipt(),
        evidence,
        true,
      );

      assert.ok(compactJsonEquality(
        {
          status: evidence.status,
          observationCount: evidence.monetaryObservations.length,
          hasMultipleCandidateConflict:
            financialConflictCodes(evidence).indexOf(
              "MULTIPLE_CANDIDATE_TOTALS",
            ) >= 0,
          canonicalReceipt: gate.canonicalReceipt,
        },
        {
          status: { resolved: false, code: "MULTIPLE_CANDIDATE_TOTALS" },
          observationCount: 2,
          hasMultipleCandidateConflict: true,
          canonicalReceipt: null,
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — conflicting synthetic typed totals fail closed",
    function (assert) {
      const evidence = interpretFinancialEvidencePrototype_(
        [
          syntheticFinancialObservation(
            "synthetic-incl-a",
            2,
            "Total incl VAT",
            "10,00",
            "document_total",
            "inclVAT",
          ),
          syntheticFinancialObservation(
            "synthetic-incl-b",
            3,
            "Total incl VAT",
            "11,00",
            "document_total",
            "inclVAT",
          ),
        ],
        1000,
      );
      const gate = buildCanonicalReceiptFromFinancialEvidencePrototype_(
        syntheticFinancialCandidateReceipt(),
        evidence,
        true,
      );

      assert.ok(compactJsonEquality(
        {
          status: evidence.status,
          conflictCodes: financialConflictCodes(evidence),
          canonicalReceipt: gate.canonicalReceipt,
        },
        {
          status: { resolved: false, code: "CONFLICTING_TYPED_TOTALS" },
          conflictCodes: ["CONFLICTING_TYPED_TOTALS"],
          canonicalReceipt: null,
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — same-value same-scope synthetic duplicate is explicit",
    function (assert) {
      const evidence = interpretFinancialEvidencePrototype_(
        [
          syntheticFinancialObservation(
            "synthetic-incl-a",
            2,
            "Total incl VAT",
            "10,00",
            "document_total",
            "inclVAT",
          ),
          syntheticFinancialObservation(
            "synthetic-incl-b",
            3,
            "Total incl VAT",
            "10,00",
            "document_total",
            "inclVAT",
          ),
        ],
        1000,
      );
      const gate = buildCanonicalReceiptFromFinancialEvidencePrototype_(
        syntheticFinancialCandidateReceipt(),
        evidence,
        true,
      );

      assert.ok(compactJsonEquality(
        {
          status: evidence.status,
          assignment: evidence.canonicalAssignments[0],
          canonicalInclVAT: gate.canonicalReceipt.totals.inclVAT,
          documentTotalInclVat: gate.documentTotalInclVat,
        },
        {
          status: {
            resolved: true,
            code: "FINANCIAL_EVIDENCE_RESOLVED",
          },
          assignment: {
            canonicalTarget: "totals.inclVAT",
            amountCents: 1000,
            scope: "document",
            supportingEvidenceIds: ["synthetic-incl-a", "synthetic-incl-b"],
            ruleIds: [
              "EXPLICIT_TOTAL_INCL_VAT_LABEL",
              "EXPLICIT_TOTAL_INCL_VAT_LABEL",
            ],
          },
          canonicalInclVAT: 10,
          documentTotalInclVat: 10,
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — synthetic shipping and fee are preserved but block",
    function (assert) {
      const evidence = interpretFinancialEvidencePrototype_(
        [
          syntheticFinancialObservation(
            "synthetic-shipping",
            2,
            "Shipping",
            "4,95",
            "shipping",
            null,
          ),
          syntheticFinancialObservation(
            "synthetic-fee",
            3,
            "Fee",
            "0,14",
            "fee",
            null,
          ),
        ],
        1000,
      );
      const gate = buildCanonicalReceiptFromFinancialEvidencePrototype_(
        syntheticFinancialCandidateReceipt(),
        evidence,
        true,
      );

      assert.ok(compactJsonEquality(
        {
          status: evidence.status,
          rawValues: evidence.monetaryObservations.map(function (item) {
            return item.valueText;
          }),
          meanings: evidence.interpretations.map(function (item) {
            return item.resolvedFinancialMeaning;
          }),
          unsupportedCount: evidence.unsupportedCapabilities.length,
          canonicalReceipt: gate.canonicalReceipt,
        },
        {
          status: {
            resolved: false,
            code: "UNSUPPORTED_FINANCIAL_COMPONENT",
          },
          rawValues: ["4,95", "0,14"],
          meanings: ["shipping", "fee"],
          unsupportedCount: 2,
          canonicalReceipt: null,
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — synthetic discount and deposit are not dropped",
    function (assert) {
      const evidence = interpretFinancialEvidencePrototype_(
        [
          syntheticFinancialObservation(
            "synthetic-discount",
            2,
            "Discount",
            "2,00",
            "discount",
            null,
          ),
          syntheticFinancialObservation(
            "synthetic-deposit",
            3,
            "Deposit",
            "5,00",
            "deposit",
            null,
          ),
        ],
        1000,
      );

      assert.ok(compactJsonEquality(
        {
          status: evidence.status,
          observationIds: evidence.monetaryObservations.map(function (item) {
            return item.evidenceId;
          }),
          meanings: evidence.interpretations.map(function (item) {
            return item.resolvedFinancialMeaning;
          }),
          unsupportedCount: evidence.unsupportedCapabilities.length,
        },
        {
          status: {
            resolved: false,
            code: "UNSUPPORTED_FINANCIAL_COMPONENT",
          },
          observationIds: ["synthetic-discount", "synthetic-deposit"],
          meanings: ["discount", "deposit"],
          unsupportedCount: 2,
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — raw synthetic evidence and source linkage are immutable",
    function (assert) {
      const source = syntheticFinancialObservation(
        "synthetic-raw",
        7,
        "Total incl. VAT",
        " 10,00 ",
        "document_total",
        "inclVAT",
      );
      const snapshot = JSON.stringify(source);
      const evidence = interpretFinancialEvidencePrototype_([source], 1000);

      assert.ok(compactJsonEquality(
        {
          sourceUnchanged: JSON.stringify(source) === snapshot,
          sourceLineOrders:
            evidence.monetaryObservations[0].sourceLineOrders,
          rawText: evidence.monetaryObservations[0].rawText,
          labelText: evidence.monetaryObservations[0].labelText,
          valueText: evidence.monetaryObservations[0].valueText,
          parsedAmountCents:
            evidence.monetaryObservations[0].parsedAmountCents,
        },
        {
          sourceUnchanged: true,
          sourceLineOrders: [7],
          rawText: "Total incl. VAT  10,00 ",
          labelText: "Total incl. VAT",
          valueText: " 10,00 ",
          parsedAmountCents: 1000,
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — inconsistent synthetic source linkage fails closed",
    function (assert) {
      const extraction = observedPrototypeExtraction(
        [
          observedPrototypeRow(
            1,
            "Synthetic item",
            "1",
            "10,00",
            "10,00",
            "left_aligned",
          ),
          observedPrototypeEvidenceLine(2, "Total incl VAT 10,00", "summary"),
        ],
        {},
      );
      extraction.financialEvidence = {
        monetaryObservations: [
          syntheticFinancialObservation(
            "synthetic-mismatched-source",
            2,
            "Total incl VAT",
            "11,00",
            "document_total",
            "inclVAT",
          ),
        ],
      };

      const result = buildStagedReceiptCandidateExperiment(extraction);

      assert.ok(compactJsonEquality(
        {
          structuralResolved: result.structuralStatus.resolved,
          conflictCodes: result.structuralStatus.conflicts.map(function (
            conflict,
          ) {
            return conflict.code;
          }),
          preservedRawText:
            result.financialEvidence.monetaryObservations[0].rawText,
          canonicalReceipt: result.canonicalReceipt,
        },
        {
          structuralResolved: false,
          conflictCodes: ["INCONSISTENT_FINANCIAL_SOURCE_EVIDENCE"],
          preservedRawText: "Total incl VAT 11,00",
          canonicalReceipt: null,
        },
      ));
    },
  );

  QUnit.test(
    "financial evidence — contradictory reported type blocks explicit label rule",
    function (assert) {
      const evidence = interpretFinancialEvidencePrototype_(
        [
          syntheticFinancialObservation(
            "synthetic-contradiction",
            2,
            "Total incl VAT",
            "10,00",
            "document_total",
            "exclVAT",
          ),
        ],
        1000,
      );
      const gate = buildCanonicalReceiptFromFinancialEvidencePrototype_(
        syntheticFinancialCandidateReceipt(),
        evidence,
        true,
      );

      assert.ok(compactJsonEquality(
        {
          status: evidence.status,
          conflictCodes: financialConflictCodes(evidence),
          assignments: evidence.canonicalAssignments,
          canonicalReceipt: gate.canonicalReceipt,
        },
        {
          status: {
            resolved: false,
            code: "CONFLICTING_REPORTED_FINANCIAL_EVIDENCE",
          },
          conflictCodes: ["CONFLICTING_REPORTED_FINANCIAL_EVIDENCE"],
          assignments: [],
          canonicalReceipt: null,
        },
      ));
    },
  );

  QUnit.test(
    "staged image integration — feature flag defaults OFF",
    function (assert) {
      const originalValue = CONFIG.stagedImageExtractionEnabled;
      try {
        CONFIG.stagedImageExtractionEnabled = null;
        assert.ok(compactJsonEquality(
          {
            configured: "stagedImageExtractionEnabled" in CONFIG,
            enabled: isStagedImageExtractionEnabled(),
          },
          { configured: true, enabled: false },
        ));
      } finally {
        CONFIG.stagedImageExtractionEnabled = originalValue;
      }
    },
  );

  QUnit.test(
    "staged image integration — route selection is image-only",
    function (assert) {
      assert.ok(compactJsonEquality(
        {
          imageOff: getReceiptAnalysisRoute_("image/jpeg", false),
          imageOn: getReceiptAnalysisRoute_("image/jpeg", true),
          pdfOff: getReceiptAnalysisRoute_("application/pdf", false),
          pdfOn: getReceiptAnalysisRoute_("application/pdf", true),
          unsupported: getReceiptAnalysisRoute_("text/plain", true),
        },
        {
          imageOff: "legacy-image",
          imageOn: "staged-image",
          pdfOff: "pdf",
          pdfOn: "pdf",
          unsupported: "unsupported",
        },
      ));
    },
  );

  QUnit.test(
    "staged image integration — flag OFF executes only legacy image path",
    function (assert) {
      const calls = [];
      const result = executeImageReceiptAnalysisRoute_(
        false,
        function () {
          calls.push("staged");
          return "staged-result";
        },
        function () {
          calls.push("legacy");
          return "legacy-result";
        },
      );

      assert.ok(compactJsonEquality(
        { calls: calls, result: result },
        { calls: ["legacy"], result: "legacy-result" },
      ));
    },
  );

  QUnit.test(
    "staged image integration — flag ON executes only staged image path",
    function (assert) {
      const calls = [];
      const result = executeImageReceiptAnalysisRoute_(
        true,
        function () {
          calls.push("staged");
          return "staged-result";
        },
        function () {
          calls.push("legacy");
          return "legacy-result";
        },
      );

      assert.ok(compactJsonEquality(
        { calls: calls, result: result },
        { calls: ["staged"], result: "staged-result" },
      ));
    },
  );

  QUnit.test(
    "staged image integration — staged failure never invokes legacy fallback",
    function (assert) {
      const calls = [];
      let caught = null;
      try {
        executeImageReceiptAnalysisRoute_(
          true,
          function () {
            calls.push("staged");
            throw createStagedImageExtractionError_(
              "financial",
              "AMBIGUOUS_PRINTED_TOTAL_TYPE",
            );
          },
          function () {
            calls.push("legacy");
            return "legacy-result";
          },
        );
      } catch (error) {
        caught = error;
      }

      assert.ok(compactJsonEquality(
        {
          calls: calls,
          name: caught && caught.name,
          stage: caught && caught.stage,
          code: caught && caught.code,
        },
        {
          calls: ["staged"],
          name: "StagedImageExtractionError",
          stage: "financial",
          code: "AMBIGUOUS_PRINTED_TOTAL_TYPE",
        },
      ));
    },
  );

  QUnit.test(
    "staged image integration — explicit synthetic inclVAT returns canonical shape",
    function (assert) {
      const canonical = buildStagedCanonicalReceiptOrThrow_(
        syntheticStagedInclExtraction("10,00"),
      );

      assert.ok(compactJsonEquality(
        canonical,
        {
          items: [
            {
              name: "Synthetic item",
              quantity: 1,
              unitPrice: 10,
              lineTotal: 10,
            },
          ],
          additionalCosts: [],
          vat: null,
          totals: { exclVAT: null, inclVAT: 10, vatAmount: null },
        },
      ));
    },
  );

  QUnit.test(
    "staged image integration — plain-total forward anchors use bounded canonical release",
    function (assert) {
      const canonical = buildStagedCanonicalReceiptOrThrow_(
        controlledProbeStage1V2AnnotationFixture(),
      );

      assert.ok(compactJsonEquality(
        {
          itemCount: canonical.items.length,
          lineTotals: canonical.items.map(function (item) {
            return item.lineTotal;
          }),
          additionalCostCount: canonical.additionalCosts.length,
          vat: canonical.vat,
          totals: canonical.totals,
        },
        {
          itemCount: 6,
          lineTotals: [15.99, 9.79, 5.49, 9.99, 15.29, 24.99],
          additionalCostCount: 0,
          vat: null,
          totals: null,
        },
      ));
    },
  );

  QUnit.test(
    "staged image integration — one-item bounded release remains normalizer-compatible",
    function (assert) {
      const canonical = buildStagedCanonicalReceiptOrThrow_(
        controlledHuboOneItemStage1V2Fixture(),
      );
      const normalized = normalizeAndAggregateReceiptData(canonical);

      assert.ok(compactJsonEquality(
        {
          item: canonical.items[0],
          additionalCostCount: canonical.additionalCosts.length,
          vat: canonical.vat,
          totals: canonical.totals,
          rows: normalized.rows,
          finalSum: normalized.finalSum,
          reconciled: normalized.reconciled,
          documentTotalInclVat: normalized.documentTotalInclVat,
        },
        {
          item: {
            name: "Veilig 2300 ak gr/kr 72 f1 skg3 (b)",
            quantity: 1,
            unitPrice: 69.99,
            lineTotal: 69.99,
          },
          additionalCostCount: 0,
          vat: null,
          totals: null,
          rows: [
            {
              name: "Veilig 2300 ak gr/kr 72 f1 skg3 (b)",
              quantity: 1,
              price: 69.99,
            },
          ],
          finalSum: 69.99,
          reconciled: true,
          documentTotalInclVat: 0,
        },
      ));
    },
  );

  QUnit.test(
    "staged image integration — bounded release failure propagates without legacy fallback",
    function (assert) {
      const candidate = buildStagedReceiptCandidateExperiment(
        controlledProbeStage1V2AnnotationFixture(),
      );
      candidate.candidateReceipt.items[0].unitPrice = 9.79;
      const calls = [];
      let caught = null;

      try {
        executeImageReceiptAnalysisRoute_(
          true,
          function () {
            calls.push("staged");
            return buildForwardPricedAnchorCanonicalReceiptOrThrow_(candidate);
          },
          function () {
            calls.push("legacy");
            return "legacy-result";
          },
        );
      } catch (error) {
        caught = error;
      }

      assert.ok(compactJsonEquality(
        {
          calls: calls,
          name: caught && caught.name,
          stage: caught && caught.stage,
          code: caught && caught.code,
        },
        {
          calls: ["staged"],
          name: "StagedImageExtractionError",
          stage: "canonical",
          code: "HUBO_CANDIDATE_SOURCE_MISMATCH",
        },
      ));
    },
  );

  QUnit.test(
    "staged image integration — other unresolved financial status bypasses bounded exception",
    function (assert) {
      const extraction = controlledHuboOneItemStage1V2Fixture();
      extraction.observedLines.splice(3, 1);
      extraction.summaryEvidence.printedTotal = null;
      let caught = null;

      try {
        buildStagedCanonicalReceiptOrThrow_(extraction);
      } catch (error) {
        caught = error;
      }

      assert.ok(compactJsonEquality(
        {
          name: caught && caught.name,
          stage: caught && caught.stage,
          code: caught && caught.code,
        },
        {
          name: "StagedImageExtractionError",
          stage: "financial",
          code: "MISSING_PRINTED_TOTAL_EVIDENCE",
        },
      ));
    },
  );

  QUnit.test(
    "staged image integration — structural conflict fails before canonical release",
    function (assert) {
      const extraction = syntheticStagedInclExtraction("10,00");
      extraction.observedLines[0].unitPriceText = null;
      let caught = null;
      try {
        buildStagedCanonicalReceiptOrThrow_(extraction);
      } catch (error) {
        caught = error;
      }

      assert.ok(compactJsonEquality(
        {
          name: caught && caught.name,
          stage: caught && caught.stage,
          code: caught && caught.code,
        },
        {
          name: "StagedImageExtractionError",
          stage: "structure",
          code: "INCOMPLETE_ANCHOR",
        },
      ));
    },
  );

  QUnit.test(
    "staged image integration — schema failure uses compact perception error",
    function (assert) {
      const response = createMockOpenAIResponse('{"unexpected":true}');
      let caught = null;
      try {
        parseStagedImageEvidenceOrThrow_(response);
      } catch (error) {
        caught = error;
      }

      assert.ok(compactJsonEquality(
        {
          name: caught && caught.name,
          stage: caught && caught.stage,
          code: caught && caught.code,
          containsEvidence: Boolean(
            caught && caught.message.indexOf("unexpected") >= 0,
          ),
        },
        {
          name: "StagedImageExtractionError",
          stage: "perception",
          code: "INVALID_STAGE1_RESPONSE",
          containsEvidence: false,
        },
      ));
    },
  );

  QUnit.test(
    "staged image integration — canonical output remains normalizer-compatible",
    function (assert) {
      const canonical = buildStagedCanonicalReceiptOrThrow_(
        syntheticStagedInclExtraction("10,00"),
      );
      const normalized = normalizeAndAggregateReceiptData(canonical);

      assert.ok(compactJsonEquality(
        {
          rows: normalized.rows,
          finalSum: normalized.finalSum,
          reconciled: normalized.reconciled,
          documentTotalInclVat: normalized.documentTotalInclVat,
        },
        {
          rows: [{ name: "Synthetic item", quantity: 1, price: 10 }],
          finalSum: 10,
          reconciled: true,
          documentTotalInclVat: 10,
        },
      ));
    },
  );

  QUnit.test(
    "staged image integration — reconciliation mismatch remains downstream failure",
    function (assert) {
      const canonical = buildStagedCanonicalReceiptOrThrow_(
        syntheticStagedInclExtraction("11,00"),
      );
      const normalized = normalizeAndAggregateReceiptData(canonical);

      assert.ok(compactJsonEquality(
        {
          canonicalInclVAT: canonical.totals.inclVAT,
          finalSum: normalized.finalSum,
          reconciled: normalized.reconciled,
        },
        { canonicalInclVAT: 11, finalSum: 10, reconciled: false },
      ));
    },
  );

  QUnit.test(
    "aggregate reconciliation blind spot — wrong seven-item association still sums to printed total",
    function (assert) {
      const incorrectDirectItemCents = [1599, 979, 549, 999, 1529, 2499, 0];
      const printedTotalCents = 8154;
      const aggregateCents = incorrectDirectItemCents.reduce(function (sum, value) {
        return sum + value;
      }, 0);

      assert.equal(incorrectDirectItemCents.length, 7);
      assert.equal(aggregateCents, printedTotalCents);
      assert.notOk(incorrectDirectItemCents.length === 6);
    },
  );

  QUnit.test(
    "staged prototype — arbitrary unpriced pre-anchor product fails closed",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([
          observedPrototypeRow(1, "Not a declared header", null, null, null, "left_aligned"),
          observedPrototypeRow(2, "Anchor", "1", "2,00", "2,00", "left_aligned"),
        ]),
      );

      assert.notOk(result.resolved);
      assert.ok(
        prototypeConflictCodes(result).indexOf("UNPRICED_ROW_BEFORE_ANCHOR") >= 0,
      );
      assert.equal(result.evidencePartition.headerObservations.length, 0);
    },
  );

  QUnit.test(
    "staged prototype — unknown role fails closed and remains accounted",
    function (assert) {
      const unknown = observedPrototypeEvidenceLine(1, "Unknown", "unknown");
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([unknown]),
      );

      assert.notOk(result.resolved);
      assert.ok(
        prototypeConflictCodes(result).indexOf("UNKNOWN_OBSERVATION_ROLE") >= 0,
      );
      assert.equal(result.evidencePartition.unclassifiedObservations.length, 1);
      assert.equal(result.evidencePartition.accountedObservationCount, 1);
    },
  );

  QUnit.test(
    "staged prototype — header inside product region fails closed",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([
          observedPrototypeRow(1, "Anchor", "1", "2,00", "2,00", "left_aligned"),
          observedPrototypeEvidenceLine(2, "Late header", "header"),
        ]),
      );

      assert.notOk(result.resolved);
      assert.ok(
        prototypeConflictCodes(result).indexOf("HEADER_INSIDE_PRODUCT_REGION") >= 0,
      );
      assert.equal(result.evidencePartition.headerObservations[0].rawText, "Late header");
    },
  );

  QUnit.test(
    "staged prototype — product after summary region fails closed",
    function (assert) {
      const summaryLine = observedPrototypeEvidenceLine(2, "Count: 1", "summary");
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction(
          [
            observedPrototypeRow(1, "First", "1", "2,00", "2,00", "left_aligned"),
            summaryLine,
            observedPrototypeRow(3, "Late product", "1", "3,00", "3,00", "left_aligned"),
          ],
          {
            printedProductCount: {
              sourceLineOrder: 2,
              rawText: "Count: 1",
              labelText: "Count:",
              valueText: "1",
            },
          },
        ),
      );

      assert.notOk(result.resolved);
      assert.ok(
        prototypeConflictCodes(result).indexOf("PRODUCT_AFTER_SUMMARY_REGION") >= 0,
      );
      assert.equal(result.evidencePartition.productObservations.length, 2);
    },
  );

  QUnit.test(
    "staged prototype — missing role fails closed",
    function (assert) {
      const line = observedPrototypeEvidenceLine(1, "No role", null);
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([line]),
      );

      assert.notOk(result.resolved);
      assert.ok(
        prototypeConflictCodes(result).indexOf("MISSING_OBSERVATION_ROLE") >= 0,
      );
      assert.equal(result.evidencePartition.unclassifiedObservations[0].rawText, "No role");
    },
  );

  QUnit.test(
    "staged prototype — duplicate physical observation order fails closed",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction([
          observedPrototypeRow(1, "First", "1", "2,00", "2,00", "left_aligned"),
          observedPrototypeRow(1, "Duplicate", "1", "3,00", "3,00", "left_aligned"),
        ]),
      );

      assert.notOk(result.resolved);
      assert.ok(
        prototypeConflictCodes(result).indexOf("DUPLICATE_OBSERVATION_ORDER") >= 0,
      );
      assert.equal(result.evidencePartition.accountedObservationCount, 2);
      assert.equal(result.evidencePartition.unclassifiedObservations.length, 1);
    },
  );

  QUnit.test(
    "staged prototype — summary source-line mismatch fails closed",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction(
          [
            observedPrototypeRow(1, "Anchor", "1", "2,00", "2,00", "left_aligned"),
            observedPrototypeEvidenceLine(2, "Count: 1", "summary"),
          ],
          {
            printedProductCount: {
              sourceLineOrder: 3,
              rawText: "Count: 1",
              labelText: "Count:",
              valueText: "1",
            },
          },
        ),
      );

      assert.notOk(result.resolved);
      assert.ok(
        prototypeConflictCodes(result).indexOf("INVALID_SUMMARY_SOURCE_LINE") >= 0,
      );
      assert.ok(
        prototypeConflictCodes(result).indexOf("UNLINKED_SUMMARY_OBSERVATION") >= 0,
      );
    },
  );

  QUnit.test(
    "staged prototype — inconsistent summary raw and value fails closed",
    function (assert) {
      const result = buildStagedReceiptPrototype(
        observedPrototypeExtraction(
          [
            observedPrototypeRow(1, "Anchor", "1", "2,00", "2,00", "left_aligned"),
            observedPrototypeEvidenceLine(2, "Count: 1", "summary"),
          ],
          {
            printedProductCount: {
              sourceLineOrder: 2,
              rawText: "Count: 1",
              labelText: "Count:",
              valueText: "2",
            },
          },
        ),
      );

      assert.notOk(result.resolved);
      assert.ok(
        prototypeConflictCodes(result).indexOf("INCONSISTENT_SUMMARY_RAW_VALUE") >= 0,
      );
      assert.equal(
        result.evidencePartition.summaryEvidence.printedProductCount.rawText,
        "Count: 1",
      );
      assert.equal(
        result.evidencePartition.summaryEvidence.printedProductCount.valueText,
        "2",
      );
    },
  );

  // ==================================================
  // BOUNDED TABULAR / TERMINAL STRUCTURAL EXPERIMENTS
  // ==================================================

  registerPermanentFinancialTest_(
    24,
    "tabular structural experiment — preserves mixed-basis cells without arithmetic repair",
    function (assert) {
      const input = wiskaStyleTabularExtractionFixture();
      const snapshot = JSON.stringify(input);
      const result = buildTabularCellRowExperiment_(input);
      const financialLine = result.financialLineEvidence[0];
      const price = financialLine.valueComponents[0];
      const subtotal = financialLine.valueComponents[3];

      assert.ok(result.resolved);
      assert.equal(result.capability, "TABULAR_CELL_ROW");
      assert.equal(result.accounting.physicalObservationCount, 6);
      assert.equal(result.accounting.partitionedObservationCount, 6);
      assert.equal(result.accounting.tableRegionCount, 1);
      assert.equal(result.accounting.tableRowCount, 2);
      assert.equal(result.accounting.tableCellCount, 12);
      assert.equal(result.accounting.summaryObservationCount, 3);
      assert.equal(result.accounting.uniqueTableLineCount, 3);
      assert.equal(result.groups.length, 1);
      assert.ok(compactJsonEquality(result.groups[0].sourceRowOrders, [2, 3]));
      assert.equal(financialLine.sourceFragments.length, 6);
      assert.ok(compactJsonEquality(financialLine.descriptionCellRefs, ["d-description"]));
      assert.ok(compactJsonEquality(
        financialLine.valueComponents.map(function (component) {
          return component.rawValue;
        }),
        ["10.95", "3", "21%", "27.15"],
      ));
      assert.ok(compactJsonEquality(
        financialLine.valueComponents.map(function (component) {
          return component.printedLabel.rawText;
        }),
        ["Prijs", "Aantal", "BTW", "Subtotaal"],
      ));
      assert.equal(price.sourceRef.cellId, "d-price");
      assert.equal(price.printedLabel.headerCellRef, "h-price");
      assert.equal(price.structuralContext.columnOrder, 3);
      assert.equal(price.uninterpretedAdjacentFragments[0].rawText, "SYN-REF");
      assert.equal(subtotal.sourceRef.cellId, "d-subtotal");
      assert.equal(subtotal.printedLabel.headerCellRef, "h-subtotal");
      assert.equal(subtotal.structuralContext.columnOrder, 6);
      assert.equal(JSON.stringify(result).indexOf("9.05"), -1);
      assert.ok(JSON.stringify(input) === snapshot);
    },
  );

  registerPermanentFinancialTest_(
    3,
    "tabular structural experiment — incomplete row alignment fails closed",
    function (assert) {
      const input = wiskaStyleTabularExtractionFixture();
      input.tableRegions[0].rows[1].sourceLineOrders = [2];
      const result = buildTabularCellRowExperiment_(input);

      assert.notOk(result.resolved);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "INCOMPLETE_TABLE_ROW_ALIGNMENT";
      }));
      assert.equal(result.groups.length, 0);
    },
  );

  registerPermanentFinancialTest_(
    3,
    "tabular structural experiment — missing header association fails closed",
    function (assert) {
      const input = wiskaStyleTabularExtractionFixture();
      input.tableRegions[0].rows[1].cells[2].headerCellRef = "missing-header";
      const result = buildTabularCellRowExperiment_(input);

      assert.notOk(result.resolved);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "MISSING_TABLE_HEADER_ASSOCIATION";
      }));
      assert.equal(result.financialLineEvidence.length, 0);
    },
  );

  registerPermanentFinancialTest_(
    3,
    "tabular structural experiment — cell value absent from its source row fails closed",
    function (assert) {
      const input = wiskaStyleTabularExtractionFixture();
      input.tableRegions[0].rows[1].cells[2].rawText = "99.99";
      const result = buildTabularCellRowExperiment_(input);

      assert.notOk(result.resolved);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "INCONSISTENT_TABLE_CELL_RAW_TEXT";
      }));
      assert.equal(result.financialLineEvidence.length, 0);
    },
  );

  registerPermanentFinancialTest_(
    3,
    "tabular structural experiment — duplicate cell consumption fails closed",
    function (assert) {
      const input = wiskaStyleTabularExtractionFixture();
      input.tableRegions[0].financialLines[0].uninterpretedCellIds.push(
        "d-price",
      );
      const result = buildTabularCellRowExperiment_(input);

      assert.notOk(result.resolved);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "DUPLICATE_TABLE_CELL_CONSUMPTION";
      }));
      assert.equal(result.groups.length, 0);
    },
  );

  registerPermanentFinancialTest_(
    3,
    "tabular structural experiment — contradictory row role fails closed",
    function (assert) {
      const input = wiskaStyleTabularExtractionFixture();
      input.observedLines[1].roleEvidence = "unknown";
      const result = buildTabularCellRowExperiment_(input);

      assert.notOk(result.resolved);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "CONTRADICTORY_TABLE_ROW_EVIDENCE";
      }));
      assert.equal(result.accounting.physicalObservationCount, 6);
    },
  );

  registerPermanentFinancialTest_(
    3,
    "tabular structural experiment — noncontiguous region fails closed",
    function (assert) {
      const input = wiskaStyleTabularExtractionFixture();
      input.tableRegions[0].sourceLineOrders = [1, 3];
      const result = buildTabularCellRowExperiment_(input);

      assert.notOk(result.resolved);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "NONCONTIGUOUS_TABLE_REGION";
      }));
      assert.equal(result.groups.length, 0);
    },
  );

  registerPermanentFinancialTest_(
    4,
    "structural capability matrix — Hubo forward anchor remains unchanged",
    function (assert) {
      const rows = [
        observedPrototypeRow(1, "Anchor", "1", "10.95", "10.95", "left_aligned"),
        observedPrototypeRow(2, "wrapped detail", null, null, null, "indented"),
      ];
      const result = groupObservedReceiptRowsPrototype_(rows);

      assert.equal(result.conflicts.length, 0);
      assert.equal(result.groups.length, 1);
      assert.ok(compactJsonEquality(result.groups[0].sourceRowOrders, [1, 2]));
      assert.equal(result.unconsumedRows.length, 0);
    },
  );

  registerPermanentFinancialTest_(
    5,
    "structural capability matrix — Gamma terminal monetary row is bounded and auditable",
    function (assert) {
      const rows = [
        observedPrototypeRow(1, "Synthetic product", null, null, null, "left_aligned"),
        observedPrototypeRow(2, null, null, "10.95", "10.95", "indented"),
      ];
      rows[1].rawText = "10.95 10.95";
      const result = projectTerminalPricedGroupsExperiment_(rows, [
        { sourceRowOrders: [1, 2], terminalRowOrder: 2 },
      ]);

      assert.ok(result.resolved);
      assert.equal(result.groups.length, 1);
      assert.equal(result.groups[0].capability, "TERMINAL_PRICED_ANCHOR");
      assert.ok(compactJsonEquality(result.groups[0].sourceRowOrders, [1, 2]));
      assert.equal(result.unconsumedRowOrders.length, 0);
    },
  );

  registerPermanentFinancialTest_(
    3,
    "terminal structural experiment — unsupported shape fails closed",
    function (assert) {
      const rows = [
        observedPrototypeRow(1, "Synthetic product", null, null, null, "left_aligned"),
        observedPrototypeRow(2, "still unpriced", null, null, null, "indented"),
      ];
      const result = projectTerminalPricedGroupsExperiment_(rows, [
        { sourceRowOrders: [1, 2], terminalRowOrder: 2 },
      ]);

      assert.notOk(result.resolved);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "INVALID_TERMINAL_PRICED_GROUP";
      }));
      assert.ok(compactJsonEquality(result.unconsumedRowOrders, [1, 2]));
    },
  );

  registerPermanentFinancialTest_(
    7,
    "structural capability matrix — Bol wrapped terminal row preserves multiple summaries",
    function (assert) {
      const productRows = [
        observedPrototypeRow(1, "Synthetic wrapped product", null, null, null, "left_aligned"),
        observedPrototypeRow(2, "second description line", null, null, null, "indented"),
        observedPrototypeRow(3, null, "2", "10.95", "21.90", "indented"),
      ];
      productRows[2].rawText = "2 10.95 21.90";
      const terminal = projectTerminalPricedGroupsExperiment_(productRows, [
        { sourceRowOrders: [1, 2, 3], terminalRowOrder: 3 },
      ]);
      const extraction = observedPrototypeExtraction(
        productRows.concat([
          observedPrototypeEvidenceLine(4, "Subtotal 21.90", "summary"),
          observedPrototypeEvidenceLine(5, "VAT amount 4.60", "summary"),
          observedPrototypeEvidenceLine(6, "Total incl VAT 26.50", "summary"),
        ]),
        { printedProductCount: null, printedTotal: null },
      );
      extraction.financialEvidence = {
        monetaryObservations: [
          syntheticFinancialObservation("bol-subtotal", 4, "Subtotal", "21.90", "subtotal", null, "document"),
          syntheticFinancialObservation("bol-vat", 5, "VAT amount", "4.60", "vat_amount", null, "document"),
          syntheticFinancialObservation("bol-total", 6, "Total incl VAT", "26.50", "document_total", "inclVAT", "document"),
        ],
      };
      const partition = partitionObservedReceiptEvidencePrototype_(extraction);

      assert.ok(terminal.resolved);
      assert.ok(compactJsonEquality(terminal.groups[0].sourceRowOrders, [1, 2, 3]));
      assert.equal(terminal.groups[0].terminalRowOrder, 3);
      assert.equal(partition.productObservations.length, 3);
      assert.equal(partition.summaryObservations.length, 3);
      assert.equal(partition.accountedObservationCount, 6);
      assert.equal(partition.conflicts.length, 0);
    },
  );

  // ==================================================
  // EXHAUSTIVE FINANCIAL EVIDENCE COLLECTOR EXPERIMENT
  // ==================================================

  registerPermanentFinancialTest_(
    8,
    "financial collector — Hubo evidence keeps a plain total ambiguous",
    function (assert) {
      const input = huboFinancialCollectionFixture();
      const result = collectExhaustiveFinancialEvidenceExperiment_(input);

      assert.ok(result.collectionComplete);
      assert.equal(result.observations.length, 3);
      assert.ok(compactJsonEquality(
        result.observations.map(function (observation) { return observation.rawValue; }),
        ["15,99", "15,99", "15,99"],
      ));
      assert.equal(result.contextObservations.length, 1);
      assert.equal(result.contextObservations[0].rawValue, "1");
      assert.equal(result.observations[2].printedLabelText, "Totaal");
      assert.equal(JSON.stringify(result).indexOf("inclVAT"), -1);
      assert.equal(result.canonicalReceipt, null);
    },
  );

  registerPermanentFinancialTest_(
    10,
    "financial collector — Gamma keeps all monetary areas as ordered evidence",
    function (assert) {
      const result = collectExhaustiveFinancialEvidenceExperiment_(
        gammaFinancialCollectionFixture(),
      );

      assert.ok(result.collectionComplete);
      assert.equal(result.observations.length, 12);
      assert.ok(compactJsonEquality(
        result.observations.map(function (observation) { return observation.rawValue; }),
        ["28,99", "-7,25", "21,74", "21,74", "50,00", "28,25", "7,25", "21,00", "17,97", "3,77", "17,97", "3,77"],
      ));
      assert.equal(result.observations[1].sourceContext, "adjustment_like");
      assert.equal(result.observations[4].sourceContext, "tender_like");
      assert.equal(result.observations[5].sourceContext, "tender_like");
      assert.equal(result.observations[8].adjacentUninterpretedFragments.length, 2);
      assert.equal(result.sourceAccounting.validSourceReferenceCount, 12);
      assert.equal(result.conflicts.length, 0);
      assert.equal(result.canonicalReceipt, null);
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial collector — signed adjustment and tender/change remain literal and distinct",
    function (assert) {
      const result = collectExhaustiveFinancialEvidenceExperiment_(
        gammaFinancialCollectionFixture(),
      );
      const byId = {};
      result.observations.forEach(function (observation) {
        byId[observation.observationId] = observation;
      });

      assert.equal(byId["gamma-discount"].rawValue, "-7,25");
      assert.equal(byId["gamma-tender"].rawValue, "50,00");
      assert.equal(byId["gamma-change"].rawValue, "28,25");
      assert.notEqual(
        byId["gamma-tender"].observationId,
        byId["gamma-change"].observationId,
      );
      assert.notEqual(
        byId["gamma-tender"].sourceRef.sourceLineOrders[0],
        byId["gamma-change"].sourceRef.sourceLineOrders[0],
      );
    },
  );

  registerPermanentFinancialTest_(
    9,
    "financial collector — Bol keeps quantity and explicit summaries independently",
    function (assert) {
      const result = collectExhaustiveFinancialEvidenceExperiment_(
        bolFinancialCollectionFixture(),
      );

      assert.ok(result.collectionComplete);
      assert.equal(result.observations.length, 8);
      assert.equal(result.observations[0].rawValue, "2");
      assert.equal(result.observations[3].printedLabelText, "Subtotal excl VAT");
      assert.equal(result.observations[4].rawValue, "21%");
      assert.equal(result.observations[5].rawValue, "4,60");
      assert.equal(result.observations[6].printedLabelText, "Total incl VAT");
      assert.equal(result.observations[7].printedLabelText, "Total");
      assert.equal(result.canonicalReceipt, null);
    },
  );

  registerPermanentFinancialTest_(
    14,
    "financial collector — Wiska preserves mixed-basis cells and provenance",
    function (assert) {
      const input = wiskaFinancialCollectionFixture();
      const snapshot = JSON.stringify(input);
      const structural = buildTabularCellRowExperiment_(input);
      const result = collectExhaustiveFinancialEvidenceExperiment_(input);

      assert.ok(structural.resolved);
      assert.ok(result.collectionComplete);
      assert.equal(result.observations.length, 7);
      assert.equal(result.observations[0].rawValue, "10.95");
      assert.equal(result.observations[0].headerCellRef, "h-price");
      assert.equal(result.observations[0].printedLabelText, "Prijs");
      assert.equal(result.observations[3].rawValue, "27.15");
      assert.equal(result.observations[3].headerCellRef, "h-subtotal");
      assert.equal(result.observations[3].printedLabelText, "Subtotaal");
      assert.equal(result.observations[4].rawValue, "27.15");
      assert.equal(result.observations[4].sourceContext, "summary");
      assert.equal(JSON.stringify(result).indexOf("9.05"), -1);
      assert.ok(JSON.stringify(input) === snapshot);
      assert.equal(result.canonicalReceipt, null);
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial collector — equal printed values are not deduplicated",
    function (assert) {
      const result = collectExhaustiveFinancialEvidenceExperiment_(
        wiskaFinancialCollectionFixture(),
      );
      const equalValues = result.observations.filter(function (observation) {
        return observation.rawValue === "27.15";
      });

      assert.equal(equalValues.length, 2);
      assert.notEqual(equalValues[0].observationId, equalValues[1].observationId);
      assert.notEqual(equalValues[0].sourceContext, equalValues[1].sourceContext);
      assert.notEqual(
        equalValues[0].sourceRef.sourceLineOrders[0],
        equalValues[1].sourceRef.sourceLineOrders[0],
      );
      assert.equal(result.sourceAccounting.uniqueSourceConsumptionCount, 7);
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial collector — unknown monetary evidence remains unresolved and visible",
    function (assert) {
      const extraction = observedPrototypeExtraction([
        observedPrototypeEvidenceLine(1, "Unknown marker +4,95", "unknown"),
      ]);
      extraction.financialSourceObservations = [
        financialSourceObservationFixture(
          "unknown-money",
          "unknown",
          "+4,95",
          "UNRESOLVED_REGION",
          [1],
          1,
        ),
      ];
      const result = collectExhaustiveFinancialEvidenceExperiment_(extraction);

      assert.ok(result.collectionComplete);
      assert.equal(result.observations.length, 1);
      assert.equal(result.observations[0].rawValue, "+4,95");
      assert.equal(result.observations[0].sourceContext, "unknown");
      assert.equal(result.unresolved.length, 1);
      assert.equal(result.unresolved[0].code, "UNRESOLVED_FINANCIAL_SOURCE_CONTEXT");
    },
  );

  registerPermanentFinancialTest_(
    4,
    "financial collector — duplicate source consumption fails closed",
    function (assert) {
      const extraction = huboFinancialCollectionFixture();
      extraction.financialSourceObservations.splice(
        1,
        0,
        financialSourceObservationFixture(
          "hubo-duplicate",
          "product_group",
          "15,99",
          "FORWARD_PRICED_ANCHOR",
          [1],
          1,
          { groupId: "hubo-group-1" },
        ),
      );
      const result = collectExhaustiveFinancialEvidenceExperiment_(extraction);

      assert.notOk(result.collectionComplete);
      assert.ok(
        financialCollectionConflictCodes(result).indexOf(
          "DUPLICATE_FINANCIAL_SOURCE_CONSUMPTION",
        ) >= 0,
      );
      assert.equal(result.observations.length, 4);
      assert.equal(result.sourceAccounting.uniqueSourceConsumptionCount, 3);
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial collector — missing source reference and raw mismatch fail closed",
    function (assert) {
      const missingInput = huboFinancialCollectionFixture();
      missingInput.financialSourceObservations[0].sourceRef.sourceLineOrders = [99];
      const missing = collectExhaustiveFinancialEvidenceExperiment_(missingInput);
      const mismatchInput = huboFinancialCollectionFixture();
      mismatchInput.financialSourceObservations[0].rawValue = "99,99";
      const mismatch = collectExhaustiveFinancialEvidenceExperiment_(mismatchInput);

      assert.notOk(missing.collectionComplete);
      assert.ok(
        financialCollectionConflictCodes(missing).indexOf(
          "MISSING_FINANCIAL_SOURCE_REFERENCE",
        ) >= 0,
      );
      assert.equal(missing.sourceAccounting.validSourceReferenceCount, 2);
      assert.notOk(mismatch.collectionComplete);
      assert.ok(
        financialCollectionConflictCodes(mismatch).indexOf(
          "FINANCIAL_SOURCE_RAW_VALUE_MISMATCH",
        ) >= 0,
      );
      assert.equal(mismatch.sourceAccounting.validSourceReferenceCount, 2);
    },
  );

  registerPermanentFinancialTest_(
    8,
    "financial collector — physical order is enforced without source mutation or repair",
    function (assert) {
      const input = bolFinancialCollectionFixture();
      const snapshot = JSON.stringify(input);
      const reversed = bolFinancialCollectionFixture();
      reversed.financialSourceObservations.reverse();
      const ordered = collectExhaustiveFinancialEvidenceExperiment_(input);
      const outOfOrder = collectExhaustiveFinancialEvidenceExperiment_(reversed);

      assert.ok(ordered.sourceAccounting.sourceOrderPreserved);
      assert.ok(compactJsonEquality(
        ordered.observations.map(function (observation) {
          return observation.sourceRef.sourceLineOrders[0];
        }),
        [1, 1, 1, 2, 3, 3, 4, 5],
      ));
      assert.ok(ordered.sourceAccounting.sourceUnchanged);
      assert.ok(JSON.stringify(input) === snapshot);
      assert.notOk(outOfOrder.collectionComplete);
      assert.notOk(outOfOrder.sourceAccounting.sourceOrderPreserved);
      assert.ok(
        financialCollectionConflictCodes(outOfOrder).indexOf(
          "INVALID_FINANCIAL_SOURCE_ORDER",
        ) >= 0,
      );
      assert.equal(ordered.canonicalReceipt, null);
    },
  );

  registerPermanentFinancialTest_(
    3,
    "financial collector — absent financial source manifest fails closed",
    function (assert) {
      const result = collectExhaustiveFinancialEvidenceExperiment_(
        observedPrototypeExtraction([
          observedPrototypeEvidenceLine(1, "Unknown financial area", "unknown"),
        ]),
      );

      assert.notOk(result.collectionComplete);
      assert.equal(result.observations.length, 0);
      assert.ok(
        financialCollectionConflictCodes(result).indexOf(
          "MISSING_FINANCIAL_SOURCE_MANIFEST",
        ) >= 0,
      );
    },
  );

  // ==================================================
  // RECORDED TABLE-LOCAL → COLLECTOR HANDOFF EXPERIMENT
  // ==================================================

  registerPermanentFinancialTest_(
    10,
    "table-local handoff — recorded runtime evidence reaches collector without line provenance",
    function (assert) {
      const first = recordedBolTableLocalRuntimeEvidenceFixture_();
      const second = recordedBolTableLocalRuntimeEvidenceFixture_();
      const snapshot = JSON.stringify(first);
      const result = buildRecordedTableLocalCollectorHandoffExperiment_(
        first,
        recordedBolTableLocalDispositionManifest_(),
      );

      assert.ok(compactJsonEquality(first, second));
      assert.ok(result.sourceAccounting.sourceUnchanged);
      assert.ok(result.adapterResolved);
      assert.ok(result.resolved);
      assert.equal(result.firstUnresolvedBoundary, null);
      assert.ok(result.collectorCompatibility.collectorInvoked);
      assert.ok(compactJsonEquality(
        {
          headers: result.sourceAccounting.headerCellCount,
          data: result.sourceAccounting.dataCellCount,
          accounted: result.sourceAccounting.accountedDataCellCount,
          values: result.sourceAccounting.valueOccurrenceCount,
          structural: result.sourceAccounting.structuralEvidenceCount,
          collectorComplete: result.collector.collectionComplete,
          collectorAccounted:
            result.collector.sourceAccounting.accountedDataCellCount,
          collectorSourceUnchanged:
            result.collector.sourceAccounting.sourceUnchanged,
        },
        {
          headers: 7,
          data: 7,
          accounted: 7,
          values: 5,
          structural: 2,
          collectorComplete: true,
          collectorAccounted: 7,
          collectorSourceUnchanged: true,
        },
      ));
      assert.equal(JSON.stringify(result).indexOf("sourceLineOrders"), -1);
      assert.equal(JSON.stringify(result).indexOf("observedLines"), -1);
      assert.equal(JSON.stringify(first), snapshot);
    },
  );

  registerPermanentFinancialTest_(
    10,
    "table-local handoff — literal header and cell provenance keeps repeated values distinct",
    function (assert) {
      const result = buildRecordedTableLocalCollectorHandoffExperiment_(
        recordedBolTableLocalRuntimeEvidenceFixture_(),
        recordedBolTableLocalDispositionManifest_(),
      );
      const byCell = {};
      result.collector.observations.forEach(function (occurrence) {
        byCell[occurrence.tableLocalRef.cellId] = occurrence;
      });
      const repeated = result.collector.observations.filter(function (occurrence) {
        return occurrence.rawValue === "€ 91,00";
      });

      assert.equal(result.collector.observations.length, 5);
      assert.equal(repeated.length, 2);
      assert.equal(repeated[0].rawValue, repeated[1].rawValue);
      assert.notEqual(repeated[0].occurrenceId, repeated[1].occurrenceId);
      assert.notEqual(
        repeated[0].tableLocalRef.cellId,
        repeated[1].tableLocalRef.cellId,
      );
      assert.ok(
        byCell.cell10.literalHeaderRawText === "Prijs/st" &&
          byCell.cell10.tableLocalRef.sourceImageSha256 ===
            result.sourceIntegrity.sha256,
      );
      assert.equal(byCell.cell12.literalHeaderRawText, "Bedrag");
      assert.ok(
        byCell.cell13.rawValue === "21%" &&
          byCell.cell13.literalHeaderRawText === "BTW%",
      );
      assert.ok(
        byCell.cell14.rawValue === "€ 15,79" &&
          byCell.cell14.literalHeaderRawText === "BTW",
      );
      assert.equal(result.headerContexts.length, 7);
    },
  );

  registerPermanentFinancialTest_(
    6,
    "table-local handoff — empty discount remains structural and every data cell is accounted",
    function (assert) {
      const result = buildRecordedTableLocalCollectorHandoffExperiment_(
        recordedBolTableLocalRuntimeEvidenceFixture_(),
        recordedBolTableLocalDispositionManifest_(),
      );
      const empty = result.collector.structuralEvidence.filter(function (item) {
        return item.tableLocalRef.cellId === "cell11";
      })[0];

      assert.ok(Boolean(empty));
      assert.equal(empty.rawText, "");
      assert.ok(empty.emptyEvidence);
      assert.equal(empty.literalHeaderRawText, "Korting");
      assert.notOk(result.collector.observations.some(function (occurrence) {
        return occurrence.tableLocalRef.cellId === "cell11";
      }));
      assert.equal(result.collector.sourceAccounting.accountedDataCellCount, 7);
    },
  );

  registerPermanentFinancialTest_(
    6,
    "table-local handoff — null or unresolved table evidence fails closed",
    function (assert) {
      const missing = recordedBolTableLocalRuntimeEvidenceFixture_();
      missing.tableEvidence = null;
      missing.tableAssessment = {
        resolved: false,
        coordinateSystem: "table-local",
        crossRepresentationAlignment: "unresolved",
        conflicts: [{ code: "NO_TABLE_EVIDENCE" }],
        regionCount: 0,
      };
      const unresolved = recordedBolTableLocalRuntimeEvidenceFixture_();
      unresolved.tableAssessment.resolved = false;
      unresolved.tableAssessment.conflicts = [{
        code: "UNRESOLVED_TABLE_HEADER_ASSOCIATION",
      }];

      const missingResult = buildRecordedTableLocalCollectorHandoffExperiment_(
        missing,
        recordedBolTableLocalDispositionManifest_(),
      );
      const unresolvedResult =
        buildRecordedTableLocalCollectorHandoffExperiment_(
          unresolved,
          recordedBolTableLocalDispositionManifest_(),
        );
      const validFixture = recordedBolTableLocalRuntimeEvidenceFixture_();
      const validHandoff = buildRecordedTableLocalCollectorHandoffExperiment_(
        validFixture,
        recordedBolTableLocalDispositionManifest_(),
      );
      const nullCollectorResult = collectExhaustiveFinancialEvidenceExperiment_({
        sourceIntegrity: validHandoff.sourceIntegrity,
        tableEvidence: null,
        tableAssessment: missing.tableAssessment,
        financialSourceObservations: validHandoff.valueOccurrences,
        structuralSourceEvidence: validHandoff.structuralEvidence,
      });

      assert.notOk(missingResult.adapterResolved);
      assert.equal(missingResult.firstUnresolvedBoundary, "NO_TABLE_EVIDENCE");
      assert.notOk(unresolvedResult.adapterResolved);
      assert.equal(
        unresolvedResult.firstUnresolvedBoundary,
        "UNRESOLVED_TABLE_EVIDENCE",
      );
      assert.notOk(nullCollectorResult.collectionComplete);
      assert.ok(financialCollectionConflictCodes(nullCollectorResult).indexOf(
        "NO_TABLE_EVIDENCE",
      ) >= 0);
    },
  );

  registerPermanentFinancialTest_(
    5,
    "table-local handoff — malformed header reference or duplicate consumption fails closed",
    function (assert) {
      const malformed = recordedBolTableLocalRuntimeEvidenceFixture_();
      malformed.tableEvidence.regions[0].rows[1].cells[2].headerCellRef =
        "missing-header";
      const duplicateManifest = recordedBolTableLocalDispositionManifest_();
      duplicateManifest.push({
        cellId: "cell10",
        disposition: "value_occurrence",
      });
      const duplicateSource = recordedBolTableLocalRuntimeEvidenceFixture_();
      const duplicateSnapshot = JSON.stringify(duplicateSource);

      const malformedResult =
        buildRecordedTableLocalCollectorHandoffExperiment_(
          malformed,
          recordedBolTableLocalDispositionManifest_(),
        );
      const duplicateResult =
        buildRecordedTableLocalCollectorHandoffExperiment_(
          duplicateSource,
          duplicateManifest,
        );

      assert.notOk(malformedResult.adapterResolved);
      assert.equal(
        malformedResult.firstUnresolvedBoundary,
        "INVALID_TABLE_LOCAL_EVIDENCE",
      );
      assert.notOk(duplicateResult.adapterResolved);
      assert.equal(
        duplicateResult.firstUnresolvedBoundary,
        "DUPLICATE_TABLE_CELL_CONSUMPTION",
      );
      assert.equal(JSON.stringify(duplicateSource), duplicateSnapshot);
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial collector provenance — observed-line invariants remain scoped and strict",
    function (assert) {
      const valid = huboFinancialCollectionFixture();
      const invalidReference = huboFinancialCollectionFixture();
      invalidReference.financialSourceObservations[0]
        .sourceRef.sourceLineOrders = [99];
      const invalidAdjacency = gammaFinancialCollectionFixture();
      invalidAdjacency.financialSourceObservations[7]
        .adjacentUninterpretedFragments[0].sourceLineOrders = [1];

      const validResult = collectExhaustiveFinancialEvidenceExperiment_(valid);
      const referenceResult = collectExhaustiveFinancialEvidenceExperiment_(
        invalidReference,
      );
      const adjacencyResult = collectExhaustiveFinancialEvidenceExperiment_(
        invalidAdjacency,
      );

      assert.ok(validResult.collectionComplete);
      assert.equal(validResult.observations[0].provenanceKind, "observed_line");
      assert.notOk(referenceResult.collectionComplete);
      assert.ok(financialCollectionConflictCodes(referenceResult).indexOf(
        "MISSING_FINANCIAL_SOURCE_REFERENCE",
      ) >= 0);
      assert.ok(financialCollectionConflictCodes(adjacencyResult).indexOf(
        "INVALID_ADJACENT_FINANCIAL_FRAGMENT",
      ) >= 0);
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial collector provenance — ambiguous and hybrid occurrences fail closed",
    function (assert) {
      const hybridLine = huboFinancialCollectionFixture();
      hybridLine.financialSourceObservations[0].tableLocalRef = {};
      const mixed = huboFinancialCollectionFixture();
      mixed.financialSourceObservations[1].provenanceKind = "table_cell";
      const missingKind = huboFinancialCollectionFixture();
      delete missingKind.financialSourceObservations[0].provenanceKind;
      const tableFixture = recordedBolTableLocalRuntimeEvidenceFixture_();
      const tableHandoff = buildRecordedTableLocalCollectorHandoffExperiment_(
        tableFixture,
        recordedBolTableLocalDispositionManifest_(),
      );
      const hybridTableInput = {
        sourceIntegrity: tableHandoff.sourceIntegrity,
        tableEvidence: tableFixture.tableEvidence,
        tableAssessment: tableFixture.tableAssessment,
        financialSourceObservations: JSON.parse(JSON.stringify(
          tableHandoff.valueOccurrences,
        )),
        structuralSourceEvidence: tableHandoff.structuralEvidence,
      };
      hybridTableInput.financialSourceObservations[0].sourceRef = {
        sourceLineOrders: [1],
      };

      const hybridResult = collectExhaustiveFinancialEvidenceExperiment_(
        hybridLine,
      );
      const mixedResult = collectExhaustiveFinancialEvidenceExperiment_(mixed);
      const missingKindResult = collectExhaustiveFinancialEvidenceExperiment_(
        missingKind,
      );
      const hybridTableResult = collectExhaustiveFinancialEvidenceExperiment_(
        hybridTableInput,
      );

      assert.notOk(hybridResult.collectionComplete);
      assert.ok(financialCollectionConflictCodes(hybridResult).indexOf(
        "INVALID_FINANCIAL_SOURCE_SHAPE",
      ) >= 0);
      assert.notOk(mixedResult.collectionComplete);
      assert.ok(financialCollectionConflictCodes(mixedResult).indexOf(
        "AMBIGUOUS_FINANCIAL_PROVENANCE",
      ) >= 0);
      assert.notOk(missingKindResult.collectionComplete);
      assert.ok(
        financialCollectionConflictCodes(missingKindResult).indexOf(
          "AMBIGUOUS_FINANCIAL_PROVENANCE",
        ) >= 0 &&
        financialCollectionConflictCodes(hybridTableResult).indexOf(
          "INVALID_TABLE_CELL_PROVENANCE_SHAPE",
        ) >= 0,
      );
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial collector provenance — table cells reject duplicate consumption and missing disposition",
    function (assert) {
      const fixture = recordedBolTableLocalRuntimeEvidenceFixture_();
      const handoff = buildRecordedTableLocalCollectorHandoffExperiment_(
        fixture,
        recordedBolTableLocalDispositionManifest_(),
      );
      const duplicateInput = {
        sourceIntegrity: handoff.sourceIntegrity,
        tableEvidence: fixture.tableEvidence,
        tableAssessment: fixture.tableAssessment,
        financialSourceObservations: handoff.valueOccurrences.concat([
          JSON.parse(JSON.stringify(handoff.valueOccurrences[1])),
        ]),
        structuralSourceEvidence: handoff.structuralEvidence,
      };
      duplicateInput.financialSourceObservations[5].occurrenceId =
        "table-local:duplicate-cell10";
      const missingInput = JSON.parse(JSON.stringify(duplicateInput));
      missingInput.financialSourceObservations =
        handoff.valueOccurrences.slice(1);

      const duplicateResult = collectExhaustiveFinancialEvidenceExperiment_(
        duplicateInput,
      );
      const missingResult = collectExhaustiveFinancialEvidenceExperiment_(
        missingInput,
      );

      assert.notOk(duplicateResult.collectionComplete);
      assert.ok(financialCollectionConflictCodes(duplicateResult).indexOf(
        "DUPLICATE_FINANCIAL_SOURCE_CONSUMPTION",
      ) >= 0);
      assert.equal(duplicateResult.sourceAccounting.dataCellCount, 7);
      assert.notOk(missingResult.collectionComplete);
      assert.ok(financialCollectionConflictCodes(missingResult).indexOf(
        "INCOMPLETE_TABLE_CELL_ACCOUNTING",
      ) >= 0);
      assert.equal(missingResult.sourceAccounting.accountedDataCellCount, 6);
    },
  );

  registerPermanentFinancialTest_(
    4,
    "financial collector provenance — invalid table header association fails closed",
    function (assert) {
      const fixture = recordedBolTableLocalRuntimeEvidenceFixture_();
      const handoff = buildRecordedTableLocalCollectorHandoffExperiment_(
        fixture,
        recordedBolTableLocalDispositionManifest_(),
      );
      const input = {
        sourceIntegrity: handoff.sourceIntegrity,
        tableEvidence: fixture.tableEvidence,
        tableAssessment: fixture.tableAssessment,
        financialSourceObservations: JSON.parse(JSON.stringify(
          handoff.valueOccurrences,
        )),
        structuralSourceEvidence: handoff.structuralEvidence,
      };
      input.financialSourceObservations[0].headerCellRef = "cell1";

      const result = collectExhaustiveFinancialEvidenceExperiment_(input);

      assert.notOk(result.collectionComplete);
      assert.ok(financialCollectionConflictCodes(result).indexOf(
        "INVALID_TABLE_CELL_SOURCE_REFERENCE",
      ) >= 0);
      assert.equal(result.sourceAccounting.validSourceReferenceCount, 6);
      assert.equal(result.canonicalReceipt, null);
    },
  );

  registerPermanentFinancialTest_(
    7,
    "financial collector provenance — table cannot masquerade as line and unresolved table stays closed",
    function (assert) {
      const fixture = recordedBolTableLocalRuntimeEvidenceFixture_();
      const handoff = buildRecordedTableLocalCollectorHandoffExperiment_(
        fixture,
        recordedBolTableLocalDispositionManifest_(),
      );
      const masquerade = {
        sourceIntegrity: handoff.sourceIntegrity,
        tableEvidence: fixture.tableEvidence,
        tableAssessment: fixture.tableAssessment,
        financialSourceObservations: JSON.parse(JSON.stringify(
          handoff.valueOccurrences,
        )),
        structuralSourceEvidence: handoff.structuralEvidence,
      };
      masquerade.financialSourceObservations.forEach(function (item) {
        item.provenanceKind = "observed_line";
      });
      const unresolved = JSON.parse(JSON.stringify(masquerade));
      unresolved.financialSourceObservations.forEach(function (item) {
        item.provenanceKind = "table_cell";
      });
      unresolved.tableAssessment.resolved = false;

      const masqueradeResult = collectExhaustiveFinancialEvidenceExperiment_(
        masquerade,
      );
      const unresolvedResult = collectExhaustiveFinancialEvidenceExperiment_(
        unresolved,
      );

      assert.notOk(masqueradeResult.collectionComplete);
      assert.equal(
        financialCollectionConflictCodes(masqueradeResult)[0],
        "MISSING_OBSERVED_LINE_PROVENANCE_SOURCE",
      );
      assert.notOk(unresolvedResult.collectionComplete);
      assert.ok(financialCollectionConflictCodes(unresolvedResult).indexOf(
        "UNRESOLVED_TABLE_EVIDENCE",
      ) >= 0);
      assert.equal(JSON.stringify(unresolvedResult).indexOf("sourceLineOrders"), -1);
      assert.equal(unresolvedResult.canonicalReceipt, null);
      assert.equal(handoff.collector.sourceAccounting.provenanceKind, "table_cell");
    },
  );

  // ==================================================
  // MULTI-DOMAIN FINANCIAL EVIDENCE PACKAGE EXPERIMENT
  // ==================================================

  registerPermanentFinancialTest_(
    9,
    "financial collector provenance — recorded Bol domains remain independently complete in one package",
    function (assert) {
      const tableFixture = recordedBolTableLocalRuntimeEvidenceFixture_();
      const lineFixture = recordedBolStage1V2RuntimeEvidenceFixture_();
      const replay = buildRecordedBolMultiDomainEvidencePackageExperiment_(
        tableFixture,
        lineFixture,
      );
      const result = replay.packageResult;

      assert.ok(replay.sourceFixturesUnchanged);
      assert.ok(result.collectionComplete);
      assert.equal(result.crossRepresentationAlignment, "unresolved");
      assert.equal(result.canonicalReceipt, null);
      assert.equal(result.evidenceDomains.length, 2);
      assert.ok(compactJsonEquality(
        result.evidenceDomains.map(function (domain) {
          return domain.provenanceKind;
        }),
        ["table_cell", "observed_line"],
      ));
      assert.ok(compactJsonEquality(result.sourceAccounting.domains[0], {
        domainId: "recorded-bol-table-local",
        provenanceKind: "table_cell",
        sourceScopeKind: "complete_table_region",
        includedSourceCount: 14,
        excludedSourceCount: 0,
        accountedSourceCount: 14,
        valueOccurrenceCount: 5,
        structuralEvidenceCount: 2,
        contextEvidenceCount: 7,
        unresolvedEvidenceCount: 0,
        collectionComplete: true,
      }));
      assert.ok(compactJsonEquality(result.sourceAccounting.domains[1], {
        domainId: "recorded-bol-observed-line-summary",
        provenanceKind: "observed_line",
        sourceScopeKind: "observed_lines_by_role:summary",
        includedSourceCount: 4,
        excludedSourceCount: 9,
        accountedSourceCount: 4,
        valueOccurrenceCount: 5,
        structuralEvidenceCount: 0,
        contextEvidenceCount: 0,
        unresolvedEvidenceCount: 0,
        collectionComplete: true,
      }));
      assert.ok(compactJsonEquality(result.sourceAccounting, {
        domainCount: 2,
        uniqueDomainIdCount: 2,
        provenanceDomainCount: 2,
        unresolvedDomainCount: 0,
        valueOccurrenceCount: 10,
        structuralEvidenceCount: 2,
        contextEvidenceCount: 7,
        sourceUnchanged: true,
        domains: result.sourceAccounting.domains,
      }));
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial collector provenance — equal Bol values remain distinct across provenance domains",
    function (assert) {
      const replay = buildRecordedBolMultiDomainEvidencePackageExperiment_(
        recordedBolTableLocalRuntimeEvidenceFixture_(),
        recordedBolStage1V2RuntimeEvidenceFixture_(),
      );
      const tableValues = replay.tableDomain.collection.observations;
      const lineValues = replay.observedLineSummaryDomain.collection.observations;
      const tableNinetyOne = tableValues.filter(function (item) {
        return item.rawValue === "€ 91,00";
      });
      const lineNinetyOne = lineValues.filter(function (item) {
        return item.rawValue === "€ 91,00";
      });
      const fifteenSeventyNine = [
        tableValues.filter(function (item) {
          return item.rawValue === "€ 15,79";
        })[0],
        lineValues.filter(function (item) {
          return item.rawValue === "€ 15,79";
        })[0],
      ];

      assert.equal(tableNinetyOne.length, 2);
      assert.equal(lineNinetyOne.length, 2);
      assert.equal(tableNinetyOne.length + lineNinetyOne.length, 4);
      assert.ok(new Set(
        tableNinetyOne.map(function (item) {
          return "table_cell|" + item.occurrenceId;
        }).concat(lineNinetyOne.map(function (item) {
          return "observed_line|" + item.observationId;
        })),
      ).size === 4);
      assert.ok(
        fifteenSeventyNine[0].provenanceKind === "table_cell" &&
        fifteenSeventyNine[1].provenanceKind === "observed_line",
      );
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial collector provenance — package identity and domain shape fail closed",
    function (assert) {
      const replay = buildRecordedBolMultiDomainEvidencePackageExperiment_(
        recordedBolTableLocalRuntimeEvidenceFixture_(),
        recordedBolStage1V2RuntimeEvidenceFixture_(),
      );
      const mismatchDomains = JSON.parse(JSON.stringify(
        replay.packageResult.evidenceDomains,
      ));
      mismatchDomains[1].sourceDocumentSha256 = "different-source-sha";
      const mismatch = buildMultiDomainFinancialEvidencePackageExperiment_(
        replay.packageResult.sourceDocumentIdentity,
        mismatchDomains,
      );
      const missingKindDomains = JSON.parse(JSON.stringify(
        replay.packageResult.evidenceDomains,
      ));
      delete missingKindDomains[1].provenanceKind;
      const missingKind = buildMultiDomainFinancialEvidencePackageExperiment_(
        replay.packageResult.sourceDocumentIdentity,
        missingKindDomains,
      );
      const unsupportedDomains = JSON.parse(JSON.stringify(
        replay.packageResult.evidenceDomains,
      ));
      unsupportedDomains[1].provenanceKind = "ocr_box";
      const unsupported = buildMultiDomainFinancialEvidencePackageExperiment_(
        replay.packageResult.sourceDocumentIdentity,
        unsupportedDomains,
      );
      const alignedDomains = JSON.parse(JSON.stringify(
        replay.packageResult.evidenceDomains,
      ));
      alignedDomains[0].crossRepresentationRef = "forbidden";
      const aligned = buildMultiDomainFinancialEvidencePackageExperiment_(
        replay.packageResult.sourceDocumentIdentity,
        alignedDomains,
      );

      assert.notOk(mismatch.collectionComplete);
      assert.ok(mismatch.conflicts.some(function (conflict) {
        return conflict.code === "SOURCE_DOCUMENT_IDENTITY_MISMATCH";
      }));
      assert.ok(!missingKind.collectionComplete && missingKind.conflicts.some(
        function (conflict) {
          return conflict.code === "INVALID_EVIDENCE_DOMAIN_SHAPE";
        },
      ));
      assert.ok(unsupported.conflicts.some(function (conflict) {
        return conflict.code === "UNSUPPORTED_EVIDENCE_DOMAIN_PROVENANCE";
      }));
      assert.notOk(aligned.collectionComplete);
      assert.ok(aligned.conflicts.some(function (conflict) {
        return conflict.code === "INVALID_EVIDENCE_DOMAIN_SHAPE";
      }));
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial collector provenance — incomplete domains cannot compensate for one another",
    function (assert) {
      const replay = buildRecordedBolMultiDomainEvidencePackageExperiment_(
        recordedBolTableLocalRuntimeEvidenceFixture_(),
        recordedBolStage1V2RuntimeEvidenceFixture_(),
      );
      const identity = replay.packageResult.sourceDocumentIdentity;
      function withDomainMutation(index, mutate) {
        const domains = JSON.parse(JSON.stringify(
          replay.packageResult.evidenceDomains,
        ));
        mutate(domains[index]);
        return buildMultiDomainFinancialEvidencePackageExperiment_(
          identity,
          domains,
        );
      }
      const tableIncomplete = withDomainMutation(0, function (domain) {
        domain.collection.collectionComplete = false;
      });
      const lineIncomplete = withDomainMutation(1, function (domain) {
        domain.collection.collectionComplete = false;
      });
      const tableDuplicate = withDomainMutation(0, function (domain) {
        domain.collection.collectionComplete = false;
        domain.collection.conflicts.push({
          code: "DUPLICATE_FINANCIAL_SOURCE_CONSUMPTION",
        });
      });
      const lineDuplicate = withDomainMutation(1, function (domain) {
        domain.collection.collectionComplete = false;
        domain.collection.conflicts.push({
          code: "DUPLICATE_FINANCIAL_SOURCE_CONSUMPTION",
        });
      });
      const incompleteScope = withDomainMutation(1, function (domain) {
        domain.sourceScope.completeWithinScope = false;
      });

      assert.notOk(tableIncomplete.collectionComplete);
      assert.notOk(lineIncomplete.collectionComplete);
      assert.notOk(tableDuplicate.collectionComplete);
      assert.notOk(lineDuplicate.collectionComplete);
      assert.notOk(incompleteScope.collectionComplete);
      assert.ok([
        tableIncomplete,
        lineIncomplete,
        tableDuplicate,
        lineDuplicate,
      ].every(function (result) {
        return result.sourceAccounting.unresolvedDomainCount === 1;
      }));
    },
  );

  registerPermanentFinancialTest_(
    4,
    "financial collector provenance — package is additive and stops before interpretation",
    function (assert) {
      const replay = buildRecordedBolMultiDomainEvidencePackageExperiment_(
        recordedBolTableLocalRuntimeEvidenceFixture_(),
        recordedBolStage1V2RuntimeEvidenceFixture_(),
      );

      assert.ok(replay.tableDomain.collection.collectionComplete);
      assert.ok(replay.observedLineSummaryDomain.collection.collectionComplete);
      assert.ok(
        collectExhaustiveFinancialEvidenceExperiment_(
          huboFinancialCollectionFixture(),
        ).collectionComplete,
      );
      assert.ok(
        !replay.interpreterInvoked &&
        !replay.canonicalReleaseInvoked &&
        replay.packageResult.canonicalReceipt === null,
      );
    },
  );

  // ==================================================
  // GOVERNED MULTI-DOMAIN SEMANTIC ROLE EXPERIMENT
  // ==================================================

  function recordedBolGovernedSemanticReplayExperiment_() {
    const packageReplay = buildRecordedBolMultiDomainEvidencePackageExperiment_(
      recordedBolTableLocalRuntimeEvidenceFixture_(),
      recordedBolStage1V2RuntimeEvidenceFixture_(),
    );
    const vocabulary = buildRecordedBolGovernedSemanticVocabularyExperiment_();
    return {
      packageReplay: packageReplay,
      vocabulary: vocabulary,
      projection: projectGovernedMultiDomainFinancialSemanticsExperiment_(
        packageReplay.packageResult,
        vocabulary,
      ),
    };
  }

  function governedSemanticOccurrenceIndexExperiment_(projection) {
    const byId = {};
    projection.semanticDomains.forEach(function (domain) {
      domain.semanticOccurrences.forEach(function (occurrence) {
        byId[occurrence.occurrenceId] = occurrence;
      });
    });
    return byId;
  }

  registerPermanentFinancialTest_(
    12,
    "financial semantic governance — recorded Bol package promotes only exact governed literals",
    function (assert) {
      const result = recordedBolGovernedSemanticReplayExperiment_().projection;

      assert.ok(result.collectionComplete);
      assert.equal(result.semanticResolutionStatus, "PARTIAL");
      assert.notOk(result.semanticComplete);
      assert.equal(result.conflicts.length, 0);
      assert.equal(result.semanticDomains.length, 2);
      assert.ok(compactJsonEquality(
        result.semanticDomains.map(function (domain) {
          return domain.provenanceKind;
        }),
        ["table_cell", "observed_line"],
      ));
      assert.ok(compactJsonEquality(
        result.semanticDomains[0].semanticAccounting,
        {
          sourceValueOccurrenceCount: 5,
          promotedOccurrenceCount: 5,
          unresolvedOccurrenceCount: 0,
          structuralEvidenceCount: 2,
          contextEvidenceCount: 7,
        },
      ));
      assert.ok(compactJsonEquality(
        result.semanticDomains[1].semanticAccounting,
        {
          sourceValueOccurrenceCount: 5,
          promotedOccurrenceCount: 3,
          unresolvedOccurrenceCount: 2,
          structuralEvidenceCount: 0,
          contextEvidenceCount: 0,
        },
      ));
      assert.ok(compactJsonEquality(
        {
          source: result.sourceAccounting.sourceValueOccurrenceCount,
          promoted: result.sourceAccounting.promotedOccurrenceCount,
          unresolved: result.sourceAccounting.unresolvedOccurrenceCount,
        },
        { source: 10, promoted: 8, unresolved: 2 },
      ));
      assert.equal(result.unresolvedSemanticEvidence.length, 2);
      assert.equal(result.crossRepresentationAlignment, "unresolved");
      assert.equal(result.canonicalReceipt, null);
    },
  );

  registerPermanentFinancialTest_(
    8,
    "financial semantic governance — governed roles remain separate from VAT basis",
    function (assert) {
      const result = recordedBolGovernedSemanticReplayExperiment_().projection;
      const byId = governedSemanticOccurrenceIndexExperiment_(
        result,
      );
      function roleAndBasis(id, role, basis) {
        return byId[id].governedSemanticRole === role &&
          byId[id].governedBasis === basis;
      }

      assert.ok(roleAndBasis(
        "table-local:region1:row2:cell9", "QUANTITY", null,
      ));
      assert.ok(roleAndBasis(
        "table-local:region1:row2:cell10", "UNIT_PRICE", null,
      ));
      assert.ok(roleAndBasis(
        "table-local:region1:row2:cell12", "LINE_AMOUNT", null,
      ));
      assert.ok(roleAndBasis(
        "table-local:region1:row2:cell13", "VAT_RATE", null,
      ));
      assert.ok(roleAndBasis(
        "table-local:region1:row2:cell14", "VAT_AMOUNT", null,
      ));
      assert.ok(roleAndBasis(
        "bol-live-line10-excl", "DOCUMENT_SUBTOTAL", "EXCL_VAT",
      ));
      assert.ok(roleAndBasis(
        "bol-live-line12-incl", "DOCUMENT_TOTAL", "INCL_VAT",
      ));
      assert.ok(
        byId["table-local:region1:row2:cell10"].sourceDocumentSha256 ===
          result.sourceDocumentIdentity.sha256 &&
        byId["table-local:region1:row2:cell10"].physicalReference.cellId ===
          "cell10" &&
        byId["bol-live-line10-excl"].physicalReference.sourceLineOrders[0] ===
          10 &&
        byId["bol-live-line10-excl"].promotionEvidence.ruleId ===
          "BOL_SUMMARY_SUBTOTAL_EX_BTW",
      );
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial semantic governance — bare total and unsupported summary values keep unresolved basis",
    function (assert) {
      const result = recordedBolGovernedSemanticReplayExperiment_().projection;
      const byId = governedSemanticOccurrenceIndexExperiment_(result);
      const bareTotal = byId["bol-live-line13-bare-total"];
      const unresolvedRate = byId["bol-live-line11-vat-rate"];
      const unresolvedAmount = byId["bol-live-line11-vat-amount"];

      assert.ok(
        bareTotal.governedSemanticRole === "DOCUMENT_TOTAL" &&
        bareTotal.governedBasis === null,
      );
      assert.ok(
        unresolvedRate.semanticStatus === "UNRESOLVED" &&
        unresolvedRate.governedSemanticRole === null &&
        unresolvedRate.governedBasis === null,
      );
      assert.ok(
        unresolvedAmount.semanticStatus === "UNRESOLVED" &&
        unresolvedAmount.governedSemanticRole === null &&
        unresolvedAmount.governedBasis === null,
      );
      assert.ok(compactJsonEquality(
        result.unresolvedSemanticEvidence.map(function (item) {
          return item.occurrenceId;
        }),
        ["bol-live-line11-vat-rate", "bol-live-line11-vat-amount"],
      ));
      assert.ok(
        byId["bol-live-line12-incl"].rawValue === bareTotal.rawValue &&
        byId["bol-live-line12-incl"].governedBasis === "INCL_VAT" &&
        bareTotal.governedBasis === null,
      );
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial semantic governance — equal values retain independent domain identities",
    function (assert) {
      const result = recordedBolGovernedSemanticReplayExperiment_().projection;
      const occurrences = result.semanticDomains.reduce(function (all, domain) {
        return all.concat(domain.semanticOccurrences.map(function (item) {
          return { domainId: domain.domainId, occurrence: item };
        }));
      }, []);
      const ninetyOne = occurrences.filter(function (item) {
        return item.occurrence.rawValue === "€ 91,00";
      });
      const fifteenSeventyNine = occurrences.filter(function (item) {
        return item.occurrence.rawValue === "€ 15,79";
      });

      assert.equal(ninetyOne.length, 4);
      assert.equal(new Set(ninetyOne.map(function (item) {
        return item.domainId + "|" + item.occurrence.occurrenceId;
      })).size, 4);
      assert.ok(compactJsonEquality(
        ninetyOne.reduce(function (counts, item) {
          counts[item.occurrence.provenanceKind] += 1;
          return counts;
        }, { table_cell: 0, observed_line: 0 }),
        { table_cell: 2, observed_line: 2 },
      ));
      assert.equal(fifteenSeventyNine.length, 2);
      assert.ok(
        fifteenSeventyNine[0].occurrence.provenanceKind !==
          fifteenSeventyNine[1].occurrence.provenanceKind,
      );
      assert.ok(
        result.crossRepresentationAlignment === "unresolved" &&
        JSON.stringify(result).indexOf("crossRepresentationRef") < 0,
      );
    },
  );

  registerPermanentFinancialTest_(
    4,
    "financial semantic governance — unknown literal stays visible and unresolved",
    function (assert) {
      const replay = recordedBolGovernedSemanticReplayExperiment_();
      const sourcePackage = JSON.parse(JSON.stringify(
        replay.packageReplay.packageResult,
      ));
      sourcePackage.evidenceDomains[0].collection.observations[0]
        .literalHeaderRawText = "Unsupported literal";
      sourcePackage.evidenceDomains[0].collection.contextObservations[1]
        .rawText = "Unsupported literal";
      const result = projectGovernedMultiDomainFinancialSemanticsExperiment_(
        sourcePackage,
        replay.vocabulary,
      );
      const occurrence = governedSemanticOccurrenceIndexExperiment_(result)[
        "table-local:region1:row2:cell9"
      ];

      assert.equal(occurrence.semanticStatus, "UNRESOLVED");
      assert.equal(occurrence.governedSemanticRole, null);
      assert.equal(occurrence.governedBasis, null);
      assert.ok(
        occurrence.rawValue === "1" &&
        occurrence.promotionEvidence === null &&
        result.unresolvedSemanticEvidence.some(function (item) {
          return item.occurrenceId === occurrence.occurrenceId;
        }),
      );
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial semantic governance — conflicting vocabulary fails closed",
    function (assert) {
      const replay = recordedBolGovernedSemanticReplayExperiment_();
      const vocabulary = JSON.parse(JSON.stringify(replay.vocabulary));
      const conflicting = JSON.parse(JSON.stringify(vocabulary.rules[0]));
      conflicting.ruleId = "CONFLICTING_AANTAL_ROLE";
      conflicting.semanticRole = "LINE_AMOUNT";
      vocabulary.rules.push(conflicting);
      const result = projectGovernedMultiDomainFinancialSemanticsExperiment_(
        replay.packageReplay.packageResult,
        vocabulary,
      );

      assert.equal(result.semanticResolutionStatus, "CONTRADICTORY");
      assert.notOk(result.semanticComplete);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "CONFLICTING_GOVERNED_SEMANTIC_RULE";
      }));
      assert.equal(result.sourceAccounting.promotedOccurrenceCount, 0);
      assert.equal(result.canonicalReceipt, null);
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial semantic governance — incomplete package cannot become semantically complete",
    function (assert) {
      const replay = recordedBolGovernedSemanticReplayExperiment_();
      const incompletePackage = JSON.parse(JSON.stringify(
        replay.packageReplay.packageResult,
      ));
      incompletePackage.collectionComplete = false;
      const result = projectGovernedMultiDomainFinancialSemanticsExperiment_(
        incompletePackage,
        replay.vocabulary,
      );

      assert.notOk(result.collectionComplete);
      assert.equal(result.semanticResolutionStatus, "BLOCKED_INPUT");
      assert.notOk(result.semanticComplete);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "INCOMPLETE_MULTI_DOMAIN_EVIDENCE_PACKAGE";
      }));
      assert.ok(
        result.sourceAccounting.promotedOccurrenceCount === 0 &&
        result.sourceAccounting.unresolvedOccurrenceCount === 10,
      );
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial semantic governance — projection is immutable and stops before interpretation",
    function (assert) {
      const replay = recordedBolGovernedSemanticReplayExperiment_();
      const packageSnapshot = JSON.stringify(replay.packageReplay.packageResult);
      const vocabularySnapshot = JSON.stringify(replay.vocabulary);
      const result = replay.projection;

      assert.equal(
        JSON.stringify(replay.packageReplay.packageResult),
        packageSnapshot,
      );
      assert.equal(JSON.stringify(replay.vocabulary), vocabularySnapshot);
      assert.ok(result.sourceAccounting.sourcePackageUnchanged);
      assert.ok(result.sourceAccounting.vocabularyUnchanged);
      assert.ok(
        !result.interpreterInvoked &&
        !result.canonicalReleaseInvoked &&
        result.canonicalReceipt === null,
      );
    },
  );

  // ==================================================
  // BOUNDED COMPOSITE-LITERAL EVIDENCE EXPERIMENT
  // ==================================================

  function recordedBolCompositeSemanticReplayExperiment_() {
    const governed = recordedBolGovernedSemanticReplayExperiment_();
    const vocabulary =
      buildRecordedBolCompositeLiteralVocabularyExperiment_();
    return {
      governed: governed,
      vocabulary: vocabulary,
      projection: projectGovernedCompositeLiteralSemanticsExperiment_(
        governed.projection,
        vocabulary,
      ),
    };
  }

  function recordedBolObservedSemanticDomainExperiment_(projection) {
    return projection.semanticDomains.filter(function (domain) {
      return domain.provenanceKind === "observed_line";
    })[0];
  }

  function recordedBolLine11CompositeMembersExperiment_(projection) {
    const byId = governedSemanticOccurrenceIndexExperiment_(projection);
    return {
      rate: byId["bol-live-line11-vat-rate"],
      amount: byId["bol-live-line11-vat-amount"],
    };
  }

  function recordedBolLine11SourceIndexExperiment_(projection) {
    const byId = {};
    recordedBolObservedSemanticDomainExperiment_(projection)
      .sourceDomain.collection.observations.forEach(function (observation) {
        byId[observation.observationId] = observation;
      });
    return byId;
  }

  registerPermanentFinancialTest_(
    9,
    "financial composite evidence — exact recorded Bol members promote as one governed composite",
    function (assert) {
      const result = recordedBolCompositeSemanticReplayExperiment_().projection;
      const members = recordedBolLine11CompositeMembersExperiment_(result);

      assert.ok(result.semanticComplete);
      assert.equal(result.semanticResolutionStatus, "RESOLVED");
      assert.equal(result.unresolvedSemanticEvidence.length, 0);
      assert.equal(result.conflicts.length, 0);
      assert.equal(result.compositeEvidence.promotions.length, 1);
      assert.ok(compactJsonEquality(
        result.compositeEvidence.promotions[0].orderedMembers.map(
          function (member) { return member.occurrenceId; },
        ),
        ["bol-live-line11-vat-rate", "bol-live-line11-vat-amount"],
      ));
      assert.ok(
        members.rate.semanticStatus === "PROMOTED" &&
        members.rate.governedSemanticRole === "VAT_RATE",
      );
      assert.ok(
        members.amount.semanticStatus === "PROMOTED" &&
        members.amount.governedSemanticRole === "VAT_AMOUNT",
      );
      assert.ok(
        result.sourceAccounting.sourceValueOccurrenceCount === 10 &&
        result.sourceAccounting.promotedOccurrenceCount === 10 &&
        result.sourceAccounting.unresolvedOccurrenceCount === 0,
      );
    },
  );

  registerPermanentFinancialTest_(
    9,
    "financial composite evidence — provenance literal context and null basis survive promotion",
    function (assert) {
      const result = recordedBolCompositeSemanticReplayExperiment_().projection;
      const members = recordedBolLine11CompositeMembersExperiment_(result);
      const promotion = result.compositeEvidence.promotions[0];

      assert.equal(members.rate.governedBasis, null);
      assert.equal(members.amount.governedBasis, null);
      assert.ok(
        members.rate.provenanceKind === "observed_line" &&
        members.amount.provenanceKind === "observed_line",
      );
      assert.ok(
        members.rate.sourceDocumentSha256 ===
          result.sourceDocumentIdentity.sha256 &&
        members.amount.sourceDocumentSha256 ===
          result.sourceDocumentIdentity.sha256,
      );
      assert.ok(compactJsonEquality(
        [members.rate.physicalReference, members.amount.physicalReference],
        [
          { sourceLineOrders: [11], occurrenceOrder: 1, groupId: null, regionId: null, rowId: null, cellId: null },
          { sourceLineOrders: [11], occurrenceOrder: 2, groupId: null, regionId: null, rowId: null, cellId: null },
        ],
      ));
      assert.ok(compactJsonEquality(
        [members.rate.rawValue, members.amount.rawValue],
        ["21%", "€ 15,79"],
      ));
      assert.equal(members.rate.literalEvidence.text, "BTW");
      assert.ok(compactJsonEquality(
        members.amount.literalEvidence.adjacentUninterpretedFragments,
        [{ rawText: "BTW", sourceLineOrders: [11] }],
      ));
      assert.ok(
        promotion.ruleId === "BOL_SUMMARY_ORDERED_BTW_RATE_AMOUNT" &&
        promotion.sourceLineOrder === 11 &&
        promotion.orderedMembers.length === 2,
      );
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial composite evidence — reversed order or missing BTW context fails closed",
    function (assert) {
      const replay = recordedBolCompositeSemanticReplayExperiment_();
      const reversed = JSON.parse(JSON.stringify(replay.governed.projection));
      const reversedMembers = recordedBolLine11CompositeMembersExperiment_(reversed);
      const reversedSources = recordedBolLine11SourceIndexExperiment_(reversed);
      reversedMembers.rate.physicalReference.occurrenceOrder = 2;
      reversedMembers.amount.physicalReference.occurrenceOrder = 1;
      reversedSources[reversedMembers.rate.occurrenceId].sourceRef.occurrenceOrder = 2;
      reversedSources[reversedMembers.amount.occurrenceId].sourceRef.occurrenceOrder = 1;
      const reversedResult = projectGovernedCompositeLiteralSemanticsExperiment_(
        reversed,
        replay.vocabulary,
      );
      const missingLabel = JSON.parse(JSON.stringify(replay.governed.projection));
      recordedBolLine11CompositeMembersExperiment_(missingLabel)
        .rate.literalEvidence.text = null;
      recordedBolLine11SourceIndexExperiment_(missingLabel)
        ["bol-live-line11-vat-rate"].printedLabelText = null;
      const missingLabelResult =
        projectGovernedCompositeLiteralSemanticsExperiment_(
          missingLabel,
          replay.vocabulary,
        );
      const missingAdjacent = JSON.parse(JSON.stringify(replay.governed.projection));
      recordedBolLine11CompositeMembersExperiment_(missingAdjacent)
        .amount.literalEvidence.adjacentUninterpretedFragments = [];
      recordedBolLine11SourceIndexExperiment_(missingAdjacent)
        ["bol-live-line11-vat-amount"].adjacentUninterpretedFragments = [];
      const missingAdjacentResult =
        projectGovernedCompositeLiteralSemanticsExperiment_(
          missingAdjacent,
          replay.vocabulary,
        );

      assert.equal(reversedResult.compositeEvidence.promotions.length, 0);
      assert.equal(reversedResult.unresolvedSemanticEvidence.length, 2);
      assert.equal(missingLabelResult.compositeEvidence.promotions.length, 0);
      assert.equal(missingAdjacentResult.compositeEvidence.promotions.length, 0);
      assert.ok(
        reversedResult.semanticResolutionStatus === "PARTIAL" &&
        missingLabelResult.semanticResolutionStatus === "PARTIAL" &&
        missingAdjacentResult.semanticResolutionStatus === "PARTIAL",
      );
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial composite evidence — missing or extra numeric members fail closed",
    function (assert) {
      const replay = recordedBolCompositeSemanticReplayExperiment_();
      const missing = JSON.parse(JSON.stringify(replay.governed.projection));
      const missingDomain = recordedBolObservedSemanticDomainExperiment_(missing);
      missingDomain.semanticOccurrences = missingDomain.semanticOccurrences.filter(
        function (item) {
          return item.occurrenceId !== "bol-live-line11-vat-amount";
        },
      );
      missingDomain.sourceDomain.collection.observations =
        missingDomain.sourceDomain.collection.observations.filter(
          function (item) {
            return item.observationId !== "bol-live-line11-vat-amount";
          },
        );
      const missingResult = projectGovernedCompositeLiteralSemanticsExperiment_(
        missing,
        replay.vocabulary,
      );
      const extra = JSON.parse(JSON.stringify(replay.governed.projection));
      const extraDomain = recordedBolObservedSemanticDomainExperiment_(extra);
      const extraOccurrence = JSON.parse(JSON.stringify(
        recordedBolLine11CompositeMembersExperiment_(extra).amount,
      ));
      const extraSource = JSON.parse(JSON.stringify(
        recordedBolLine11SourceIndexExperiment_(extra)
          ["bol-live-line11-vat-amount"],
      ));
      extraOccurrence.occurrenceId = "bol-live-line11-extra-amount";
      extraOccurrence.physicalReference.occurrenceOrder = 3;
      extraSource.observationId = extraOccurrence.occurrenceId;
      extraSource.sourceRef.occurrenceOrder = 3;
      extraDomain.semanticOccurrences.push(extraOccurrence);
      extraDomain.sourceDomain.collection.observations.push(extraSource);
      const extraResult = projectGovernedCompositeLiteralSemanticsExperiment_(
        extra,
        replay.vocabulary,
      );

      assert.equal(missingResult.compositeEvidence.promotions.length, 0);
      assert.equal(missingResult.unresolvedSemanticEvidence.length, 1);
      assert.equal(extraResult.compositeEvidence.promotions.length, 0);
      assert.equal(extraResult.unresolvedSemanticEvidence.length, 3);
      assert.ok(
        missingResult.semanticResolutionStatus === "PARTIAL" &&
        extraResult.semanticResolutionStatus === "PARTIAL",
      );
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial composite evidence — members cannot cross lines or provenance domains",
    function (assert) {
      const replay = recordedBolCompositeSemanticReplayExperiment_();
      const splitLine = JSON.parse(JSON.stringify(replay.governed.projection));
      const splitMembers = recordedBolLine11CompositeMembersExperiment_(splitLine);
      const splitSources = recordedBolLine11SourceIndexExperiment_(splitLine);
      splitMembers.amount.physicalReference.sourceLineOrders = [12];
      splitSources[splitMembers.amount.occurrenceId].sourceRef.sourceLineOrders = [12];
      const splitLineResult =
        projectGovernedCompositeLiteralSemanticsExperiment_(
          splitLine,
          replay.vocabulary,
        );
      const splitDomain = JSON.parse(JSON.stringify(replay.governed.projection));
      const observedDomain = recordedBolObservedSemanticDomainExperiment_(splitDomain);
      const tableDomain = splitDomain.semanticDomains.filter(function (domain) {
        return domain.provenanceKind === "table_cell";
      })[0];
      const amountOccurrence = observedDomain.semanticOccurrences.splice(
        observedDomain.semanticOccurrences.findIndex(function (item) {
          return item.occurrenceId === "bol-live-line11-vat-amount";
        }),
        1,
      )[0];
      const amountSource = observedDomain.sourceDomain.collection.observations.splice(
        observedDomain.sourceDomain.collection.observations.findIndex(
          function (item) {
            return item.observationId === "bol-live-line11-vat-amount";
          },
        ),
        1,
      )[0];
      amountOccurrence.provenanceKind = "table_cell";
      amountSource.provenanceKind = "table_cell";
      tableDomain.semanticOccurrences.push(amountOccurrence);
      tableDomain.sourceDomain.collection.observations.push(amountSource);
      const splitDomainResult =
        projectGovernedCompositeLiteralSemanticsExperiment_(
          splitDomain,
          replay.vocabulary,
        );

      assert.equal(splitLineResult.compositeEvidence.promotions.length, 0);
      assert.equal(splitLineResult.unresolvedSemanticEvidence.length, 2);
      assert.equal(splitDomainResult.compositeEvidence.promotions.length, 0);
      assert.equal(splitDomainResult.unresolvedSemanticEvidence.length, 2);
      assert.ok(
        splitLineResult.semanticResolutionStatus === "PARTIAL" &&
        splitDomainResult.semanticResolutionStatus === "PARTIAL",
      );
    },
  );

  registerPermanentFinancialTest_(
    4,
    "financial composite evidence — equal table-cell values cannot assist a broken line composite",
    function (assert) {
      const replay = recordedBolCompositeSemanticReplayExperiment_();
      const broken = JSON.parse(JSON.stringify(replay.governed.projection));
      recordedBolLine11CompositeMembersExperiment_(broken)
        .amount.literalEvidence.adjacentUninterpretedFragments = [];
      recordedBolLine11SourceIndexExperiment_(broken)
        ["bol-live-line11-vat-amount"].adjacentUninterpretedFragments = [];
      const tableDomain = broken.semanticDomains.filter(function (domain) {
        return domain.provenanceKind === "table_cell";
      })[0];
      const tableValues = tableDomain.semanticOccurrences.map(function (item) {
        return item.rawValue;
      });
      const result = projectGovernedCompositeLiteralSemanticsExperiment_(
        broken,
        replay.vocabulary,
      );

      assert.ok(
        tableValues.indexOf("21%") >= 0 &&
        tableValues.indexOf("€ 15,79") >= 0,
      );
      assert.equal(result.compositeEvidence.promotions.length, 0);
      assert.equal(result.unresolvedSemanticEvidence.length, 2);
      assert.equal(result.sourceAccounting.promotedOccurrenceCount, 8);
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial composite evidence — source and single-literal promotions remain immutable",
    function (assert) {
      const replay = recordedBolCompositeSemanticReplayExperiment_();
      const sourceSnapshot = JSON.stringify(replay.governed.projection);
      const vocabularySnapshot = JSON.stringify(replay.vocabulary);
      const priorPromotions = replay.governed.projection.semanticDomains
        .reduce(function (items, domain) {
          return items.concat(domain.semanticOccurrences);
        }, [])
        .filter(function (item) { return item.semanticStatus === "PROMOTED"; })
        .map(function (item) { return item.promotionEvidence; });
      const result = replay.projection;
      const retainedPromotions = result.semanticDomains.reduce(
        function (items, domain) {
          return items.concat(domain.semanticOccurrences);
        },
        [],
      ).filter(function (item) {
        return item.promotionEvidence &&
          item.promotionEvidence.literalEvidenceKind !==
            "ordered_same_line_composite";
      }).map(function (item) { return item.promotionEvidence; });

      assert.ok(
        JSON.stringify(replay.governed.projection) === sourceSnapshot,
        "Complete governed projection changed.",
      );
      assert.equal(JSON.stringify(replay.vocabulary), vocabularySnapshot);
      assert.ok(result.compositeEvidence.sourceProjectionUnchanged);
      assert.ok(result.compositeEvidence.vocabularyUnchanged);
      assert.ok(compactJsonEquality(retainedPromotions, priorPromotions));
    },
  );

  registerPermanentFinancialTest_(
    3,
    "financial composite evidence — projection stops before interpretation and canonical release",
    function (assert) {
      const result = recordedBolCompositeSemanticReplayExperiment_().projection;

      assert.notOk(result.interpreterInvoked);
      assert.notOk(result.canonicalReleaseInvoked);
      assert.ok(
        result.canonicalReceipt === null &&
        result.crossRepresentationAlignment === "unresolved",
      );
    },
  );

  // ==================================================
  // GOVERNED TO LEGACY INTERPRETATION ADAPTER EXPERIMENT
  // ==================================================

  function recordedBolGovernedInterpretationAdapterExperiment_() {
    return buildGovernedInterpretationInputExperiment_(
      recordedBolCompositeSemanticReplayExperiment_().projection,
    );
  }

  function adaptedGovernedOccurrencesExperiment_(result) {
    return result.adaptedDomains.reduce(function (all, domain) {
      return all.concat(domain.adaptedOccurrences);
    }, []);
  }

  registerPermanentFinancialTest_(
    11,
    "financial interpretation adapter — exact governed Bol replay fails closed at legacy coordinate boundary",
    function (assert) {
      const result = recordedBolGovernedInterpretationAdapterExperiment_();

      assert.ok(result.sourceUnchanged);
      assert.notOk(result.adapterResolved);
      assert.equal(result.adapterStatus, "BLOCKED_INTERPRETER_CONTRACT");
      assert.equal(result.sourceOccurrenceCount, 10);
      assert.equal(result.adaptedOccurrenceCount, 10);
      assert.equal(result.unresolvedOccurrenceCount, 0);
      assert.equal(result.conflicts.length, 0);
      assert.equal(result.crossRepresentationAlignment, "unresolved");
      assert.ok(!result.interpreterCompatible && !result.interpreterInvoked);
      assert.equal(
        result.firstUnresolvedBoundary,
        "INTERPRETER_REQUIRES_OBSERVED_LINE_ORDER_FOR_TABLE_CELL_PROVENANCE",
      );
      assert.ok(
        result.interpreterInput === null &&
        result.interpretationResult === null &&
        !result.canonicalReleaseInvoked &&
        result.canonicalReceipt === null,
      );
    },
  );

  registerPermanentFinancialTest_(
    7,
    "financial interpretation adapter — every occurrence retains unique domain provenance",
    function (assert) {
      const result = recordedBolGovernedInterpretationAdapterExperiment_();
      const occurrences = adaptedGovernedOccurrencesExperiment_(result);

      assert.equal(result.adaptedDomains.length, 2);
      assert.ok(compactJsonEquality(
        result.adaptedDomains.map(function (domain) {
          return domain.provenanceKind;
        }),
        ["table_cell", "observed_line"],
      ));
      assert.equal(occurrences.length, 10);
      assert.equal(new Set(occurrences.map(function (item) {
        return item.occurrenceId;
      })).size, 10);
      assert.ok(occurrences.every(function (item) {
        return item.originalDomainIdentity.provenanceKind ===
          item.provenanceKind;
      }));
      assert.ok(occurrences.every(function (item) {
        return item.sourceDocumentSha256 ===
          result.sourceDocumentIdentity.sha256;
      }));
      assert.ok(occurrences.every(function (item) {
        return typeof item.rawValue === "string" &&
          item.promotionEvidence && item.promotionEvidence.ruleId;
      }));
    },
  );

  registerPermanentFinancialTest_(
    8,
    "financial interpretation adapter — repeated equal values remain independent occurrences",
    function (assert) {
      const occurrences = adaptedGovernedOccurrencesExperiment_(
        recordedBolGovernedInterpretationAdapterExperiment_(),
      );
      const ninetyOne = occurrences.filter(function (item) {
        return item.rawValue === "€ 91,00";
      });
      const fifteenSeventyNine = occurrences.filter(function (item) {
        return item.rawValue === "€ 15,79";
      });

      assert.equal(ninetyOne.length, 4);
      assert.equal(new Set(ninetyOne.map(function (item) {
        return item.occurrenceId;
      })).size, 4);
      assert.equal(new Set(ninetyOne.map(function (item) {
        return item.provenanceKind + "|" + JSON.stringify(
          item.tableLocalRef || item.sourceRef,
        );
      })).size, 4);
      assert.ok(compactJsonEquality(
        ninetyOne.reduce(function (counts, item) {
          counts[item.provenanceKind] += 1;
          return counts;
        }, { table_cell: 0, observed_line: 0 }),
        { table_cell: 2, observed_line: 2 },
      ));
      assert.equal(fifteenSeventyNine.length, 2);
      assert.equal(new Set(fifteenSeventyNine.map(function (item) {
        return item.occurrenceId;
      })).size, 2);
      assert.notEqual(
        fifteenSeventyNine[0].provenanceKind,
        fifteenSeventyNine[1].provenanceKind,
      );
      assert.ok(
        occurrences.filter(function (item) {
          return item.governedSemanticRole === "UNIT_PRICE";
        })[0].occurrenceId !==
        occurrences.filter(function (item) {
          return item.governedSemanticRole === "LINE_AMOUNT";
        })[0].occurrenceId,
      );
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial interpretation adapter — table-cell provenance is never converted to line provenance",
    function (assert) {
      const result = recordedBolGovernedInterpretationAdapterExperiment_();
      const tableDomain = result.adaptedDomains[0];
      const occurrences = tableDomain.adaptedOccurrences;

      assert.equal(tableDomain.provenanceKind, "table_cell");
      assert.equal(occurrences.length, 5);
      assert.ok(occurrences.every(function (item) {
        return item.tableLocalRef !== null;
      }));
      assert.ok(occurrences.every(function (item) {
        return item.sourceRef === null;
      }));
      assert.ok(occurrences.every(function (item) {
        return !("sourceLineOrders" in item.tableLocalRef);
      }));
      assert.ok(occurrences.every(function (item) {
        return item.originalDomainIdentity.domainId === tableDomain.domainId;
      }));
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial interpretation adapter — observed-line provenance is never converted to table provenance",
    function (assert) {
      const result = recordedBolGovernedInterpretationAdapterExperiment_();
      const lineDomain = result.adaptedDomains[1];
      const occurrences = lineDomain.adaptedOccurrences;

      assert.equal(lineDomain.provenanceKind, "observed_line");
      assert.equal(occurrences.length, 5);
      assert.ok(occurrences.every(function (item) {
        return item.sourceRef !== null;
      }));
      assert.ok(occurrences.every(function (item) {
        return item.tableLocalRef === null;
      }));
      assert.ok(occurrences.every(function (item) {
        return item.sourceRef.sourceLineOrders.length === 1;
      }));
      assert.ok(occurrences.every(function (item) {
        return item.sourceRef.regionId === null &&
          item.sourceRef.rowId === null && item.sourceRef.cellId === null;
      }));
    },
  );

  registerPermanentFinancialTest_(
    7,
    "financial interpretation adapter — governed roles and null VAT bases survive unchanged",
    function (assert) {
      const occurrences = adaptedGovernedOccurrencesExperiment_(
        recordedBolGovernedInterpretationAdapterExperiment_(),
      );
      const byId = {};
      occurrences.forEach(function (item) { byId[item.occurrenceId] = item; });

      assert.ok(compactJsonEquality(
        occurrences.slice(0, 5).map(function (item) {
          return item.governedSemanticRole;
        }),
        ["QUANTITY", "UNIT_PRICE", "LINE_AMOUNT", "VAT_RATE", "VAT_AMOUNT"],
      ));
      assert.ok(occurrences.slice(0, 5).every(function (item) {
        return item.governedBasis === null;
      }));
      assert.ok(
        byId["bol-live-line10-excl"].governedSemanticRole ===
          "DOCUMENT_SUBTOTAL" &&
        byId["bol-live-line10-excl"].governedBasis === "EXCL_VAT",
      );
      assert.equal(byId["bol-live-line11-vat-rate"].governedBasis, null);
      assert.equal(byId["bol-live-line11-vat-amount"].governedBasis, null);
      assert.equal(byId["bol-live-line12-incl"].governedBasis, "INCL_VAT");
      assert.equal(byId["bol-live-line13-bare-total"].governedBasis, null);
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial interpretation adapter — composite membership remains auditable",
    function (assert) {
      const result = recordedBolGovernedInterpretationAdapterExperiment_();
      const occurrences = adaptedGovernedOccurrencesExperiment_(result);
      const byId = {};
      occurrences.forEach(function (item) { byId[item.occurrenceId] = item; });
      const rate = byId["bol-live-line11-vat-rate"];
      const amount = byId["bol-live-line11-vat-amount"];

      assert.ok(result.governedState.compositeEvidence !== null);
      assert.equal(rate.compositeMembership.memberId, "rate");
      assert.equal(amount.compositeMembership.memberId, "amount");
      assert.equal(
        rate.compositeMembership.promotionId,
        amount.compositeMembership.promotionId,
      );
      assert.notEqual(rate.occurrenceId, amount.occurrenceId);
      assert.ok(
        rate.rawValue === "21%" && amount.rawValue === "€ 15,79",
      );
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial interpretation adapter — missing legacy table line order is not fabricated",
    function (assert) {
      const result = recordedBolGovernedInterpretationAdapterExperiment_();
      const tableOccurrences = result.adaptedDomains[0].adaptedOccurrences;

      assert.equal(tableOccurrences.length, 5);
      assert.ok(tableOccurrences.every(function (item) {
        return !("sourceLineOrders" in item.tableLocalRef);
      }));
      assert.equal(
        result.firstUnresolvedBoundary,
        "INTERPRETER_REQUIRES_OBSERVED_LINE_ORDER_FOR_TABLE_CELL_PROVENANCE",
      );
      assert.equal(result.interpreterInput, null);
      assert.ok(!result.interpreterCompatible && !result.interpreterInvoked);
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial interpretation adapter — mixed hybrid provenance fails closed",
    function (assert) {
      const replay = recordedBolCompositeSemanticReplayExperiment_().projection;
      const hybrid = JSON.parse(JSON.stringify(replay));
      hybrid.semanticDomains[0].semanticOccurrences[0]
        .physicalReference.sourceLineOrders = [3];
      const result = buildGovernedInterpretationInputExperiment_(hybrid);

      assert.equal(result.adapterStatus, "BLOCKED_INVALID_GOVERNED_INPUT");
      assert.equal(result.unresolvedOccurrenceCount, 1);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "MIXED_GOVERNED_PROVENANCE_REFERENCE";
      }));
      assert.equal(
        result.firstUnresolvedBoundary,
        "MIXED_GOVERNED_PROVENANCE_REFERENCE",
      );
      assert.ok(!result.interpreterInvoked && result.canonicalReceipt === null);
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial interpretation adapter — incomplete or contradictory governed input fails closed",
    function (assert) {
      const replay = recordedBolCompositeSemanticReplayExperiment_().projection;
      const incomplete = JSON.parse(JSON.stringify(replay));
      incomplete.semanticComplete = false;
      incomplete.semanticResolutionStatus = "PARTIAL";
      incomplete.unresolvedSemanticEvidence.push({
        domainId: incomplete.semanticDomains[0].domainId,
        occurrenceId: incomplete.semanticDomains[0].semanticOccurrences[0]
          .occurrenceId,
        code: "SYNTHETIC_UNRESOLVED_SEMANTIC_EVIDENCE",
      });
      const contradictory = JSON.parse(JSON.stringify(replay));
      contradictory.semanticResolutionStatus = "CONTRADICTORY";
      contradictory.conflicts.push({ code: "SYNTHETIC_CONTRADICTION" });
      const incompleteResult =
        buildGovernedInterpretationInputExperiment_(incomplete);
      const contradictoryResult =
        buildGovernedInterpretationInputExperiment_(contradictory);

      assert.equal(
        incompleteResult.adapterStatus,
        "BLOCKED_INVALID_GOVERNED_INPUT",
      );
      assert.equal(
        contradictoryResult.adapterStatus,
        "BLOCKED_INVALID_GOVERNED_INPUT",
      );
      assert.equal(
        incompleteResult.firstUnresolvedBoundary,
        "INVALID_GOVERNED_SEMANTIC_RESULT",
      );
      assert.equal(
        contradictoryResult.firstUnresolvedBoundary,
        "INVALID_GOVERNED_SEMANTIC_RESULT",
      );
      assert.ok(
        !incompleteResult.interpreterInvoked &&
        !contradictoryResult.interpreterInvoked &&
        incompleteResult.canonicalReceipt === null &&
        contradictoryResult.canonicalReceipt === null,
      );
    },
  );

  // ==================================================
  // PROVENANCE-AWARE GOVERNED INTERPRETATION EXPERIMENT
  // ==================================================

  function recordedBolGovernedInterpretationExperiment_(requests) {
    return interpretGovernedFinancialEvidenceExperiment_(
      recordedBolCompositeSemanticReplayExperiment_().projection,
      requests,
    );
  }

  function governedInterpretationFactIndexExperiment_(result) {
    const byId = {};
    result.interpretationFacts.forEach(function (fact) {
      byId[fact.occurrenceId] = fact;
    });
    return byId;
  }

  registerPermanentFinancialTest_(
    8,
    "financial governed interpretation — all ten recorded occurrences become traceable domain-local facts",
    function (assert) {
      const result = recordedBolGovernedInterpretationExperiment_();

      assert.equal(result.interpretationStatus, "PARTIAL");
      assert.equal(result.sourceOccurrenceCount, 10);
      assert.equal(result.interpretedOccurrenceCount, 10);
      assert.equal(result.unresolvedOccurrenceCount, 0);
      assert.equal(result.conflictingOccurrenceCount, 0);
      assert.equal(result.interpretationFacts.length, 10);
      assert.equal(new Set(result.interpretationFacts.map(function (fact) {
        return fact.occurrenceId;
      })).size, 10);
      assert.ok(result.semanticInputUnchanged);
    },
  );

  registerPermanentFinancialTest_(
    7,
    "financial governed interpretation — table facts retain only table-local provenance",
    function (assert) {
      const result = recordedBolGovernedInterpretationExperiment_();
      const tableDomain = result.domains.filter(function (domain) {
        return domain.provenanceKind === "table_cell";
      })[0];
      const facts = result.interpretationFacts.filter(function (fact) {
        return fact.provenanceKind === "table_cell";
      });

      assert.equal(facts.length, 5);
      assert.equal(tableDomain.interpretationFactIds.length, 5);
      assert.ok(facts.every(function (fact) {
        return fact.domainId === tableDomain.domainId;
      }));
      assert.ok(facts.every(function (fact) {
        return fact.tableLocalRef !== null;
      }));
      assert.ok(facts.every(function (fact) {
        return fact.sourceRef === null;
      }));
      assert.ok(facts.every(function (fact) {
        return !("sourceLineOrders" in fact.tableLocalRef);
      }));
      assert.ok(facts.every(function (fact) {
        return fact.interpretationStatus === "SUPPORTED_DOMAIN_LOCAL";
      }));
    },
  );

  registerPermanentFinancialTest_(
    7,
    "financial governed interpretation — observed-line facts retain only line provenance",
    function (assert) {
      const result = recordedBolGovernedInterpretationExperiment_();
      const lineDomain = result.domains.filter(function (domain) {
        return domain.provenanceKind === "observed_line";
      })[0];
      const facts = result.interpretationFacts.filter(function (fact) {
        return fact.provenanceKind === "observed_line";
      });

      assert.equal(facts.length, 5);
      assert.equal(lineDomain.interpretationFactIds.length, 5);
      assert.ok(facts.every(function (fact) {
        return fact.domainId === lineDomain.domainId;
      }));
      assert.ok(facts.every(function (fact) {
        return fact.sourceRef !== null;
      }));
      assert.ok(facts.every(function (fact) {
        return fact.tableLocalRef === null;
      }));
      assert.ok(facts.every(function (fact) {
        return fact.sourceRef.sourceLineOrders.length === 1;
      }));
      assert.ok(facts.every(function (fact) {
        return fact.interpretationStatus === "SUPPORTED_DOMAIN_LOCAL";
      }));
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial governed interpretation — governed roles are consumed without legacy label derivation",
    function (assert) {
      const result = recordedBolGovernedInterpretationExperiment_();
      const facts = governedInterpretationFactIndexExperiment_(result);

      assert.equal(
        facts["table-local:region1:row2:cell10"].governedSemanticRole,
        "UNIT_PRICE",
      );
      assert.equal(
        facts["table-local:region1:row2:cell12"].governedSemanticRole,
        "LINE_AMOUNT",
      );
      assert.equal(
        facts["bol-live-line10-excl"].governedSemanticRole,
        "DOCUMENT_SUBTOTAL",
      );
      assert.ok(result.interpretationFacts.every(function (fact) {
        return !("semanticRole" in fact);
      }));
      assert.ok(result.interpretationFacts.every(function (fact) {
        return !("printedLabelText" in fact);
      }));
      assert.ok(result.interpretationFacts.every(function (fact) {
        return fact.promotionEvidence && fact.promotionEvidence.ruleId;
      }));
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial governed interpretation — explicit document VAT bases survive exactly",
    function (assert) {
      const facts = governedInterpretationFactIndexExperiment_(
        recordedBolGovernedInterpretationExperiment_(),
      );

      assert.equal(facts["bol-live-line10-excl"].governedBasis, "EXCL_VAT");
      assert.equal(facts["bol-live-line12-incl"].governedBasis, "INCL_VAT");
      assert.equal(
        facts["bol-live-line10-excl"].governedSemanticRole,
        "DOCUMENT_SUBTOTAL",
      );
      assert.equal(
        facts["bol-live-line12-incl"].governedSemanticRole,
        "DOCUMENT_TOTAL",
      );
      assert.notEqual(
        facts["bol-live-line10-excl"].occurrenceId,
        facts["bol-live-line12-incl"].occurrenceId,
      );
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial governed interpretation — null table and composite bases remain unknown",
    function (assert) {
      const result = recordedBolGovernedInterpretationExperiment_();
      const facts = governedInterpretationFactIndexExperiment_(result);

      assert.ok(result.interpretationFacts.filter(function (fact) {
        return fact.provenanceKind === "table_cell";
      }).every(function (fact) { return fact.governedBasis === null; }));
      assert.equal(facts["bol-live-line11-vat-rate"].governedBasis, null);
      assert.equal(facts["bol-live-line11-vat-amount"].governedBasis, null);
      assert.equal(facts["bol-live-line13-bare-total"].governedBasis, null);
      const tableBasisRelationships = result.unresolvedRelationships.filter(function (item) {
        return item.code === "TABLE_AMOUNT_VAT_BASIS_UNRESOLVED";
      });
      assert.equal(tableBasisRelationships.length, 2);
      assert.ok(tableBasisRelationships.every(function (item) {
        return item.occurrenceIds.length === 1 &&
          item.alignmentState === "NOT_REQUIRED_FOR_DOMAIN_LOCAL_ROLE";
      }));
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial governed interpretation — four equal 91-euro values remain distinct",
    function (assert) {
      const facts = recordedBolGovernedInterpretationExperiment_()
        .interpretationFacts.filter(function (fact) {
          return fact.rawValue === "€ 91,00";
        });

      assert.equal(facts.length, 4);
      assert.equal(new Set(facts.map(function (fact) {
        return fact.occurrenceId;
      })).size, 4);
      assert.equal(new Set(facts.map(function (fact) {
        return fact.domainId;
      })).size, 2);
      assert.ok(facts.some(function (fact) {
        return fact.governedSemanticRole === "UNIT_PRICE";
      }));
      assert.ok(facts.some(function (fact) {
        return fact.governedSemanticRole === "DOCUMENT_TOTAL" &&
          fact.governedBasis === null;
      }));
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial governed interpretation — two equal VAT amounts remain distinct",
    function (assert) {
      const facts = recordedBolGovernedInterpretationExperiment_()
        .interpretationFacts.filter(function (fact) {
          return fact.rawValue === "€ 15,79";
        });

      assert.equal(facts.length, 2);
      assert.notEqual(facts[0].occurrenceId, facts[1].occurrenceId);
      assert.notEqual(facts[0].domainId, facts[1].domainId);
      assert.ok(facts.every(function (fact) {
        return fact.governedSemanticRole === "VAT_AMOUNT";
      }));
      assert.ok(facts.every(function (fact) {
        return fact.governedBasis === null;
      }));
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial governed interpretation — no cross-domain deduplication occurs",
    function (assert) {
      const result = recordedBolGovernedInterpretationExperiment_();

      assert.equal(result.interpretationFacts.length, result.sourceOccurrenceCount);
      assert.equal(result.domains[0].interpretationFactIds.length, 5);
      assert.equal(result.domains[1].interpretationFactIds.length, 5);
      assert.equal(new Set(result.domains.reduce(function (ids, domain) {
        return ids.concat(domain.interpretationFactIds);
      }, [])).size, 10);
      assert.equal(JSON.stringify(result).indexOf("deduplicatedOccurrenceIds"), -1);
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial governed interpretation — domain-local facts do not require fabricated alignment",
    function (assert) {
      const result = recordedBolGovernedInterpretationExperiment_();

      assert.equal(result.crossRepresentationAlignment, "unresolved");
      assert.ok(result.interpretationFacts.every(function (fact) {
        return fact.alignmentRequirement === "NOT_REQUIRED_DOMAIN_LOCAL";
      }));
      assert.equal(result.interpretationFactOrder, "DOMAIN_SERIALIZATION_ORDER_ONLY");
      assert.equal(JSON.stringify(result).indexOf("crossRepresentationRef"), -1);
      assert.ok(result.unresolvedRelationships.some(function (item) {
        return item.alignmentState === "REQUIRED_BUT_UNAVAILABLE";
      }));
      assert.equal(result.interpretationStatus, "PARTIAL");
    },
  );

  registerPermanentFinancialTest_(
    7,
    "financial governed interpretation — requested cross-domain identity remains unresolved",
    function (assert) {
      const request = {
        requestId: "synthetic-vat-relationship",
        relationshipType: "COMPARE_FINANCIAL_FACTS",
        occurrenceIds: [
          "table-local:region1:row2:cell14",
          "bol-live-line11-vat-amount",
        ],
        evidenceKind: "EXPLICIT_RELATIONSHIP_REQUIRED",
        proposedBasis: null,
      };
      const result = recordedBolGovernedInterpretationExperiment_([request]);
      const requested = result.unresolvedRelationships.filter(function (item) {
        return item.requestId === request.requestId;
      });

      assert.equal(result.interpretationStatus, "PARTIAL");
      assert.equal(result.conflicts.length, 0);
      assert.equal(requested.length, 1);
      assert.equal(
        requested[0].code,
        "CROSS_REPRESENTATION_ALIGNMENT_REQUIRED_BUT_UNAVAILABLE",
      );
      assert.equal(requested[0].alignmentState, "REQUIRED_BUT_UNAVAILABLE");
      assert.equal(result.crossRepresentationAlignment, "unresolved");
      assert.equal(result.interpretedOccurrenceCount, 10);
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial governed interpretation — hybrid provenance fails closed",
    function (assert) {
      const source = recordedBolCompositeSemanticReplayExperiment_().projection;
      const hybrid = JSON.parse(JSON.stringify(source));
      hybrid.semanticDomains[0].semanticOccurrences[0]
        .physicalReference.sourceLineOrders = [3];
      const result = interpretGovernedFinancialEvidenceExperiment_(hybrid);

      assert.equal(result.interpretationStatus, "BLOCKED");
      assert.equal(result.interpretedOccurrenceCount, 0);
      assert.equal(result.unresolvedOccurrenceCount, 10);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "MIXED_GOVERNED_PROVENANCE_REFERENCE";
      }));
      assert.equal(result.interpretationFacts.length, 10);
      assert.ok(!result.legacyInterpreterInvoked && result.canonicalReceipt === null);
    },
  );

  registerPermanentFinancialTest_(
    7,
    "financial governed interpretation — identity provenance role and physical reference are mandatory",
    function (assert) {
      const source = recordedBolCompositeSemanticReplayExperiment_().projection;
      function mutate(mutator) {
        const changed = JSON.parse(JSON.stringify(source));
        mutator(changed);
        return interpretGovernedFinancialEvidenceExperiment_(changed);
      }
      const duplicate = mutate(function (value) {
        value.semanticDomains[0].semanticOccurrences[1].occurrenceId =
          value.semanticDomains[0].semanticOccurrences[0].occurrenceId;
      });
      const missingProvenance = mutate(function (value) {
        delete value.semanticDomains[0].semanticOccurrences[0].provenanceKind;
      });
      const identityMismatch = mutate(function (value) {
        value.semanticDomains[0].semanticOccurrences[0]
          .sourceDocumentSha256 = "synthetic-mismatch";
      });
      const missingRef = mutate(function (value) {
        value.semanticDomains[0].semanticOccurrences[0].physicalReference = null;
      });
      const missingRole = mutate(function (value) {
        value.semanticDomains[0].semanticOccurrences[0]
          .governedSemanticRole = null;
      });

      assert.ok([duplicate, missingProvenance, identityMismatch, missingRef, missingRole]
        .every(function (result) {
          return result.interpretationStatus === "BLOCKED";
        }));
      assert.ok(duplicate.conflicts.some(function (item) {
        return item.code === "INVALID_GOVERNED_SEMANTIC_OCCURRENCE";
      }));
      assert.ok(missingProvenance.conflicts.length > 0);
      assert.ok(identityMismatch.conflicts.length > 0);
      assert.ok(missingRef.conflicts.length > 0);
      assert.ok(missingRole.conflicts.length > 0);
      assert.ok([duplicate, missingProvenance, identityMismatch, missingRef, missingRole]
        .every(function (result) {
          return !result.legacyInterpreterInvoked && result.canonicalReceipt === null;
        }));
    },
  );

  registerPermanentFinancialTest_(
    7,
    "financial governed interpretation — contradictory basis or composite semantics fail closed",
    function (assert) {
      const source = recordedBolCompositeSemanticReplayExperiment_().projection;
      const contradictoryBasis = JSON.parse(JSON.stringify(source));
      contradictoryBasis.semanticDomains[0].semanticOccurrences[0]
        .governedBasis = "INCL_VAT";
      const contradictoryComposite = JSON.parse(JSON.stringify(source));
      contradictoryComposite.compositeEvidence.promotions[0]
        .orderedMembers[0].semanticRole = "VAT_AMOUNT";
      const basisResult =
        interpretGovernedFinancialEvidenceExperiment_(contradictoryBasis);
      const compositeResult =
        interpretGovernedFinancialEvidenceExperiment_(contradictoryComposite);

      assert.equal(basisResult.interpretationStatus, "CONTRADICTORY");
      assert.ok(basisResult.conflicts.some(function (item) {
        return item.code === "CONTRADICTORY_GOVERNED_INTERPRETATION_BASIS";
      }));
      assert.equal(compositeResult.interpretationStatus, "CONTRADICTORY");
      assert.ok(compositeResult.conflicts.some(function (item) {
        return item.code === "CONFLICTING_COMPOSITE_MEMBERSHIP";
      }));
      assert.ok(basisResult.conflictingOccurrenceCount > 0);
      assert.ok(compositeResult.conflictingOccurrenceCount > 0);
      assert.ok(!basisResult.canonicalReleaseInvoked &&
        !compositeResult.canonicalReleaseInvoked);
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial governed interpretation — incomplete governed input remains blocked",
    function (assert) {
      const incomplete = JSON.parse(JSON.stringify(
        recordedBolCompositeSemanticReplayExperiment_().projection,
      ));
      incomplete.semanticComplete = false;
      incomplete.semanticResolutionStatus = "PARTIAL";
      incomplete.unresolvedSemanticEvidence.push({
        domainId: incomplete.semanticDomains[0].domainId,
        occurrenceId: incomplete.semanticDomains[0].semanticOccurrences[0]
          .occurrenceId,
        code: "SYNTHETIC_UNRESOLVED_SEMANTIC_EVIDENCE",
      });
      const result = interpretGovernedFinancialEvidenceExperiment_(incomplete);

      assert.equal(result.interpretationStatus, "BLOCKED");
      assert.equal(result.interpretedOccurrenceCount, 0);
      assert.equal(result.unresolvedOccurrenceCount, 10);
      assert.ok(result.conflicts.some(function (item) {
        return item.code === "INVALID_PROVENANCE_AWARE_INTERPRETATION_INPUT";
      }));
      assert.equal(result.interpretationFacts.length, 10);
      assert.equal(result.canonicalReceipt, null);
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial governed interpretation — governed input and requests remain immutable",
    function (assert) {
      const source = recordedBolCompositeSemanticReplayExperiment_().projection;
      const requests = [{
        requestId: "synthetic-unresolved",
        relationshipType: "COMPARE_FINANCIAL_FACTS",
        occurrenceIds: [
          "table-local:region1:row2:cell13",
          "bol-live-line11-vat-rate",
        ],
        evidenceKind: "EXPLICIT_RELATIONSHIP_REQUIRED",
        proposedBasis: null,
      }];
      const sourceSnapshot = JSON.stringify(source);
      const requestsSnapshot = JSON.stringify(requests);
      const result = interpretGovernedFinancialEvidenceExperiment_(
        source,
        requests,
      );

      assert.ok(result.semanticInputUnchanged);
      assert.ok(result.relationshipRequestsUnchanged);
      assert.ok(JSON.stringify(source) === sourceSnapshot,
        "Complete governed input changed.");
      assert.ok(JSON.stringify(requests) === requestsSnapshot,
        "Complete relationship request changed.");
      assert.equal(result.interpretationStatus, "PARTIAL");
    },
  );

  registerPermanentFinancialTest_(
    5,
    "financial governed interpretation — legacy interpretation and canonical release remain uninvoked",
    function (assert) {
      const result = recordedBolGovernedInterpretationExperiment_();

      assert.notOk(result.legacyInterpreterInvoked);
      assert.notOk(result.canonicalReleaseInvoked);
      assert.equal(result.canonicalReceipt, null);
      assert.equal(JSON.stringify(result).indexOf("releaseStatus"), -1);
      assert.equal(result.interpretationStatus, "PARTIAL");
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial governed interpretation — equal raw value cannot authorize a cross-domain merge",
    function (assert) {
      const request = {
        requestId: "synthetic-equal-value-merge",
        relationshipType: "ASSERT_SAME_FINANCIAL_FACT",
        occurrenceIds: [
          "table-local:region1:row2:cell14",
          "bol-live-line11-vat-amount",
        ],
        evidenceKind: "EQUAL_RAW_VALUE",
        proposedBasis: null,
      };
      const result = recordedBolGovernedInterpretationExperiment_([request]);

      assert.equal(result.interpretationStatus, "BLOCKED");
      assert.ok(result.conflicts.some(function (item) {
        return item.code === "EQUAL_RAW_VALUE_IDENTITY_INFERENCE_FORBIDDEN";
      }));
      assert.equal(result.interpretationFacts.length, 10);
      assert.equal(result.sourceOccurrenceCount, 10);
      assert.ok(result.conflictingOccurrenceCount === 2);
      assert.equal(result.canonicalReceipt, null);
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial governed interpretation — arithmetic cannot authorize VAT-basis assignment",
    function (assert) {
      const request = {
        requestId: "synthetic-arithmetic-basis",
        relationshipType: "ASSIGN_VAT_BASIS",
        occurrenceIds: ["table-local:region1:row2:cell12"],
        evidenceKind: "ARITHMETIC",
        proposedBasis: "EXCL_VAT",
      };
      const result = recordedBolGovernedInterpretationExperiment_([request]);
      const fact = governedInterpretationFactIndexExperiment_(result)
        ["table-local:region1:row2:cell12"];

      assert.equal(result.interpretationStatus, "BLOCKED");
      assert.ok(result.conflicts.some(function (item) {
        return item.code === "ARITHMETIC_SEMANTIC_INFERENCE_FORBIDDEN";
      }));
      assert.equal(fact.governedBasis, null);
      assert.equal(fact.rawValue, "€ 91,00");
      assert.equal(result.conflictingOccurrenceCount, 1);
      assert.equal(result.canonicalReceipt, null);
    },
  );

  // ==================================================
  // BOUNDED FINANCIAL INTERPRETATION EXPERIMENT
  // ==================================================

  registerPermanentFinancialTest_(
    10,
    "financial interpretation — Hubo equal product values keep distinct slots and bare total",
    function (assert) {
      const collection = collectExhaustiveFinancialEvidenceExperiment_(
        huboFinancialCollectionFixture(),
      );
      const result = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        huboInterpretationProjectionFixture(),
      );

      assert.equal(result.interpretations.length, 3);
      assert.notEqual(
        result.interpretations[0].structuralSlotRef.field,
        result.interpretations[1].structuralSlotRef.field,
      );
      assert.equal(result.interpretations[0].parsedValue.value, 1599);
      assert.equal(result.interpretations[1].parsedValue.value, 1599);
      assert.equal(
        result.interpretations[2].semanticRole,
        "document_total_unknown_basis",
      );
      assert.equal(result.interpretations[2].vatBasis, null);
      assert.equal(result.interpretations[2].status, "AMBIGUOUS");
      assert.ok(compactJsonEquality(
        result.releaseStatus,
        { eligible: false, code: "AMBIGUOUS_FINANCIAL_INTERPRETATION" },
      ));
      assert.equal(JSON.stringify(result).indexOf("totals.inclVAT"), -1);
      assert.notOk("canonicalReceipt" in result);
    },
  );

  registerPermanentFinancialTest_(
    17,
    "financial interpretation — Gamma preserves adjustment payment VAT and unresolved turnover evidence",
    function (assert) {
      const collection = collectExhaustiveFinancialEvidenceExperiment_(
        gammaFinancialCollectionFixture(),
      );
      const result = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        gammaInterpretationProjectionFixture(),
      );
      const byId = {};
      result.interpretations.forEach(function (interpretation) {
        byId[interpretation.sourceObservationId] = interpretation;
      });

      assert.equal(result.interpretations.length, 12);
      assert.equal(byId["gamma-original"].semanticRole, "product_unit_amount");
      assert.equal(byId["gamma-discount"].semanticRole, "discount_or_adjustment");
      assert.equal(byId["gamma-discount"].parsedValue.value, -725);
      assert.equal(byId["gamma-net"].semanticRole, "product_line_amount");
      assert.equal(byId["gamma-tender"].canonicalDisposition, "EVIDENCE_ONLY");
      assert.equal(byId["gamma-change"].canonicalDisposition, "EVIDENCE_ONLY");
      assert.equal(byId["gamma-vat-rate"].semanticRole, "vat_rate");
      assert.equal(byId["gamma-vat-base"].semanticRole, "vat_base");
      assert.equal(byId["gamma-vat-amount"].semanticRole, "vat_amount");
      assert.equal(byId["gamma-turnover"].status, "AMBIGUOUS");
      assert.equal(collection.observations[10].rawValue, "17,97");
      assert.equal(JSON.stringify(result).indexOf("21,74"), -1);
      assert.equal(byId["gamma-original"].canonicalDisposition, "POLICY_REQUIRED");
      assert.equal(byId["gamma-net"].canonicalDisposition, "POLICY_REQUIRED");
      assert.ok(compactJsonEquality(
        result.releaseStatus,
        { eligible: false, code: "BUSINESS_POLICY_REQUIRED" },
      ));
      assert.notOk("canonicalReceipt" in result);
    },
  );

  registerPermanentFinancialTest_(
    14,
    "financial interpretation — Bol explicit totals resolve while equal bare total stays evidence-only",
    function (assert) {
      const collection = collectExhaustiveFinancialEvidenceExperiment_(
        bolFinancialCollectionFixture(),
      );
      const result = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        bolInterpretationProjectionFixture(),
      );
      const byId = {};
      result.interpretations.forEach(function (interpretation) {
        byId[interpretation.sourceObservationId] = interpretation;
      });

      assert.equal(result.interpretations.length, 8);
      assert.equal(byId["bol-quantity"].semanticRole, "quantity");
      assert.equal(byId["bol-unit"].semanticRole, "product_unit_amount");
      assert.equal(byId["bol-line"].semanticRole, "product_line_amount");
      assert.equal(byId["bol-excl"].semanticRole, "document_total_excl_vat");
      assert.equal(byId["bol-vat-rate"].semanticRole, "vat_rate");
      assert.equal(byId["bol-vat-amount"].semanticRole, "vat_amount");
      assert.equal(byId["bol-incl"].semanticRole, "document_total_incl_vat");
      assert.equal(byId["bol-total"].semanticRole, "document_total_unknown_basis");
      assert.equal(byId["bol-total"].vatBasis, null);
      assert.equal(byId["bol-total"].canonicalDisposition, "EVIDENCE_ONLY");
      assert.notEqual(
        byId["bol-incl"].sourceObservationId,
        byId["bol-total"].sourceObservationId,
      );
      assert.ok(compactJsonEquality(
        result.releaseStatus,
        { eligible: true, code: "RELEASE_ELIGIBLE" },
      ));
      assert.notOk("canonicalReceipt" in result);
    },
  );

  registerPermanentFinancialTest_(
    13,
    "financial interpretation — Wiska is understandable but unrepresentable without repair",
    function (assert) {
      const collection = collectExhaustiveFinancialEvidenceExperiment_(
        wiskaFinancialCollectionFixture(),
      );
      const result = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        wiskaInterpretationProjectionFixture(),
      );
      const byId = {};
      result.interpretations.forEach(function (interpretation) {
        byId[interpretation.sourceObservationId] = interpretation;
      });

      assert.equal(byId["wiska-price"].parsedValue.value, 1095);
      assert.equal(byId["wiska-quantity"].parsedValue.value, 3);
      assert.equal(byId["wiska-vat-rate"].parsedValue.value, 2100);
      assert.equal(byId["wiska-subtotal"].parsedValue.value, 2715);
      assert.equal(byId["wiska-excl"].parsedValue.value, 2715);
      assert.notEqual(
        byId["wiska-subtotal"].structuralSlotRef.kind,
        byId["wiska-excl"].structuralSlotRef.kind,
      );
      assert.equal(byId["wiska-price"].status, "UNSUPPORTED");
      assert.equal(byId["wiska-subtotal"].canonicalDisposition, "UNREPRESENTABLE");
      assert.equal(result.validations[0].relation, "different");
      assert.equal(
        result.validations[0].code,
        "CURRENT_CANONICAL_PRODUCT_UNREPRESENTABLE",
      );
      assert.ok(compactJsonEquality(
        result.releaseStatus,
        { eligible: false, code: "UNSUPPORTED_CANONICAL_REPRESENTATION" },
      ));
      assert.equal(JSON.stringify(result).indexOf("9.05"), -1);
      assert.notOk("canonicalReceipt" in result);
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial interpretation — missing and multiply consumed slots fail closed",
    function (assert) {
      const collection = collectExhaustiveFinancialEvidenceExperiment_(
        huboFinancialCollectionFixture(),
      );
      const missingProjection = huboInterpretationProjectionFixture();
      missingProjection.slots.pop();
      const missing = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        missingProjection,
      );
      const duplicateProjection = huboInterpretationProjectionFixture();
      duplicateProjection.slots[1].structuralSlotRef.field = "unitPriceText";
      const duplicate = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        duplicateProjection,
      );

      assert.notOk(missing.releaseStatus.eligible);
      assert.ok(missing.conflicts.some(function (conflict) {
        return conflict.code === "MISSING_STRUCTURAL_SLOT";
      }));
      assert.equal(missing.interpretations.length, 3);
      assert.notOk(duplicate.releaseStatus.eligible);
      assert.ok(duplicate.conflicts.some(function (conflict) {
        return conflict.code === "MULTIPLY_CONSUMED_STRUCTURAL_SLOT";
      }));
      assert.ok(duplicate.interpretations.some(function (interpretation) {
        return interpretation.status === "CONTRADICTORY";
      }));
    },
  );

  registerPermanentFinancialTest_(
    6,
    "financial interpretation — incomplete collection and invalid provenance remain contradictory",
    function (assert) {
      const collection = collectExhaustiveFinancialEvidenceExperiment_(
        huboFinancialCollectionFixture(),
      );
      collection.collectionComplete = false;
      const incomplete = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        huboInterpretationProjectionFixture(),
      );
      const invalidProjection = huboInterpretationProjectionFixture();
      invalidProjection.slots[0].structuralSlotRef.lineOrder = 99;
      const invalid = interpretCollectedFinancialEvidenceExperiment_(
        collectExhaustiveFinancialEvidenceExperiment_(
          huboFinancialCollectionFixture(),
        ),
        invalidProjection,
      );

      assert.equal(
        incomplete.releaseStatus.code,
        "CONTRADICTORY_FINANCIAL_INTERPRETATION",
      );
      assert.ok(incomplete.conflicts.some(function (conflict) {
        return conflict.code === "INCOMPLETE_FINANCIAL_EVIDENCE_COLLECTION";
      }));
      assert.equal(incomplete.interpretations.length, 3);
      assert.notOk(invalid.releaseStatus.eligible);
      assert.ok(invalid.conflicts.some(function (conflict) {
        return conflict.code === "INVALID_STRUCTURAL_SLOT_REFERENCE";
      }));
      assert.equal(invalid.interpretations[0].status, "CONTRADICTORY");
    },
  );

  registerPermanentFinancialTest_(
    4,
    "financial interpretation — explicit total label contradicting product slot fails closed",
    function (assert) {
      const extraction = observedPrototypeExtraction([
        observedPrototypeEvidenceLine(1, "Total incl VAT 10,00", "product"),
      ]);
      extraction.financialSourceObservations = [
        financialSourceObservationFixture(
          "contradictory-label",
          "product_group",
          "10,00",
          "FORWARD_PRICED_ANCHOR",
          [1],
          1,
          { groupId: "contradictory-group", printedLabelText: "Total incl VAT" },
        ),
      ];
      const collection = collectExhaustiveFinancialEvidenceExperiment_(extraction);
      const projection = {
        resolved: true,
        slots: [
          structuralBindingFixture(
            "contradictory-label",
            structuralSlotRefFixture("observed_line_field", 1, null, "unitPriceText"),
          ),
        ],
      };
      const result = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        projection,
      );

      assert.ok(collection.collectionComplete);
      assert.equal(result.interpretations[0].status, "CONTRADICTORY");
      assert.equal(
        result.interpretations[0].ruleId,
        "LABEL_CONTRADICTS_PRODUCT_SLOT",
      );
      assert.equal(
        result.releaseStatus.code,
        "CONTRADICTORY_FINANCIAL_INTERPRETATION",
      );
    },
  );

  registerPermanentFinancialTest_(
    11,
    "financial interpretation — unknown evidence is accounted without mutation",
    function (assert) {
      const extraction = observedPrototypeExtraction([
        observedPrototypeEvidenceLine(1, "Unknown marker +4,95", "unknown"),
      ]);
      extraction.financialSourceObservations = [
        financialSourceObservationFixture(
          "unknown-interpretation",
          "unknown",
          "+4,95",
          "UNRESOLVED_REGION",
          [1],
          1,
        ),
      ];
      const collection = collectExhaustiveFinancialEvidenceExperiment_(extraction);
      const projection = {
        resolved: true,
        slots: [
          structuralBindingFixture(
            "unknown-interpretation",
            structuralSlotRefFixture("summary_value", 1, 1),
          ),
        ],
      };
      const collectionSnapshot = JSON.stringify(collection);
      const projectionSnapshot = JSON.stringify(projection);
      const result = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        projection,
      );

      assert.equal(result.interpretations.length, 1);
      assert.equal(result.interpretations[0].status, "AMBIGUOUS");
      assert.equal(result.interpretations[0].parsedValue.value, 495);
      assert.equal(
        result.interpretations[0].canonicalDisposition,
        "BLOCKED_UNRESOLVED",
      );
      assert.ok(result.accounting.everyObservationInterpreted);
      assert.equal(result.accounting.uniqueInterpretedObservationCount, 1);
      assert.ok(result.accounting.collectionUnchanged);
      assert.ok(result.accounting.projectionUnchanged);
      assert.ok(JSON.stringify(collection) === collectionSnapshot);
      assert.ok(JSON.stringify(projection) === projectionSnapshot);
      assert.notOk(result.releaseStatus.eligible);
    },
  );

  // ==================================================
  // BOUNDED CANONICAL RELEASE ENVELOPE EXPERIMENT
  // ==================================================

  QUnit.module("canonical-release"); // 30 tests / 140 assertions

  QUnit.test(
    "canonical release — Bol fixture releases one existing-shape item",
    function (assert) {
      const inputs = bolCanonicalReleaseInputsFixture();
      const result = buildCanonicalReleaseEnvelopeFixture(inputs);

      assert.ok(inputs.terminalProjection.resolved);
      assert.ok(result.releaseStatus.eligible);
      assert.equal(result.canonicalReceipt.items.length, 1);
    },
  );

  QUnit.test(
    "canonical release — Bol canonical receipt shape is exact",
    function (assert) {
      const result = buildCanonicalReleaseEnvelopeFixture(
        bolCanonicalReleaseInputsFixture(),
      );

      assert.ok(compactJsonEquality(result.canonicalReceipt, {
        items: [
          {
            name: "Synthetic product wrapped detail",
            quantity: 2,
            unitPrice: 10.95,
            lineTotal: 21.9,
          },
        ],
        additionalCosts: [],
        vat: { rate: 0.21, amount: 4.6 },
        totals: { exclVAT: 21.9, inclVAT: 26.5, vatAmount: null },
      }));
    },
  );

  QUnit.test(
    "canonical release — every Bol financial target retains exact provenance",
    function (assert) {
      const result = buildCanonicalReleaseEnvelopeFixture(
        bolCanonicalReleaseInputsFixture(),
      );
      const targets = result.canonicalTargetProvenance.map(function (entry) {
        return entry.canonicalTarget;
      });

      assert.ok(compactJsonEquality(targets, [
        "items[0].name",
        "items[0].quantity",
        "items[0].unitPrice",
        "items[0].lineTotal",
        "totals.exclVAT",
        "vat.rate",
        "vat.amount",
        "totals.inclVAT",
      ]));
      assert.ok(compactJsonEquality(
        result.supportingFinancialObservationIds,
        [
          "bol-quantity",
          "bol-unit",
          "bol-line",
          "bol-excl",
          "bol-vat-rate",
          "bol-vat-amount",
          "bol-incl",
        ],
      ));
      assert.equal(result.accounting.canonicalSupportingObservationCount, 7);
    },
  );

  QUnit.test(
    "canonical release — Bol item retains structural group provenance",
    function (assert) {
      const result = buildCanonicalReleaseEnvelopeFixture(
        bolCanonicalReleaseInputsFixture(),
      );
      const provenance = result.structuralGroupProvenance[0];

      assert.equal(provenance.groupId, "bol-group-1");
      assert.equal(provenance.structuralCapability, "TERMINAL_PRICED_ANCHOR");
      assert.ok(compactJsonEquality(provenance.sourceRowOrders, [1, 2, 3]));
    },
  );

  QUnit.test(
    "canonical release — source inputs remain immutable",
    function (assert) {
      const inputs = bolCanonicalReleaseInputsFixture();
      const structuralSnapshot = JSON.stringify(inputs.structuralProjection);
      const collectionSnapshot = JSON.stringify(inputs.collection);
      const interpretationSnapshot = JSON.stringify(inputs.interpretation);
      const result = buildCanonicalReleaseEnvelopeFixture(inputs);

      assert.ok(result.accounting.inputsUnchanged);
      assert.ok(JSON.stringify(inputs.structuralProjection) === structuralSnapshot);
      assert.ok(JSON.stringify(inputs.collection) === collectionSnapshot);
      assert.ok(JSON.stringify(inputs.interpretation) === interpretationSnapshot);
    },
  );

  QUnit.test(
    "canonical release — exact minor-unit product arithmetic is validation only",
    function (assert) {
      const result = buildCanonicalReleaseEnvelopeFixture(
        bolCanonicalReleaseInputsFixture(),
      );

      assert.equal(result.canonicalReceipt.items[0].quantity, 2);
      assert.equal(result.canonicalReceipt.items[0].unitPrice, 10.95);
      assert.equal(result.canonicalReceipt.items[0].lineTotal, 21.9);
    },
  );

  QUnit.test(
    "canonical release — arithmetic mismatch fails closed without repair",
    function (assert) {
      const inputs = bolCanonicalReleaseInputsFixture();
      inputs.extraction.observedLines[2].rawText = "2 10,94 21,90";
      inputs.extraction.financialSourceObservations[1].rawValue = "10,94";
      inputs.collection = collectExhaustiveFinancialEvidenceExperiment_(
        inputs.extraction,
      );
      inputs.interpretation = interpretCollectedFinancialEvidenceExperiment_(
        inputs.collection,
        inputs.interpretationProjection,
      );
      const result = buildCanonicalReleaseEnvelopeFixture(inputs);

      assert.notOk(result.releaseStatus.eligible);
      assert.equal(result.canonicalReceipt, null);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "CANONICAL_PRODUCT_ARITHMETIC_MISMATCH";
      }));
    },
  );

  QUnit.test(
    "canonical release — bare total cannot populate inclVAT",
    function (assert) {
      const collection = collectExhaustiveFinancialEvidenceExperiment_(
        huboFinancialCollectionFixture(),
      );
      const interpretation = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        huboInterpretationProjectionFixture(),
      );
      interpretation.interpretations[2].status = "SUPPORTED";
      interpretation.interpretations[2].canonicalDisposition = "totals.inclVAT";
      interpretation.releaseStatus = {
        eligible: true,
        code: "RELEASE_ELIGIBLE",
      };
      const result = buildCanonicalReceiptFromFinancialInterpretationExperiment_(
        canonicalProductProjectionFixture(
          "hubo-group-1",
          "FORWARD_PRICED_ANCHOR",
          "Synthetic item wrapped detail",
          [1, 2],
          null,
          "hubo-unit",
          "hubo-line",
        ),
        collection,
        interpretation,
      );

      assert.equal(result.canonicalReceipt, null);
      assert.notOk(result.canonicalTargetProvenance.some(function (entry) {
        return entry.canonicalTarget === "totals.inclVAT";
      }));
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "CANONICAL_TARGET_SEMANTIC_MISMATCH";
      }));
    },
  );

  QUnit.test(
    "canonical release — bare total cannot populate exclVAT",
    function (assert) {
      const collection = collectExhaustiveFinancialEvidenceExperiment_(
        huboFinancialCollectionFixture(),
      );
      const interpretation = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        huboInterpretationProjectionFixture(),
      );
      interpretation.interpretations[2].status = "SUPPORTED";
      interpretation.interpretations[2].canonicalDisposition = "totals.exclVAT";
      interpretation.releaseStatus = {
        eligible: true,
        code: "RELEASE_ELIGIBLE",
      };
      const result = buildCanonicalReceiptFromFinancialInterpretationExperiment_(
        { resolved: true, productGroups: [] },
        collection,
        interpretation,
      );

      assert.equal(result.canonicalReceipt, null);
      assert.notOk(result.canonicalTargetProvenance.some(function (entry) {
        return entry.canonicalTarget === "totals.exclVAT";
      }));
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "CANONICAL_TARGET_SEMANTIC_MISMATCH";
      }));
    },
  );

  QUnit.test(
    "canonical release — Hubo ambiguity remains fail closed",
    function (assert) {
      const collection = collectExhaustiveFinancialEvidenceExperiment_(
        huboFinancialCollectionFixture(),
      );
      const interpretation = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        huboInterpretationProjectionFixture(),
      );
      const result = buildCanonicalReceiptFromFinancialInterpretationExperiment_(
        { resolved: true, productGroups: [] },
        collection,
        interpretation,
      );

      assert.equal(result.releaseStatus.code, "AMBIGUOUS_FINANCIAL_INTERPRETATION");
      assert.equal(result.canonicalReceipt, null);
      assert.ok(result.blockingEvidence.some(function (entry) {
        return entry.sourceObservationId === "hubo-total";
      }));
    },
  );

  QUnit.test(
    "canonical release — Gamma policy boundary remains fail closed",
    function (assert) {
      const collection = collectExhaustiveFinancialEvidenceExperiment_(
        gammaFinancialCollectionFixture(),
      );
      const interpretation = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        gammaInterpretationProjectionFixture(),
      );
      const result = buildCanonicalReceiptFromFinancialInterpretationExperiment_(
        { resolved: true, productGroups: [] },
        collection,
        interpretation,
      );

      assert.equal(result.releaseStatus.code, "BUSINESS_POLICY_REQUIRED");
      assert.equal(result.canonicalReceipt, null);
      assert.ok(result.blockingEvidence.some(function (entry) {
        return entry.sourceObservationId === "gamma-discount";
      }));
    },
  );

  QUnit.test(
    "canonical release — Wiska mixed-basis evidence remains fail closed",
    function (assert) {
      const collection = collectExhaustiveFinancialEvidenceExperiment_(
        wiskaFinancialCollectionFixture(),
      );
      const interpretation = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        wiskaInterpretationProjectionFixture(),
      );
      const result = buildCanonicalReceiptFromFinancialInterpretationExperiment_(
        { resolved: true, productGroups: [] },
        collection,
        interpretation,
      );
      const serialized = JSON.stringify(result);

      assert.equal(result.releaseStatus.code, "UNSUPPORTED_CANONICAL_REPRESENTATION");
      assert.equal(result.canonicalReceipt, null);
      assert.ok(serialized.indexOf("wiska-price") >= 0);
      assert.ok(serialized.indexOf("wiska-subtotal") >= 0);
    },
  );

  QUnit.test(
    "canonical release — Wiska never derives 9.05 or changes quantity",
    function (assert) {
      const collection = collectExhaustiveFinancialEvidenceExperiment_(
        wiskaFinancialCollectionFixture(),
      );
      const interpretation = interpretCollectedFinancialEvidenceExperiment_(
        collection,
        wiskaInterpretationProjectionFixture(),
      );
      const result = buildCanonicalReceiptFromFinancialInterpretationExperiment_(
        { resolved: true, productGroups: [] },
        collection,
        interpretation,
      );
      const serialized = JSON.stringify(result);

      assert.equal(serialized.indexOf("9.05"), -1);
      assert.equal(collection.observations[1].rawValue, "3");
    },
  );

  QUnit.test(
    "canonical release — incompatible singleton assignments fail closed",
    function (assert) {
      const inputs = addBolCanonicalTotalObservationFixture(
        bolCanonicalReleaseInputsFixture(),
        "bol-incl-conflict",
        "27,00",
      );
      const result = buildCanonicalReleaseEnvelopeFixture(inputs);

      assert.equal(result.canonicalReceipt, null);
      assert.notOk(result.releaseStatus.eligible);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "CONFLICTING_CANONICAL_SINGLETON_TARGET";
      }));
    },
  );

  QUnit.test(
    "canonical release — missing product financial slot fails closed",
    function (assert) {
      const inputs = bolCanonicalReleaseInputsFixture();
      delete inputs.structuralProjection.productGroups[0].financialSlots.lineTotal;
      const result = buildCanonicalReleaseEnvelopeFixture(inputs);

      assert.equal(result.canonicalReceipt, null);
      assert.ok(result.accounting.everyObservationAccounted);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "MISSING_CANONICAL_PRODUCT_SLOT";
      }));
    },
  );

  QUnit.test(
    "canonical release — cross-group product linkage fails closed",
    function (assert) {
      const inputs = bolCanonicalReleaseInputsFixture();
      inputs.structuralProjection.productGroups[0].groupId = "other-group";
      const result = buildCanonicalReleaseEnvelopeFixture(inputs);

      assert.equal(result.canonicalReceipt, null);
      assert.notOk(result.releaseStatus.eligible);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "CROSS_GROUP_OR_INVALID_PRODUCT_SLOT";
      }));
    },
  );

  QUnit.test(
    "canonical release — multiply consumed product source fails closed",
    function (assert) {
      const inputs = bolCanonicalReleaseInputsFixture();
      inputs.structuralProjection.productGroups[0].financialSlots.unitPrice =
        "bol-quantity";
      const result = buildCanonicalReleaseEnvelopeFixture(inputs);

      assert.equal(result.canonicalReceipt, null);
      assert.notOk(result.releaseStatus.eligible);
      assert.ok(result.conflicts.some(function (conflict) {
        return conflict.code === "MULTIPLY_CONSUMED_CANONICAL_SOURCE";
      }));
    },
  );

  QUnit.test(
    "canonical release — unknown monetary evidence cannot disappear",
    function (assert) {
      const inputs = bolCanonicalReleaseInputsFixture();
      inputs.extraction.observedLines.push(
        observedPrototypeEvidenceLine(8, "Unknown marker +4,95", "unknown"),
      );
      inputs.extraction.financialSourceObservations.push(
        financialSourceObservationFixture(
          "bol-unknown",
          "unknown",
          "+4,95",
          "UNRESOLVED_REGION",
          [8],
          1,
        ),
      );
      inputs.interpretationProjection.slots.push(
        structuralBindingFixture(
          "bol-unknown",
          structuralSlotRefFixture("summary_value", 8, 1),
        ),
      );
      inputs.collection = collectExhaustiveFinancialEvidenceExperiment_(
        inputs.extraction,
      );
      inputs.interpretation = interpretCollectedFinancialEvidenceExperiment_(
        inputs.collection,
        inputs.interpretationProjection,
      );
      const result = buildCanonicalReleaseEnvelopeFixture(inputs);

      assert.equal(result.canonicalReceipt, null);
      assert.notOk(result.releaseStatus.eligible);
      assert.ok(result.blockingEvidence.some(function (entry) {
        return entry.sourceObservationId === "bol-unknown";
      }));
      assert.ok(result.accounting.everyObservationAccounted);
    },
  );

  QUnit.test(
    "canonical release — evidence-only bare total remains auditable",
    function (assert) {
      const result = buildCanonicalReleaseEnvelopeFixture(
        bolCanonicalReleaseInputsFixture(),
      );
      const evidenceOnly = result.evidenceOnlyDispositions[0];

      assert.equal(result.evidenceOnlyDispositions.length, 1);
      assert.equal(evidenceOnly.sourceObservationId, "bol-total");
      assert.equal(evidenceOnly.ruleId, "BARE_TOTAL_CORROBORATES_TYPED_TOTAL");
      assert.ok(compactJsonEquality(
        evidenceOnly.supportingObservationIds,
        ["bol-total", "bol-incl"],
      ));
    },
  );

  QUnit.test(
    "canonical release — every successful Bol observation is accounted once",
    function (assert) {
      const result = buildCanonicalReleaseEnvelopeFixture(
        bolCanonicalReleaseInputsFixture(),
      );

      assert.equal(result.accounting.sourceObservationCount, 8);
      assert.equal(result.accounting.uniqueClaimedObservationCount, 8);
      assert.equal(result.accounting.uniqueAccountedObservationCount, 8);
      assert.ok(result.accounting.everyObservationAccounted);
    },
  );

  QUnit.test(
    "canonical release — equal typed singleton observations retain all provenance",
    function (assert) {
      const inputs = addBolCanonicalTotalObservationFixture(
        bolCanonicalReleaseInputsFixture(),
        "bol-incl-repeat",
        "26,50",
      );
      const result = buildCanonicalReleaseEnvelopeFixture(inputs);
      const inclProvenance = result.canonicalTargetProvenance.find(
        function (entry) {
          return entry.canonicalTarget === "totals.inclVAT";
        },
      );

      assert.ok(result.releaseStatus.eligible);
      assert.equal(result.canonicalReceipt.totals.inclVAT, 26.5);
      assert.ok(compactJsonEquality(
        inclProvenance.supportingObservationIds,
        ["bol-incl", "bol-incl-repeat"],
      ));
      assert.equal(result.accounting.sourceObservationCount, 9);
    },
  );

  QUnit.test(
    "canonical release — Bol output remains normalizer compatible",
    function (assert) {
      const result = buildCanonicalReleaseEnvelopeFixture(
        bolCanonicalReleaseInputsFixture(),
      );
      const normalized = normalizeAndAggregateReceiptData(
        result.canonicalReceipt,
      );

      assert.ok(result.releaseStatus.eligible);
      assert.equal(normalized.rows.length, 1);
      assert.equal(normalized.finalSum, 21.9);
      assert.equal(normalized.documentTotalInclVat, 26.5);
      assert.ok(normalized.reconciled);
    },
  );

  QUnit.test(
    "recorded Bol runtime handoff — fixture remains exact and immutable",
    function (assert) {
      const fixture = recordedBolStage1V2RuntimeEvidenceFixture_();
      const snapshot = JSON.stringify(fixture.evidence);
      const result = buildRecordedBolLocalHandoffExperiment_(fixture.evidence);

      assert.equal(fixture.sourceIntegrity.mimeType, "image/png");
      assert.equal(fixture.sourceIntegrity.driveReportedByteLength, 94252);
      assert.equal(fixture.sourceIntegrity.blobByteLength, 94252);
      assert.equal(
        fixture.sourceIntegrity.sha256,
        "daff887a8a8f3ec35386989eebc2bd4e0240354a4acd6c51e117be7037b32e8c",
      );
      assert.equal(fixture.openAIMetadata.model, "gpt-4o-2024-08-06");
      assert.equal(fixture.evidence.observedLines.length, 13);
      assert.equal(
        fixture.evidence.observedLines[8].rawText,
        "1 € 91,00 € 91,00 21% € 15,79",
      );
      assert.ok(result.sourceUnchanged && JSON.stringify(fixture.evidence) === snapshot);
    },
  );

  QUnit.test(
    "recorded Bol runtime handoff — lines 4-9 form one terminal-priced group",
    function (assert) {
      const result = buildRecordedBolLocalHandoffExperiment_(
        recordedBolStage1V2RuntimeEvidenceFixture_().evidence,
      );
      const structural = result.structural;
      const group = structural.terminalProjection.groups[0];

      assert.ok(structural.resolved);
      assert.equal(structural.capability, "TERMINAL_PRICED_ANCHOR");
      assert.ok(structural.terminalProjection.resolved);
      assert.equal(structural.terminalProjection.groups.length, 1);
      assert.ok(compactJsonEquality(group.sourceRowOrders, [4, 5, 6, 7, 8, 9]));
      assert.equal(group.terminalRowOrder, 9);
      assert.ok(compactJsonEquality(
        structural.accountedSourceLineOrders,
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      ));
      assert.ok(compactJsonEquality(structural.summaryOrders, [10, 11, 12, 13]));
    },
  );

  QUnit.test(
    "recorded Bol runtime handoff — financial occurrences remain distinct",
    function (assert) {
      const result = buildRecordedBolLocalHandoffExperiment_(
        recordedBolStage1V2RuntimeEvidenceFixture_().evidence,
      );
      const observations = result.manifest.observations;
      const ninetyOne = observations.filter(function (observation) {
        return observation.rawValue === "€ 91,00";
      });
      const vatAmounts = observations.filter(function (observation) {
        return observation.rawValue === "€ 15,79";
      });

      assert.equal(observations.length, 10);
      assert.equal(result.manifest.conflicts.length, 0);
      assert.equal(ninetyOne.length, 4);
      assert.equal(new Set(ninetyOne.map(function (item) {
        return item.observationId;
      })).size, 4);
      assert.ok(compactJsonEquality(
        ninetyOne.map(function (item) { return item.sourceRef.sourceLineOrders[0]; }),
        [9, 9, 12, 13],
      ));
      assert.equal(vatAmounts.length, 2);
      assert.notEqual(vatAmounts[0].observationId, vatAmounts[1].observationId);
      assert.ok(compactJsonEquality(
        vatAmounts.map(function (item) { return item.sourceRef.sourceLineOrders[0]; }),
        [9, 11],
      ));
      assert.ok(compactJsonEquality(
        result.manifest.unresolvedObservationIds,
        [
          "bol-live-line9-vat-rate-unbound",
          "bol-live-line9-vat-amount-unbound",
        ],
      ));
      assert.equal(result.manifest.interpretationProjection.slots.length, 10);
    },
  );

  QUnit.test(
    "recorded Bol runtime handoff — literal summaries retain independent provenance",
    function (assert) {
      const result = buildRecordedBolLocalHandoffExperiment_(
        recordedBolStage1V2RuntimeEvidenceFixture_().evidence,
      );
      const byId = {};
      result.manifest.observations.forEach(function (observation) {
        byId[observation.observationId] = observation;
      });

      assert.equal(byId["bol-live-line10-excl"].printedLabelText, "Subtotaal ex. BTW");
      assert.equal(byId["bol-live-line10-excl"].rawValue, "€ 75,21");
      assert.equal(byId["bol-live-line10-excl"].sourceRef.sourceLineOrders[0], 10);
      assert.equal(byId["bol-live-line11-vat-rate"].printedLabelText, "BTW");
      assert.equal(byId["bol-live-line11-vat-rate"].rawValue, "21%");
      assert.equal(
        byId["bol-live-line11-vat-amount"].adjacentUninterpretedFragments[0].rawText,
        "BTW",
      );
      assert.equal(byId["bol-live-line12-incl"].printedLabelText, "Bedrag incl. BTW");
      assert.equal(byId["bol-live-line13-bare-total"].printedLabelText, "Totaalbedrag");
      assert.equal(byId["bol-live-line13-bare-total"].rawValue, "€ 91,00");
      assert.notEqual(
        byId["bol-live-line12-incl"].observationId,
        byId["bol-live-line13-bare-total"].observationId,
      );
    },
  );

  QUnit.test(
    "recorded Bol runtime handoff — line-9 VAT header binding remains unresolved",
    function (assert) {
      const result = buildRecordedBolLocalHandoffExperiment_(
        recordedBolStage1V2RuntimeEvidenceFixture_().evidence,
      );
      const byId = {};
      result.manifest.observations.forEach(function (observation) {
        byId[observation.observationId] = observation;
      });
      const rate = byId["bol-live-line9-vat-rate-unbound"];
      const amount = byId["bol-live-line9-vat-amount-unbound"];

      assert.notOk(result.manifest.resolved);
      assert.equal(
        result.firstUnresolvedBoundary,
        "UNSUPPORTED_LINE9_HEADER_BINDING",
      );
      assert.equal(rate.sourceContext, "unknown");
      assert.equal(amount.sourceContext, "unknown");
      assert.equal(rate.structuralCapability, "UNRESOLVED_REGION");
      assert.equal(amount.structuralCapability, "UNRESOLVED_REGION");
      assert.equal(rate.printedLabelText, null);
      assert.equal(amount.headerCellRef, null);
    },
  );

  QUnit.test(
    "recorded Bol runtime handoff — exhaustive collector preserves accounting",
    function (assert) {
      const result = buildRecordedBolLocalHandoffExperiment_(
        recordedBolStage1V2RuntimeEvidenceFixture_().evidence,
      );
      const accounting = result.collector.sourceAccounting;

      assert.ok(result.collector.collectionComplete);
      assert.equal(result.collector.conflicts.length, 0);
      assert.equal(result.collector.observations.length, 10);
      assert.equal(result.collector.unresolved.length, 2);
      assert.equal(accounting.declaredObservationCount, 10);
      assert.equal(accounting.collectedObservationCount, 10);
      assert.equal(accounting.validSourceReferenceCount, 10);
      assert.equal(accounting.uniqueSourceConsumptionCount, 10);
      assert.ok(accounting.sourceOrderPreserved && accounting.sourceUnchanged);
    },
  );

  QUnit.test(
    "recorded Bol runtime handoff — unchanged downstream layers fail closed",
    function (assert) {
      const result = buildRecordedBolLocalHandoffExperiment_(
        recordedBolStage1V2RuntimeEvidenceFixture_().evidence,
      );
      const interpretedById = {};
      result.interpreter.interpretations.forEach(function (interpretation) {
        interpretedById[interpretation.sourceObservationId] = interpretation;
      });

      assert.notOk(result.interpreter.releaseStatus.eligible);
      assert.equal(
        result.interpreter.releaseStatus.code,
        "AMBIGUOUS_FINANCIAL_INTERPRETATION",
      );
      assert.equal(
        interpretedById["bol-live-line9-vat-rate-unbound"].status,
        "AMBIGUOUS",
      );
      assert.equal(
        interpretedById["bol-live-line10-excl"].status,
        "AMBIGUOUS",
      );
      assert.equal(
        interpretedById["bol-live-line12-incl"].status,
        "AMBIGUOUS",
      );
      assert.notOk(result.canonicalRelease.releaseStatus.eligible);
      assert.equal(result.canonicalRelease.canonicalReceipt, null);
      assert.ok(result.canonicalRelease.accounting.everyObservationAccounted);
      assert.ok(result.canonicalRelease.accounting.inputsUnchanged);
      assert.equal(result.normalizerCompatibility, null);
    },
  );

  QUnit.test(
    "recorded Bol runtime handoff — incomplete or duplicate evidence fails closed",
    function (assert) {
      const fixture = recordedBolStage1V2RuntimeEvidenceFixture_();
      const result = buildRecordedBolLocalHandoffExperiment_(fixture.evidence);
      const missing = result.manifest.observations.slice(0, -1);
      const duplicate = result.manifest.observations.map(function (observation) {
        return JSON.parse(JSON.stringify(observation));
      });
      duplicate[4].sourceRef.occurrenceOrder = 4;
      const missingStatus = validateRecordedBolManifestCompletenessExperiment_(
        fixture.evidence,
        missing,
      );
      const duplicateStatus = validateRecordedBolManifestCompletenessExperiment_(
        fixture.evidence,
        duplicate,
      );
      const structurallyInvalid = JSON.parse(JSON.stringify(fixture.evidence));
      structurallyInvalid.observedLines[4].unitPriceText = "€ 1,00";
      const structural = deriveRecordedBolTerminalStructureExperiment_(
        structurallyInvalid,
      );

      assert.notOk(missingStatus.resolved);
      assert.equal(
        missingStatus.conflicts[0].code,
        "MISSING_RECORDED_BOL_FINANCIAL_OCCURRENCE",
      );
      assert.notOk(duplicateStatus.resolved);
      assert.equal(
        duplicateStatus.conflicts[0].code,
        "DUPLICATE_RECORDED_BOL_FINANCIAL_OCCURRENCE",
      );
      assert.notOk(structural.resolved);
      assert.equal(
        structural.conflicts[0].code,
        "RECORDED_BOL_DESCRIPTION_ROW_MISMATCH",
      );
    },
  );

  // ==================================================
  // MANUAL STAGE-1-V2 IMAGE PERCEPTION DIAGNOSTIC
  // ==================================================

  QUnit.test(
    "Stage-1-v2 diagnostic payload — preserves isolated image input contract",
    function (assert) {
      const payload = buildOpenAIStage1V2DiagnosticPayload_(
        "image/jpeg",
        "synthetic-base64",
      );
      const imagePart = payload.messages[0].content[1];
      const prompt = payload.messages[0].content[0].text;

      assert.equal(payload.model, OPENAI.model);
      assert.equal(payload.temperature, OPENAI.temperature);
      assert.equal(payload.response_format.type, "json_schema");
      assert.ok(payload.response_format.json_schema.strict);
      assert.equal(
        imagePart.image_url.url,
        "data:image/jpeg;base64,synthetic-base64",
      );
      assert.notOk("detail" in imagePart.image_url);
      assert.ok(prompt.indexOf("Do not create canonical products") >= 0);
      assert.ok(prompt.indexOf('use roleEvidence "unknown"') >= 0);
      assert.ok(prompt.indexOf('totalTypeEvidence must be null') >= 0);
    },
  );

  QUnit.test(
    "Stage-1-v2 diagnostic parser — preserves valid evidence unchanged",
    function (assert) {
      const evidence = {
        observedLines: [
          {
            order: 1,
            rawText: "Synthetic header",
            leadingQuantityText: null,
            descriptionText: "Synthetic header",
            unitPriceText: null,
            lineTotalText: null,
            indentation: "unclear",
            roleEvidence: "header",
          },
          {
            order: 2,
            rawText: "Total 12,34",
            leadingQuantityText: null,
            descriptionText: "Total",
            unitPriceText: null,
            lineTotalText: "12,34",
            indentation: "left_aligned",
            roleEvidence: "summary",
          },
        ],
        summaryEvidence: {
          printedProductCount: null,
          printedTotal: {
            sourceLineOrder: 2,
            rawText: "Total 12,34",
            labelText: "Total",
            valueText: "12,34",
            totalTypeEvidence: null,
          },
        },
      };
      const response = createMockOpenAIResponse(JSON.stringify(evidence));
      const parsed = parseOpenAIStage1V2DiagnosticResponse_(response);

      assert.ok(compactJsonEquality(parsed, evidence));
      assert.equal(parsed.observedLines[1].rawText, "Total 12,34");
      assert.equal(
        parsed.summaryEvidence.printedTotal.totalTypeEvidence,
        null,
      );
    },
  );

  QUnit.test(
    "Stage-1-v2 diagnostic parser — rejects malformed model JSON without repair",
    function (assert) {
      assert.throws(function () {
        parseOpenAIStage1V2DiagnosticResponse_(
          createMockOpenAIResponse("```json\n{}\n```"),
        );
      }, /valid JSON evidence/);
    },
  );

  QUnit.test(
    "Stage-1-v2 diagnostic parser — rejects an unsupported evidence role",
    function (assert) {
      const evidence = {
        observedLines: [
          {
            order: 1,
            rawText: "Synthetic line",
            leadingQuantityText: null,
            descriptionText: "Synthetic line",
            unitPriceText: null,
            lineTotalText: null,
            indentation: "unclear",
            roleEvidence: "forced-role",
          },
        ],
        summaryEvidence: {
          printedProductCount: null,
          printedTotal: null,
        },
      };

      assert.throws(function () {
        parseOpenAIStage1V2DiagnosticResponse_(
          createMockOpenAIResponse(JSON.stringify(evidence)),
        );
      }, /observedLines\[0\]\.roleEvidence/);
    },
  );

  QUnit.test(
    "Stage-1-v2 diagnostic handoff — reports prototype result without normalization",
    function (assert) {
      const evidence = {
        observedLines: [
          {
            order: 1,
            rawText: "1 Synthetic item 2,00 2,00",
            leadingQuantityText: "1",
            descriptionText: "Synthetic item",
            unitPriceText: "2,00",
            lineTotalText: "2,00",
            indentation: "left_aligned",
            roleEvidence: "product",
          },
        ],
        summaryEvidence: {
          printedProductCount: null,
          printedTotal: null,
        },
      };
      const result = buildStage1V2PrototypeHandoffDiagnostic_(evidence);

      assert.ok(result.compatible);
      assert.ok(result.resolved);
      assert.equal(result.groupCount, 1);
      assert.ok(compactJsonEquality(result.groupSourceRowOrders, [[1]]));
      assert.notOk("canonicalReceiptProduced" in result);
    },
  );

  QUnit.test(
    "Stage-1-v3 contract — schema exposes physical evidence without canonical semantics",
    function (assert) {
      const schema = buildStage1V3PhysicalEvidenceJsonSchema_();
      const rowSchema = schema.properties.physicalRows.items;
      const cellSchema = rowSchema.properties.cells.items;
      const schemaText = JSON.stringify(schema);

      assert.ok(compactJsonEquality(schema.required, [
        "schemaVersion",
        "physicalRows",
        "summaryEvidence",
      ]));
      assert.ok(compactJsonEquality(
        schema.properties.schemaVersion.enum,
        ["stage1-v3"],
      ));
      assert.ok(compactJsonEquality(rowSchema.required, [
        "rowId",
        "order",
        "rawText",
        "indentationEvidence",
        "roleEvidence",
        "cells",
      ]));
      assert.ok(cellSchema.properties.meaningEvidence.enum.indexOf("unknown") >= 0);
      assert.ok(
        schemaText.indexOf("canonicalReceipt") < 0 &&
          schemaText.indexOf("observedLines") < 0 &&
          schemaText.indexOf("unitPriceText") < 0,
      );
    },
  );

  QUnit.test(
    "Stage-1-v3 contract — minimal evidence preserves strings and nullable summaries",
    function (assert) {
      const evidence = minimalStage1V3PhysicalEvidenceFixture();
      const snapshot = JSON.stringify(evidence);
      const validated = validateStage1V3PhysicalEvidence_(evidence);

      assert.ok(validated === evidence);
      assert.equal(validated.physicalRows.length, 1);
      assert.ok(compactJsonEquality(validated.summaryEvidence, {
        printedProductCount: null,
        printedTotal: null,
      }));
      assert.equal(validated.physicalRows[0].rawText, "  literal evidence  ");
      assert.equal(
        validated.physicalRows[0].cells[0].rawText,
        "  literal evidence  ",
      );
      assert.ok(JSON.stringify(evidence) === snapshot);
    },
  );

  QUnit.test(
    "Stage-1-v3 contract — parser freezes valid multi-row evidence without interpretation",
    function (assert) {
      const source = multiRowStage1V3PhysicalEvidenceFixture();
      const sourceSnapshot = JSON.stringify(source);
      const parsed = parseOpenAIStage1V3Response_(
        stage1V3OpenAIResponseFixture(source),
      );
      const uncertainRow = parsed.physicalRows[2];

      assert.ok(compactJsonEquality(
        parsed.physicalRows.map(function (row) {
          return row.order;
        }),
        [1, 2, 3, 4, 5],
      ));
      assert.ok(compactJsonEquality(
        parsed.physicalRows.map(function (row) {
          return row.rawText;
        }),
        [
          "Aantal Omschrijving €/stuk €",
          "1 Synthetic item 15,99 15,99",
          "detail",
          "Totaal 81,54",
          "Aantal producten: 6",
        ],
      ));
      assert.equal(uncertainRow.roleEvidence, "unknown");
      assert.equal(uncertainRow.cells[1].meaningEvidence, "unknown");
      assert.ok(compactJsonEquality(
        {
          rawText: uncertainRow.cells[0].rawText,
          emptyEvidence: uncertainRow.cells[0].emptyEvidence,
        },
        { rawText: "", emptyEvidence: true },
      ));
      assert.ok(compactJsonEquality(
        uncertainRow.cells.map(function (cell) {
          return cell.headerCellRef;
        }),
        ["h-quantity", "h-description", "h-unit", "h-total"],
      ));
      assert.ok(compactJsonEquality(parsed.summaryEvidence.printedTotal, {
        sourceRowId: "total-row",
        labelCellRefs: ["total-label"],
        valueCellRefs: ["total-value"],
        totalTypeEvidence: null,
      }));
      assert.equal(
        parsed.summaryEvidence.printedTotal.totalTypeEvidence,
        null,
      );
      assert.ok(Object.isFrozen(parsed));
      assert.ok(
        Object.isFrozen(parsed.physicalRows) &&
          Object.isFrozen(parsed.physicalRows[1].cells) &&
          Object.isFrozen(parsed.physicalRows[1].cells[2]),
      );
      assert.ok(JSON.stringify(parsed) === sourceSnapshot);
    },
  );

  QUnit.test(
    "Stage-1-v3 contract — rejects version and top-level allowlist violations",
    function (assert) {
      const wrongVersion = minimalStage1V3PhysicalEvidenceFixture();
      wrongVersion.schemaVersion = "stage1-v2";
      assertStage1V3ValidationRejects(assert, wrongVersion, "schemaVersion");

      const unexpected = minimalStage1V3PhysicalEvidenceFixture();
      unexpected.unexpected = true;
      assertStage1V3ValidationRejects(assert, unexpected, "invalid fields");

      const missing = minimalStage1V3PhysicalEvidenceFixture();
      delete missing.summaryEvidence;
      assertStage1V3ValidationRejects(assert, missing, "invalid fields");
    },
  );

  QUnit.test(
    "Stage-1-v3 contract — rejects duplicate identities and non-increasing order",
    function (assert) {
      const duplicateRow = multiRowStage1V3PhysicalEvidenceFixture();
      duplicateRow.physicalRows[1].rowId = "header-row";
      assertStage1V3ValidationRejects(assert, duplicateRow, "rowId is duplicated");

      const duplicateCell = multiRowStage1V3PhysicalEvidenceFixture();
      duplicateCell.physicalRows[1].cells[0].cellId = "h-quantity";
      assertStage1V3ValidationRejects(assert, duplicateCell, "cellId is duplicated");

      const rowOrder = multiRowStage1V3PhysicalEvidenceFixture();
      rowOrder.physicalRows[1].order = 1;
      assertStage1V3ValidationRejects(assert, rowOrder, ".order is invalid");

      const columnOrder = multiRowStage1V3PhysicalEvidenceFixture();
      columnOrder.physicalRows[0].cells[1].columnOrder = 1;
      assertStage1V3ValidationRejects(
        assert,
        columnOrder,
        ".columnOrder is invalid",
      );
    },
  );

  QUnit.test(
    "Stage-1-v3 contract — rejects invalid annotations and contradictory emptiness",
    function (assert) {
      const indentation = minimalStage1V3PhysicalEvidenceFixture();
      indentation.physicalRows[0].indentationEvidence = "centered";
      assertStage1V3ValidationRejects(assert, indentation, "indentationEvidence");

      const role = minimalStage1V3PhysicalEvidenceFixture();
      role.physicalRows[0].roleEvidence = "canonical-product";
      assertStage1V3ValidationRejects(assert, role, "roleEvidence");

      const meaning = minimalStage1V3PhysicalEvidenceFixture();
      meaning.physicalRows[0].cells[0].meaningEvidence = "net_total";
      assertStage1V3ValidationRejects(assert, meaning, "meaningEvidence");

      const emptyFalse = multiRowStage1V3PhysicalEvidenceFixture();
      emptyFalse.physicalRows[2].cells[0].emptyEvidence = false;
      assertStage1V3ValidationRejects(assert, emptyFalse, "emptyEvidence");

      const nonEmptyTrue = minimalStage1V3PhysicalEvidenceFixture();
      nonEmptyTrue.physicalRows[0].cells[0].emptyEvidence = true;
      assertStage1V3ValidationRejects(assert, nonEmptyTrue, "emptyEvidence");

      const emptyMeaning = multiRowStage1V3PhysicalEvidenceFixture();
      emptyMeaning.physicalRows[2].cells[0].meaningEvidence = "quantity";
      assertStage1V3ValidationRejects(
        assert,
        emptyMeaning,
        "meaningEvidence contradicts empty evidence",
      );
    },
  );

  QUnit.test(
    "Stage-1-v3 contract — validates only bounded earlier-header references",
    function (assert) {
      const dangling = multiRowStage1V3PhysicalEvidenceFixture();
      dangling.physicalRows[1].cells[2].headerCellRef = "missing-header";
      assertStage1V3ValidationRejects(assert, dangling, "matching earlier header");

      const selfReference = minimalStage1V3PhysicalEvidenceFixture();
      selfReference.physicalRows[0].cells[0].headerCellRef = "cell-1";
      assertStage1V3ValidationRejects(assert, selfReference, "self-reference");

      const nonHeader = multiRowStage1V3PhysicalEvidenceFixture();
      nonHeader.physicalRows[1].cells[2].headerCellRef = "p-total";
      assertStage1V3ValidationRejects(assert, nonHeader, "matching earlier header");

      const laterHeader = multiRowStage1V3PhysicalEvidenceFixture();
      const headerRow = laterHeader.physicalRows[0];
      const productRow = laterHeader.physicalRows[1];
      productRow.order = 1;
      headerRow.order = 2;
      laterHeader.physicalRows = [productRow, headerRow];
      laterHeader.summaryEvidence.printedProductCount = null;
      laterHeader.summaryEvidence.printedTotal = null;
      assertStage1V3ValidationRejects(
        assert,
        laterHeader,
        "matching earlier header",
      );

      const wrongColumn = multiRowStage1V3PhysicalEvidenceFixture();
      wrongColumn.physicalRows[1].cells[2].headerCellRef = "h-total";
      assertStage1V3ValidationRejects(
        assert,
        wrongColumn,
        "matching earlier header",
      );
    },
  );

  QUnit.test(
    "Stage-1-v3 contract — rejects invalid and duplicate summary references",
    function (assert) {
      const danglingRow = multiRowStage1V3PhysicalEvidenceFixture();
      danglingRow.summaryEvidence.printedTotal.sourceRowId = "missing-row";
      assertStage1V3ValidationRejects(assert, danglingRow, "sourceRowId");

      const danglingCell = multiRowStage1V3PhysicalEvidenceFixture();
      danglingCell.summaryEvidence.printedTotal.valueCellRefs = ["missing-cell"];
      assertStage1V3ValidationRejects(assert, danglingCell, "cellRefs");

      const wrongRow = multiRowStage1V3PhysicalEvidenceFixture();
      wrongRow.summaryEvidence.printedTotal.sourceRowId = "count-row";
      assertStage1V3ValidationRejects(assert, wrongRow, "another source row");

      const duplicateLabel = multiRowStage1V3PhysicalEvidenceFixture();
      duplicateLabel.summaryEvidence.printedTotal.labelCellRefs = [
        "total-label",
        "total-label",
      ];
      assertStage1V3ValidationRejects(assert, duplicateLabel, "duplicate cell refs");

      const overlapping = multiRowStage1V3PhysicalEvidenceFixture();
      overlapping.summaryEvidence.printedTotal.valueCellRefs = ["total-label"];
      assertStage1V3ValidationRejects(assert, overlapping, "duplicate cell refs");

      const emptyRefs = multiRowStage1V3PhysicalEvidenceFixture();
      emptyRefs.summaryEvidence.printedProductCount.labelCellRefs = [];
      assertStage1V3ValidationRejects(
        assert,
        emptyRefs,
        "must contain label and value cell refs",
      );

      const totalType = multiRowStage1V3PhysicalEvidenceFixture();
      totalType.summaryEvidence.printedTotal.totalTypeEvidence = "payable";
      assertStage1V3ValidationRejects(assert, totalType, "totalTypeEvidence");
    },
  );

  QUnit.test(
    "Stage-1-v3 contract — rejects malformed count and total summary objects",
    function (assert) {
      const countShape = multiRowStage1V3PhysicalEvidenceFixture();
      countShape.summaryEvidence.printedProductCount.totalTypeEvidence = null;
      assertStage1V3ValidationRejects(assert, countShape, "invalid fields");

      const totalShape = multiRowStage1V3PhysicalEvidenceFixture();
      delete totalShape.summaryEvidence.printedTotal.totalTypeEvidence;
      assertStage1V3ValidationRejects(assert, totalShape, "invalid fields");
    },
  );

  QUnit.test(
    "Stage-1-v3 contract — rejects malformed empty and non-JSON envelopes",
    function (assert) {
      assert.throws(function () {
        parseOpenAIStage1V3Response_("{");
      }, /response was not valid JSON/);
      assert.throws(function () {
        parseOpenAIStage1V3Response_(JSON.stringify({ choices: [] }));
      }, /returned no JSON evidence content/);
      assert.throws(function () {
        parseOpenAIStage1V3Response_(JSON.stringify({
          choices: [{ message: { content: "   " } }],
        }));
      }, /returned no JSON evidence content/);
      assert.throws(function () {
        parseOpenAIStage1V3Response_(JSON.stringify({
          choices: [{ message: { content: "not-json" } }],
        }));
      }, /content was not valid JSON evidence/);
    },
  );

  QUnit.test(
    "Stage-1-v3 projection — same-row fields and continuations remain literal",
    function (assert) {
      const input = stage1V3AnchorContinuationProjectionFixture();
      const snapshot = JSON.stringify(input);
      const result = projectStage1V3ToObservedLines_(input);
      const anchor = result.evidence.observedLines[0];
      const continuation = result.evidence.observedLines[1];

      assert.ok(result.resolved);
      assert.equal(result.evidence.observedLines.length, 2);
      assert.ok(compactJsonEquality(anchor, {
        order: 1,
        rawText: "1 Synthetic anchor 15,99 15,99",
        leadingQuantityText: "1",
        descriptionText: "Synthetic anchor",
        unitPriceText: "15,99",
        lineTotalText: "15,99",
        indentation: "left_aligned",
        roleEvidence: "product",
      }));
      assert.ok(compactJsonEquality(continuation, {
        order: 2,
        rawText: "1 continuation detail",
        leadingQuantityText: "1",
        descriptionText: "continuation detail",
        unitPriceText: null,
        lineTotalText: null,
        indentation: "indented",
        roleEvidence: "product",
      }));
      assert.equal(anchor.rawText, input.physicalRows[0].rawText);
      assert.ok(compactJsonEquality(
        result.sourceMap.rows[0].fieldSources.unitPriceText,
        { cellId: "a1-u", headerCellRef: null },
      ));
      assert.equal(
        result.accounting.sourceCellCount,
        result.accounting.accountedCellCount,
      );
      assert.notOk("groups" in result);
      assert.ok(JSON.stringify(input) === snapshot);
    },
  );

  QUnit.test(
    "Stage-1-v3 projection — bounded annotations copy without interpretation",
    function (assert) {
      const linkedInput = stage1V3ProjectionEvidenceFixture([
        stage1V3ProjectionRowFixture(
          "header",
          1,
          "Quantity Description Unit Total",
          "left_aligned",
          "header",
          [
            ["hq", "Quantity", "other"],
            ["hd", "Description", "other"],
            ["hu", "Unit", "other"],
            ["ht", "Total", "other"],
          ],
        ),
        stage1V3ProjectionRowFixture(
          "linked",
          2,
          "1 Linked 2,00 2,00",
          "unclear",
          "unknown",
          [
            ["lq", "1", "quantity", "hq"],
            ["ld", "Linked", "description", "hd"],
            ["lu", "2,00", "unit_price", "hu"],
            ["lt", "2,00", "line_total", "ht"],
          ],
        ),
        stage1V3ProjectionRowFixture(
          "headerless",
          3,
          "1 Headerless 3,00",
          "left_aligned",
          "product",
          [
            ["uq", "1", "quantity"],
            ["ud", "Headerless", "description"],
            ["uu", "3,00", "unit_price"],
          ],
        ),
      ]);
      const result = projectStage1V3ToObservedLines_(linkedInput);

      assert.ok(result.resolved);
      assert.equal(result.evidence.observedLines[1].indentation, "unclear");
      assert.equal(result.evidence.observedLines[1].roleEvidence, "unknown");
      assert.ok(compactJsonEquality(
        [
          result.evidence.observedLines[1].unitPriceText,
          result.evidence.observedLines[2].unitPriceText,
        ],
        ["2,00", "3,00"],
      ));
      assert.equal(result.evidence.observedLines[2].lineTotalText, null);
      assert.ok(compactJsonEquality(
        result.sourceMap.rows[1].fieldSources.unitPriceText,
        { cellId: "lu", headerCellRef: "hu" },
      ));
      assert.ok(result.sourceMap.rows[0].contextOnlyCellIds.length === 4);
    },
  );

  QUnit.test(
    "Stage-1-v3 projection — six-product topology preserves physical price rows",
    function (assert) {
      const result = projectStage1V3ToObservedLines_(
        sanitizedSixProductStage1V3ProjectionFixture(),
      );
      const priced = result.evidence.observedLines.filter(function (line) {
        return line.unitPriceText !== null || line.lineTotalText !== null;
      });

      assert.ok(result.resolved);
      assert.ok(compactJsonEquality(priced.map(function (line) {
        return line.order;
      }), [3, 5, 7, 9, 11, 13]));
      assert.ok(compactJsonEquality(priced.map(function (line) {
        return line.unitPriceText;
      }), ["15,99", "9,79", "5,49", "9,99", "15,29", "24,99"]));
      assert.ok(compactJsonEquality(priced.map(function (line) {
        return line.lineTotalText;
      }), ["15,99", "9,79", "5,49", "9,99", "15,29", "24,99"]));
      assert.equal(
        result.evidence.observedLines[3].leadingQuantityText,
        "1",
      );
      assert.equal(
        result.accounting.sourceCellCount,
        result.accounting.accountedCellCount,
      );
    },
  );

  QUnit.test(
    "Stage-1-v3 projection — ambiguous row fields fail closed",
    function (assert) {
      const semanticCases = [
        ["quantity", "leadingQuantityText"],
        ["description", "descriptionText"],
        ["unit_price", "unitPriceText"],
        ["line_total", "lineTotalText"],
      ];
      const results = semanticCases.map(function (item, index) {
        const input = simpleStage1V3ProjectionFixture();
        input.physicalRows[0].cells.push(stage1V3CellFixture(
          "duplicate-" + String(index),
          5,
          "duplicate",
          null,
          item[0],
        ));
        return {
          field: item[1],
          result: projectStage1V3ToObservedLines_(input),
        };
      });

      assert.ok(results.every(function (item) {
        return !item.result.resolved &&
          item.result.evidence === null &&
          item.result.conflicts.some(function (conflict) {
            return conflict.code === "AMBIGUOUS_ROW_FIELD" &&
              conflict.field === item.field;
          });
      }));
      assert.ok(results.every(function (item) {
        return item.result.accounting.sourceCellCount ===
          item.result.accounting.accountedCellCount;
      }));
    },
  );

  QUnit.test(
    "Stage-1-v3 projection — bounded context handling preserves or rejects without heuristics",
    function (assert) {
      const productOther = simpleStage1V3ProjectionFixture();
      productOther.physicalRows[0].cells.push(stage1V3CellFixture(
        "product-other",
        5,
        "unclassified fragment",
        null,
        "other",
      ));
      const productOtherResult = projectStage1V3ToObservedLines_(productOther);

      const summaryUnknown = stage1V3SummaryProjectionFixture(null);
      summaryUnknown.physicalRows[0].cells[1].meaningEvidence = "unknown";
      const summaryUnknownResult = projectStage1V3ToObservedLines_(
        summaryUnknown,
      );

      const emptyContext = simpleStage1V3ProjectionFixture();
      emptyContext.physicalRows[0].cells.push(stage1V3CellFixture(
        "empty-context",
        5,
        "",
        null,
        "unknown",
      ));
      const emptyContextResult = projectStage1V3ToObservedLines_(emptyContext);

      const oneSided = simpleStage1V3ProjectionFixture();
      oneSided.physicalRows[0].cells.pop();
      const oneSidedResult = projectStage1V3ToObservedLines_(oneSided);

      assert.ok(productOtherResult.conflicts.some(function (conflict) {
        return conflict.code === "UNREPRESENTABLE_CELL_EVIDENCE";
      }));
      assert.ok(summaryUnknownResult.conflicts.some(function (conflict) {
        return conflict.code === "SUMMARY_PROJECTION_CONFLICT";
      }));
      assert.ok(emptyContextResult.resolved);
      assert.ok(
        emptyContextResult.sourceMap.rows[0].contextOnlyCellIds.indexOf(
          "empty-context",
        ) >= 0,
      );
      assert.ok(oneSidedResult.resolved);
      assert.ok(compactJsonEquality(
        {
          unitPriceText:
            oneSidedResult.evidence.observedLines[0].unitPriceText,
          lineTotalText:
            oneSidedResult.evidence.observedLines[0].lineTotalText,
        },
        { unitPriceText: "15,99", lineTotalText: null },
      ));
    },
  );

  QUnit.test(
    "Stage-1-v3 projection — summaries map literally or remain unresolved",
    function (assert) {
      const literalResult = projectStage1V3ToObservedLines_(
        stage1V3SummaryProjectionFixture(null),
      );

      assert.ok(literalResult.resolved);
      assert.ok(compactJsonEquality(literalResult.evidence.summaryEvidence, {
        printedProductCount: {
          sourceLineOrder: 2,
          rawText: "Aantal producten: 6",
          labelText: "Aantal producten:",
          valueText: "6",
        },
        printedTotal: {
          sourceLineOrder: 1,
          rawText: "Totaal 81,54",
          labelText: "Totaal",
          valueText: "81,54",
          totalTypeEvidence: null,
        },
      }));
      assert.equal(
        literalResult.evidence.summaryEvidence.printedTotal.totalTypeEvidence,
        null,
      );
      assert.equal(
        literalResult.accounting.sourceCellCount,
        literalResult.accounting.accountedCellCount,
      );

      const multiRefInput = stage1V3SummaryProjectionFixture(null);
      multiRefInput.physicalRows[0].cells.push(stage1V3CellFixture(
        "total-label-extra",
        3,
        "extra",
        null,
        "summary_label",
      ));
      multiRefInput.summaryEvidence.printedTotal.labelCellRefs.push(
        "total-label-extra",
      );
      const multiRefResult = projectStage1V3ToObservedLines_(multiRefInput);

      assert.notOk(multiRefResult.resolved);
      assert.ok(multiRefResult.conflicts.some(function (conflict) {
        return conflict.code === "SUMMARY_PROJECTION_CONFLICT";
      }));
    },
  );

  QUnit.test(
    "Stage-1-v3 projection boundary-of-guarantee — coherent perception error remains unchanged",
    function (assert) {
      // Projection does not inspect the image. A physically false but
      // internally coherent row therefore remains a perception limitation.
      const input = simpleStage1V3ProjectionFixture();
      const row = input.physicalRows[0];
      row.rawText = "1 continuation-like part 9,79 9,79";
      row.cells[1].rawText = "continuation-like part";
      row.cells[2].rawText = "9,79";
      row.cells[3].rawText = "9,79";
      const snapshot = JSON.stringify(input);
      const result = projectStage1V3ToObservedLines_(input);
      const line = result.evidence.observedLines[0];

      assert.ok(result.resolved);
      assert.equal(line.rawText, "1 continuation-like part 9,79 9,79");
      assert.equal(line.descriptionText, "continuation-like part");
      assert.ok(compactJsonEquality(
        [line.unitPriceText, line.lineTotalText],
        ["9,79", "9,79"],
      ));
      assert.ok(JSON.stringify(input) === snapshot);
    },
  );

  QUnit.test(
    "Stage-1-v3 projection integration — unchanged candidate boundary groups continuations",
    function (assert) {
      const projection = projectStage1V3ToObservedLines_(
        stage1V3AnchorContinuationProjectionFixture(),
      );
      const candidate = buildStagedReceiptCandidate(projection.evidence);

      assert.ok(projection.resolved);
      assert.ok(candidate.structuralStatus.resolved);
      assert.ok(compactJsonEquality(
        candidate.evidenceTrace.candidateItemSources[0].sourceRowOrders,
        [1, 2],
      ));
      assert.equal(
        candidate.candidateReceipt.items[0].name,
        "Synthetic anchor continuation detail",
      );
      assert.ok(candidate.evidenceTrace.anomalies.some(function (anomaly) {
        return anomaly.code === "UNEXPECTED_QUANTITY_ON_CONTINUATION" &&
          anomaly.rowOrder === 2;
      }));
    },
  );

  QUnit.test(
    "Stage-1-v3 projection integration — representable uncertainty fails closed downstream",
    function (assert) {
      const unclearInput = simpleStage1V3ProjectionFixture();
      unclearInput.physicalRows[0].indentationEvidence = "unclear";
      const unclearProjection = projectStage1V3ToObservedLines_(unclearInput);
      const unclearCandidate = buildStagedReceiptCandidate(
        unclearProjection.evidence,
      );
      const unknownInput = simpleStage1V3ProjectionFixture();
      unknownInput.physicalRows[0].roleEvidence = "unknown";
      const unknownProjection = projectStage1V3ToObservedLines_(unknownInput);
      const unknownCandidate = buildStagedReceiptCandidate(
        unknownProjection.evidence,
      );

      assert.ok(unclearProjection.resolved && unknownProjection.resolved);
      assert.notOk(unclearCandidate.structuralStatus.resolved);
      assert.ok(unclearCandidate.structuralStatus.conflicts.some(function (conflict) {
        return conflict.code === "UNSUPPORTED_ROW_STRUCTURE";
      }));
      assert.notOk(unknownCandidate.structuralStatus.resolved);
      assert.ok(unknownCandidate.structuralStatus.conflicts.some(function (conflict) {
        return conflict.code === "UNKNOWN_OBSERVATION_ROLE";
      }));
      assert.ok(
        unclearCandidate.canonicalReceipt === null &&
          unknownCandidate.canonicalReceipt === null,
      );
    },
  );

  QUnit.test(
    "Stage-1-v3 projection integration — unresolved adapter result has no candidate input",
    function (assert) {
      const input = simpleStage1V3ProjectionFixture();
      input.physicalRows[0].cells.push(stage1V3CellFixture(
        "duplicate-unit",
        5,
        "99,99",
        null,
        "unit_price",
      ));
      const result = projectStage1V3ToObservedLines_(input);

      assert.notOk(result.resolved);
      assert.equal(result.evidence, null);
      assert.ok(compactJsonEquality(Object.keys(result).sort(), [
        "accounting",
        "conflicts",
        "evidence",
        "resolved",
        "sourceMap",
      ]));
      assert.notOk(
        "canonicalReceipt" in result ||
          "normalizedReceipt" in result ||
          "legacyReceipt" in result,
      );
    },
  );

  QUnit.test(
    "Stage-1-v3 request diagnostic — payload reuses the contract and isolates configuration",
    function (assert) {
      const payload = buildOpenAIStage1V3DiagnosticPayload_(
        "image/png",
        "bounded-test-data",
      );

      assert.equal(payload.model, "gpt-4o-2024-08-06");
      assert.notEqual(payload.model, OPENAI.model);
      assert.equal(payload.temperature, OPENAI.temperature);
      assert.equal(payload.response_format.type, "json_schema");
      assert.equal(
        payload.response_format.json_schema.name,
        "stage1_v3_physical_receipt_evidence",
      );
      assert.ok(payload.response_format.json_schema.strict);
      assert.ok(compactJsonEquality(
        payload.response_format.json_schema.schema,
        buildStage1V3PhysicalEvidenceJsonSchema_(),
      ));
      assert.equal(
        payload.messages[0].content[1].image_url.url,
        "data:image/png;base64,bounded-test-data",
      );
    },
  );

  QUnit.test(
    "Stage-1-v3 request diagnostic — prompt requires physical transcription",
    function (assert) {
      const prompt = buildOpenAIStage1V3DiagnosticPayload_(
        "image/jpeg",
        "bounded-test-data",
      ).messages[0].content[0].text;

      assert.ok(prompt.indexOf("all relevant physical rows") >= 0);
      assert.ok(prompt.indexOf("top-to-bottom order") >= 0);
      assert.ok(prompt.indexOf("stable unique rowId") >= 0);
      assert.ok(prompt.indexOf("left-to-right columnOrder") >= 0);
      assert.ok(prompt.indexOf("stable unique cellId") >= 0);
      assert.ok(prompt.indexOf("literal row text") >= 0);
      assert.ok(prompt.indexOf("literal cell text") >= 0);
      assert.ok(prompt.indexOf("empty position is visually supported") >= 0);
      assert.ok(prompt.indexOf("indentationEvidence") >= 0);
      assert.ok(prompt.indexOf("roleEvidence") >= 0);
      assert.ok(prompt.indexOf("meaningEvidence") >= 0);
      assert.ok(prompt.indexOf("headerCellRef only when") >= 0);
      assert.ok(prompt.indexOf('use "unknown" whenever') >= 0);
      assert.ok(
        prompt.indexOf("only actual rowIds and cellIds reported") >= 0 &&
          prompt.indexOf("VAT basis is visually explicit") >= 0,
      );
    },
  );

  QUnit.test(
    "Stage-1-v3 request diagnostic — prompt prohibits repair and interpretation",
    function (assert) {
      const prompt = buildOpenAIStage1V3DiagnosticPayload_(
        "image/png",
        "bounded-test-data",
      ).messages[0].content[0].text;

      assert.ok(prompt.indexOf("Do not move a price") >= 0);
      assert.ok(prompt.indexOf("Do not move a quantity") >= 0);
      assert.ok(prompt.indexOf("Do not merge physical rows") >= 0);
      assert.ok(prompt.indexOf("reconstruct an expected product block") >= 0);
      assert.ok(prompt.indexOf("printed product count or printed total") >= 0);
      assert.ok(prompt.indexOf("arithmetic or quantity-times-price reasoning") >= 0);
      assert.ok(prompt.indexOf("Do not reconcile values") >= 0);
      assert.ok(prompt.indexOf("infer VAT meaning") >= 0);
      assert.ok(prompt.indexOf("merchant-specific assumptions") >= 0);
      assert.ok(prompt.indexOf("invent missing cells") >= 0);
      assert.ok(prompt.indexOf("silently correct OCR or transcription") >= 0);
      assert.ok(prompt.indexOf("Do not construct a canonical receipt") >= 0);
      assert.equal(prompt.indexOf("Return a canonical receipt"), -1);
    },
  );

  QUnit.test(
    "Stage-1-v3 request diagnostic — production routing and Stage-1-v2 remain unchanged",
    function (assert) {
      const stagedSource = analyzeImageReceiptWithStagedExtraction_.toString();
      const parserSource = parseStagedImageEvidenceOrThrow_.toString();
      const productionSource = analyzeReceiptWithOpenAI.toString();

      assert.equal(getReceiptAnalysisRoute_("image/png", true), "staged-image");
      assert.ok(stagedSource.indexOf("buildOpenAIStage1V2Payload_") >= 0);
      assert.ok(parserSource.indexOf("parseOpenAIStage1V2Response_") >= 0);
      assert.equal(stagedSource.indexOf("Stage1V3"), -1);
      assert.equal(productionSource.indexOf("Stage1V3"), -1);
      assert.equal(OPENAI.model, "gpt-4o");
      assert.equal(STAGE1_V3_DIAGNOSTIC_MODEL_, "gpt-4o-2024-08-06");
    },
  );

  QUnit.test(
    "Stage-1-v3 request diagnostic — response metadata preserves available fields",
    function (assert) {
      const metadata = buildStage1V3DiagnosticResponseMetadata_(
        "gpt-4o-2024-08-06",
        {
          model: "gpt-4o-2024-08-06",
          system_fingerprint: "bounded-fingerprint",
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
          choices: [{ finish_reason: "stop" }],
        },
      );

      assert.equal(metadata.requestedModel, "gpt-4o-2024-08-06");
      assert.ok(compactJsonEquality(metadata, {
        requestedModel: "gpt-4o-2024-08-06",
        returnedModel: "gpt-4o-2024-08-06",
        systemFingerprint: "bounded-fingerprint",
        finishReason: "stop",
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      }));
    },
  );

  QUnit.test(
    "Stage-1-v3 request diagnostic — absent optional metadata remains valid",
    function (assert) {
      assert.ok(compactJsonEquality(
        buildStage1V3DiagnosticResponseMetadata_(
          "gpt-4o-2024-08-06",
          { choices: [{ message: {} }] },
        ),
        {
          requestedModel: "gpt-4o-2024-08-06",
          returnedModel: null,
          systemFingerprint: null,
          finishReason: null,
          usage: null,
        },
      ));
    },
  );

  QUnit.test(
    "Stage-1-v3 request diagnostic — one request uses the existing parser without retry or fallback",
    function (assert) {
      const evidence = minimalStage1V3PhysicalEvidenceFixture();
      const responseText = JSON.stringify({
        model: "gpt-4o-2024-08-06",
        choices: [{
          finish_reason: "stop",
          message: { content: JSON.stringify(evidence) },
        }],
      });
      let requestCount = 0;
      let requestedUrl = null;
      let requestedOptions = null;
      const result = requestOpenAIStage1V3Diagnostic_(
        "image/png",
        "bounded-test-data",
        null,
        function (url, options) {
          requestCount += 1;
          requestedUrl = url;
          requestedOptions = options;
          return {
            getResponseCode: function () { return 200; },
            getContentText: function () { return responseText; },
          };
        },
      );

      assert.equal(requestCount, 1);
      assert.equal(requestedUrl, OPENAI.apiUrl);
      assert.equal(requestedOptions.method, "post");
      assert.equal(
        JSON.parse(requestedOptions.payload).response_format.json_schema.name,
        "stage1_v3_physical_receipt_evidence",
      );
      assert.equal(result.requestedModel, "gpt-4o-2024-08-06");
      assert.ok(Object.isFrozen(result.evidence));
      assert.ok(Object.isFrozen(result.evidence.physicalRows[0]));

      let failedRequestCount = 0;
      assert.throws(function () {
        requestOpenAIStage1V3Diagnostic_(
          "image/png",
          "bounded-test-data",
          null,
          function () {
            failedRequestCount += 1;
            return {
              getResponseCode: function () { return 503; },
              getContentText: function () { return ""; },
            };
          },
        );
      }, /STAGE1_V3_HTTP_503/);
      assert.equal(failedRequestCount, 1);
      assert.equal(
        requestOpenAIStage1V3Diagnostic_.toString().indexOf("Stage1V2"),
        -1,
      );
      assert.ok(
        requestOpenAIStage1V3Diagnostic_.toString().indexOf(
          "parseOpenAIStage1V3Response_",
        ) >= 0,
      );
    },
  );

  QUnit.test(
    "Stage-1-v3 request diagnostic — explicit selector and image MIME fail before request",
    function (assert) {
      let fileLookupCount = 0;
      assert.throws(function () {
        runStage1V3ImageRequestDiagnosticForFileId_("", {
          getFileById: function () { fileLookupCount += 1; },
        });
      }, /Drive image file ID is required/);
      assert.equal(fileLookupCount, 0);

      let keyReadCount = 0;
      let requestCount = 0;
      assert.throws(function () {
        runStage1V3ImageRequestDiagnosticForFileId_("explicit-test-id", {
          getFileById: function () {
            return {
              getMimeType: function () { return "application/pdf"; },
            };
          },
          getOpenAIApiKey: function () { keyReadCount += 1; },
          request: function () { requestCount += 1; },
        });
      }, /UNSUPPORTED_STAGE1_V3_IMAGE_MIME/);
      assert.equal(keyReadCount, 0);
      assert.equal(requestCount, 0);
    },
  );

  QUnit.test(
    "Stage-1-v3 request diagnostic — unresolved projection skips downstream candidate",
    function (assert) {
      let candidateCount = 0;
      const result = runStage1V3ImageRequestDiagnosticForFileId_(
        "explicit-test-id",
        stage1V3DiagnosticDependencyFixture_(
          minimalStage1V3PhysicalEvidenceFixture(),
          {
            resolved: false,
            evidence: null,
            conflicts: [{ code: "SYNTHETIC_PROJECTION_CONFLICT" }],
            sourceMap: { rows: [], summaries: {} },
            accounting: {
              sourceRowCount: 1,
              projectedLineCount: 1,
              sourceCellCount: 1,
              accountedCellCount: 1,
            },
          },
          function () { candidateCount += 1; },
        ),
      );

      assert.ok(result.transportSuccess);
      assert.ok(result.contractValid);
      assert.notOk(result.projectionResolved);
      assert.notOk(result.candidateResolved);
      assert.notOk(result.candidateInspection.invoked);
      assert.equal(candidateCount, 0);
      assert.ok(
        result.requiresHumanSourceComparison &&
          result.perceptionCorrectnessDetermined === false,
      );
    },
  );

  QUnit.test(
    "Stage-1-v3 request diagnostic — resolved projection permits bounded read-only candidate inspection",
    function (assert) {
      const evidence = simpleStage1V3ProjectionFixture();
      let requestCount = 0;
      let candidateCount = 0;
      const dependencies = stage1V3DiagnosticDependencyFixture_(
        evidence,
        null,
        function (projectedEvidence) {
          candidateCount += 1;
          return {
            structuralStatus: {
              resolved: true,
              conflicts: [],
              unconsumedRowOrders: [],
            },
            financialStatus: {
              resolved: false,
              code: "MISSING_PRINTED_TOTAL_EVIDENCE",
            },
            candidateReceipt: { items: [{ name: "Bounded candidate" }] },
            canonicalReceipt: null,
            evidenceTrace: { originalObservations: projectedEvidence.observedLines },
          };
        },
      );
      const originalRequest = dependencies.request;
      dependencies.request = function () {
        requestCount += 1;
        return originalRequest();
      };
      const result = runStage1V3ImageRequestDiagnosticForFileId_(
        "explicit-test-id",
        dependencies,
      );
      const diagnosticSource =
        runStage1V3ImageRequestDiagnosticForFileId_.toString() +
        buildStage1V3DiagnosticCandidateInspection_.toString();

      assert.equal(requestCount, 1);
      assert.ok(result.projectionResolved);
      assert.equal(candidateCount, 1);
      assert.ok(result.candidateResolved);
      assert.ok(result.candidateInspection.invoked);
      assert.equal(result.candidateInspection.candidateItemCount, 1);
      assert.equal(result.candidateInspection.financialStatus.code,
        "MISSING_PRINTED_TOTAL_EVIDENCE");
      assert.ok(
        result.source.fileId === "explicit-test-id" &&
          result.source.fileName === "bounded-test.png" &&
          result.source.sha256 === "bounded-test-sha256",
      );
      assert.equal("classification" in result, false);
      assert.ok(diagnosticSource.indexOf("projectStage1V3ToObservedLines_") >= 0);
      assert.ok(diagnosticSource.indexOf("buildStagedReceiptCandidate") >= 0);
      assert.ok(
        [
          "SpreadsheetApp",
          "replaceMaterialsForWerkbon",
          "generateWerkbon",
          "normalizeAndAggregateReceiptData",
          "setName",
          "setTrashed",
        ].every(function (forbiddenName) {
          return diagnosticSource.indexOf(forbiddenName) < 0;
        }),
      );
    },
  );

  QUnit.test(
    "Stage-1 table-evidence diagnostic payload — requests only physical table structure",
    function (assert) {
      const payload = buildOpenAIStage1V2TableEvidenceDiagnosticPayload_(
        "image/png",
        "synthetic-base64",
      );
      const prompt = payload.messages[0].content[0].text;
      const imagePart = payload.messages[0].content[1];
      const schema = payload.response_format.json_schema.schema;

      assert.equal(
        imagePart.image_url.url,
        "data:image/png;base64,synthetic-base64",
      );
      assert.notOk("detail" in imagePart.image_url);
      assert.equal(
        payload.response_format.json_schema.name,
        "stage1_v2_table_evidence",
      );
      assert.ok(schema.required.indexOf("tableEvidence") >= 0);
      assert.ok(prompt.indexOf("physical header-to-cell association") >= 0);
      assert.ok(prompt.indexOf("observed empty cell position") >= 0);
      assert.ok(prompt.indexOf("does not inherit or reference observedLines.order") >= 0);
      assert.ok(prompt.indexOf("Do not use arithmetic") >= 0);
    },
  );

  QUnit.test(
    "Stage-1 table evidence — preserves ordered cells, binding, and an empty position",
    function (assert) {
      const evidence = syntheticStage1V2TableEvidenceDiagnosticFixture_();
      const response = createMockOpenAIResponse(JSON.stringify(evidence));
      const parsed = parseOpenAIStage1V2TableEvidenceDiagnosticResponse_(
        response,
      );
      const assessment = assessStage1V2TableEvidenceDiagnostic_(parsed);
      const rows = parsed.tableEvidence.regions[0].rows;
      const emptyCell = rows[1].cells[2];

      assert.ok(compactJsonEquality(parsed, evidence));
      assert.ok(
        assessment.resolved &&
          assessment.coordinateSystem === "table-local" &&
          assessment.crossRepresentationAlignment === "unresolved",
      );
      assert.ok(compactJsonEquality(
        rows[0].cells.map(function (cell) { return cell.columnOrder; }),
        [1, 2, 3, 4],
      ));
      assert.ok(compactJsonEquality(
        rows[1].cells.map(function (cell) { return cell.columnOrder; }),
        [1, 2, 3, 4],
      ));
      assert.equal(rows[1].cells[1].headerCellRef, "header-value-a");
      assert.equal(emptyCell.rawText, "");
      assert.ok(emptyCell.emptyEvidence);
      assert.ok(
        rows[1].cells[1].rawText === rows[1].cells[3].rawText &&
          rows[1].cells[1].cellId !== rows[1].cells[3].cellId,
      );
    },
  );

  QUnit.test(
    "Stage-1 table evidence — unresolved or absent association remains fail-closed",
    function (assert) {
      const unresolved = syntheticStage1V2TableEvidenceDiagnosticFixture_();
      unresolved.tableEvidence.regions[0].rows[1].cells[3].headerCellRef = null;
      const unresolvedAssessment = assessStage1V2TableEvidenceDiagnostic_(
        unresolved,
      );
      const absent = syntheticStage1V2TableEvidenceDiagnosticFixture_();
      absent.tableEvidence = null;
      const absentAssessment = assessStage1V2TableEvidenceDiagnostic_(absent);
      const incomplete = syntheticStage1V2TableEvidenceDiagnosticFixture_();
      incomplete.tableEvidence.regions[0].rows[1].cells.splice(2, 1);
      const incompleteAssessment = assessStage1V2TableEvidenceDiagnostic_(
        incomplete,
      );
      const originalEvidence = {
        observedLines: absent.observedLines,
        summaryEvidence: absent.summaryEvidence,
      };

      validateStage1V2TableEvidenceDiagnostic_(unresolved);
      validateStage1V2TableEvidenceDiagnostic_(absent);
      validateStage1V2Evidence_(originalEvidence);

      assert.notOk(unresolvedAssessment.resolved);
      assert.equal(
        unresolvedAssessment.conflicts[0].code,
        "UNRESOLVED_TABLE_HEADER_ASSOCIATION",
      );
      assert.notOk(absentAssessment.resolved);
      assert.equal(absentAssessment.conflicts[0].code, "NO_TABLE_EVIDENCE");
      assert.notOk(incompleteAssessment.resolved);
      assert.equal(
        incompleteAssessment.conflicts[0].code,
        "INCOMPLETE_TABLE_COLUMN_ALIGNMENT",
      );
      assert.equal(
        unresolved.tableEvidence.regions[0].rows[1].cells[3].headerCellRef,
        null,
      );
      assert.ok(true, "The existing observedLines-only validator still accepts its contract.");
    },
  );

  QUnit.test(
    "Stage-1 table evidence — duplicate cell identity fails structural validation",
    function (assert) {
      const evidence = syntheticStage1V2TableEvidenceDiagnosticFixture_();
      evidence.tableEvidence.regions[0].rows[1].cells[0].cellId =
        "header-description";

      assert.throws(function () {
        validateStage1V2TableEvidenceDiagnostic_(evidence);
      }, /duplicate cellId/);
    },
  );

  QUnit.test(
    "Stage-1 table evidence — foreign observed-line references fail structural validation",
    function (assert) {
      const foreignRegion = syntheticStage1V2TableEvidenceDiagnosticFixture_();
      foreignRegion.tableEvidence.regions[0].sourceLineOrders = [1, 2];
      const foreignCell = syntheticStage1V2TableEvidenceDiagnosticFixture_();
      foreignCell.tableEvidence.regions[0].rows[1].cells[0]
        .sourceLineOrders = [2];

      assert.throws(function () {
        validateStage1V2TableEvidenceDiagnostic_(foreignRegion);
      }, /invalid fields/);
      assert.throws(function () {
        validateStage1V2TableEvidenceDiagnostic_(foreignCell);
      }, /invalid fields/);
    },
  );

  QUnit.test(
    "Stage-1 table evidence — validation is immutable and requires no financial role",
    function (assert) {
      const evidence = syntheticStage1V2TableEvidenceDiagnosticFixture_();
      const snapshot = JSON.stringify(evidence);
      const schemaText = JSON.stringify(
        buildStage1V2TableEvidenceDiagnosticJsonSchema_().properties
          .tableEvidence,
      );

      validateStage1V2TableEvidenceDiagnostic_(evidence);
      assessStage1V2TableEvidenceDiagnostic_(evidence);

      assert.equal(JSON.stringify(evidence), snapshot);
      assert.equal(schemaText.indexOf("semanticRole"), -1);
      assert.equal(schemaText.indexOf("vatAmount"), -1);
      assert.equal(schemaText.indexOf("sourceLineOrders"), -1);
      assert.ok(schemaText.indexOf("tableRowOrder") >= 0);
    },
  );

  QUnit.test(
    "staged production-path diagnostic — missing selector fails preflight",
    function (assert) {
      assert.throws(function () {
        validateStagedImageProductionDiagnosticPreflight_("", true);
      }, /diagnostic Drive image file ID is required/);
    },
  );

  QUnit.test(
    "staged production-path diagnostic — disabled route fails preflight",
    function (assert) {
      assert.throws(function () {
        validateStagedImageProductionDiagnosticPreflight_(
          "synthetic-file-id",
          false,
        );
      }, /STAGED_IMAGE_EXTRACTION_ENABLED must be true/);
    },
  );

  QUnit.test(
    "staged production-path diagnostic — success projection is compact",
    function (assert) {
      const canonical = {
        items: [{ name: "Synthetic item", quantity: 1, lineTotal: 2 }],
        additionalCosts: [],
        vat: null,
        totals: { exclVAT: null, inclVAT: 2, vatAmount: null },
      };
      const result = buildStagedImageProductionDiagnosticSuccess_(canonical);

      assert.ok(compactJsonEquality(
        result,
        {
          outcome: "canonical_success",
          itemCount: 1,
          hasInclVAT: true,
          hasExclVAT: false,
          hasVatAmount: false,
        },
      ));
    },
  );

  QUnit.test(
    "staged production-path diagnostic — staged failure preserves stage and code",
    function (assert) {
      const error = createStagedImageExtractionError_(
        "financial",
        "AMBIGUOUS_PRINTED_TOTAL_TYPE",
      );

      assert.ok(compactJsonEquality(
        buildStagedImageProductionDiagnosticFailure_(error),
        {
          outcome: "staged_fail_closed",
          stage: "financial",
          code: "AMBIGUOUS_PRINTED_TOTAL_TYPE",
        },
      ));
    },
  );

  QUnit.test(
    "staged production-path diagnostic — unexpected errors remain distinct",
    function (assert) {
      assert.equal(
        buildStagedImageProductionDiagnosticFailure_(
          new Error("Synthetic unexpected failure"),
        ),
        null,
      );
    },
  );

  QUnit.test(
    "staged production-path diagnostic — auditable result preserves one-item evidence through normalization",
    function (assert) {
      const evidence = controlledHuboOneItemStage1V2Fixture();
      const candidate = buildStagedReceiptCandidate(evidence);
      const release = buildForwardPricedAnchorCanonicalRelease_(candidate);
      const canonical = release.canonicalReceipt;
      const normalized = normalizeAndAggregateReceiptData(canonical);
      const result = buildAuditableStagedImageDiagnosticResult_(
        {
          fileId: "synthetic-file-id",
          fileName: "synthetic.jpg",
          mimeType: "image/jpeg",
          driveReportedByteLength: 123,
          blobByteLength: 123,
          sha256: "synthetic-sha256",
        },
        {
          model: "synthetic-model",
          systemFingerprint: "synthetic-fingerprint",
          finishReason: "stop",
          usage: {
            promptTokens: 10,
            completionTokens: 20,
            totalTokens: 30,
          },
        },
        evidence,
        candidate,
        release,
        canonical,
        normalized,
      );

      assert.ok(
        result.outcome === "canonical_success" &&
          result.stage1 === evidence &&
          result.partition.resolved === true &&
          compactJsonEquality(result.partition.productRowOrders, [2, 3]) &&
          compactJsonEquality(result.groups[0].sourceRowOrders, [2, 3]) &&
          result.groups[0].unitPriceEvidence.cents === 6999 &&
          result.groups[0].lineTotalEvidence.cents === 6999 &&
          result.groups[0].quantityTimesUnitMatchesLineTotal === true &&
          result.candidateRelease.printedProductCount === 1 &&
          result.candidateRelease.printedPlainTotalCents === 6999 &&
          result.candidateRelease.sumLineTotalCents === 6999 &&
          result.candidateRelease.totalValidationMatches === true &&
          result.canonical.items[0].name ===
            "Veilig 2300 ak gr/kr 72 f1 skg3 (b)" &&
          result.canonical.vat === null &&
          result.canonical.totals === null &&
          result.normalized.finalSum === 69.99 &&
          result.normalized.reconciled === true &&
          result.normalized.documentTotalInclVat === 0,
      );
    },
  );

  QUnit.test(
    "staged production-path diagnostic — failure projection remains stage-aware",
    function (assert) {
      const error = createStagedImageExtractionError_(
        "canonical",
        "SYNTHETIC_RELEASE_REJECTION",
      );
      const failure = buildAuditableStagedImageDiagnosticFailure_(
        error,
        "canonical/release",
      );

      assert.ok(
        failure.outcome === "staged_fail_closed" &&
          failure.stage === "canonical" &&
          failure.code === "SYNTHETIC_RELEASE_REJECTION" &&
          failure.activeDiagnosticStage === "canonical/release",
      );
    },
  );

  validatePermanentStagedPartition_(stagedTestRegistrations);
  QUnit.test = registerQUnitTest;
  QUnit.start();

  if (options && options.diagnosticsOnly === true) {
    return buildQUnitDiagnosticReport(QUnitGS2.getResultsFromServer());
  }

  return QUnitGS2.getHtml();
}

function createMockOpenAIResponse(content) {
  return JSON.stringify({
    choices: [
      {
        message: {
          content: content
        }
      }
    ]
  });
}

function getResultsFromServer() {
  return QUnitGS2.getResultsFromServer();
}

/**
 * Runs the existing QUnitGS2 suite without rendering the HTML test UI.
 * Execute this function from the Apps Script editor and inspect the execution log.
 */
function runQUnitDiagnostics(batchName) {
  const report = doGet({ diagnosticsOnly: true, batch: batchName });
  console.log("QUnitGS2 batch " + batchName + ":\n" + report);
  return report;
}

function runLegacyProductionQUnitDiagnostics() {
  return runQUnitDiagnostics("legacy-production");
}

function runStagedCoreQUnitDiagnostics() {
  return runQUnitDiagnostics("staged-core");
}

function runStagedSelectorHarnessQUnitDiagnostics() {
  return runQUnitDiagnostics("staged-selector-harness");
}

function runStagedPrototypeCandidateQUnitDiagnostics() {
  return runQUnitDiagnostics("staged-prototype-candidate");
}

function runStagedFinancialEvidenceQUnitDiagnostics() {
  return runQUnitDiagnostics("staged-financial-evidence");
}

function runStagedImageIntegrationQUnitDiagnostics() {
  return runQUnitDiagnostics("staged-image-integration");
}

function runStagedStage1DiagnosticsQUnitDiagnostics() {
  return runQUnitDiagnostics("staged-stage1-diagnostics");
}

function runStagedTableEvidenceDiagnosticsQUnitDiagnostics() {
  return runQUnitDiagnostics("staged-table-evidence-diagnostics");
}

function runFinancialStructureQUnitDiagnostics() {
  return runQUnitDiagnostics("financial-structure");
}

function runFinancialCollectorQUnitDiagnostics() {
  return runQUnitDiagnostics("financial-collector");
}

function runFinancialProvenanceQUnitDiagnostics() {
  return runQUnitDiagnostics("financial-provenance");
}

function runFinancialSemanticGovernanceQUnitDiagnostics() {
  return runQUnitDiagnostics("financial-semantic-governance");
}

function runFinancialInterpretationQUnitDiagnostics() {
  return runQUnitDiagnostics("financial-interpretation");
}

function runCanonicalReleaseQUnitDiagnostics() {
  return runQUnitDiagnostics("canonical-release");
}

function runCollectorWiskaQUnitDiagnostic() {
  const diagnosticName = "collector-wiska";
  const report = doGet({
    diagnosticsOnly: true,
    diagnostic: diagnosticName,
  });
  console.log("QUnitGS2 diagnostic " + diagnosticName + ":\n" + report);
  return report;
}

function buildQUnitDiagnosticReport(resultsText) {
  if (typeof resultsText !== "string" || resultsText.trim() === "") {
    throw new Error("QUnitGS2 returned no cached test results.");
  }

  let events;

  try {
    events = JSON.parse(resultsText);
  } catch (error) {
    throw new Error(
      "QUnitGS2 returned malformed cached test results: " + error.message,
    );
  }

  if (!Array.isArray(events)) {
    throw new Error("QUnitGS2 cached test results must be an array.");
  }

  const report = {
    status: "INCOMPLETE",
    summary: null,
    failedTests: [],
  };

  events.forEach(function (event) {
    if (!event || !event.value) return;

    if (event.type === "TESTS_RESULTS_ALL") {
      report.summary = event.value;
      report.status = Number(event.value.failed) > 0 ? "FAIL" : "PASS";
      return;
    }

    if (event.type !== "TESTS_RESULTS_ONE") return;

    const testResult = event.value.results || {};
    const failedAssertions = (event.value.assertions || [])
      .filter(function (assertion) {
        return assertion && assertion.result === false;
      })
      .map(function (assertion) {
        return {
          message: assertion.message || "(no assertion message)",
          actual: assertion.actual,
          expected: assertion.expected,
          source: assertion.source || "",
          diff: assertion.diff || "",
        };
      });

    if (Number(testResult.failed) > 0 || failedAssertions.length > 0) {
      report.failedTests.push({
        name: testResult.name || "(unnamed test)",
        failed: Number(testResult.failed) || failedAssertions.length,
        passed: Number(testResult.passed) || 0,
        total: Number(testResult.total) || 0,
        assertions: failedAssertions,
      });
    }
  });

  return JSON.stringify(report, null, 2);
}

function runRealPdfIngestionDiagnostic() {
  const folderId = getRequiredConfigValue(
    CONFIG.openAIReceiptsFolderId,
    "OPENAI_RECEIPTS_FOLDER_ID",
  );

  const files = findAllUnprocessedReceipts(folderId);
  const pdfFiles = files.filter(function (file) {
    return file.getMimeType() === "application/pdf";
  });

  if (pdfFiles.length === 0) {
    throw new Error("No unprocessed PDF found for diagnostic run.");
  }

  if (pdfFiles.length > 1) {
    throw new Error(
      "Expected exactly one unprocessed PDF for diagnostic run, found: " +
        pdfFiles.length,
    );
  }

  const file = pdfFiles[0];

  console.log(
    "PDF diagnostic input: " +
      file.getName() +
      " (" +
      file.getSize() +
      " bytes)",
  );

  const extracted = analyzeReceiptWithOpenAI(file);

  console.log("PDF extracted:\n" + JSON.stringify(extracted, null, 2));

  const normalized = normalizeAndAggregateReceiptData(extracted);

  console.log("PDF normalized:\n" + JSON.stringify(normalized, null, 2));

  return normalized;
}

/**
 * Runs an isolated, read-only image perception probe for one explicit Drive file.
 * This helper is manual-only and is not connected to the production workflow.
 */
// Keep empty in Git. Set temporarily only in the isolated test GAS project.
const IMAGE_PERCEPTION_DIAGNOSTIC_FILE_ID = "";
const STAGED_IMAGE_PRODUCTION_DIAGNOSTIC_FILE_ID_PROPERTY =
  "STAGED_IMAGE_PRODUCTION_DIAGNOSTIC_FILE_ID";

/**
 * Runs one manual read-only diagnostic through the real production staged-image
 * boundary. The feature flag and explicit image selector must be configured in
 * the isolated test GAS project before execution.
 */
function runStagedImageProductionPathDiagnostic() {
  const fileId = validateStagedImageProductionDiagnosticPreflight_(
    IMAGE_PERCEPTION_DIAGNOSTIC_FILE_ID,
    isStagedImageExtractionEnabled(),
  );
  const file = DriveApp.getFileById(fileId);

  if (file.getMimeType().indexOf("image/") !== 0) {
    throw new Error(
      "The staged production-path diagnostic Drive file must be an image.",
    );
  }

  try {
    const canonicalReceipt = analyzeReceiptWithOpenAI(file);
    const success = buildStagedImageProductionDiagnosticSuccess_(
      canonicalReceipt,
    );
    console.log(
      "STAGED IMAGE PRODUCTION-PATH DIAGNOSTIC: " +
        JSON.stringify(success),
    );
    return success;
  } catch (error) {
    const stagedFailure = buildStagedImageProductionDiagnosticFailure_(error);
    if (!stagedFailure) {
      console.error(
        "STAGED IMAGE PRODUCTION-PATH DIAGNOSTIC: unexpected error [" +
          (error && error.name ? error.name : "Error") +
          "].",
      );
      throw error;
    }

    console.log(
      "STAGED IMAGE PRODUCTION-PATH DIAGNOSTIC: " +
        JSON.stringify(stagedFailure),
    );
    return stagedFailure;
  }
}

/**
 * Editor entry point for one auditable, no-write staged production-path run.
 * The explicit Drive file ID is read only from the isolated test project's
 * diagnostic Script Property; no receipt is selected implicitly.
 */
function runAuditableStagedImageProductionPathDiagnostic() {
  let fileId;
  try {
    fileId = getRequiredScriptProperty(
      STAGED_IMAGE_PRODUCTION_DIAGNOSTIC_FILE_ID_PROPERTY,
    );
  } catch (error) {
    const failure = buildAuditableStagedImageDiagnosticFailure_(
      error,
      "preflight",
    );
    console.error(
      "[AUDITABLE-STAGED-IMAGE][ERROR]\n" + JSON.stringify(failure, null, 2),
    );
    throw error;
  }

  return runAuditableStagedImageProductionPathDiagnosticForFileId(fileId);
}

/**
 * Explicit/testable runner. Reads one image blob, sends those exact bytes in
 * one Stage-1 request, and reuses the parsed evidence through the production
 * candidate and canonical-release functions before a read-only normalization.
 */
function runAuditableStagedImageProductionPathDiagnosticForFileId(fileId) {
  const runId = "staged-image-" + new Date().toISOString();
  let activeStage = "preflight";
  const captured = { runId: runId };

  try {
    const validatedFileId = validateStagedImageProductionDiagnosticPreflight_(
      fileId,
      isStagedImageExtractionEnabled(),
    );

    activeStage = "source";
    const file = DriveApp.getFileById(validatedFileId);
    const mimeType = file.getMimeType();
    if (mimeType.indexOf("image/") !== 0) {
      throw new Error(
        "The auditable staged production-path diagnostic file must be an image.",
      );
    }
    const bytes = file.getBlob().getBytes();
    captured.source = {
      fileId: validatedFileId,
      fileName: file.getName(),
      mimeType: mimeType,
      driveReportedByteLength: file.getSize(),
      blobByteLength: bytes.length,
      sha256: computeDiagnosticSha256Hex_(bytes),
    };

    activeStage = "perception/schema";
    const openAIApiKey = getRequiredConfigValue(
      CONFIG.openAIApiKey,
      "OPENAI_API_KEY",
    );
    const payload = buildOpenAIStage1V2Payload_(
      mimeType,
      Utilities.base64Encode(bytes),
    );
    const response = UrlFetchApp.fetch(OPENAI.apiUrl, {
      method: "post",
      headers: {
        Authorization: "Bearer " + openAIApiKey,
        "Content-Type": "application/json",
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const responseCode = response.getResponseCode();
    if (responseCode !== 200) {
      throw createStagedImageExtractionError_(
        "perception",
        "STAGE1_HTTP_" + responseCode,
      );
    }

    let parsedEnvelope;
    try {
      parsedEnvelope = parseOpenAIStage1V2Envelope_(response.getContentText());
    } catch (error) {
      throw createStagedImageExtractionError_(
        "perception",
        "INVALID_STAGE1_RESPONSE",
      );
    }
    captured.model = buildStage1V2OpenAIMetadata_(
      parsedEnvelope.responseJson,
    );
    captured.stage1 = parsedEnvelope.evidence;

    activeStage = "structure/financial";
    const candidate = buildStagedReceiptCandidate(captured.stage1);

    activeStage = "canonical/release";
    const canonical = buildStagedCanonicalReceiptOrThrow_(captured.stage1);
    const release = buildForwardPricedAnchorCanonicalRelease_(candidate);
    if (
      !release.releaseStatus.eligible ||
      JSON.stringify(canonical) !== JSON.stringify(release.canonicalReceipt)
    ) {
      throw createStagedImageExtractionError_(
        "canonical",
        firstStagedIssueCode_(
          release.conflicts,
          "DIAGNOSTIC_RELEASE_MISMATCH",
        ),
      );
    }

    activeStage = "normalization";
    const normalized = normalizeAndAggregateReceiptData(canonical);
    const result = buildAuditableStagedImageDiagnosticResult_(
      captured.source,
      captured.model,
      captured.stage1,
      candidate,
      release,
      canonical,
      normalized,
    );
    result.runId = runId;
    logAuditableStagedImageDiagnostic_(result);
    return result;
  } catch (error) {
    const failure = buildAuditableStagedImageDiagnosticFailure_(
      error,
      activeStage,
    );
    failure.runId = runId;
    failure.availableEvidence = {
      source: captured.source || null,
      model: captured.model || null,
      stage1: captured.stage1 || null,
    };
    console.error(
      "[" + runId + "][ERROR]\n" + JSON.stringify(failure, null, 2),
    );
    throw error;
  }
}

function buildAuditableStagedImageDiagnosticResult_(
  source,
  model,
  evidence,
  candidate,
  release,
  canonical,
  normalized,
) {
  const observations = evidence.observedLines;
  const mappings = candidate.evidenceTrace.candidateItemSources;
  const candidateItems = candidate.candidateReceipt.items;
  const productRowOrders = observations
    .filter(function (row) {
      return row.roleEvidence === "product";
    })
    .map(function (row) {
      return row.order;
    });
  const consumedProductRowOrders = [];
  const groups = mappings.map(function (mapping, index) {
    const anchor = observations.filter(function (row) {
      return row.order === mapping.anchorRowOrder;
    })[0];
    const item = candidateItems[index];
    const unitPriceCents = diagnosticMoneyCents_(item.unitPrice);
    const lineTotalCents = diagnosticMoneyCents_(item.lineTotal);
    mapping.sourceRowOrders.forEach(function (rowOrder) {
      consumedProductRowOrders.push(rowOrder);
    });

    return {
      groupIndex: index,
      sourceRowOrders: mapping.sourceRowOrders.slice(),
      anchorSourceRowOrder: mapping.anchorRowOrder,
      continuationSourceRowOrders: mapping.continuationRowOrders.slice(),
      rawAnchorEvidence: anchor,
      quantityEvidence: {
        rawText: anchor.leadingQuantityText,
        parsedQuantity: item.quantity,
      },
      unitPriceEvidence: {
        rawText: anchor.unitPriceText,
        cents: unitPriceCents,
      },
      lineTotalEvidence: {
        rawText: anchor.lineTotalText,
        cents: lineTotalCents,
      },
      quantityTimesUnitMatchesLineTotal:
        Number.isInteger(item.quantity) &&
        unitPriceCents !== null &&
        lineTotalCents !== null &&
        item.quantity * unitPriceCents === lineTotalCents,
    };
  });
  const releaseValidation = release.validation;
  const printedTotalEvidence = evidence.summaryEvidence.printedTotal;
  const uniqueConsumedOrders = {};
  consumedProductRowOrders.forEach(function (rowOrder) {
    uniqueConsumedOrders[rowOrder] = true;
  });

  return {
    outcome: "canonical_success",
    source: source,
    model: model,
    stage1: evidence,
    partition: {
      compatible: true,
      resolved: candidate.structuralStatus.resolved,
      accountedRowCount: candidate.structuralStatus.accountedObservationCount,
      headerRowOrders: diagnosticOrdersForRole_(observations, "header"),
      productRowOrders: productRowOrders,
      summaryRowOrders: diagnosticOrdersForRole_(observations, "summary"),
      unknownRowOrders: diagnosticOrdersForRole_(observations, "unknown"),
      unconsumedRowOrders:
        candidate.structuralStatus.unconsumedRowOrders.slice(),
      conflicts: candidate.structuralStatus.conflicts,
      anomalies: candidate.evidenceTrace.anomalies,
    },
    groups: groups,
    candidateRelease: {
      candidateCount: candidateItems.length,
      candidateItems: candidateItems,
      candidateGroupMappings: mappings,
      productObservationCount: releaseValidation.productObservationCount,
      consumedProductObservationCount:
        releaseValidation.consumedProductObservationCount,
      productEvidenceConsumedExactlyOnce:
        release.releaseStatus.eligible &&
        consumedProductRowOrders.length === productRowOrders.length &&
        Object.keys(uniqueConsumedOrders).length === productRowOrders.length,
      structuralGroupCount: mappings.length,
      printedProductCount: releaseValidation.printedProductCount,
      countValidationMatches:
        releaseValidation.printedProductCount === mappings.length &&
        candidate.structuralStatus.validation.printedProductCount.matches ===
          true,
      printedPlainTotalCents: releaseValidation.printedTotalCents,
      sumLineTotalCents: releaseValidation.candidateLineTotalSumCents,
      totalValidationMatches:
        releaseValidation.printedTotalCents ===
        releaseValidation.candidateLineTotalSumCents,
      financialStatus: candidate.financialStatus,
      vatBasisState: printedTotalEvidence
        ? printedTotalEvidence.totalTypeEvidence
        : null,
      releaseStatus: release.releaseStatus,
      releaseValidation: releaseValidation,
      releaseConflicts: release.conflicts,
      canonicalMatchesProductionReturn:
        JSON.stringify(canonical) === JSON.stringify(release.canonicalReceipt),
      legacyFallbackInvoked: false,
    },
    canonical: canonical,
    canonicalProvenance: mappings.map(function (mapping, index) {
      return {
        itemIndex: index,
        sourceGroupIndex: index,
        sourceRowOrders: mapping.sourceRowOrders.slice(),
      };
    }),
    normalized: {
      normalizedItemCount: normalized.rows.length,
      normalizedItems: normalized.rows,
      finalSum: normalized.finalSum,
      reconciled: normalized.reconciled,
      documentTotalInclVat: normalized.documentTotalInclVat,
    },
  };
}

function diagnosticOrdersForRole_(observations, role) {
  return observations
    .filter(function (row) {
      return row.roleEvidence === role;
    })
    .map(function (row) {
      return row.order;
    });
}

function diagnosticMoneyCents_(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value * 100)
    : null;
}

function buildAuditableStagedImageDiagnosticFailure_(error, activeStage) {
  const stagedFailure = buildStagedImageProductionDiagnosticFailure_(error);
  if (stagedFailure) {
    stagedFailure.activeDiagnosticStage = activeStage;
    return stagedFailure;
  }
  return {
    outcome: "unexpected_error",
    stage: activeStage,
    code: null,
    errorName: error && error.name ? error.name : "Error",
    errorMessage:
      error && error.message ? error.message : "Unknown diagnostic error.",
  };
}

function logAuditableStagedImageDiagnostic_(result) {
  const prefix = "[" + result.runId + "]";
  const sections = [
    ["SOURCE", result.source],
    ["MODEL", result.model],
    ["STAGE1", result.stage1],
    ["PARTITION", result.partition],
    ["GROUPS", result.groups],
    ["CANDIDATE_RELEASE", result.candidateRelease],
    ["CANONICAL", {
      receipt: result.canonical,
      provenance: result.canonicalProvenance,
    }],
    ["NORMALIZED", result.normalized],
  ];
  sections.forEach(function (section, index) {
    console.log(
      prefix +
        "[" +
        (index + 1) +
        "/" +
        sections.length +
        " " +
        section[0] +
        "]\n" +
        JSON.stringify(section[1], null, 2),
    );
  });
}

function validateStagedImageProductionDiagnosticPreflight_(
  fileId,
  stagedImageEnabled,
) {
  if (typeof fileId !== "string" || fileId.trim() === "") {
    throw new Error(
      "A diagnostic Drive image file ID is required in " +
        "IMAGE_PERCEPTION_DIAGNOSTIC_FILE_ID.",
    );
  }
  if (!stagedImageEnabled) {
    throw new Error(
      "STAGED_IMAGE_EXTRACTION_ENABLED must be true for the staged " +
        "production-path diagnostic.",
    );
  }
  return fileId.trim();
}

function buildStagedImageProductionDiagnosticSuccess_(canonicalReceipt) {
  const totals =
    canonicalReceipt && canonicalReceipt.totals
      ? canonicalReceipt.totals
      : {};
  return {
    outcome: "canonical_success",
    itemCount:
      canonicalReceipt && Array.isArray(canonicalReceipt.items)
        ? canonicalReceipt.items.length
        : 0,
    hasInclVAT: typeof totals.inclVAT === "number",
    hasExclVAT: typeof totals.exclVAT === "number",
    hasVatAmount: typeof totals.vatAmount === "number",
  };
}

function buildStagedImageProductionDiagnosticFailure_(error) {
  if (!error || error.name !== "StagedImageExtractionError") return null;

  return {
    outcome: "staged_fail_closed",
    stage: typeof error.stage === "string" ? error.stage : null,
    code: typeof error.code === "string" ? error.code : null,
  };
}

function runImagePerceptionDiagnostic() {
  return runImagePerceptionDiagnosticForFileId(
    IMAGE_PERCEPTION_DIAGNOSTIC_FILE_ID,
  );
}

function inspectImagePerceptionDiagnosticSource() {
  return inspectImagePerceptionDiagnosticSourceForFileId(
    IMAGE_PERCEPTION_DIAGNOSTIC_FILE_ID,
  );
}

function inspectImagePerceptionDiagnosticSourceForFileId(fileId) {
  const diagnosticInput = getImagePerceptionDiagnosticInput_(fileId);
  console.log(
    "IMAGE PERCEPTION SOURCE INTEGRITY:\n" +
      JSON.stringify(diagnosticInput.sourceIntegrity, null, 2),
  );
  return diagnosticInput.sourceIntegrity;
}

function getImagePerceptionDiagnosticInput_(fileId) {
  if (typeof fileId !== "string" || fileId.trim() === "") {
    throw new Error("A diagnostic Drive image file ID is required.");
  }

  const file = DriveApp.getFileById(fileId.trim());
  const mimeType = file.getMimeType();

  if (mimeType.indexOf("image/") !== 0) {
    throw new Error("The diagnostic Drive file must be an image.");
  }

  const bytes = file.getBlob().getBytes();
  const sourceIntegrity = {
    mimeType: mimeType,
    driveReportedByteLength: file.getSize(),
    blobByteLength: bytes.length,
    sha256: computeDiagnosticSha256Hex_(bytes),
  };

  return {
    mimeType: mimeType,
    bytes: bytes,
    sourceIntegrity: sourceIntegrity,
  };
}

function runImagePerceptionDiagnosticForFileId(fileId) {
  const diagnosticInput = getImagePerceptionDiagnosticInput_(fileId);
  const sourceIntegrity = diagnosticInput.sourceIntegrity;

  console.log(
    "IMAGE PERCEPTION SOURCE INTEGRITY:\n" +
      JSON.stringify(sourceIntegrity, null, 2),
  );

  const openAIApiKey = getRequiredConfigValue(
    CONFIG.openAIApiKey,
    "OPENAI_API_KEY",
  );
  const payload = buildOpenAIImagePerceptionDiagnosticPayload_(
    diagnosticInput.mimeType,
    Utilities.base64Encode(diagnosticInput.bytes),
  );
  const response = UrlFetchApp.fetch(OPENAI.apiUrl, {
    method: "post",
    headers: {
      Authorization: "Bearer " + openAIApiKey,
      "Content-Type": "application/json",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    throw new Error(
      "OpenAI image perception diagnostic failed with HTTP " + responseCode +
        ".",
    );
  }

  const responseJson = JSON.parse(response.getContentText());
  const choice =
    responseJson.choices && responseJson.choices.length > 0
      ? responseJson.choices[0]
      : null;
  const transcription =
    choice && choice.message && typeof choice.message.content === "string"
      ? choice.message.content
      : "";

  if (transcription.trim() === "") {
    throw new Error(
      "OpenAI image perception diagnostic returned no transcription.",
    );
  }

  const responseMetadata = {
    model: responseJson.model || null,
    systemFingerprint: responseJson.system_fingerprint || null,
    finishReason: choice.finish_reason || null,
    usage: responseJson.usage
      ? {
          promptTokens: diagnosticNumberOrNull_(
            responseJson.usage.prompt_tokens,
          ),
          completionTokens: diagnosticNumberOrNull_(
            responseJson.usage.completion_tokens,
          ),
          totalTokens: diagnosticNumberOrNull_(
            responseJson.usage.total_tokens,
          ),
        }
      : null,
  };

  console.log(
    "OPENAI IMAGE PERCEPTION METADATA:\n" +
      JSON.stringify(responseMetadata, null, 2),
  );
  console.log("OPENAI IMAGE PERCEPTION TRANSCRIPTION:\n" + transcription);

  return {
    sourceIntegrity: sourceIntegrity,
    responseMetadata: responseMetadata,
    transcription: transcription,
  };
}

function buildOpenAIImagePerceptionDiagnosticPayload_(mimeType, base64Data) {
  const prompt =
    "This is a literal visual-transcription diagnostic. " +
    "Inspect only the printed product table and the nearby printed product-count and total lines. " +
    "Report physical printed lines in visual top-to-bottom order. " +
    "Create exactly one observedLines entry for each physical printed line, including visible product-table header lines. " +
    "Do not create canonical products, merge lines, normalize values, infer missing values, correct text or arithmetic, or reconcile totals. " +
    "For each physical line, transcribe only what is visibly printed on that same line. " +
    "Record the leading purchased-quantity text, description text, unit-price-column text, and line-total-column text separately; use null when that column is blank or not visible on the line. " +
    "Describe indentation only as left_aligned, indented, or unclear, based on the visual position of the description text. " +
    "Preserve punctuation, decimal separators, and printed text as literally as possible. " +
    "The printed product count and printed total are observations only and must not be used to alter any observed line. " +
    "Return valid JSON only, with this structure: " +
    '{"observedLines":[{"order":1,"leadingQuantityText":null,"descriptionText":"exact printed text","unitPriceText":null,"lineTotalText":null,"indentation":"unclear"}],"printedProductCountText":null,"printedTotalText":null}';

  return {
    model: OPENAI.model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: "data:" + mimeType + ";base64," + base64Data,
            },
          },
        ],
      },
    ],
    temperature: OPENAI.temperature,
  };
}

function computeDiagnosticSha256Hex_(bytes) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
    .map(function (byte) {
      const unsignedByte = byte < 0 ? byte + 256 : byte;
      return ("0" + unsignedByte.toString(16)).slice(-2);
    })
    .join("");
}

function diagnosticNumberOrNull_(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Runs the manual Stage-1-v2 image-perception experiment against one explicit
 * Drive image. It is isolated from production receipt processing.
 */
function runStage1V2ImagePerceptionDiagnostic() {
  return runStage1V2ImagePerceptionDiagnosticForFileId(
    IMAGE_PERCEPTION_DIAGNOSTIC_FILE_ID,
  );
}

function runStage1V2ImagePerceptionDiagnosticForFileId(fileId) {
  const diagnosticInput = getImagePerceptionDiagnosticInput_(fileId);

  console.log(
    "STAGE-1-V2 SOURCE INTEGRITY:\n" +
      JSON.stringify(diagnosticInput.sourceIntegrity, null, 2),
  );

  const openAIApiKey = getRequiredConfigValue(
    CONFIG.openAIApiKey,
    "OPENAI_API_KEY",
  );
  const payload = buildOpenAIStage1V2DiagnosticPayload_(
    diagnosticInput.mimeType,
    Utilities.base64Encode(diagnosticInput.bytes),
  );
  const response = UrlFetchApp.fetch(OPENAI.apiUrl, {
    method: "post",
    headers: {
      Authorization: "Bearer " + openAIApiKey,
      "Content-Type": "application/json",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    throw new Error(
      "OpenAI Stage-1-v2 diagnostic failed with HTTP " + responseCode + ".",
    );
  }

  const parsedEnvelope = parseOpenAIStage1V2DiagnosticEnvelope_(
    response.getContentText(),
  );
  const responseMetadata = buildStage1V2OpenAIMetadata_(
    parsedEnvelope.responseJson,
  );

  console.log(
    "STAGE-1-V2 OPENAI METADATA:\n" +
      JSON.stringify(responseMetadata, null, 2),
  );
  console.log(
    "STAGE-1-V2 EVIDENCE:\n" +
      JSON.stringify(parsedEnvelope.evidence, null, 2),
  );

  const prototypeHandoff = buildStage1V2PrototypeHandoffDiagnostic_(
    parsedEnvelope.evidence,
  );
  console.log(
    "STAGE-1-V2 PROTOTYPE HANDOFF:\n" +
      JSON.stringify(prototypeHandoff, null, 2),
  );

  return {
    sourceIntegrity: diagnosticInput.sourceIntegrity,
    responseMetadata: responseMetadata,
    evidence: parsedEnvelope.evidence,
    prototypeHandoff: prototypeHandoff,
  };
}

/**
 * Runs the isolated table-evidence experiment for the already controlled Bol
 * PNG. No Drive ID is stored in source and no downstream prototype is called.
 */
function runControlledBolTableEvidenceDiagnostic() {
  return runControlledBolTableEvidenceDiagnosticForFileId(
    IMAGE_PERCEPTION_DIAGNOSTIC_FILE_ID,
  );
}

function runControlledBolTableEvidenceDiagnosticForFileId(fileId) {
  const diagnosticInput = getImagePerceptionDiagnosticInput_(fileId);
  console.log(
    "BOL TABLE-EVIDENCE SOURCE INTEGRITY:\n" +
      JSON.stringify(diagnosticInput.sourceIntegrity, null, 2),
  );
  validateControlledBolTableEvidenceSource_(diagnosticInput.sourceIntegrity);

  const openAIApiKey = getRequiredConfigValue(
    CONFIG.openAIApiKey,
    "OPENAI_API_KEY",
  );
  const payload = buildOpenAIStage1V2TableEvidenceDiagnosticPayload_(
    diagnosticInput.mimeType,
    Utilities.base64Encode(diagnosticInput.bytes),
  );
  const response = UrlFetchApp.fetch(OPENAI.apiUrl, {
    method: "post",
    headers: {
      Authorization: "Bearer " + openAIApiKey,
      "Content-Type": "application/json",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const responseCode = response.getResponseCode();
  if (responseCode !== 200) {
    throw new Error(
      "OpenAI Bol table-evidence diagnostic failed with HTTP " +
        responseCode + ".",
    );
  }

  const parsedEnvelope = parseOpenAIStage1V2TableEvidenceDiagnosticEnvelope_(
    response.getContentText(),
  );
  const responseMetadata = buildStage1V2OpenAIMetadata_(
    parsedEnvelope.responseJson,
  );
  const tableAssessment = assessStage1V2TableEvidenceDiagnostic_(
    parsedEnvelope.evidence,
  );
  console.log(
    "BOL TABLE-EVIDENCE OPENAI METADATA:\n" +
      JSON.stringify(responseMetadata, null, 2),
  );
  console.log(
    "BOL TABLE-EVIDENCE OBSERVATION:\n" +
      JSON.stringify(parsedEnvelope.evidence.tableEvidence, null, 2),
  );
  console.log(
    "BOL TABLE-EVIDENCE ASSESSMENT:\n" +
      JSON.stringify(tableAssessment, null, 2),
  );

  return {
    sourceIntegrity: diagnosticInput.sourceIntegrity,
    responseMetadata: responseMetadata,
    evidence: parsedEnvelope.evidence,
    tableAssessment: tableAssessment,
  };
}

function validateControlledBolTableEvidenceSource_(sourceIntegrity) {
  const expectedSha256 =
    "daff887a8a8f3ec35386989eebc2bd4e0240354a4acd6c51e117be7037b32e8c";
  if (
    !sourceIntegrity ||
    sourceIntegrity.mimeType !== "image/png" ||
    sourceIntegrity.driveReportedByteLength !== 94252 ||
    sourceIntegrity.blobByteLength !== 94252 ||
    sourceIntegrity.sha256 !== expectedSha256
  ) {
    throw new Error(
      "The Bol table-evidence diagnostic source does not match the controlled PNG.",
    );
  }
}

function buildOpenAIStage1V2DiagnosticPayload_(mimeType, base64Data) {
  return buildOpenAIStage1V2Payload_(mimeType, base64Data);
}

function buildStage1V2DiagnosticJsonSchema_() {
  return buildStage1V2JsonSchema_();
}

/**
 * Builds a manual-only Stage-1-v2 request with additive physical table
 * evidence. Production Stage-1-v2 extraction keeps its existing contract.
 */
function buildOpenAIStage1V2TableEvidenceDiagnosticPayload_(
  mimeType,
  base64Data,
) {
  const payload = buildOpenAIStage1V2Payload_(mimeType, base64Data);
  payload.messages[0].content[0].text +=
    " Additionally inspect any visually explicit bounded table region. " +
    "Report tableEvidence as null when no table is visually supported. " +
    "Treat tableEvidence as an independent same-image observation; it does not " +
    "inherit or reference observedLines.order. Preserve table rows in stable " +
    "top-to-bottom tableRowOrder and cells in stable left-to-right columnOrder. " +
    "Use rowKindEvidence only as header, data, or unknown physical structure. " +
    "For a data cell, report headerCellRef only when the physical header-to-cell association is visually supported; otherwise use null. " +
    "Represent an observed empty cell position with rawText as an empty string and emptyEvidence true. " +
    "Do not replace an empty cell with zero and do not pack later cells into the empty position. " +
    "Do not assign financial meaning such as VAT amount, inclusive total, or exclusive total to table cells. " +
    "Do not use arithmetic, totals, counts, or expected financial meaning to create or repair a cell association.";
  payload.response_format.json_schema = {
    name: "stage1_v2_table_evidence",
    strict: true,
    schema: buildStage1V2TableEvidenceDiagnosticJsonSchema_(),
  };
  return payload;
}

function buildStage1V2TableEvidenceDiagnosticJsonSchema_() {
  const schema = buildStage1V2JsonSchema_();
  const cellSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      cellId: { type: "string" },
      columnOrder: { type: "integer", minimum: 1 },
      rawText: { type: "string" },
      emptyEvidence: { type: "boolean" },
      headerCellRef: { type: ["string", "null"] },
    },
    required: [
      "cellId",
      "columnOrder",
      "rawText",
      "emptyEvidence",
      "headerCellRef",
    ],
  };
  const rowSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      rowId: { type: "string" },
      tableRowOrder: { type: "integer", minimum: 1 },
      rowKindEvidence: {
        type: "string",
        enum: ["header", "data", "unknown"],
      },
      cells: { type: "array", items: cellSchema },
    },
    required: ["rowId", "tableRowOrder", "rowKindEvidence", "cells"],
  };
  const regionSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      regionId: { type: "string" },
      rows: { type: "array", items: rowSchema },
    },
    required: ["regionId", "rows"],
  };

  schema.properties.tableEvidence = {
    anyOf: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          regions: { type: "array", items: regionSchema },
        },
        required: ["regions"],
      },
      { type: "null" },
    ],
  };
  schema.required.push("tableEvidence");
  return schema;
}

function parseOpenAIStage1V2DiagnosticResponse_(responseText) {
  return parseOpenAIStage1V2Response_(responseText);
}

function parseOpenAIStage1V2DiagnosticEnvelope_(responseText) {
  return parseOpenAIStage1V2Envelope_(responseText);
}

function parseOpenAIStage1V2TableEvidenceDiagnosticResponse_(responseText) {
  return parseOpenAIStage1V2TableEvidenceDiagnosticEnvelope_(responseText)
    .evidence;
}

function parseOpenAIStage1V2TableEvidenceDiagnosticEnvelope_(responseText) {
  let responseJson;
  try {
    responseJson = JSON.parse(responseText);
  } catch (error) {
    throw new Error("OpenAI Stage-1 table diagnostic response was not valid JSON.");
  }

  const choice =
    responseJson &&
    Array.isArray(responseJson.choices) &&
    responseJson.choices.length > 0
      ? responseJson.choices[0]
      : null;
  const content =
    choice && choice.message && typeof choice.message.content === "string"
      ? choice.message.content
      : "";
  if (content.trim() === "") {
    throw new Error("OpenAI Stage-1 table diagnostic returned no evidence content.");
  }

  let evidence;
  try {
    evidence = JSON.parse(content);
  } catch (error) {
    throw new Error("OpenAI Stage-1 table diagnostic content was not valid JSON evidence.");
  }
  validateStage1V2TableEvidenceDiagnostic_(evidence);
  return { responseJson: responseJson, evidence: evidence };
}

function validateStage1V2TableEvidenceDiagnostic_(evidence) {
  assertStage1V2PlainObject_(evidence, "evidence");
  assertStage1V2ExactKeys_(
    evidence,
    ["observedLines", "summaryEvidence", "tableEvidence"],
    "evidence",
  );
  validateStage1V2Evidence_({
    observedLines: evidence.observedLines,
    summaryEvidence: evidence.summaryEvidence,
  });
  if (evidence.tableEvidence === null) return;

  assertStage1V2PlainObject_(evidence.tableEvidence, "tableEvidence");
  assertStage1V2ExactKeys_(evidence.tableEvidence, ["regions"], "tableEvidence");
  if (!Array.isArray(evidence.tableEvidence.regions)) {
    throw new Error("Stage-1 tableEvidence.regions must be an array.");
  }

  const seenRegionIds = {};
  const seenRowIds = {};
  const seenCellIds = {};
  const cellEntries = {};

  evidence.tableEvidence.regions.forEach(function (region, regionIndex) {
    const regionPath = "tableEvidence.regions[" + regionIndex + "]";
    assertStage1V2PlainObject_(region, regionPath);
    assertStage1V2ExactKeys_(
      region,
      ["regionId", "rows"],
      regionPath,
    );
    assertStage1V2TableIdentity_(
      region.regionId,
      seenRegionIds,
      regionPath + ".regionId",
      "regionId",
    );
    if (!Array.isArray(region.rows)) {
      throw new Error("Stage-1 " + regionPath + ".rows must be an array.");
    }

    let previousTableRowOrder = 0;
    region.rows.forEach(function (row, rowIndex) {
      const rowPath = regionPath + ".rows[" + rowIndex + "]";
      assertStage1V2PlainObject_(row, rowPath);
      assertStage1V2ExactKeys_(
        row,
        ["rowId", "tableRowOrder", "rowKindEvidence", "cells"],
        rowPath,
      );
      assertStage1V2TableIdentity_(
        row.rowId,
        seenRowIds,
        rowPath + ".rowId",
        "rowId",
      );
      if (
        !Number.isInteger(row.tableRowOrder) ||
        row.tableRowOrder <= previousTableRowOrder
      ) {
        throw new Error("Stage-1 " + rowPath + ".tableRowOrder is invalid.");
      }
      previousTableRowOrder = row.tableRowOrder;
      if (["header", "data", "unknown"].indexOf(row.rowKindEvidence) < 0) {
        throw new Error("Stage-1 " + rowPath + ".rowKindEvidence is unsupported.");
      }
      if (!Array.isArray(row.cells)) {
        throw new Error("Stage-1 " + rowPath + ".cells must be an array.");
      }

      let previousColumnOrder = 0;
      row.cells.forEach(function (cell, cellIndex) {
        const cellPath = rowPath + ".cells[" + cellIndex + "]";
        assertStage1V2PlainObject_(cell, cellPath);
        assertStage1V2ExactKeys_(
          cell,
          [
            "cellId",
            "columnOrder",
            "rawText",
            "emptyEvidence",
            "headerCellRef",
          ],
          cellPath,
        );
        assertStage1V2TableIdentity_(
          cell.cellId,
          seenCellIds,
          cellPath + ".cellId",
          "cellId",
        );
        if (
          !Number.isInteger(cell.columnOrder) ||
          cell.columnOrder <= previousColumnOrder
        ) {
          throw new Error("Stage-1 " + cellPath + ".columnOrder is invalid.");
        }
        previousColumnOrder = cell.columnOrder;
        if (typeof cell.rawText !== "string") {
          throw new Error("Stage-1 " + cellPath + ".rawText must be a string.");
        }
        if (
          typeof cell.emptyEvidence !== "boolean" ||
          cell.emptyEvidence !== (cell.rawText === "")
        ) {
          throw new Error("Stage-1 " + cellPath + ".emptyEvidence contradicts rawText.");
        }
        if (
          cell.headerCellRef !== null &&
          typeof cell.headerCellRef !== "string"
        ) {
          throw new Error("Stage-1 " + cellPath + ".headerCellRef is invalid.");
        }
        cellEntries[cell.cellId] = {
          regionId: region.regionId,
          rowKindEvidence: row.rowKindEvidence,
          columnOrder: cell.columnOrder,
          headerCellRef: cell.headerCellRef,
          path: cellPath,
        };
      });
    });
  });

  Object.keys(cellEntries).forEach(function (cellId) {
    const entry = cellEntries[cellId];
    if (entry.rowKindEvidence === "header" && entry.headerCellRef !== null) {
      throw new Error("Stage-1 " + entry.path + ".headerCellRef must be null for a header cell.");
    }
    if (entry.headerCellRef === null) return;
    const header = cellEntries[entry.headerCellRef];
    if (
      !header ||
      header.regionId !== entry.regionId ||
      header.rowKindEvidence !== "header" ||
      header.columnOrder !== entry.columnOrder
    ) {
      throw new Error("Stage-1 " + entry.path + ".headerCellRef is not a matching observed header cell.");
    }
  });
}

function assertStage1V2TableIdentity_(value, seen, path, identityName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Stage-1 " + path + " must be a non-empty string.");
  }
  if (seen[value]) {
    throw new Error("Stage-1 " + path + " has duplicate " + identityName + ".");
  }
  seen[value] = true;
}

function assessStage1V2TableEvidenceDiagnostic_(evidence) {
  validateStage1V2TableEvidenceDiagnostic_(evidence);
  if (evidence.tableEvidence === null) {
    return {
      resolved: false,
      coordinateSystem: "table-local",
      crossRepresentationAlignment: "unresolved",
      conflicts: [{ code: "NO_TABLE_EVIDENCE" }],
      regionCount: 0,
    };
  }

  const conflicts = [];
  if (evidence.tableEvidence.regions.length === 0) {
    conflicts.push({ code: "NO_TABLE_REGIONS" });
  }
  evidence.tableEvidence.regions.forEach(function (region) {
    const headerRows = region.rows.filter(function (row) {
      return row.rowKindEvidence === "header";
    });
    if (headerRows.length !== 1) {
      conflicts.push({
        code: "UNSUPPORTED_TABLE_HEADER_COUNT",
        regionId: region.regionId,
      });
      return;
    }
    const headerColumns = headerRows[0].cells.map(function (cell) {
      return cell.columnOrder;
    });
    if (!region.rows.some(function (row) {
      return row.rowKindEvidence === "data";
    })) {
      conflicts.push({
        code: "NO_TABLE_DATA_ROWS",
        regionId: region.regionId,
      });
    }
    region.rows.forEach(function (row) {
      if (row.rowKindEvidence === "unknown") {
        conflicts.push({
          code: "UNKNOWN_TABLE_ROW_STRUCTURE",
          regionId: region.regionId,
          rowId: row.rowId,
        });
        return;
      }
      if (row.rowKindEvidence !== "data") return;
      const rowColumns = row.cells.map(function (cell) {
        return cell.columnOrder;
      });
      if (JSON.stringify(rowColumns) !== JSON.stringify(headerColumns)) {
        conflicts.push({
          code: "INCOMPLETE_TABLE_COLUMN_ALIGNMENT",
          regionId: region.regionId,
          rowId: row.rowId,
        });
      }
      row.cells.forEach(function (cell) {
        if (cell.headerCellRef === null) {
          conflicts.push({
            code: "UNRESOLVED_TABLE_HEADER_ASSOCIATION",
            regionId: region.regionId,
            rowId: row.rowId,
            cellId: cell.cellId,
          });
        }
      });
    });
  });
  return {
    resolved: conflicts.length === 0,
    coordinateSystem: "table-local",
    crossRepresentationAlignment: "unresolved",
    conflicts: conflicts,
    regionCount: evidence.tableEvidence.regions.length,
  };
}

function syntheticStage1V2TableEvidenceDiagnosticFixture_() {
  return {
    observedLines: [
      {
        order: 1,
        rawText: "Description Printed value A Discount Amount",
        leadingQuantityText: null,
        descriptionText: null,
        unitPriceText: null,
        lineTotalText: null,
        indentation: "left_aligned",
        roleEvidence: "header",
      },
      {
        order: 2,
        rawText: "Synthetic item 12,34 12,34",
        leadingQuantityText: null,
        descriptionText: "Synthetic item",
        unitPriceText: "12,34",
        lineTotalText: "12,34",
        indentation: "left_aligned",
        roleEvidence: "product",
      },
    ],
    summaryEvidence: {
      printedProductCount: null,
      printedTotal: null,
    },
    tableEvidence: {
      regions: [
        {
          regionId: "table-1",
          rows: [
            {
              rowId: "header-row",
              tableRowOrder: 1,
              rowKindEvidence: "header",
              cells: [
                {
                  cellId: "header-description",
                  columnOrder: 1,
                  rawText: "Description",
                  emptyEvidence: false,
                  headerCellRef: null,
                },
                {
                  cellId: "header-value-a",
                  columnOrder: 2,
                  rawText: "Printed value A",
                  emptyEvidence: false,
                  headerCellRef: null,
                },
                {
                  cellId: "header-discount",
                  columnOrder: 3,
                  rawText: "Discount",
                  emptyEvidence: false,
                  headerCellRef: null,
                },
                {
                  cellId: "header-amount",
                  columnOrder: 4,
                  rawText: "Amount",
                  emptyEvidence: false,
                  headerCellRef: null,
                },
              ],
            },
            {
              rowId: "data-row",
              tableRowOrder: 2,
              rowKindEvidence: "data",
              cells: [
                {
                  cellId: "data-description",
                  columnOrder: 1,
                  rawText: "Synthetic item",
                  emptyEvidence: false,
                  headerCellRef: "header-description",
                },
                {
                  cellId: "data-value-a",
                  columnOrder: 2,
                  rawText: "12,34",
                  emptyEvidence: false,
                  headerCellRef: "header-value-a",
                },
                {
                  cellId: "data-discount",
                  columnOrder: 3,
                  rawText: "",
                  emptyEvidence: true,
                  headerCellRef: "header-discount",
                },
                {
                  cellId: "data-amount",
                  columnOrder: 4,
                  rawText: "12,34",
                  emptyEvidence: false,
                  headerCellRef: "header-amount",
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

/**
 * Immutable-by-convention replay of one successful corrected-contract table
 * observation from the controlled Bol PNG. Each call returns a fresh object.
 */
function recordedBolTableLocalRuntimeEvidenceFixture_() {
  return {
    sourceIntegrity: {
      mimeType: "image/png",
      driveReportedByteLength: 94252,
      blobByteLength: 94252,
      sha256: "daff887a8a8f3ec35386989eebc2bd4e0240354a4acd6c51e117be7037b32e8c",
    },
    tableEvidence: {
      regions: [
        {
          regionId: "region1",
          rows: [
            {
              rowId: "row1",
              tableRowOrder: 1,
              rowKindEvidence: "header",
              cells: [
                { cellId: "cell1", columnOrder: 1, rawText: "Omschrijving", emptyEvidence: false, headerCellRef: null },
                { cellId: "cell2", columnOrder: 2, rawText: "Aantal", emptyEvidence: false, headerCellRef: null },
                { cellId: "cell3", columnOrder: 3, rawText: "Prijs/st", emptyEvidence: false, headerCellRef: null },
                { cellId: "cell4", columnOrder: 4, rawText: "Korting", emptyEvidence: false, headerCellRef: null },
                { cellId: "cell5", columnOrder: 5, rawText: "Bedrag", emptyEvidence: false, headerCellRef: null },
                { cellId: "cell6", columnOrder: 6, rawText: "BTW%", emptyEvidence: false, headerCellRef: null },
                { cellId: "cell7", columnOrder: 7, rawText: "BTW", emptyEvidence: false, headerCellRef: null },
              ],
            },
            {
              rowId: "row2",
              tableRowOrder: 2,
              rowKindEvidence: "data",
              cells: [
                {
                  cellId: "cell8",
                  columnOrder: 1,
                  rawText: "Inventum AK06012RVS onderbouw afzuigkap 60 cm - Afzuigcapaciteit 326,4 m3/h - Geschikt voor grote keuken - 3 standen - Ledverlichting - Luchtafvoer en recirculatie - RVS",
                  emptyEvidence: false,
                  headerCellRef: "cell1",
                },
                { cellId: "cell9", columnOrder: 2, rawText: "1", emptyEvidence: false, headerCellRef: "cell2" },
                { cellId: "cell10", columnOrder: 3, rawText: "€ 91,00", emptyEvidence: false, headerCellRef: "cell3" },
                { cellId: "cell11", columnOrder: 4, rawText: "", emptyEvidence: true, headerCellRef: "cell4" },
                { cellId: "cell12", columnOrder: 5, rawText: "€ 91,00", emptyEvidence: false, headerCellRef: "cell5" },
                { cellId: "cell13", columnOrder: 6, rawText: "21%", emptyEvidence: false, headerCellRef: "cell6" },
                { cellId: "cell14", columnOrder: 7, rawText: "€ 15,79", emptyEvidence: false, headerCellRef: "cell7" },
              ],
            },
          ],
        },
      ],
    },
    tableAssessment: {
      resolved: true,
      coordinateSystem: "table-local",
      crossRepresentationAlignment: "unresolved",
      conflicts: [],
      regionCount: 1,
    },
  };
}

/**
 * Explicit fixture manifest only; it does not infer financial meaning from a
 * header or column. Every data cell receives exactly one local disposition.
 */
function recordedBolTableLocalDispositionManifest_() {
  return [
    { cellId: "cell8", disposition: "structural_evidence" },
    { cellId: "cell9", disposition: "value_occurrence" },
    { cellId: "cell10", disposition: "value_occurrence" },
    { cellId: "cell11", disposition: "structural_evidence" },
    { cellId: "cell12", disposition: "value_occurrence" },
    { cellId: "cell13", disposition: "value_occurrence" },
    { cellId: "cell14", disposition: "value_occurrence" },
  ];
}

/**
 * Local-only handoff experiment. It inventories table-local evidence and
 * invokes the generalized collector without fabricating observed-line refs.
 */
function buildRecordedTableLocalCollectorHandoffExperiment_(
  recordedEvidence,
  dispositionManifest,
) {
  const sourceSnapshot = JSON.stringify(recordedEvidence);
  const sourceIntegrity = recordedEvidence && recordedEvidence.sourceIntegrity
    ? JSON.parse(JSON.stringify(recordedEvidence.sourceIntegrity))
    : null;
  const tableEvidence = recordedEvidence && recordedEvidence.tableEvidence;
  const assessment = recordedEvidence && recordedEvidence.tableAssessment;

  if (tableEvidence === null) {
    return buildTableLocalHandoffFailure_(
      sourceIntegrity,
      "NO_TABLE_EVIDENCE",
      [],
      JSON.stringify(recordedEvidence) === sourceSnapshot,
    );
  }
  if (
    !assessment ||
    assessment.resolved !== true ||
    assessment.coordinateSystem !== "table-local" ||
    assessment.crossRepresentationAlignment !== "unresolved"
  ) {
    return buildTableLocalHandoffFailure_(
      sourceIntegrity,
      "UNRESOLVED_TABLE_EVIDENCE",
      assessment && Array.isArray(assessment.conflicts)
        ? assessment.conflicts
        : [],
      JSON.stringify(recordedEvidence) === sourceSnapshot,
    );
  }

  const validationEnvelope = {
    observedLines: [],
    summaryEvidence: {
      printedProductCount: null,
      printedTotal: null,
    },
    tableEvidence: tableEvidence,
  };
  let verifiedAssessment;
  try {
    verifiedAssessment = assessStage1V2TableEvidenceDiagnostic_(
      validationEnvelope,
    );
  } catch (error) {
    return buildTableLocalHandoffFailure_(
      sourceIntegrity,
      "INVALID_TABLE_LOCAL_EVIDENCE",
      [{
        code: "INVALID_TABLE_LOCAL_EVIDENCE",
        message: error && error.message ? error.message : "Unknown validation error.",
      }],
      JSON.stringify(recordedEvidence) === sourceSnapshot,
    );
  }
  if (!verifiedAssessment.resolved) {
    return buildTableLocalHandoffFailure_(
      sourceIntegrity,
      "UNRESOLVED_TABLE_EVIDENCE",
      verifiedAssessment.conflicts,
      JSON.stringify(recordedEvidence) === sourceSnapshot,
    );
  }

  const headerContexts = [];
  const dataCells = {};
  const headerCells = {};
  tableEvidence.regions.forEach(function (region) {
    region.rows.forEach(function (row) {
      row.cells.forEach(function (cell) {
        const localRef = {
          sourceImageSha256: sourceIntegrity && sourceIntegrity.sha256,
          regionId: region.regionId,
          rowId: row.rowId,
          tableRowOrder: row.tableRowOrder,
          cellId: cell.cellId,
          columnOrder: cell.columnOrder,
        };
        if (row.rowKindEvidence === "header") {
          headerCells[region.regionId + "|" + cell.cellId] = cell;
          headerContexts.push({
            provenanceKind: "table_cell",
            tableLocalRef: localRef,
            rawText: cell.rawText,
            emptyEvidence: cell.emptyEvidence,
          });
        } else if (row.rowKindEvidence === "data") {
          dataCells[cell.cellId] = {
            region: region,
            row: row,
            cell: cell,
            tableLocalRef: localRef,
          };
        }
      });
    });
  });

  const manifest = Array.isArray(dispositionManifest)
    ? dispositionManifest
    : [];
  const seenConsumption = {};
  const valueOccurrences = [];
  const structuralEvidence = [];
  const conflicts = [];

  manifest.forEach(function (entry) {
    const cellId = entry && entry.cellId;
    if (seenConsumption[cellId]) {
      conflicts.push({
        code: "DUPLICATE_TABLE_CELL_CONSUMPTION",
        cellId: cellId || null,
      });
      return;
    }
    seenConsumption[cellId] = true;
    const indexed = dataCells[cellId];
    if (
      !indexed ||
      !hasExactObjectKeysExperiment_(entry, ["cellId", "disposition"]) ||
      ["value_occurrence", "structural_evidence"].indexOf(
        entry.disposition,
      ) < 0
    ) {
      conflicts.push({
        code: "INVALID_TABLE_CELL_DISPOSITION",
        cellId: cellId || null,
      });
      return;
    }
    const cell = indexed.cell;
    const header = headerCells[
      indexed.region.regionId + "|" + cell.headerCellRef
    ];
    const item = {
      provenanceKind: "table_cell",
      evidenceId: "table-local:" + indexed.region.regionId + ":" +
        indexed.row.rowId + ":" + cell.cellId,
      rawText: cell.rawText,
      emptyEvidence: cell.emptyEvidence,
      literalHeaderRawText: header.rawText,
      headerCellRef: cell.headerCellRef,
      tableLocalRef: indexed.tableLocalRef,
    };
    if (entry.disposition === "value_occurrence") {
      if (cell.emptyEvidence) {
        conflicts.push({
          code: "EMPTY_CELL_CANNOT_BE_VALUE_OCCURRENCE",
          cellId: cellId,
        });
      } else {
        valueOccurrences.push({
          provenanceKind: item.provenanceKind,
          occurrenceId: item.evidenceId,
          rawValue: item.rawText,
          rawText: item.rawText,
          emptyEvidence: item.emptyEvidence,
          literalHeaderRawText: item.literalHeaderRawText,
          headerCellRef: item.headerCellRef,
          tableLocalRef: item.tableLocalRef,
        });
      }
    } else {
      structuralEvidence.push(item);
    }
  });

  Object.keys(dataCells).forEach(function (cellId) {
    if (!seenConsumption[cellId]) {
      conflicts.push({
        code: "INCOMPLETE_TABLE_CELL_ACCOUNTING",
        cellId: cellId,
      });
    }
  });

  const sourceUnchanged = JSON.stringify(recordedEvidence) === sourceSnapshot;
  if (!sourceUnchanged) {
    conflicts.push({ code: "TABLE_LOCAL_ADAPTER_MUTATED_SOURCE" });
  }
  const adapterResolved = conflicts.length === 0;
  const collector = adapterResolved
    ? collectExhaustiveFinancialEvidenceExperiment_({
        sourceIntegrity: sourceIntegrity,
        tableEvidence: tableEvidence,
        tableAssessment: assessment,
        financialSourceObservations: valueOccurrences,
        structuralSourceEvidence: structuralEvidence,
      })
    : null;
  const collectorResolved = Boolean(collector && collector.collectionComplete);
  return {
    resolved: adapterResolved && collectorResolved,
    adapterResolved: adapterResolved,
    firstUnresolvedBoundary: !adapterResolved
      ? conflicts[0].code
      : collectorResolved
        ? null
        : collector.conflicts[0].code,
    sourceIntegrity: sourceIntegrity,
    headerContexts: headerContexts,
    valueOccurrences: valueOccurrences,
    structuralEvidence: structuralEvidence,
    sourceAccounting: {
      headerCellCount: headerContexts.length,
      dataCellCount: Object.keys(dataCells).length,
      accountedDataCellCount: Object.keys(seenConsumption).filter(function (cellId) {
        return Boolean(dataCells[cellId]);
      }).length,
      valueOccurrenceCount: valueOccurrences.length,
      structuralEvidenceCount: structuralEvidence.length,
      sourceUnchanged: sourceUnchanged,
    },
    collectorCompatibility: {
      compatible: adapterResolved,
      code: adapterResolved ? null : "INVALID_TABLE_LOCAL_ADAPTER_INPUT",
      collectorInvoked: adapterResolved,
    },
    collector: collector,
    conflicts: conflicts,
  };
}

function buildTableLocalHandoffFailure_(
  sourceIntegrity,
  boundary,
  conflicts,
  sourceUnchanged,
) {
  return {
    resolved: false,
    adapterResolved: false,
    firstUnresolvedBoundary: boundary,
    sourceIntegrity: sourceIntegrity,
    headerContexts: [],
    valueOccurrences: [],
    structuralEvidence: [],
    sourceAccounting: {
      headerCellCount: 0,
      dataCellCount: 0,
      accountedDataCellCount: 0,
      valueOccurrenceCount: 0,
      structuralEvidenceCount: 0,
      sourceUnchanged: sourceUnchanged,
    },
    collectorCompatibility: {
      compatible: false,
      code: boundary,
      collectorInvoked: false,
    },
    collector: null,
    conflicts: (Array.isArray(conflicts) ? conflicts : []).map(function (item) {
      return JSON.parse(JSON.stringify(item));
    }),
  };
}

function buildStage1V2OpenAIMetadata_(responseJson) {
  const choice =
    responseJson &&
    Array.isArray(responseJson.choices) &&
    responseJson.choices.length > 0
      ? responseJson.choices[0]
      : null;

  return {
    model: responseJson.model || null,
    systemFingerprint: responseJson.system_fingerprint || null,
    finishReason: choice ? choice.finish_reason || null : null,
    usage: responseJson.usage
      ? {
          promptTokens: diagnosticNumberOrNull_(
            responseJson.usage.prompt_tokens,
          ),
          completionTokens: diagnosticNumberOrNull_(
            responseJson.usage.completion_tokens,
          ),
          totalTokens: diagnosticNumberOrNull_(
            responseJson.usage.total_tokens,
          ),
        }
      : null,
  };
}

const STAGE1_V3_DIAGNOSTIC_FILE_ID_PROPERTY =
  "STAGE1_V3_DIAGNOSTIC_FILE_ID";

/**
 * Manual-only entry point for one isolated Stage-1-v3 image request.
 * The configured Drive file is read but never modified.
 */
function runStage1V3ImageRequestDiagnostic() {
  const fileId = getRequiredScriptProperty(
    STAGE1_V3_DIAGNOSTIC_FILE_ID_PROPERTY,
  );
  return runStage1V3ImageRequestDiagnosticForFileId_(fileId);
}

/**
 * Testable single-request runner. Runtime dependencies default to the existing
 * Apps Script/OpenAI mechanisms; deterministic tests inject bounded stubs.
 */
function runStage1V3ImageRequestDiagnosticForFileId_(fileId, dependencies) {
  if (typeof fileId !== "string" || fileId.trim() === "") {
    throw new Error(
      "A Stage-1-v3 diagnostic Drive image file ID is required in " +
        STAGE1_V3_DIAGNOSTIC_FILE_ID_PROPERTY +
        ".",
    );
  }

  const runtime = dependencies || {};
  const getFileById =
    typeof runtime.getFileById === "function"
      ? runtime.getFileById
      : function (selectedFileId) {
          return DriveApp.getFileById(selectedFileId);
        };
  const file = getFileById(fileId.trim());
  const mimeType = file.getMimeType();
  assertStage1V3DiagnosticImageMimeType_(mimeType);

  const bytes = file.getBlob().getBytes();
  const computeSha256 =
    typeof runtime.computeSha256Hex === "function"
      ? runtime.computeSha256Hex
      : computeDiagnosticSha256Hex_;
  const encodeBase64 =
    typeof runtime.base64Encode === "function"
      ? runtime.base64Encode
      : function (sourceBytes) {
          return Utilities.base64Encode(sourceBytes);
        };
  const source = {
    fileId: fileId.trim(),
    fileName: file.getName(),
    mimeType: mimeType,
    driveReportedByteLength: file.getSize(),
    blobByteLength: bytes.length,
    sha256: computeSha256(bytes),
  };

  const getOpenAIApiKey =
    typeof runtime.getOpenAIApiKey === "function"
      ? runtime.getOpenAIApiKey
      : function () {
          return getRequiredConfigValue(
            CONFIG.openAIApiKey,
            "OPENAI_API_KEY",
          );
        };
  const makeRequest =
    typeof runtime.request === "function"
      ? runtime.request
      : requestOpenAIStage1V3Diagnostic_;
  const requestResult = makeRequest(
    mimeType,
    encodeBase64(bytes),
    getOpenAIApiKey(),
  );
  const responseMetadata = buildStage1V3DiagnosticResponseMetadata_(
    requestResult.requestedModel,
    requestResult.responseJson,
  );

  const projectEvidence =
    typeof runtime.projectEvidence === "function"
      ? runtime.projectEvidence
      : projectStage1V3ToObservedLines_;
  const projection = projectEvidence(requestResult.evidence);
  const candidateInspection = buildStage1V3DiagnosticCandidateInspection_(
    projection,
    typeof runtime.buildCandidate === "function"
      ? runtime.buildCandidate
      : buildStagedReceiptCandidate,
  );
  const result = {
    transportSuccess: true,
    contractValid: true,
    projectionResolved: projection.resolved === true,
    candidateResolved: candidateInspection.resolved === true,
    requiresHumanSourceComparison: true,
    perceptionCorrectnessDetermined: false,
    source: source,
    responseMetadata: responseMetadata,
    physicalEvidence: requestResult.evidence,
    projection: {
      resolved: projection.resolved === true,
      conflicts: projection.conflicts,
      accounting: projection.accounting,
      sourceMap: projection.sourceMap,
    },
    candidateInspection: candidateInspection,
  };

  const logReport =
    typeof runtime.logReport === "function"
      ? runtime.logReport
      : function (report) {
          console.log(
            "STAGE-1-V3 IMAGE REQUEST DIAGNOSTIC — HUMAN SOURCE " +
              "COMPARISON REQUIRED:\n" + JSON.stringify(report, null, 2),
          );
        };
  logReport(result);
  return result;
}

function buildStage1V3DiagnosticResponseMetadata_(
  requestedModel,
  responseJson,
) {
  const metadata = buildStage1V2OpenAIMetadata_(responseJson || {});
  return {
    requestedModel: requestedModel || null,
    returnedModel: metadata.model,
    systemFingerprint: metadata.systemFingerprint,
    finishReason: metadata.finishReason,
    usage: metadata.usage,
  };
}

function buildStage1V3DiagnosticCandidateInspection_(
  projection,
  candidateBuilder,
) {
  if (!projection || projection.resolved !== true || !projection.evidence) {
    return {
      invoked: false,
      resolved: false,
      structuralStatus: null,
      financialStatus: null,
      candidateItemCount: null,
      canonicalReceiptAvailable: false,
    };
  }

  const candidate = candidateBuilder(projection.evidence);
  const candidateReceipt = candidate.candidateReceipt;
  return {
    invoked: true,
    resolved: Boolean(
      candidate.structuralStatus && candidate.structuralStatus.resolved,
    ),
    structuralStatus: candidate.structuralStatus,
    financialStatus: candidate.financialStatus,
    candidateItemCount:
      candidateReceipt && Array.isArray(candidateReceipt.items)
        ? candidateReceipt.items.length
        : 0,
    canonicalReceiptAvailable: Boolean(candidate.canonicalReceipt),
  };
}

function stage1V3DiagnosticDependencyFixture_(
  evidence,
  projectionResult,
  candidateBuilder,
) {
  return {
    getFileById: function () {
      return {
        getMimeType: function () { return "image/png"; },
        getBlob: function () {
          return { getBytes: function () { return [1, 2, 3]; } };
        },
        getName: function () { return "bounded-test.png"; },
        getSize: function () { return 3; },
      };
    },
    computeSha256Hex: function () { return "bounded-test-sha256"; },
    base64Encode: function () { return "bounded-test-data"; },
    getOpenAIApiKey: function () { return null; },
    request: function () {
      return {
        requestedModel: "gpt-4o-2024-08-06",
        responseJson: {
          model: "gpt-4o-2024-08-06",
          choices: [{ finish_reason: "stop" }],
        },
        evidence: evidence,
      };
    },
    projectEvidence: projectionResult
      ? function () { return projectionResult; }
      : null,
    buildCandidate: candidateBuilder,
    logReport: function () {},
  };
}

function buildStage1V2PrototypeHandoffDiagnostic_(evidence) {
  try {
    const partition = partitionObservedReceiptEvidencePrototype_(evidence);
    const grouping = groupObservedReceiptRowsPrototype_(
      partition.productObservations,
    );
    const conflicts = partition.conflicts.concat(grouping.conflicts);
    const unconsumedRows = partition.unclassifiedObservations.concat(
      grouping.unconsumedRows,
    );

    return {
      compatible: true,
      resolved: conflicts.length === 0 && unconsumedRows.length === 0,
      accountedObservationCount: partition.accountedObservationCount,
      headerOrders: partition.headerObservations.map(function (line) {
        return line.order;
      }),
      productOrders: partition.productObservations.map(function (line) {
        return line.order;
      }),
      summaryOrders: partition.summaryObservations.map(function (line) {
        return line.order;
      }),
      groupCount: grouping.groups.length,
      groupSourceRowOrders: grouping.groups.map(function (group) {
        return group.sourceRowOrders;
      }),
      anomalies: grouping.anomalies.map(copyStage1V2DiagnosticIssue_),
      conflicts: conflicts.map(copyStage1V2DiagnosticIssue_),
      unconsumedRowOrders: unconsumedRows.map(function (line) {
        return line.order;
      }),
    };
  } catch (error) {
    return {
      compatible: false,
      error: {
        name: error && error.name ? error.name : "Error",
        message:
          error && error.message
            ? error.message
            : "Unknown prototype handoff error.",
      },
    };
  }
}

function copyStage1V2DiagnosticIssue_(issue) {
  return {
    code: issue.code || null,
    rowOrder:
      issue.rowOrder === undefined ? null : issue.rowOrder,
    field: issue.field || null,
  };
}

/**
 * Immutable-by-convention replay fixture captured from one controlled real
 * Bol invoice image in the isolated GAS/OpenAI diagnostic. Each call returns
 * a fresh object so local experiments cannot mutate the recorded evidence.
 */
function recordedBolStage1V2RuntimeEvidenceFixture_() {
  return {
    sourceIntegrity: {
      mimeType: "image/png",
      driveReportedByteLength: 94252,
      blobByteLength: 94252,
      sha256: "daff887a8a8f3ec35386989eebc2bd4e0240354a4acd6c51e117be7037b32e8c",
    },
    openAIMetadata: {
      model: "gpt-4o-2024-08-06",
      systemFingerprint: "fp_ffd8308b42",
      finishReason: "stop",
      usage: {
        promptTokens: 1715,
        completionTokens: 847,
        totalTokens: 2562,
      },
    },
    evidence: {
      observedLines: [
        {
          order: 1,
          rawText: "Factuur",
          leadingQuantityText: null,
          descriptionText: null,
          unitPriceText: null,
          lineTotalText: null,
          indentation: "left_aligned",
          roleEvidence: "header",
        },
        {
          order: 2,
          rawText: "alles op een rijtje",
          leadingQuantityText: null,
          descriptionText: null,
          unitPriceText: null,
          lineTotalText: null,
          indentation: "left_aligned",
          roleEvidence: "header",
        },
        {
          order: 3,
          rawText: "Omschrijving Aantal Prijs/st Korting Bedrag BTW% BTW",
          leadingQuantityText: null,
          descriptionText: null,
          unitPriceText: null,
          lineTotalText: null,
          indentation: "left_aligned",
          roleEvidence: "header",
        },
        {
          order: 4,
          rawText: "Inventum AK0601Z RVS onderbouw",
          leadingQuantityText: null,
          descriptionText: "Inventum AK0601Z RVS onderbouw",
          unitPriceText: null,
          lineTotalText: null,
          indentation: "left_aligned",
          roleEvidence: "product",
        },
        {
          order: 5,
          rawText: "afzuigkap 60 cm - Afzuigcapaciteit",
          leadingQuantityText: null,
          descriptionText: "afzuigkap 60 cm - Afzuigcapaciteit",
          unitPriceText: null,
          lineTotalText: null,
          indentation: "indented",
          roleEvidence: "product",
        },
        {
          order: 6,
          rawText: "326,4 m3/h - Geschikt voor grote",
          leadingQuantityText: null,
          descriptionText: "326,4 m3/h - Geschikt voor grote",
          unitPriceText: null,
          lineTotalText: null,
          indentation: "indented",
          roleEvidence: "product",
        },
        {
          order: 7,
          rawText: "keuken - 3 standen - Ledverlichting -",
          leadingQuantityText: null,
          descriptionText: "keuken - 3 standen - Ledverlichting -",
          unitPriceText: null,
          lineTotalText: null,
          indentation: "indented",
          roleEvidence: "product",
        },
        {
          order: 8,
          rawText: "Luchtafvoer en recirculatie - RVS",
          leadingQuantityText: null,
          descriptionText: "Luchtafvoer en recirculatie - RVS",
          unitPriceText: null,
          lineTotalText: null,
          indentation: "indented",
          roleEvidence: "product",
        },
        {
          order: 9,
          rawText: "1 € 91,00 € 91,00 21% € 15,79",
          leadingQuantityText: "1",
          descriptionText: null,
          unitPriceText: "€ 91,00",
          lineTotalText: "€ 91,00",
          indentation: "left_aligned",
          roleEvidence: "product",
        },
        {
          order: 10,
          rawText: "Subtotaal ex. BTW € 75,21",
          leadingQuantityText: null,
          descriptionText: "Subtotaal ex. BTW",
          unitPriceText: null,
          lineTotalText: "€ 75,21",
          indentation: "left_aligned",
          roleEvidence: "summary",
        },
        {
          order: 11,
          rawText: "21% BTW € 15,79",
          leadingQuantityText: null,
          descriptionText: "21% BTW",
          unitPriceText: null,
          lineTotalText: "€ 15,79",
          indentation: "left_aligned",
          roleEvidence: "summary",
        },
        {
          order: 12,
          rawText: "Bedrag incl. BTW € 91,00",
          leadingQuantityText: null,
          descriptionText: "Bedrag incl. BTW",
          unitPriceText: null,
          lineTotalText: "€ 91,00",
          indentation: "left_aligned",
          roleEvidence: "summary",
        },
        {
          order: 13,
          rawText: "Totaalbedrag € 91,00",
          leadingQuantityText: null,
          descriptionText: "Totaalbedrag",
          unitPriceText: null,
          lineTotalText: "€ 91,00",
          indentation: "left_aligned",
          roleEvidence: "summary",
        },
      ],
      summaryEvidence: {
        printedProductCount: null,
        printedTotal: {
          sourceLineOrder: 13,
          rawText: "Totaalbedrag € 91,00",
          labelText: "Totaalbedrag",
          valueText: "€ 91,00",
          totalTypeEvidence: null,
        },
      },
    },
  };
}

/**
 * Adapts the recorded table-local call into one independently complete
 * provenance domain. Header and data-cell identities stay table-local.
 */
function buildRecordedBolTableEvidenceDomainExperiment_(recordedEvidence) {
  const handoff = buildRecordedTableLocalCollectorHandoffExperiment_(
    recordedEvidence,
    recordedBolTableLocalDispositionManifest_(),
  );
  const includedSourceIds = [];
  const regions = recordedEvidence && recordedEvidence.tableEvidence &&
    Array.isArray(recordedEvidence.tableEvidence.regions)
      ? recordedEvidence.tableEvidence.regions
      : [];
  regions.forEach(function (region) {
    (Array.isArray(region.rows) ? region.rows : []).forEach(function (row) {
      (Array.isArray(row.cells) ? row.cells : []).forEach(function (cell) {
        includedSourceIds.push(
          ["table-cell", region.regionId, row.rowId, cell.cellId].join(":"),
        );
      });
    });
  });

  return {
    domainId: "recorded-bol-table-local",
    provenanceKind: "table_cell",
    sourceDocumentSha256:
      recordedEvidence && recordedEvidence.sourceIntegrity
        ? recordedEvidence.sourceIntegrity.sha256
        : null,
    sourceScope: {
      scopeKind: "complete_table_region",
      includedSourceIds: includedSourceIds,
      excludedSourceIds: [],
      completeWithinScope:
        handoff.resolved === true &&
        handoff.sourceAccounting.headerCellCount +
          handoff.sourceAccounting.accountedDataCellCount ===
          includedSourceIds.length,
    },
    collection: handoff.collector,
  };
}

/**
 * Adapts only lines already observed as summary-role evidence. Non-summary
 * lines remain explicitly outside this domain; no table/line alignment is
 * attempted and no label is promoted to financial meaning.
 */
function buildRecordedBolObservedLineSummaryDomainExperiment_(
  recordedEvidence,
) {
  const evidence = recordedEvidence && recordedEvidence.evidence;
  const lines = evidence && Array.isArray(evidence.observedLines)
    ? evidence.observedLines
    : [];
  const includedLines = lines.filter(function (line) {
    return line.roleEvidence === "summary";
  });
  const excludedLines = lines.filter(function (line) {
    return line.roleEvidence !== "summary";
  });
  const includedOrders = {};
  includedLines.forEach(function (line) {
    includedOrders[line.order] = true;
  });

  const structural = deriveRecordedBolTerminalStructureExperiment_(evidence);
  const manifest = deriveRecordedBolFinancialManifestExperiment_(
    evidence,
    structural,
  );
  const summaryObservations = manifest.observations.filter(function (item) {
    return item.sourceContext === "summary";
  });
  const representedOrders = {};
  let referencesStayWithinScope = summaryObservations.length > 0;
  summaryObservations.forEach(function (item) {
    const orders = item.sourceRef.sourceLineOrders;
    orders.forEach(function (order) {
      if (!includedOrders[order]) referencesStayWithinScope = false;
      representedOrders[order] = true;
    });
  });
  const completeWithinScope =
    manifest.conflicts.length === 0 &&
    referencesStayWithinScope &&
    includedLines.length > 0 &&
    includedLines.every(function (line) {
      return representedOrders[line.order] === true;
    });
  const scopedExtraction = {
    observedLines: JSON.parse(JSON.stringify(includedLines)),
    summaryEvidence: JSON.parse(JSON.stringify(evidence.summaryEvidence)),
    financialSourceObservations: JSON.parse(JSON.stringify(
      summaryObservations,
    )),
  };
  const collection = collectExhaustiveFinancialEvidenceExperiment_(
    scopedExtraction,
  );

  return {
    domainId: "recorded-bol-observed-line-summary",
    provenanceKind: "observed_line",
    sourceDocumentSha256:
      recordedEvidence && recordedEvidence.sourceIntegrity
        ? recordedEvidence.sourceIntegrity.sha256
        : null,
    sourceScope: {
      scopeKind: "observed_lines_by_role:summary",
      includedSourceIds: includedLines.map(function (line) {
        return "observed-line:" + line.order;
      }),
      excludedSourceIds: excludedLines.map(function (line) {
        return "observed-line:" + line.order;
      }),
      completeWithinScope:
        completeWithinScope && collection.collectionComplete === true,
    },
    collection: collection,
  };
}

function buildRecordedBolMultiDomainEvidencePackageExperiment_(
  tableRecordedEvidence,
  observedLineRecordedEvidence,
) {
  const tableSnapshot = JSON.stringify(tableRecordedEvidence);
  const observedLineSnapshot = JSON.stringify(observedLineRecordedEvidence);
  const tableDomain = buildRecordedBolTableEvidenceDomainExperiment_(
    tableRecordedEvidence,
  );
  const observedLineSummaryDomain =
    buildRecordedBolObservedLineSummaryDomainExperiment_(
      observedLineRecordedEvidence,
    );
  const result = buildMultiDomainFinancialEvidencePackageExperiment_(
    {
      sha256:
        tableRecordedEvidence && tableRecordedEvidence.sourceIntegrity
          ? tableRecordedEvidence.sourceIntegrity.sha256
          : null,
    },
    [tableDomain, observedLineSummaryDomain],
  );

  return {
    packageResult: result,
    tableDomain: tableDomain,
    observedLineSummaryDomain: observedLineSummaryDomain,
    sourceFixturesUnchanged:
      JSON.stringify(tableRecordedEvidence) === tableSnapshot &&
      JSON.stringify(observedLineRecordedEvidence) === observedLineSnapshot,
    interpreterInvoked: false,
    canonicalReleaseInvoked: false,
  };
}

/**
 * Test-only replay adapter for the one recorded Bol Stage-1-v2 response above.
 * It validates a bounded terminal-priced layout, inventories every financial
 * occurrence, and deliberately leaves the two unbound line-9 VAT fragments
 * unresolved because Stage-1 did not preserve positional cell evidence.
 */
function buildRecordedBolLocalHandoffExperiment_(evidence) {
  const sourceSnapshot = JSON.stringify(evidence);
  const structural = deriveRecordedBolTerminalStructureExperiment_(evidence);
  const manifest = deriveRecordedBolFinancialManifestExperiment_(
    evidence,
    structural,
  );
  const extraction = JSON.parse(JSON.stringify(evidence));
  extraction.financialSourceObservations = manifest.observations;
  const collector = collectExhaustiveFinancialEvidenceExperiment_(extraction);
  const interpreter = interpretCollectedFinancialEvidenceExperiment_(
    collector,
    manifest.interpretationProjection,
  );
  const canonicalRelease =
    buildCanonicalReceiptFromFinancialInterpretationExperiment_(
      structural.canonicalProductProjection,
      collector,
      interpreter,
    );

  return {
    resolved: manifest.resolved && canonicalRelease.releaseStatus.eligible,
    firstUnresolvedBoundary: manifest.firstUnresolvedBoundary,
    sourceUnchanged: JSON.stringify(evidence) === sourceSnapshot,
    structural: structural,
    manifest: manifest,
    collector: collector,
    interpreter: interpreter,
    canonicalRelease: canonicalRelease,
    normalizerCompatibility: null,
  };
}

function deriveRecordedBolTerminalStructureExperiment_(evidence) {
  const lines = evidence && Array.isArray(evidence.observedLines)
    ? evidence.observedLines
    : [];
  const conflicts = [];
  const expectedOrders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const actualOrders = lines.map(function (line) { return line.order; });
  const lineByOrder = {};
  lines.forEach(function (line) { lineByOrder[line.order] = line; });

  if (JSON.stringify(actualOrders) !== JSON.stringify(expectedOrders)) {
    conflicts.push({ code: "RECORDED_BOL_LINE_ORDER_MISMATCH" });
  }
  if (
    !lineByOrder[3] ||
    lineByOrder[3].rawText !==
      "Omschrijving Aantal Prijs/st Korting Bedrag BTW% BTW"
  ) {
    conflicts.push({ code: "RECORDED_BOL_HEADER_MISMATCH" });
  }

  const productRows = lines.filter(function (line) {
    return line.order >= 4 && line.order <= 9;
  });
  productRows.slice(0, -1).forEach(function (line) {
    if (
      line.roleEvidence !== "product" ||
      !hasObservedTextPrototype_(line.descriptionText) ||
      hasObservedTextPrototype_(line.leadingQuantityText) ||
      hasObservedTextPrototype_(line.unitPriceText) ||
      hasObservedTextPrototype_(line.lineTotalText)
    ) {
      conflicts.push({
        code: "RECORDED_BOL_DESCRIPTION_ROW_MISMATCH",
        rowOrder: line.order,
      });
    }
  });
  const terminal = lineByOrder[9];
  if (
    !terminal ||
    terminal.roleEvidence !== "product" ||
    hasObservedTextPrototype_(terminal.descriptionText) ||
    !hasObservedTextPrototype_(terminal.leadingQuantityText) ||
    !hasObservedTextPrototype_(terminal.unitPriceText) ||
    !hasObservedTextPrototype_(terminal.lineTotalText)
  ) {
    conflicts.push({ code: "RECORDED_BOL_TERMINAL_ROW_MISMATCH", rowOrder: 9 });
  }
  [10, 11, 12, 13].forEach(function (order) {
    if (!lineByOrder[order] || lineByOrder[order].roleEvidence !== "summary") {
      conflicts.push({
        code: "RECORDED_BOL_SUMMARY_REGION_MISMATCH",
        rowOrder: order,
      });
    }
  });

  const terminalProjection = projectTerminalPricedGroupsExperiment_(
    productRows,
    [{ sourceRowOrders: [4, 5, 6, 7, 8, 9], terminalRowOrder: 9 }],
  );
  if (!terminalProjection.resolved) {
    conflicts.push({ code: "RECORDED_BOL_TERMINAL_PROJECTION_FAILED" });
  }

  const description = productRows
    .slice(0, -1)
    .map(function (line) { return line.descriptionText; })
    .join(" ");
  const groupId = "recorded-bol-group-4-9";
  const resolved = conflicts.length === 0;
  return {
    resolved: resolved,
    capability: "TERMINAL_PRICED_ANCHOR",
    headerOrders: [1, 2, 3],
    productOrders: [4, 5, 6, 7, 8, 9],
    summaryOrders: [10, 11, 12, 13],
    accountedSourceLineOrders: expectedOrders,
    terminalProjection: terminalProjection,
    conflicts: conflicts,
    canonicalProductProjection: {
      resolved: resolved,
      productGroups: resolved
        ? [{
            groupId: groupId,
            structuralCapability: "TERMINAL_PRICED_ANCHOR",
            description: description,
            sourceRowOrders: [4, 5, 6, 7, 8, 9],
            financialSlots: {
              quantity: "bol-live-line9-quantity",
              unitPrice: "bol-live-line9-unit-price",
              lineTotal: "bol-live-line9-line-total",
            },
          }]
        : [],
    },
  };
}

function deriveRecordedBolFinancialManifestExperiment_(evidence, structural) {
  const lineByOrder = {};
  evidence.observedLines.forEach(function (line) { lineByOrder[line.order] = line; });
  const terminal = lineByOrder[9];
  const terminalMatch = terminal &&
    /^(\d+)\s+(€\s*\d+,\d{2})\s+(€\s*\d+,\d{2})\s+(\d+%)\s+(€\s*\d+,\d{2})$/.exec(
      terminal.rawText,
    );
  const summaryPatterns = {
    10: /^(Subtotaal ex\. BTW)\s+(€\s*\d+,\d{2})$/,
    11: /^(\d+%)\s+(BTW)\s+(€\s*\d+,\d{2})$/,
    12: /^(Bedrag incl\. BTW)\s+(€\s*\d+,\d{2})$/,
    13: /^(Totaalbedrag)\s+(€\s*\d+,\d{2})$/,
  };
  const summaryMatches = {};
  Object.keys(summaryPatterns).forEach(function (orderText) {
    const order = Number(orderText);
    summaryMatches[order] = lineByOrder[order] &&
      summaryPatterns[order].exec(lineByOrder[order].rawText);
  });
  const conflicts = [];
  if (
    !structural.resolved ||
    !terminalMatch ||
    terminalMatch[1] !== terminal.leadingQuantityText ||
    terminalMatch[2] !== terminal.unitPriceText ||
    terminalMatch[3] !== terminal.lineTotalText
  ) {
    conflicts.push({ code: "RECORDED_BOL_TERMINAL_TOKEN_MISMATCH" });
  }
  [10, 11, 12, 13].forEach(function (order) {
    if (!summaryMatches[order]) {
      conflicts.push({
        code: "RECORDED_BOL_SUMMARY_TOKEN_MISMATCH",
        rowOrder: order,
      });
    }
  });

  const groupId = "recorded-bol-group-4-9";
  const headerContext = [{
    rawText: lineByOrder[3] ? lineByOrder[3].rawText : "",
    sourceLineOrders: [3],
  }];
  const observations = conflicts.length > 0 ? [] : [
    recordedBolFinancialObservation_(
      "bol-live-line9-quantity", "product_group", terminalMatch[1],
      "TERMINAL_PRICED_ANCHOR", [9], 1, groupId, null, [],
    ),
    recordedBolFinancialObservation_(
      "bol-live-line9-unit-price", "product_group", terminalMatch[2],
      "TERMINAL_PRICED_ANCHOR", [9], 2, groupId, null, [],
    ),
    recordedBolFinancialObservation_(
      "bol-live-line9-line-total", "product_group", terminalMatch[3],
      "TERMINAL_PRICED_ANCHOR", [9], 3, groupId, null, [],
    ),
    recordedBolFinancialObservation_(
      "bol-live-line9-vat-rate-unbound", "unknown", terminalMatch[4],
      "UNRESOLVED_REGION", [9], 4, null, null, headerContext,
    ),
    recordedBolFinancialObservation_(
      "bol-live-line9-vat-amount-unbound", "unknown", terminalMatch[5],
      "UNRESOLVED_REGION", [9], 5, null, null, headerContext,
    ),
    recordedBolFinancialObservation_(
      "bol-live-line10-excl", "summary", summaryMatches[10][2],
      "SUMMARY_REGION", [10], 1, null, summaryMatches[10][1], [],
    ),
    recordedBolFinancialObservation_(
      "bol-live-line11-vat-rate", "summary", summaryMatches[11][1],
      "SUMMARY_REGION", [11], 1, null, summaryMatches[11][2], [],
    ),
    recordedBolFinancialObservation_(
      "bol-live-line11-vat-amount", "summary", summaryMatches[11][3],
      "SUMMARY_REGION", [11], 2, null, null,
      [{ rawText: summaryMatches[11][2], sourceLineOrders: [11] }],
    ),
    recordedBolFinancialObservation_(
      "bol-live-line12-incl", "summary", summaryMatches[12][2],
      "SUMMARY_REGION", [12], 1, null, summaryMatches[12][1], [],
    ),
    recordedBolFinancialObservation_(
      "bol-live-line13-bare-total", "summary", summaryMatches[13][2],
      "SUMMARY_REGION", [13], 1, null, summaryMatches[13][1], [],
    ),
  ];
  const completeness = validateRecordedBolManifestCompletenessExperiment_(
    evidence,
    observations,
  );
  Array.prototype.push.apply(conflicts, completeness.conflicts);
  const slots = observations.map(function (observation) {
    let slotRef;
    if (observation.observationId === "bol-live-line9-quantity") {
      slotRef = recordedBolStructuralSlotRef_(
        "observed_line_field", 9, null, "leadingQuantityText",
      );
    } else if (observation.observationId === "bol-live-line9-unit-price") {
      slotRef = recordedBolStructuralSlotRef_(
        "observed_line_field", 9, null, "unitPriceText",
      );
    } else if (observation.observationId === "bol-live-line9-line-total") {
      slotRef = recordedBolStructuralSlotRef_(
        "observed_line_field", 9, null, "lineTotalText",
      );
    } else {
      slotRef = recordedBolStructuralSlotRef_(
        observation.sourceContext === "summary"
          ? "summary_value"
          : "labelled_line_value",
        observation.sourceRef.sourceLineOrders[0],
        observation.sourceRef.occurrenceOrder,
        null,
      );
    }
    return {
      sourceObservationId: observation.observationId,
      structuralSlotRef: slotRef,
    };
  });

  return {
    resolved: false,
    firstUnresolvedBoundary: "UNSUPPORTED_LINE9_HEADER_BINDING",
    observations: observations,
    conflicts: conflicts,
    unresolvedObservationIds: [
      "bol-live-line9-vat-rate-unbound",
      "bol-live-line9-vat-amount-unbound",
    ],
    interpretationProjection: {
      resolved: conflicts.length === 0,
      slots: slots,
    },
  };
}

function recordedBolFinancialObservation_(
  observationId,
  sourceContext,
  rawValue,
  capability,
  sourceLineOrders,
  occurrenceOrder,
  groupId,
  printedLabelText,
  adjacentUninterpretedFragments,
) {
  return {
    provenanceKind: "observed_line",
    observationId: observationId,
    sourceContext: sourceContext,
    rawValue: rawValue,
    structuralCapability: capability,
    sourceRef: {
      sourceLineOrders: sourceLineOrders.slice(),
      occurrenceOrder: occurrenceOrder,
      groupId: groupId,
      regionId: null,
      rowId: null,
      cellId: null,
    },
    printedLabelText: printedLabelText,
    headerCellRef: null,
    adjacentUninterpretedFragments: adjacentUninterpretedFragments.map(
      function (fragment) {
        return {
          rawText: fragment.rawText,
          sourceLineOrders: fragment.sourceLineOrders.slice(),
        };
      },
    ),
  };
}

function recordedBolStructuralSlotRef_(kind, lineOrder, occurrenceOrder, field) {
  return {
    kind: kind,
    lineOrder: lineOrder,
    occurrenceOrder: occurrenceOrder,
    field: field,
    regionId: null,
    rowId: null,
    cellId: null,
    headerCellRef: null,
  };
}

function validateRecordedBolManifestCompletenessExperiment_(evidence, manifest) {
  const expected = [
    ["9|1", "1"],
    ["9|2", "€ 91,00"],
    ["9|3", "€ 91,00"],
    ["9|4", "21%"],
    ["9|5", "€ 15,79"],
    ["10|1", "€ 75,21"],
    ["11|1", "21%"],
    ["11|2", "€ 15,79"],
    ["12|1", "€ 91,00"],
    ["13|1", "€ 91,00"],
  ];
  const conflicts = [];
  const seen = {};
  (Array.isArray(manifest) ? manifest : []).forEach(function (observation) {
    const ref = observation && observation.sourceRef;
    const key = ref && Array.isArray(ref.sourceLineOrders)
      ? ref.sourceLineOrders[0] + "|" + ref.occurrenceOrder
      : "";
    if (!key || seen[key]) {
      conflicts.push({
        code: "DUPLICATE_RECORDED_BOL_FINANCIAL_OCCURRENCE",
        observationId: observation && observation.observationId,
      });
      return;
    }
    seen[key] = observation.rawValue;
  });
  expected.forEach(function (expectedOccurrence) {
    if (seen[expectedOccurrence[0]] !== expectedOccurrence[1]) {
      conflicts.push({
        code: "MISSING_RECORDED_BOL_FINANCIAL_OCCURRENCE",
        occurrenceKey: expectedOccurrence[0],
      });
    }
  });
  return {
    resolved: conflicts.length === 0,
    expectedOccurrenceCount: expected.length,
    representedOccurrenceCount: Object.keys(seen).length,
    conflicts: conflicts,
  };
}
