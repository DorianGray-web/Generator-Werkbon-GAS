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
  // parseOpenAIReceiptResponse()
  // ==================================================

  QUnit.test(
    'parseOpenAIReceiptResponse — parses direct material array',
    function (assert) {
      const materials = [
        {
          name: 'Primer',
          quantity: 2,
          price: 12.5
        }
      ];

      const response = createMockOpenAIResponse(
        JSON.stringify(materials)
      );

      assert.deepEqual(
        parseOpenAIReceiptResponse(response),
        materials
      );
    }
  );

  QUnit.test(
    'parseOpenAIReceiptResponse — accepts materials wrapper',
    function (assert) {
      const materials = [
        {
          name: 'Paint',
          quantity: 1,
          price: 35
        }
      ];

      const response = createMockOpenAIResponse(
        JSON.stringify({
          materials: materials
        })
      );

      assert.deepEqual(
        parseOpenAIReceiptResponse(response),
        materials
      );
    }
  );

  QUnit.test(
    'parseOpenAIReceiptResponse — accepts items wrapper',
    function (assert) {
      const items = [
        {
          name: 'Brush',
          quantity: 3,
          price: 4.5
        }
      ];

      const response = createMockOpenAIResponse(
        JSON.stringify({
          items: items
        })
      );

      assert.deepEqual(
        parseOpenAIReceiptResponse(response),
        items
      );
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

      assert.deepEqual(
        parseOpenAIReceiptResponse(response),
        [
          {
            name: 'Primer',
            quantity: 1,
            price: 10
          }
        ]
      );
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