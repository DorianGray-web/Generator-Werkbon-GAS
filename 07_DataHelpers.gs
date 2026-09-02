// =========================================================================
// DATA AND FORMATTING HELPERS
// =========================================================================

function filterDataInMemory(dataMatrix, id) {
  if (!dataMatrix || dataMatrix.length === 0) {
    console.log('No data rows available for filtering.');
    return [];
  }

  const targetId = cleanId(id);
  console.log(`=== START FULL-DATASET FILTERING FOR ID: [${targetId}] ===`);
  console.log(`Total rows to analyze on the sheet: ${dataMatrix.length}`);

  const filtered = [];

  for (let i = 1; i < dataMatrix.length; i++) {
    const row = dataMatrix[i];

    if (!row || row.length === 0) continue;

    const rowId = cleanId(row[0]);

    if (rowId === targetId) {
      filtered.push(row);
    }
  }

  console.log(`=== FULL-DATASET FILTERING FINISHED. MATCHED ROWS: ${filtered.length} ===`);
  return filtered;
}

function filterCompleteMaterialRows(rows) {
  return rows.filter(function(row) {
    const name = String(row[1] || '').trim();
    const rawPrice = row[2];
    const rawQuantity = row[3];

    const price = Number(rawPrice);
    const quantity = Number(rawQuantity);

    return (
      name !== '' &&
      rawPrice !== '' &&
      rawPrice !== null &&
      rawPrice !== undefined &&
      Number.isFinite(price) &&
      price >= 0 &&
      rawQuantity !== '' &&
      rawQuantity !== null &&
      rawQuantity !== undefined &&
      Number.isFinite(quantity) &&
      quantity > 0
    );
  });
}

function cleanId(value) {
  if (value === null || value === undefined) return '';

  const str = value.toString().replace(/[\s\u00A0]+/g, '').trim();

  if (!isNaN(str) && str.indexOf('.') !== -1 && !isNaN(parseFloat(str))) {
    if (parseFloat(str) === Math.floor(parseFloat(str))) {
      return Math.floor(parseFloat(str)).toString();
    }
  }

  return str;
}

/**
 * Generates a stable key for each receipt to isolate processing and prevent
 * one receipt from overwriting another when multiple unrecognized receipts exist.
 */
function generateReceiptKey(filename) {
  const name = String(filename || '').trim();
  const cleanName = name.replace(RECEIPTS.processedPrefix || '', '').replace(/[^a-zA-Z0-9]/g, '');
  return cleanName || 'unknown-' + Date.now();
}

function getLocatieDataFast(locatiesData, code) {
  const defaultResult = {
    naamLocatie: code,
    adres: '',
    postcode: '',
    woonplaats: '',
  };

  if (!locatiesData || locatiesData.length < 2) {
    return defaultResult;
  }

  const targetCode = cleanId(code);

  for (let i = 1; i < locatiesData.length; i++) {
    if (cleanId(locatiesData[i][0]) === targetCode) {
      return {
        naamLocatie: locatiesData[i][2] || '',
        adres: locatiesData[i][5] || '',
        postcode: locatiesData[i][6] || '',
        woonplaats: locatiesData[i][7] || '',
      };
    }
  }

  return defaultResult;
}

function appendAanvullingen(body, rows) {
  if (!body || !rows || rows.length === 0) {
    console.log('appendAanvullingen: the document body is empty or there are no additional rows.');
    return;
  }

  body.appendParagraph('Aanvullingen')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  const werkzaamheden = rows.filter(row => row[1].toString().trim() === 'Werkzaamheden');
  const opmerkingen = rows.filter(row => row[1].toString().trim() === 'Opmerking');
  const bijlagen = rows.filter(row => row[1].toString().trim() === 'Bijlage');

  appendAanvullingenSection(body, werkzaamheden, 'Uitgevoerde werkzaamheden', true);
  appendAanvullingenSection(body, opmerkingen, 'Opmerkingen:', false);
  appendAanvullingenSection(body, bijlagen, 'Bijlagen:', false);
}

