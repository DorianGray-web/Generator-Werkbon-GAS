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
