// =========================================================================
// RECEIPT PROCESSING
// =========================================================================

/**
 * Scans the receipts Drive folder and extracts receipt data with OpenAI Vision.
 * Now supports processing multiple unrecognized receipts in one run.
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

  const filesToProcess = findAllUnprocessedReceipts(receiptsFolderId);

  if (filesToProcess.length === 0) {
    console.log('No unprocessed receipt images were found.');
    ss.toast('No new receipts found.', 'Info', 5);
    return;
  }

  console.log(`Found ${filesToProcess.length} unprocessed receipt(s). Starting processing...`);

  filesToProcess.forEach((fileToProcess, index) => {
    const originalName = fileToProcess.getName();
    console.log(`--- Processing receipt ${index + 1}/${filesToProcess.length} for order ${bonId}: ${originalName} ---`);

    try {
      console.log('Sending the image to OpenAI...');
      const rawReceiptData = analyzeReceiptWithOpenAI(fileToProcess);

      const normalized = normalizeAndAggregateReceiptData(rawReceiptData);

      if (!normalized.reconciled && (normalized.printedIncl > 0 || normalized.printedExcl > 0)) {
        const expected = normalized.printedExcl > 0 ? normalized.printedExcl : normalized.printedIncl;
        throw new Error(
          `Receipt could not be reconciled to the printed total of €${expected.toFixed(2)}. ` +
          'The resulting Werkbon would have incorrect totals. Manual review required.'
        );
      }

      console.log('Normalized receipt data. Final expense sum: ' + normalized.finalSum.toFixed(2));

      const receiptKey = generateReceiptKey(originalName);
      replaceMaterialsForWerkbon(matSheet, bonId, normalized.rows, receiptKey, normalized.documentTotalInclVat);

      fileToProcess.setName(RECEIPTS.processedPrefix + originalName);
      console.log(
        'File ' + originalName +
        ' was successfully processed. The data was added to order ' + bonId + '.'
      );
    } catch (error) {
      console.error('Critical error while processing file ' + originalName + ': ' + error.message);
      throw error; // rethrow so the workflow can surface the error
    }
  });

  console.log('All receipts processed for bonId: ' + bonId);
  ss.toast(`Processed ${filesToProcess.length} receipt(s) for order ${bonId}`, 'Done', 8);
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

/**
 * Returns ALL unprocessed receipt images (fixes the "only one receipt processed" bug).
 */
function findAllUnprocessedReceipts(receiptsFolderId) {
  const folder = DriveApp.getFolderById(receiptsFolderId);
  const files = folder.getFiles();
  const unprocessed = [];

  while (files.hasNext()) {
    const nextFile = files.next();
    const mimeType = nextFile.getMimeType();
    const isUnprocessed = nextFile.getName().indexOf(RECEIPTS.processedPrefix.trim()) === -1;
    const isImage = mimeType.indexOf('image/') !== -1;

    if (isUnprocessed && isImage) {
      unprocessed.push(nextFile);
    }
  }

  return unprocessed;
}

/**
 * Core normalization logic.
 * - Preserves printed values for product items (no per-line VAT reconstruction).
 * - Aggregates additional costs by category using their printed amounts.
 * - Does NOT allocate VAT from one category to another (no foreign BTW shares).
 * - Reconciles against printed exclVAT when available, otherwise inclVAT.
 */
function normalizeAndAggregateReceiptData(rawData) {
  if (!rawData) {
    return { rows: [], finalSum: 0, printedIncl: 0, printedExcl: 0, reconciled: true, documentTotalInclVat: 0 };
  }

  const items = rawData.items || [];
  const additionalCosts = rawData.additionalCosts || [];
  const totals = rawData.totals || {};
  const vatInfo = rawData.vat || {};

  // Apply multi-line merging only to real product items (preserve existing behavior)
  let materialItems = mergeMultiLineReceiptItems(items);

  // Build material rows using printed values
  let materialRows = materialItems.map(function(item) {
    const qty = Number(item.quantity) || 1;
    const unitP = Number(item.unitPrice !== undefined ? item.unitPrice : item.price);
    const lineT = Number(item.lineTotal !== undefined ? item.lineTotal : (qty * unitP));

    return {
      name: stripQuantityPrefix(item.name),
      quantity: qty,
      price: unitP,
      lineTotal: lineT
    };
  });

  // Aggregate additional costs (printed amounts)
  let shippingTotal = 0;
  let feeTotal = 0;

  additionalCosts.forEach(function(cost) {
    const amt = Number(cost.amount);
    if (!Number.isFinite(amt) || amt <= 0) return;

    if (cost.type === 'shipping') {
      shippingTotal += amt;
    } else if (cost.type === 'fee') {
      feeTotal += amt;
    }
    // else: ignore discount_or_reward, payment_information, unknown
  });

  const materialSum = materialRows.reduce(function(sum, r) {
    return sum + (r.lineTotal || 0);
  }, 0);

  const rawExpenseSum = materialSum + shippingTotal + feeTotal;

  // Use printed amounts for additional costs exactly as on the receipt.
  // Never distribute VAT belonging to materials into Toeslagen or Vrachtkosten.
  let finalShipping = roundToCents(shippingTotal);
  let finalFee = roundToCents(feeTotal);

  const printedIncl = Number(totals.inclVAT);
  const printedExcl = Number(totals.exclVAT || 0);

  const hasAuthoritativeTotal = (Number.isFinite(printedIncl) && printedIncl > 0) ||
    (Number.isFinite(printedExcl) && printedExcl > 0);

  // Build final rows for the sheet
  const finalRows = [];

  // Product items — keep printed amounts (no per-item VAT adjustment)
  materialRows.forEach(function(item) {
    finalRows.push({
      name: item.name,
      quantity: item.quantity,
      price: item.price
    });
  });

  // Aggregated categories — use printed values only
  if (finalFee > 0) {
    finalRows.push({
      name: 'Toeslagen',
      quantity: 1,
      price: finalFee
    });
  }

  if (finalShipping > 0) {
    finalRows.push({
      name: 'Vrachtkosten',
      quantity: 1,
      price: finalShipping
    });
  }

  const finalSum = finalRows.reduce(function(sum, r) {
    return sum + ((Number(r.quantity) || 0) * (Number(r.price) || 0));
  }, 0);

  const expectedTotal = (Number.isFinite(printedExcl) && printedExcl > 0) ? printedExcl : printedIncl;

  const reconciled = !hasAuthoritativeTotal ||
    (Math.abs(roundToCents(finalSum) - roundToCents(expectedTotal)) <= 0.02);

  if (!reconciled) {
    console.warn(
      'Reconciliation issue: final computed sum = ' + finalSum.toFixed(2) +
      ', expected = ' + expectedTotal.toFixed(2)
    );
  }

  // Determine documentTotalInclVat for column G (only when we have a reliable printed incl. VAT)
  let documentTotalInclVat = 0;
  if (Number.isFinite(printedIncl) && printedIncl > 0) {
    documentTotalInclVat = roundToCents(printedIncl);
  }

  return {
    rows: finalRows,
    finalSum: roundToCents(finalSum),
    printedIncl: printedIncl || 0,
    printedExcl: printedExcl || 0,
    reconciled: reconciled,
    rawExpenseSum: rawExpenseSum,
    documentTotalInclVat: documentTotalInclVat
  };
}