function appendAanvullingenSection(body, rows, title, asBullets) {
  if (!rows || rows.length === 0) {
    return;
  }

  body.appendParagraph('');
  body.appendParagraph(title)
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  rows.forEach(row => {
    const paragraph = body.appendParagraph(row[2]);

    if (asBullets) {
      paragraph.setBullet(true);
    }
  });
}

function calculateTotalHours(urenRows) {
  let totalMinutes = 0;

  urenRows.forEach(row => {
    const durationStr = row[4] ? row[4].toString().trim() : '';

    if (durationStr.indexOf(':') !== -1) {
      const parts = durationStr.split(':');
      totalMinutes += (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    } else {
      totalMinutes += Math.round((parseFloat(durationStr) || 0) * 60);
    }
  });

  const finalHours = Math.floor(totalMinutes / 60);
  const finalMinutes = totalMinutes % 60;

  return `${finalHours}:${finalMinutes < 10 ? '0' : ''}${finalMinutes}`;
}

function formatWerkbonDate(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd-MM-yyyy');
  }

  return value.toString();
}

function formatEuro(value) {
  if (value === null || value === undefined || value === '') return '€ 0,00';

  const number = Number(value);

  if (isNaN(number)) {
    return value.toString();
  }

  return '€ ' + number.toFixed(2).replace('.', ',');
}

function formatOptionalDocumentTotal(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return formatEuro(value);
}

/**
 * Calculates TotalMateriaal respecting the new column G (documentTotalInclVat) rules.
 * - Rows without receiptKey (legacy): use column E directly.
 * - Group by receiptKey:
 *   - If G present: use G (once per group).
 *   - If no G: use SUM(E) for the group.
 * - Duplicate G handling:
 *   - Identical duplicates: log warning, use once.
 *   - Conflicting values: log error, do not silently choose one (falls back to SUM(E)).
 */
function calculateMaterialTotalFromRows(matRows) {
  if (!Array.isArray(matRows) || matRows.length === 0) {
    return 0;
  }

  let total = 0;
  const groups = {};

  matRows.forEach(function(row) {
    const receiptKey = row[5] ? String(row[5]).trim() : '';
    const eValue = Number(row[4]) || 0;
    const gRaw = (row.length > 6) ? row[6] : undefined;
    const gValue = (gRaw !== undefined && gRaw !== '' && gRaw !== null) ? Number(gRaw) : NaN;

    if (!receiptKey) {
      total += eValue;
      return;
    }

    if (!groups[receiptKey]) {
      groups[receiptKey] = { eSum: 0, gValues: [] };
    }

    groups[receiptKey].eSum += eValue;

    if (Number.isFinite(gValue) && gValue > 0) {
      groups[receiptKey].gValues.push(gValue);
    }
  });

  Object.keys(groups).forEach(function(key) {
    const g = groups[key];

    if (g.gValues.length > 0) {
      // Deduplicate for comparison
      const uniqueGs = [];
      g.gValues.forEach(function(v) {
        if (uniqueGs.indexOf(v) === -1) uniqueGs.push(v);
      });

      if (uniqueGs.length > 1) {
        console.error('Conflicting document totals (column G) for receiptKey ' + key + ': ' + uniqueGs.join(', '));
        // Validation error: do not silently pick one. Fall back to eSum.
        total += g.eSum;
      } else {
        if (g.gValues.length > 1) {
          console.warn('Duplicate identical G values for receiptKey ' + key + '. Using once.');
        }
        total += uniqueGs[0];
      }
    } else {
      total += g.eSum;
    }
  });

  return Math.round(total * 100) / 100;
}

function safeToast(spreadsheet, message, title, timeoutSeconds) {
  try {
    if (spreadsheet && typeof spreadsheet.toast === 'function') {
      spreadsheet.toast(message, title, timeoutSeconds);
    }
  } catch (e) {
    console.log('Notification skipped (non-UI / editor context): ' + (e && e.message ? e.message : e));
  }
}
