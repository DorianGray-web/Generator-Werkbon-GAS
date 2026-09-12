// =========================================================================
// WERKBON PDF GENERATION
// =========================================================================

async function generateWerkbon(spreadsheet) {
  return generateWerkbonWithDependencies_(spreadsheet, {
    getConfigValue: getRequiredConfigValue,
    getActiveSpreadsheet: function () {
      return SpreadsheetApp.getActiveSpreadsheet();
    },
    showMessage: function (message) { return Browser.msgBox(message); },
    getFolderById: function (folderId) { return DriveApp.getFolderById(folderId); },
    getFileById: function (fileId) { return DriveApp.getFileById(fileId); },
    openDocumentById: function (fileId) { return DocumentApp.openById(fileId); },
    loadContext: loadWerkbonContext,
    populateDocument: populateWerkbonDocument,
    exportPdf: exportWerkbonPdf,
  });
}

async function generateWerkbonWithDependencies_(spreadsheet, dependencies) {
  const templateDocId = dependencies.getConfigValue(
    CONFIG.templateDocId,
    'TEMPLATE_DOC_ID'
  );
  const pdfOutputFolderId = dependencies.getConfigValue(
    CONFIG.pdfOutputFolderId,
    'PDF_OUTPUT_FOLDER_ID'
  );

  const ss = spreadsheet || dependencies.getActiveSpreadsheet();

  if (!ss) {
    throw new Error("No spreadsheet available. generateWerkbon() was called without a spreadsheet argument and SpreadsheetApp.getActiveSpreadsheet() returned null (common in editor context).");
  }

  const generalSheet = ss.getSheetByName(SHEETS.werkbonnen);

  if (!generalSheet) {
    return dependencies.showMessage("The 'Werkbonnen' sheet was not found!");
  }

  const context = dependencies.loadContext(ss, generalSheet);

  if (!context) {
    return;
  }

  console.time('Step 2: Copy the template and open the document');
  const outputFolder = dependencies.getFolderById(pdfOutputFolderId);
  const tempCopy = dependencies
    .getFileById(templateDocId)
    .makeCopy(`Werkbon_${context.bonId}`, outputFolder);
  const tempCopyId = tempCopy.getId();
  const doc = dependencies.openDocumentById(tempCopyId);
  const body = doc.getBody();
  console.timeEnd('Step 2: Copy the template and open the document');

  dependencies.populateDocument(body, context);

  console.time('Step 6: Save document changes (doc.saveAndClose)');
  doc.saveAndClose();
  console.timeEnd('Step 6: Save document changes (doc.saveAndClose)');

  await dependencies.exportPdf(
    tempCopyId,
    outputFolder,
    context.bonId,
    context.rawMatRows
  );
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
    rawMatRows: relatedRows.rawMatRows,
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

  const bonMatchedMatRows = filterDataInMemory(rawMatRows, bonId);

  return {
    urenRows: filterDataInMemory(rawUrenRows, bonId),
    rawMatRows: bonMatchedMatRows || [],
    matRows: filterCompleteMaterialRows(bonMatchedMatRows || []),
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

  const totalMateriaal = calculateMaterialTotalFromRows(context.matRows);
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

  console.log(`Populating tables - Uren rows: ${urenRows.length}, Materials rows: ${matRows.length}`);

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
    { tag: '{{m_btw}}', col: 6, cellIndex: 4, isEuro: true, isOptionalDocumentTotal: true }
  ]);
}

async function exportWerkbonPdf(tempCopyId, outputFolder, bonId, materialRows) {
  return exportWerkbonPdfWithDependencies_(
    tempCopyId,
    outputFolder,
    bonId,
    materialRows,
    {
      getOAuthToken: function () { return ScriptApp.getOAuthToken(); },
      fetch: function (url, options) { return UrlFetchApp.fetch(url, options); },
      buildPackage: buildWerkbonPdfPackage,
      getFileById: function (fileId) { return DriveApp.getFileById(fileId); },
    }
  );
}

async function exportWerkbonPdfWithDependencies_(
  tempCopyId,
  outputFolder,
  bonId,
  materialRows,
  dependencies
) {
  console.time('Step 7: ULTRA-FAST PDF EXPORT USING DIRECT DOWNLOAD');

  let primaryError = null;

  try {
    const url = `https://docs.google.com/document/d/${tempCopyId}/export?format=pdf`;
    const token = dependencies.getOAuthToken();
    const response = dependencies.fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('PDF export failed: ' + response.getContentText());
    }

    const werkbonPdfBlob = response.getBlob();
    const finalBlob = await dependencies.buildPackage({
      bonId,
      werkbonPdfBlob,
      materialRows,
    });
    finalBlob.setName(`Werkbon_${bonId}.pdf`);
    outputFolder.createFile(finalBlob);
    console.log('PDF successfully exported and saved.');
  } catch (error) {
    primaryError = error;
    console.error('PDF export error: ' + error.message);
  } finally {
    try {
      dependencies.getFileById(tempCopyId).setTrashed(true);
      console.log('Temporary document cleaned up.');
    } catch (cleanupError) {
      console.error('Could not delete temp doc: ' + cleanupError.message);
      if (!primaryError) {
        primaryError = cleanupError;
      }
    }
    console.timeEnd('Step 7: ULTRA-FAST PDF EXPORT USING DIRECT DOWNLOAD');
  }

  if (primaryError) {
    throw primaryError;
  }
}
