/**
 * QUnitGS2 tests for Generator-Werkbon-GAS v1.7.
 */

var QUnit = QUnitGS2.QUnit;

function doGet(options) {
  QUnitGS2.init();

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
function runQUnitDiagnostics() {
  const report = doGet({ diagnosticsOnly: true });
  console.log(report);
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
