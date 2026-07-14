// =========================================================================
// RECEIPT PROCESSING
// =========================================================================

/**
 * Scans the receipts Drive folder and extracts receipt data with OpenAI Vision.
 */
function processNewReceipts() {
  const spreadsheetId = getRequiredConfigValue(CONFIG.spreadsheetId, 'SPREADSHEET_ID');
  const receiptsFolderId = getRequiredConfigValue(
    CONFIG.openAIReceiptsFolderId,
    'OPENAI_RECEIPTS_FOLDER_ID'
  );

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const generalSheet = ss.getSheetByName(SHEETS.werkbonnen);
  const matSheet = ss.getSheetByName(SHEETS.materialen);

  if (!generalSheet || !matSheet) {
    console.error("The 'Werkbonnen' or 'Werkbon_Materialen' sheet was not found!");
    return;
  }

  const bonId = getSelectedWerkbonId(generalSheet);
  console.log(`Successfully identified the target order ID: ${bonId}`);

  const fileToProcess = findNextReceiptImage(receiptsFolderId);

  if (!fileToProcess) {
    console.log('No unprocessed receipt image was found.');
    return;
  }

  const originalName = fileToProcess.getName();
  console.log('--- Started processing file for order ' + bonId + ': ' + originalName + ' ---');

  try {
    console.log('Sending the image to OpenAI...');
    const materials = analyzeReceiptWithOpenAI(fileToProcess);
    console.log('The AI successfully returned this many items: ' + (materials ? materials.length : 0));

    appendMaterialsToSheet(matSheet, bonId, materials);

    fileToProcess.setName(RECEIPTS.processedPrefix + originalName);
    console.log(
      'File ' + originalName +
      ' was successfully processed. The data was added to order ' + bonId + '.'
    );
  } catch (error) {
    console.error('Critical error while processing file ' + originalName + ': ' + error.message);
  }
}

function getSelectedWerkbonId(generalSheet) {
  const editorTestWerkbonId = cleanId(CONFIG.editorTestWerkbonId);
  const activeCell = getActiveCellForWerkbonSheet(generalSheet);

  if (activeCell) {
    const activeRow = activeCell.getRow();

    if (activeRow >= 2) {
      const rawBonId = generalSheet.getRange(activeRow, 1).getValue();
      let bonId = cleanId(rawBonId);

      if (bonId === '') {
        bonId = cleanId(activeCell.getValue());
      }

      if (bonId && bonId.indexOf('Date') === -1) {
        return bonId;
      }

      if (!editorTestWerkbonId) {
        throw new Error(`Error: No valid ID was found in row ${activeRow} of the 'Werkbonnen' sheet!`);
      }
    }
  }

  if (editorTestWerkbonId) {
    console.log(`Using EDITOR_TEST_WERKBON_ID for this run: ${editorTestWerkbonId}`);
    return editorTestWerkbonId;
  }

  throw new Error(
    "No active Werkbon row is available. Open the spreadsheet, select a row on the 'Werkbonnen' sheet, " +
    'and run the workflow from the custom menu. If you run from the Apps Script editor, set ' +
    'the EDITOR_TEST_WERKBON_ID script property first.'
  );
}

function getActiveCellForWerkbonSheet(generalSheet) {
  try {
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    if (activeSpreadsheet) {
      const activeSheet = activeSpreadsheet.getActiveSheet();

      if (activeSheet && activeSheet.getName() === SHEETS.werkbonnen) {
        const activeRange = activeSheet.getActiveRange();

        if (activeRange) {
          return activeRange.getCell(1, 1);
        }
      }
    }
  } catch (e) {}

  try {
    const sheetActiveCell = generalSheet.getActiveCell();

    if (sheetActiveCell) {
      return sheetActiveCell;
    }
  } catch (e) {}

  return null;
}

function findNextReceiptImage(receiptsFolderId) {
  const folder = DriveApp.getFolderById(receiptsFolderId);
  const files = folder.getFiles();

  while (files.hasNext()) {
    const nextFile = files.next();
    const mimeType = nextFile.getMimeType();
    const isUnprocessed = nextFile.getName().indexOf(RECEIPTS.processedPrefix.trim()) === -1;
    const isImage = mimeType.indexOf('image/') !== -1;

    if (isUnprocessed && isImage) {
      return nextFile;
    }
  }

  return null;
}

function appendMaterialsToSheet(matSheet, bonId, materials) {
  if (!materials || materials.length === 0) {
    console.log('No material rows were returned by OpenAI.');
    return;
  }

  materials.forEach(function(item) {
    matSheet.appendRow([
      bonId,
      item.name,
      Number(item.price),
      Number(item.quantity),
      Number(item.quantity * item.price),
    ]);
  });
}


