// =========================================================================
// WERKBON PDF GENERATION
// =========================================================================

function generateWerkbon() {
  const templateDocId = getRequiredConfigValue(CONFIG.templateDocId, 'TEMPLATE_DOC_ID');
  const pdfOutputFolderId = getRequiredConfigValue(CONFIG.pdfOutputFolderId, 'PDF_OUTPUT_FOLDER_ID');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const generalSheet = ss.getSheetByName(SHEETS.werkbonnen);

  if (!generalSheet) {
    return Browser.msgBox("The 'Werkbonnen' sheet was not found!");
  }

  const context = loadWerkbonContext(ss, generalSheet);

  if (!context) {
    return;
  }

  console.time('Step 2: Copy the template and open the document');
  const outputFolder = DriveApp.getFolderById(pdfOutputFolderId);
  const tempCopy = DriveApp
    .getFileById(templateDocId)
    .makeCopy(`Werkbon_${context.bonId}`, outputFolder);
  const tempCopyId = tempCopy.getId();
  const doc = DocumentApp.openById(tempCopyId);
  const body = doc.getBody();
  console.timeEnd('Step 2: Copy the template and open the document');

  populateWerkbonDocument(body, context);

  console.time('Step 6: Save document changes (doc.saveAndClose)');
  doc.saveAndClose();
  console.timeEnd('Step 6: Save document changes (doc.saveAndClose)');

  exportWerkbonPdf(ss, tempCopy, tempCopyId, outputFolder, context.bonId);
}

function loadWerkbonContext(ss, generalSheet) {
  console.time('Step 1: Load and filter data in memory');
  const bonId = getSelectedWerkbonId(generalSheet);

  const allData = generalSheet.getDataRange().getValues();
  const startRowIndex = findWerkbonRowIndex(allData, bonId);

  if (startRowIndex === -1) {
    console.timeEnd('Step 1: Load and filter data in memory');
    Browser.msgBox(`Error: ID ${bonId} was not found in column A of the Werkbonnen sheet.`);
    return null;
  }

  const context = buildWerkbonContext(ss, generalSheet, allData, startRowIndex, bonId);
  console.timeEnd('Step 1: Load and filter data in memory');

  return context;
}

function findWerkbonRowIndex(allData, bonId) {
  for (let i = 1; i < allData.length; i++) {
    if (cleanId(allData[i][0]) === bonId) {
      return i;
    }
  }

  return -1;
}

function buildWerkbonContext(ss, generalSheet, allData, startRowIndex, bonId) {
  const datumRaw = allData[startRowIndex][1];
  const locatie = allData[startRowIndex][2];

  const locatiesSheet = ss.getSheetByName(SHEETS.locaties);
  const locatiesData = locatiesSheet ? locatiesSheet.getDataRange().getValues() : [];
  const locatieData = getLocatieDataFast(locatiesData, locatie);

  const relatedRows = loadRelatedWerkbonRows(ss, bonId);
  const description = buildWerkbonDescription(allData, startRowIndex);

  return {
    bonId,
    datumFormatted: formatWerkbonDate(datumRaw),
    locatieData,
    totaalUrenFormatted: generalSheet.getRange(startRowIndex + 1, 6).getDisplayValue(),
    urenRows: relatedRows.urenRows,
    matRows: relatedRows.matRows,
    aanvullingenRows: relatedRows.aanvullingenRows,
    omschrijvingText: description.omschrijvingText,
    werkzaamhedenText: description.werkzaamhedenText,
  };
}

function loadRelatedWerkbonRows(ss, bonId) {
  const urenSheet = ss.getSheetByName(SHEETS.uren);
  const matSheet = ss.getSheetByName(SHEETS.materialen);
  const aanvSheet = ss.getSheetByName(SHEETS.aanvullingen);

  const rawUrenRows = getSheetDataOrEmpty(urenSheet, true);
  const rawMatRows = getSheetDataOrEmpty(matSheet, false);
  const rawAanvRows = getSheetDataOrEmpty(aanvSheet, false);

  return {
    urenRows: filterDataInMemory(rawUrenRows, bonId),
    matRows: filterDataInMemory(rawMatRows, bonId),
    aanvullingenRows: filterDataInMemory(rawAanvRows, bonId),
  };
}

function getSheetDataOrEmpty(sheet, useDisplayValues) {
  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
  return useDisplayValues ? range.getDisplayValues() : range.getValues();
}

function buildWerkbonDescription(allData, startRowIndex) {
  let endRowIndex = startRowIndex;

  while (
    endRowIndex + 1 < allData.length &&
    allData[endRowIndex + 1] &&
    allData[endRowIndex + 1][0] === ''
  ) {
    endRowIndex++;
    if (endRowIndex > startRowIndex + 100) break;
  }

  const omschrijvingLines = [];
  const werkzaamhedenLines = [];

  for (let i = startRowIndex; i <= endRowIndex; i++) {
    if (allData[i][3] && allData[i][3].toString().trim() !== '') {
      omschrijvingLines.push(allData[i][3]);
    }

    if (allData[i][4] && allData[i][4].toString().trim() !== '') {
      werkzaamhedenLines.push(allData[i][4]);
    }
  }

  return {
    omschrijvingText: omschrijvingLines.join('\n'),
    werkzaamhedenText: werkzaamhedenLines.join('\n'),
  };
}

