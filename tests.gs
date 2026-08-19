/**
 * QUnitGS2 tests for Generator-Werkbon-GAS v1.7.
 */

var QUnit = QUnitGS2.QUnit;

function doGet() {
  QUnitGS2.init();

  // ==================================================
  // CONFIG HELPERS
  // ==================================================

  QUnit.test(
    'getRequiredConfigValue — trims configured values',
    function (assert) {
      assert.equal(
        getRequiredConfigValue('  example-value  ', 'TEST_PROPERTY'),
        'example-value'
      );
    }
  );

  QUnit.test(
    'getRequiredConfigValue — throws for missing values',
    function (assert) {
      assert.throws(
        function () {
          getRequiredConfigValue('', 'TEST_PROPERTY');
        },
        /Missing required script property/
      );

      assert.throws(
        function () {
          getRequiredConfigValue(null, 'TEST_PROPERTY');
        },
        /Missing required script property/
      );
    }
  );

  QUnit.test(
    'isDebugEnabled — recognizes true case-insensitively',
    function (assert) {
      assert.ok(isDebugEnabled('true'));
      assert.ok(isDebugEnabled(' TRUE '));
      assert.notOk(isDebugEnabled('false'));
      assert.notOk(isDebugEnabled(''));
      assert.notOk(isDebugEnabled(null));
    }
  );

  // ==================================================
  // cleanId()
  // ==================================================

  QUnit.test(
    'cleanId — normalizes Werkbon identifiers',
    function (assert) {
      assert.equal(
        cleanId(' ENG-20260518-004 '),
        'ENG-20260518-004'
      );

      assert.equal(
        cleanId('ENG - 20260518 - 004'),
        'ENG-20260518-004'
      );

      assert.equal(
        cleanId('ENG\u00A0-\u00A020260518\u00A0-\u00A0004'),
        'ENG-20260518-004'
      );

      assert.equal(cleanId('123.0'), '123');
      assert.equal(cleanId('123.5'), '123.5');
      assert.equal(cleanId(''), '');
      assert.equal(cleanId(null), '');
      assert.equal(cleanId(undefined), '');
    }
  );

  // ==================================================
  // formatEuro()
  // ==================================================

  QUnit.test(
    'formatEuro — formats euro values',
    function (assert) {
      assert.equal(formatEuro(10), '€ 10,00');
      assert.equal(formatEuro(1234.5), '€ 1234,50');
      assert.equal(formatEuro(0), '€ 0,00');
      assert.equal(formatEuro(99.999), '€ 100,00');
      assert.equal(formatEuro('12.5'), '€ 12,50');
    }
  );

  QUnit.test(
    'formatEuro — handles empty and invalid values',
    function (assert) {
      assert.equal(formatEuro(null), '€ 0,00');
      assert.equal(formatEuro(undefined), '€ 0,00');
      assert.equal(formatEuro(''), '€ 0,00');
      assert.equal(formatEuro('invalid'), 'invalid');
    }
  );

  // ==================================================
  // formatWerkbonDate()
  // ==================================================

  QUnit.test(
    'formatWerkbonDate — keeps non-Date values unchanged',
    function (assert) {
      assert.equal(
        formatWerkbonDate('2024-01-05'),
        '2024-01-05'
      );

      assert.equal(formatWerkbonDate('05-01-2024'), '05-01-2024');
      assert.equal(formatWerkbonDate(12345), '12345');
    }
  );

  QUnit.test(
    'formatWerkbonDate — formats Date objects',
    function (assert) {
      const date = new Date(2024, 0, 5, 12, 0, 0);

      assert.equal(
        formatWerkbonDate(date),
        '05-01-2024'
      );
    }
  );

  // ==================================================
  // filterDataInMemory()
  // ==================================================

  QUnit.test(
    'filterDataInMemory — filters rows by Werkbon ID',
    function (assert) {
      const data = [
        ['Werkbon ID', 'Material', 'Price'],
        ['ENG-20260518-004', 'Paint', 10],
        ['ENG-20260518-005', 'Brush', 5],
        [' ENG-20260518-004 ', 'Primer', 15]
      ];

      const result = filterDataInMemory(
        data,
        'ENG-20260518-004'
      );

      assert.deepEqual(result, [
        ['ENG-20260518-004', 'Paint', 10],
        [' ENG-20260518-004 ', 'Primer', 15]
      ]);
    }
  );

  QUnit.test(
    'filterDataInMemory — returns empty array for empty input',
    function (assert) {
      assert.deepEqual(
        filterDataInMemory([], 'ENG-20260518-004'),
        []
      );

      assert.deepEqual(
        filterDataInMemory(null, 'ENG-20260518-004'),
        []
      );
    }
  );

  // ==================================================
  // filterCompleteMaterialRows
  // ==================================================

  QUnit.test("filterCompleteMaterialRows — removes incomplete material rows", function(assert) {
    const rows = [
      ['ENG-001', 'Paint', 12.5, 2, 25],
      ['ENG-001', '', 5, 1, 5],
      ['ENG-001', 'Brush', '', 1, ''],
      ['ENG-001', 'Tape', 3, '', ''],
    ];

    const result = filterCompleteMaterialRows(rows);

    assert.deepEqual(result, [
      ['ENG-001', 'Paint', 12.5, 2, 25],
    ]);
  });

  // ==================================================
  // getLocatieDataFast()
  // ==================================================

  QUnit.test(
    'getLocatieDataFast — finds location data by code',
    function (assert) {
      const locaties = [
        [
          'Code',
          'Unused 1',
          'Name',
          'Unused 3',
          'Unused 4',
          'Address',
          'Postcode',
          'City'
        ],
        [
          'A1',
          '',
          'Amsterdam Office',
          '',
          '',
          'Damrak 1',
          '1012LG',
          'Amsterdam'
        ],
        [
          'B2',
          '',
          'Rotterdam Office',
          '',
          '',
          'Coolsingel 1',
          '3012AG',
          'Rotterdam'
        ]
      ];

      assert.deepEqual(
        getLocatieDataFast(locaties, 'A1'),
        {
          naamLocatie: 'Amsterdam Office',
          adres: 'Damrak 1',
          postcode: '1012LG',
          woonplaats: 'Amsterdam'
        }
      );
    }
  );

  QUnit.test(
    'getLocatieDataFast — returns fallback for unknown code',
    function (assert) {
      const locaties = [
        [
          'Code',
          '',
          'Name',
          '',
          '',
          'Address',
          'Postcode',
          'City'
        ],
        [
          'A1',
          '',
          'Amsterdam Office',
          '',
          '',
          'Damrak 1',
          '1012LG',
          'Amsterdam'
        ]
      ];

      assert.deepEqual(
        getLocatieDataFast(locaties, 'X9'),
        {
          naamLocatie: 'X9',
          adres: '',
          postcode: '',
          woonplaats: ''
        }
      );
    }
  );

  // ==================================================
  // calculateTotalHours()
  // ==================================================

  QUnit.test(
    'calculateTotalHours — sums HH:MM duration values',
    function (assert) {
      const rows = [
        ['ID', '', '', '', '1:30'],
        ['ID', '', '', '', '0:45'],
        ['ID', '', '', '', '2:15']
      ];

      assert.equal(calculateTotalHours(rows), '4:30');
    }
  );

  QUnit.test(
    'calculateTotalHours — supports decimal hours',
    function (assert) {
      const rows = [
        ['ID', '', '', '', '1.5'],
        ['ID', '', '', '', '0.25']
      ];

      assert.equal(calculateTotalHours(rows), '1:45');
    }
  );

  QUnit.test(
    'calculateTotalHours — handles empty values',
    function (assert) {
      const rows = [
        ['ID', '', '', '', ''],
        ['ID', '', '', '', null]
      ];

      assert.equal(calculateTotalHours(rows), '0:00');
    }
  );

  // ==================================================
  // findWerkbonRowIndex()
  // ==================================================

  QUnit.test(
    'findWerkbonRowIndex — finds Werkbon row',
    function (assert) {
      const data = [
        ['Werkbon ID', 'Date'],
        ['ENG-20260518-004', '2026-05-18'],
        ['NDK-20260610-005', '2026-06-10']
      ];

      assert.equal(
        findWerkbonRowIndex(
          data,
          'ENG-20260518-004'
        ),
        1
      );

      assert.equal(
        findWerkbonRowIndex(
          data,
          'NDK-20260610-005'
        ),
        2
      );
    }
  );

  QUnit.test(
    'findWerkbonRowIndex — returns -1 for unknown ID',
    function (assert) {
      const data = [
        ['Werkbon ID', 'Date'],
        ['ENG-20260518-004', '2026-05-18']
      ];

      assert.equal(
        findWerkbonRowIndex(data, 'UNKNOWN-001'),
        -1
      );
    }
  );

  // ==================================================
  // buildWerkbonDescription()
  // ==================================================

  QUnit.test(
    'buildWerkbonDescription — combines multiline rows',
    function (assert) {
      const data = [
        [
          'ID',
          'Date',
          'Location',
          'Description',
          'Work'
        ],
        [
          'ENG-20260518-004',
          '2026-05-18',
          'A1',
          'Wall damaged',
          'Prepared surface'
        ],
        [
          '',
          '',
          '',
          'Additional damage',
          'Applied primer'
        ],
        [
          '',
          '',
          '',
          '',
          'Painted wall'
        ],
        [
          'ENG-20260519-005',
          '2026-05-19',
          'B2',
          'Other job',
          'Other work'
        ]
      ];

      assert.deepEqual(
        buildWerkbonDescription(data, 1),
        {
          omschrijvingText:
            'Wall damaged\nAdditional damage',
          werkzaamhedenText:
            'Prepared surface\nApplied primer\nPainted wall'
        }
      );
    }
  );

  // ==================================================
  // parseOpenAIReceiptResponse() - updated for structured return
  // ==================================================

  QUnit.test(
    'parseOpenAIReceiptResponse — returns structured object with items',
    function (assert) {
      const materials = [
        { name: 'Primer', quantity: 2, price: 12.5 }
      ];

      const response = createMockOpenAIResponse(JSON.stringify(materials));

      const result = parseOpenAIReceiptResponse(response);
      assert.ok(Array.isArray(result.items));
      assert.deepEqual(result.items, [
        { name: 'Primer', quantity: 2, unitPrice: 12.5, lineTotal: 25, price: 12.5 }
      ]);
      assert.deepEqual(result.additionalCosts, []);
    }
  );

  QUnit.test(
    'parseOpenAIReceiptResponse — accepts materials wrapper',
    function (assert) {
      const materials = [{ name: 'Paint', quantity: 1, price: 35 }];

      const response = createMockOpenAIResponse(
        JSON.stringify({ materials: materials })
      );

      const result = parseOpenAIReceiptResponse(response);
      assert.equal(result.items.length, 1);
      assert.equal(result.items[0].name, 'Paint');
    }
  );

  QUnit.test(
    'parseOpenAIReceiptResponse — removes markdown fences',
    function (assert) {
      const response = createMockOpenAIResponse(
        '```json\n' +
        '[{"name":"Primer","quantity":1,"price":10}]\n' +
        '```'
      );

      const result = parseOpenAIReceiptResponse(response);
      assert.equal(result.items[0].name, 'Primer');
    }
  );

  QUnit.test(
    'parseOpenAIReceiptResponse — accepts multi-line items with unitPrice and lineTotal',
    function (assert) {
      const response = createMockOpenAIResponse(
        JSON.stringify([
          {
            name: 'Schüt Aqua2save handd 4stnd wstop chr',
            quantity: 1,
            unitPrice: 16.99,
            lineTotal: 16.99
          },
          {
            name: 'Saniv plugbekersifon 5/4x32mm chr',
            quantity: 2,
            unitPrice: 29.89,
            lineTotal: 59.78
          }
        ])
      );

      const result = parseOpenAIReceiptResponse(response);
      assert.equal(result.items.length, 2);
      assert.equal(result.items[0].price, 16.99);
      assert.equal(result.items[1].price, 29.89);
    }
  );

  // ==================================================
  // normalizeAndAggregateReceiptData()
  // ==================================================

  QUnit.test(
    'normalizeAndAggregateReceiptData — keeps product items as printed (no per-line VAT)',
    function (assert) {
      const raw = {
        items: [
          { name: 'Lamp', quantity: 2, unitPrice: 4.60, lineTotal: 9.20 }
        ],
        additionalCosts: [],
        vat: { rate: 0.21, amount: 3.00 },
        totals: { exclVAT: 14.29, inclVAT: 17.29 }
      };

      const result = normalizeAndAggregateReceiptData(raw);

      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0].name, 'Lamp');
      assert.equal(result.rows[0].price, 4.60);
      // Total should still be based on printed product value
      assert.ok(Math.abs(result.finalSum - 9.20) < 0.01);
      assert.equal(result.documentTotalInclVat, 17.29);
    }
  );

  QUnit.test(
    'normalizeAndAggregateReceiptData — aggregates fees and shipping using printed amounts (no cross-category VAT)',
    function (assert) {
      const raw = {
        items: [
          { name: 'Material', quantity: 1, unitPrice: 9.20, lineTotal: 9.20 }
        ],
        additionalCosts: [
          { name: 'Verwijderingsbijdrage', type: 'fee', amount: 0.14 },
          { name: 'Vrachtkosten', type: 'shipping', amount: 4.95 }
        ],
        vat: { rate: 0.21, amount: 3.00 },
        totals: { exclVAT: 14.29, inclVAT: 17.29 }
      };

      const result = normalizeAndAggregateReceiptData(raw);

      // Should have 1 material + 2 aggregated rows
      assert.equal(result.rows.length, 3);

      const toeslagen = result.rows.find(r => r.name === 'Toeslagen');
      const vracht = result.rows.find(r => r.name === 'Vrachtkosten');

      assert.ok(toeslagen, 'Toeslagen row should exist');
      assert.ok(vracht, 'Vrachtkosten row should exist');

      // Must use printed amounts — no VAT from materials may be given to additional categories
      assert.ok(Math.abs(toeslagen.price - 0.14) < 0.01);
      assert.ok(Math.abs(vracht.price - 4.95) < 0.01);

      // Final sum uses printed values (reconciles to exclVAT when available)
      assert.ok(Math.abs(result.finalSum - 14.29) < 0.01);
      assert.ok(result.reconciled);
      assert.equal(result.documentTotalInclVat, 17.29);
    }
  );

  QUnit.test(
    'normalizeAndAggregateReceiptData — excludes discounts and payment metadata',
    function (assert) {
      const raw = {
        items: [{ name: 'Screw', quantity: 10, unitPrice: 0.5, lineTotal: 5.00 }],
        additionalCosts: [
          { name: 'Korting', type: 'discount_or_reward', amount: -2.00 }, // should be ignored
          { name: 'Reeds betaald', type: 'payment_information', amount: 10.00 }
        ],
        vat: null,
        totals: { inclVAT: 5.00 }
      };

      const result = normalizeAndAggregateReceiptData(raw);

      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0].name, 'Screw');
      assert.equal(result.documentTotalInclVat, 5.00);
    }
  );

  QUnit.test(
    'normalizeAndAggregateReceiptData — fails reconciliation when totals cannot be matched',
    function (assert) {
      const raw = {
        items: [{ name: 'Item', quantity: 1, unitPrice: 10, lineTotal: 10 }],
        additionalCosts: [],
        vat: { amount: 2 },
        totals: { inclVAT: 999.99 }   // deliberately wrong
      };

      const result = normalizeAndAggregateReceiptData(raw);

      assert.notOk(result.reconciled);
    }
  );

  QUnit.test(
    'stripQuantityPrefix — removes leading quantity from names',
    function (assert) {
      assert.equal(stripQuantityPrefix('1 Tiger doucheglijstang chr'), 'Tiger doucheglijstang chr');
      assert.equal(stripQuantityPrefix('2x LED bulb'), 'LED bulb');
      assert.equal(stripQuantityPrefix('10 - Screw set'), 'Screw set');
      assert.equal(stripQuantityPrefix('CorePro LED'), 'CorePro LED');
      assert.equal(stripQuantityPrefix('  3×  Item '), 'Item');
    }
  );

  // ==================================================
  // calculateMaterialTotalFromRows() - new for column G support
  // ==================================================

  QUnit.test(
    'calculateMaterialTotalFromRows — legacy rows (no receiptKey) use column E',
    function (assert) {
      const rows = [
        ['ID', 'Item1', 10, 1, 10, '', ''],           // no receiptKey, use E=10
        ['ID', 'Item2', 20, 1, 20, '', '']            // no receiptKey, use E=20
      ];

      assert.equal(calculateMaterialTotalFromRows(rows), 30);
    }
  );

  QUnit.test(
    'calculateMaterialTotalFromRows — uses G when present (only once)',
    function (assert) {
      const rows = [
        ['ID', 'Item1', 10, 1, 10, 'REC-001', ''],
        ['ID', 'Item2', 15, 1, 15, 'REC-001', 44.28]   // G on last row
      ];

      assert.equal(calculateMaterialTotalFromRows(rows), 44.28);
    }
  );

  QUnit.test(
    'calculateMaterialTotalFromRows — falls back to SUM(E) when no G for receiptKey',
    function (assert) {
      const rows = [
        ['ID', 'Item1', 10, 1, 10, 'REC-001', ''],
        ['ID', 'Item2', 15, 1, 15, 'REC-001', '']
      ];

      assert.equal(calculateMaterialTotalFromRows(rows), 25);
    }
  );

  QUnit.test(
    'calculateMaterialTotalFromRows — mixed legacy + receiptKey groups',
    function (assert) {
      const rows = [
        ['ID', 'Legacy', 5, 1, 5, '', ''],            // legacy
        ['ID', 'Mat1', 10, 1, 10, 'REC-001', ''],
        ['ID', 'Mat2', 12, 1, 12, 'REC-001', 22.5]    // G wins for group
      ];

      assert.equal(calculateMaterialTotalFromRows(rows), 5 + 22.5);
    }
  );

  QUnit.test(
    'calculateMaterialTotalFromRows — identical duplicate G logs warning and uses once',
    function (assert) {
      const rows = [
        ['ID', 'A', 10, 1, 10, 'REC-DUP', 30],
        ['ID', 'B', 20, 1, 20, 'REC-DUP', 30]
      ];

      // Should use 30 once
      assert.equal(calculateMaterialTotalFromRows(rows), 30);
    }
  );

  QUnit.test(
    'calculateMaterialTotalFromRows — conflicting G values logs error and does not silently choose',
    function (assert) {
      const rows = [
        ['ID', 'A', 10, 1, 10, 'REC-CONF', 30],
        ['ID', 'B', 20, 1, 20, 'REC-CONF', 35]
      ];

      // Falls back to eSum (30) because of conflict
      const result = calculateMaterialTotalFromRows(rows);
      assert.equal(result, 30);
    }
  );

  QUnit.start();

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