function roundToCents(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Removes a leading quantity prefix from a product name (e.g. "1 ", "2x ", "10 - ").
 * This prevents names like "1 Tiger doucheglijstang chr" from appearing in the Werkbon.
 */
function stripQuantityPrefix(name) {
  const str = String(name || '').trim();
  // Matches patterns like: 1 , 2x , 10- , 3× , 5. etc. at the start
  // Explicitly supports Unicode × (multiplication sign)
  return str.replace(/^\d+[\s\u00D7×\-\–—xX\*\.]+/, '').trim();
}

function mergeMultiLineReceiptItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const merged = [];
  let currentItem = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const name = String(item.name || '').trim();
    const price = Number(item.unitPrice !== undefined ? item.unitPrice : item.price);

    if (name === '') continue;

    if (Number.isFinite(price) && price >= 0) {
      if (currentItem) {
        merged.push(currentItem);
      }
      currentItem = {
        name: name,
        quantity: Number(item.quantity) || 1,
        unitPrice: price,
        price: price
      };
    } else {
      if (currentItem) {
        currentItem.name += ' ' + name;
      } else {
        currentItem = { name: name, quantity: 1, price: 0 };
      }
    }
  }

  if (currentItem) {
    merged.push(currentItem);
  }

  return merged.filter(item => {
    const p = Number(item.price);
    return Number.isFinite(p) && p >= 0 && String(item.name || '').trim() !== '';
  });
}

function replaceMaterialsForWerkbon(matSheet, bonId, materials, receiptKey, documentTotalInclVat) {
  console.log(`Processing receipt key: ${receiptKey} for bonId ${bonId}`);

  let validMaterials = materials || [];

  if (validMaterials.length === 0) {
    throw new Error(
      `No valid material rows were returned for Werkbon ${bonId} (receipt ${receiptKey}).`
    );
  }

  const targetId = cleanId(bonId);
  const lastRow = matSheet.getLastRow();

  // Delete ONLY rows that belong to this exact receipt (using receiptKey in column F).
  // This prevents one receipt from deleting materials added by another receipt for the same bonId.
  for (let rowIndex = lastRow; rowIndex >= 2; rowIndex--) {
    const existingId = cleanId(matSheet.getRange(rowIndex, 1).getValue());
    const existingKey = matSheet.getRange(rowIndex, 6).getValue(); // Column F = receiptKey

    if (existingId === targetId && existingKey === receiptKey) {
      matSheet.deleteRow(rowIndex);
    }
  }

  const newRows = validMaterials.map(function(item, index) {
    const qty = Number(item.quantity) || 1;
    const prc = Number(item.price) || 0;
    const lineTotal = roundToCents(qty * prc);

    // Write documentTotalInclVat (column G) ONLY on the last row for this receiptKey
    const gValue = (index === validMaterials.length - 1 && documentTotalInclVat > 0)
      ? documentTotalInclVat
      : '';

    return [
      bonId,                    // A
      item.name,                // B
      prc,                      // C
      qty,                      // D
      lineTotal,                // E
      receiptKey,               // F
      gValue                    // G - document total incl. VAT (only once per receiptKey)
    ];
  });

  const startRow = matSheet.getLastRow() + 1;

  matSheet
    .getRange(startRow, 1, newRows.length, 7)
    .setValues(newRows);

  console.log(
    `Replaced materials for ${bonId} (receipt ${receiptKey}). Added rows: ${newRows.length}.`
  );
}