function populateWerkbonDocument(body, context) {
  console.time('Step 3: Replace individual text tags');
  body.replaceText('{{WerkbonID}}', context.bonId);
  body.replaceText('{{Datum}}', context.datumFormatted);
  body.replaceText('{{NaamLocatie}}', context.locatieData.naamLocatie);
  body.replaceText('{{Adres}}', context.locatieData.adres);
  body.replaceText('{{Postcode}}', context.locatieData.postcode);
  body.replaceText('{{Woonplaats}}', context.locatieData.woonplaats);

  const totalMateriaal = context.matRows.reduce((sum, row) => sum + (Number(row[4]) || 0), 0);
  body.replaceText('{{TotalMateriaal}}', formatEuro(totalMateriaal));
  console.timeEnd('Step 3: Replace individual text tags');

  console.time('Step 4: Populate dynamic tables (Uren / Materialen)');
  populateWerkbonTables(body, context.urenRows, context.matRows);
  console.timeEnd('Step 4: Populate dynamic tables (Uren / Materialen)');

  console.time('Step 5: Process card tables (Omschrijving / Werkzaamheden)');
  body.replaceText('{{Omschrijving}}', context.omschrijvingText || 'Geen omschrijving.');
  body.replaceText('{{Werkzaamheden}}', context.werkzaamhedenText || 'Geen werkzaamheden uitgevoerd.');

  if (context.aanvullingenRows.length > 0) {
    body.appendPageBreak();
    appendAanvullingen(body, context.aanvullingenRows);
  }

  body.replaceText('{{TotalUren}}', context.totaalUrenFormatted || calculateTotalHours(context.urenRows));
  console.timeEnd('Step 5: Process card tables (Omschrijving / Werkzaamheden)');
}

function populateWerkbonTables(body, urenRows, matRows) {
  const tables = body.getTables();

  if (tables.length < 4) {
    Browser.msgBox('Error: The document template must contain at least four tables!');
    throw new Error('The document template must contain at least four tables.');
  }

  fillTableRowsFast(tables[DOCUMENT_TABLE_INDEX.uren], urenRows, [
    { tag: '{{u_datum}}', col: 1, cellIndex: 0 },
    { tag: '{{u_hours}}', col: 4, cellIndex: 1 },
    { tag: '{{u_van}}', col: 2, cellIndex: 2 },
    { tag: '{{u_tot}}', col: 3, cellIndex: 3 },
  ]);

  fillTableRowsFast(tables[DOCUMENT_TABLE_INDEX.materialen], matRows, [
    { tag: '{{m_name}}', col: 1, cellIndex: 0 },
    { tag: '{{m_price}}', col: 2, cellIndex: 1, isEuro: true },
    { tag: '{{m_qty}}', col: 3, cellIndex: 2 },
    { tag: '{{m_total}}', col: 4, cellIndex: 3, isEuro: true },
  ]);
}

function exportWerkbonPdf(ss, tempCopy, tempCopyId, outputFolder, bonId) {
  console.time('Step 7: ULTRA-FAST PDF EXPORT USING DIRECT DOWNLOAD');

  try {
    const url = `https://docs.google.com/document/d/${tempCopyId}/export?format=pdf`;
    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('The export system returned status code ' + response.getResponseCode());
    }

    const pdfBlob = response.getBlob().setName(`Werkbon_${bonId}.pdf`);
    outputFolder.createFile(pdfBlob);
    console.timeEnd('Step 7: ULTRA-FAST PDF EXPORT USING DIRECT DOWNLOAD');

    Drive.Files.remove(tempCopyId);
    ss.toast(`Werkbon ${bonId} was generated in seconds!`);
  } catch (e) {
    console.timeEnd('Step 7: ULTRA-FAST PDF EXPORT (FAILED; FALLING BACK TO STANDARD MODE)');
    exportWerkbonPdfFallback(ss, tempCopy, outputFolder, bonId);
  }
}

function exportWerkbonPdfFallback(ss, tempCopy, outputFolder, bonId) {
  try {
    const pdfBlob = tempCopy.getAs(MimeType.PDF);
    outputFolder.createFile(pdfBlob).setName(`Werkbon_${bonId}.pdf`);
    tempCopy.setTrashed(true);
    ss.toast('Generated successfully (standard mode).');
  } catch (err) {
    ss.toast('Failed to create the PDF. The Docs file was kept in the folder.', 'Warning', 10);
  }
}
