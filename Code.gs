// =========================================================================
// PROJECT SETTINGS AND CONSTANTS (FOR THE TEST SANDBOX)
// =========================================================================

// OpenAI API key (generate one at platform.openai.com)
const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

// ID of the new empty Google Drive folder
const OPENAI_RECEIPTS_FOLDER_ID = PropertiesService.getScriptProperties().getProperty('OPENAI_RECEIPTS_FOLDER_ID');

// ID of your test spreadsheet
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

// Document template and output folder
const TEMPLATE_DOC_ID = PropertiesService.getScriptProperties().getProperty('TEMPLATE_DOC_ID');
const PDF_OUTPUT_FOLDER_ID = PropertiesService.getScriptProperties().getProperty('PDF_OUTPUT_FOLDER_ID');

// =========================================================================
// MAIN AUTOMATION FUNCTIONS
// =========================================================================


/**
 * Function 1: Scan a Google Drive folder and automatically extract receipt data with OpenAI GPT-4o
 */
function processNewReceipts() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const generalSheet = ss.getSheetByName('Werkbonnen');
  const matSheet = ss.getSheetByName('Werkbon_Materialen');
  
  if (!generalSheet || !matSheet) {
    console.error("The 'Werkbonnen' or 'Werkbon_Materialen' sheet was not found!");
    return;
  }

  // Step 1: Get the row currently selected by the user in the spreadsheet
  const activeRow = SpreadsheetApp.getActiveRange().getRow();
  
  // Handle the case where the cursor is accidentally placed on the header
  if (activeRow < 2) {
    throw new Error("Error: Go to the 'Werkbonnen' sheet and select a data row containing an order!");
  }
  
  // Get the ID from column A of the selected row
  const rawBonId = generalSheet.getRange(activeRow, 1).getValue();
  const bonId = typeof cleanId === 'function' ? cleanId(rawBonId) : String(rawBonId).trim();
  
  if (!bonId || bonId === "" || bonId.indexOf('Date') !== -1) {
    throw new Error(`Error: No valid ID was found in row ${activeRow} of the 'Werkbonnen' sheet!`);
  }

  console.log(`Successfully identified the target order ID: ${bonId}`);

  // Step 2: Find the receipt file in the Google Drive folder
  const folder = DriveApp.getFolderById(OPENAI_RECEIPTS_FOLDER_ID);
  const files = folder.getFiles();
  
  let fileToProcess = null;
  while (files.hasNext()) {
    const nextFile = files.next();
    const mimeType = nextFile.getMimeType();
    
    // Process only unprocessed images
    if (nextFile.getName().indexOf('[Recognized]') === -1 && mimeType.indexOf('image/') !== -1) {
      fileToProcess = nextFile;
      break; 
    }
  }

 // Verify that the file exists before sending it
    if (fileToProcess) {
      // 1. Declare the file name BEFORE the try block so it is also available in catch
      const originalName = fileToProcess.getName();
      console.log("--- Started processing file for order " + bonId + ": " + originalName + " ---");
      
      try {
        console.log("Sending the image to OpenAI...");
        const materials = analyzeReceiptWithOpenAI(fileToProcess);
        console.log("The AI successfully returned this many items: " + (materials ? materials.length : 0));
        
        // Step 3: Write the items to the spreadsheet and automatically assign the bonId
        materials.forEach(function(item) {
          matSheet.appendRow([
            bonId,                          // Column A: Automatically assigned ID
            item.name,                      // Column B: Materiaal
            Number(item.price),             // Column C: Prijs
            Number(item.quantity),          // Column D: Aantal
            Number(item.quantity * item.price) // Column E: Totaal
          ]);
        });
        
        // Mark the file as successfully processed
        fileToProcess.setName("[Recognized] " + originalName);
        console.log("File " + originalName + " was successfully processed. The data was added to order " + bonId + ".");
        
      } catch (error) {
        // originalName is now available here and will not cause an error.
        console.error("Critical error while processing file " + originalName + ": " + error.message);
      }
    }
}

/**
 * Function 2: Direct low-level API request to OpenAI GPT-4o Vision
 */
function analyzeReceiptWithOpenAI(file) {
  // Defensive check: if no file was passed, log the issue and return without crashing
  if (!file) {
    console.error("CRITICAL ERROR: analyzeReceiptWithOpenAI was called, but the 'file' argument is empty (undefined)!");
    return [];
  }

  const blob = file.getBlob();
  const base64Data = Utilities.base64Encode(blob.getBytes());
  const mimeType = blob.getContentType();

  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  
  // The unchanged systemPrompt and payload follow...
  // Clear model instructions to prevent extra text in the response
  const systemPrompt = 
    "You are a professional AI parser for construction delivery notes, invoices, and receipts. " +
    "Your task is to analyze the image and extract ALL construction materials, tools, and consumables. " +
    "Ignore the receipt total, taxes (BTW/VAT), discounts, delivery fees, returnable packaging, and pallet deposits. " +
    "Return the result STRICTLY as a valid JSON array of objects, without Markdown formatting (no ```json ... ```). " +
    "Response format: [{\"name\": \"Exact product name in the receipt language\", \"quantity\": numeric_quantity, \"price\": numeric_unit_price}]";

  const payload = {
    "model": "gpt-4o", 
    "messages": [
      {
        "role": "user",
        "content": [
          { "type": "text", "text": systemPrompt },
          {
            "type": "image_url",
            "image_url": { "url": `data:${mimeType};base64,${base64Data}` }
          }
        ]
      }
    ],
    "temperature": 0.0
  };

  const options = {
    "method": "post",
    "headers": {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  const response = UrlFetchApp.fetch(apiUrl, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (responseCode !== 200) {
    throw new Error(`OpenAI API returned an error: ${responseCode} - ${responseText}`);
  }

  const jsonResponse = JSON.parse(responseText);
  let resultText = jsonResponse.choices[0].message.content.trim();
  Logger.log("RESPONSE FROM OPENAI: " + resultText);
  
 // Remove any possible ```json ... ``` Markdown fences from the response
    if (resultText.indexOf("```") !== -1) {
      resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    try {
      const parsedData = JSON.parse(resultText);
      // Check whether the response is an array or an object containing an array field (for example, parsedData.materials)
      if (Array.isArray(parsedData)) {
        return parsedData;
      } else if (parsedData.materials && Array.isArray(parsedData.materials)) {
        return parsedData.materials;
      } else if (parsedData.items && Array.isArray(parsedData.items)) {
        return parsedData.items;
      }
      
      console.error("OpenAI returned JSON, but it is not an array of receipt items:", resultText);
      return [];
    } catch (e) {
      console.error("Failed to parse JSON from OpenAI. Raw response:", resultText);
      return [];
    }
  }

function generateWerkbon() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const generalSheet = ss.getSheetByName('Werkbonnen'); 
  
  if (!generalSheet) return Browser.msgBox("The 'Werkbonnen' sheet was not found!");
  
  // Get the row containing the current cursor position
  const activeCell = generalSheet.getActiveCell();
  const activeRow = activeCell.getRow();
  
  if (activeRow < 2) { 
    return Browser.msgBox("Error: Select a row containing order data (row 2 or below)!"); 
  }
  
  console.time("Step 1: Load and filter data in memory");
  
  // Read the ID directly from column A (1) of the selected row
  const rawBonId = generalSheet.getRange(activeRow, 1).getValue();
  
  // If the cell in column A is empty, try to get the ID from the active cell
  let bonId = cleanId(rawBonId);
  if (bonId === "") {
    bonId = cleanId(activeCell.getValue());
  }
  
  // If the ID is still empty, stop and ask the user to select the correct cell
  if (bonId === "" || bonId.indexOf('Date') !== -1) {
    console.timeEnd("Step 1: Load and filter data in memory");
    return Browser.msgBox(`Error: No order ID was found in row ${activeRow} (column A). Select the cell containing the ID (for example, NDK-20260610-005) and run the script again!`);
  }
  
  // Now that the exact ID is known, find its row in the full dataset to retrieve the date and location
  const allData = generalSheet.getDataRange().getValues();
  let startRowIndex = -1;
  
  for (let i = 1; i < allData.length; i++) {
    if (cleanId(allData[i][0]) === bonId) {
      startRowIndex = i;
      break;
    }
  }
  
  // Handle the unlikely case where the row was not found
  if (startRowIndex === -1) {
    console.timeEnd("Step 1: Load and filter data in memory");
    return Browser.msgBox(`Error: ID ${bonId} was not found in column A of the Werkbonnen sheet.`);
  }
  
  // Extract the remaining data only from the matched form row
  const datumRaw = allData[startRowIndex][1]; 
  const locatie = allData[startRowIndex][2]; 
  
  // Load and find the location data
  const locatiesSheet = ss.getSheetByName('Locaties');
  const locatiesData = locatiesSheet ? locatiesSheet.getDataRange().getValues() : [];
  const locatieData = getLocatieDataFast(locatiesData, locatie);
  
  // Read the formatted hours directly from the sheet
  const totaalUrenFormatted = generalSheet.getRange(startRowIndex + 1, 6).getDisplayValue(); 
  
    // Access the related sheets
  const urenSheet = ss.getSheetByName('Werkbon_Uren');
  const matSheet = ss.getSheetByName('Werkbon_Materialen');
  const aanvSheet = ss.getSheetByName('Werkbon_Aanvullingen');
  
  // Load data arrays up to the last populated row on each sheet
  const rawUrenRows = (urenSheet && urenSheet.getLastRow() > 1) ? urenSheet.getRange(1, 1, urenSheet.getLastRow(), urenSheet.getLastColumn()).getDisplayValues() : [];
  const rawMatRows = (matSheet && matSheet.getLastRow() > 1) ? matSheet.getRange(1, 1, matSheet.getLastRow(), matSheet.getLastColumn()).getValues() : [];
  const rawAanvRows = (aanvSheet && aanvSheet.getLastRow() > 1) ? aanvSheet.getRange(1, 1, aanvSheet.getLastRow(), aanvSheet.getLastColumn()).getValues() : [];
  
  // Filter the in-memory data by the normalized bonId
  const urenRows = filterDataInMemory(rawUrenRows, bonId);
  const matRows = filterDataInMemory(rawMatRows, bonId);
  const aanvullingenRows = filterDataInMemory(rawAanvRows, bonId);


  // Find the lower boundary of the merged description text block
  let endRowIndex = startRowIndex;
  while (endRowIndex + 1 < allData.length && allData[endRowIndex + 1] && allData[endRowIndex + 1][0] === "") {
    endRowIndex++;
    if (endRowIndex > startRowIndex + 100) break;
  }

  // Build the multiline task-description text
  let omschrijvingLines = [];
  let werkzaamhedenLines = [];
  for (let i = startRowIndex; i <= endRowIndex; i++) {
    if (allData[i][3] && allData[i][3].toString().trim() !== "") omschrijvingLines.push(allData[i][3]);
    if (allData[i][4] && allData[i][4].toString().trim() !== "") werkzaamhedenLines.push(allData[i][4]);
  }
  const omschrijvingText = omschrijvingLines.join("\n");
  const werkzaamhedenText = werkzaamhedenLines.join("\n");
  
  // Format the date
  let datumFormatted = datumRaw.toString();
  if (datumRaw instanceof Date) {
    datumFormatted = Utilities.formatDate(datumRaw, Session.getScriptTimeZone(), "dd-MM-yyyy");
  }
  console.timeEnd("Step 1: Load and filter data in memory");
  
  // === STEP 2 CONTINUES UNCHANGED BELOW ===


  console.time("Step 2: Copy the template and open the document");
  const templateId = '1aldaawk4hW-Cx_onZFizDKZigDKzgh9cL9HDdPGoCqc';
  const folderId = '1piu-jqQ5hoh1akfS_7632Yp3wT2Ppeze';
  
  const tempCopy = DriveApp.getFileById(templateId).makeCopy(`Werkbon_${bonId}`, DriveApp.getFolderById(folderId));
  const tempCopyId = tempCopy.getId();
  const doc = DocumentApp.openById(tempCopyId);
  const body = doc.getBody();
  console.timeEnd("Step 2: Copy the template and open the document");


  console.time("Step 3: Replace individual text tags");
  body.replaceText('{{WerkbonID}}', bonId);
  body.replaceText('{{Datum}}', datumFormatted);
  body.replaceText('{{NaamLocatie}}', locatieData.naamLocatie);
  body.replaceText('{{Adres}}', locatieData.adres);
  body.replaceText('{{Postcode}}', locatieData.postcode);
  body.replaceText('{{Woonplaats}}', locatieData.woonplaats);

  const totalMateriaal = matRows.reduce((sum, row) => sum + (Number(row[4]) || 0), 0);
  body.replaceText('{{TotalMateriaal}}', formatEuro(totalMateriaal));
  console.timeEnd("Step 3: Replace individual text tags");


  console.time("Step 4: Populate dynamic tables (Uren / Materialen)");
  const tables = body.getTables();
  if (tables.length < 4) {
    return Browser.msgBox("Error: The document template must contain at least four tables!");
  }
  
  const urenTable = tables[2]; 
  const matTable = tables[3];  

  fillTableRowsFast(urenTable, urenRows, [
  { tag: '{{u_datum}}',  col: 1, cellIndex: 0 }, // DATUM
  { tag: '{{u_hours}}',  col: 4, cellIndex: 1 }, // GEWERKTE UREN
  { tag: '{{u_van}}',    col: 2, cellIndex: 2 }, // VAN
  { tag: '{{u_tot}}',    col: 3, cellIndex: 3 }  // TOT
]);

fillTableRowsFast(matTable, matRows, [
  { tag: '{{m_name}}',   col: 1, cellIndex: 0 }, // MATERIAAL
  { tag: '{{m_price}}',  col: 2, cellIndex: 1, isEuro: true }, // PRIJS
  { tag: '{{m_qty}}',    col: 3, cellIndex: 2 }, // AANTAL
  { tag: '{{m_total}}',  col: 4, cellIndex: 3, isEuro: true }  // TOTAAL
]);

  console.timeEnd("Step 4: Populate dynamic tables (Uren / Materialen)");


  console.time("Step 5: Process card tables (Omschrijving / Werkzaamheden)");
  body.replaceText('{{Omschrijving}}', omschrijvingText || 'Geen omschrijving.');
  body.replaceText('{{Werkzaamheden}}', werkzaamhedenText || 'Geen werkzaamheden uitgevoerd.');

  if (aanvullingenRows.length > 0) {
    body.appendPageBreak();
    appendAanvullingen(body, aanvullingenRows);
  }
    
  let totalMinutes = 0;
  urenRows.forEach(row => {
    const durationStr = row[4] ? row[4].toString().trim() : ""; 
    if (durationStr.indexOf(":") !== -1) {
      const parts = durationStr.split(":");
      totalMinutes += (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    } else {
      totalMinutes += Math.round((parseFloat(durationStr) || 0) * 60);
    }
  });

  const finalHours = Math.floor(totalMinutes / 60);
  const finalMinutes = totalMinutes % 60;
  const totalUrenCalculated = `${finalHours}:${finalMinutes < 10 ? '0' : ''}${finalMinutes}`;
  
  body.replaceText('{{TotalUren}}', totaalUrenFormatted || totalUrenCalculated);
  console.timeEnd("Step 5: Process card tables (Omschrijving / Werkzaamheden)");


  console.time("Step 6: Save document changes (doc.saveAndClose)");
  doc.saveAndClose();
  console.timeEnd("Step 6: Save document changes (doc.saveAndClose)");


  console.time("Step 7: ULTRA-FAST PDF EXPORT USING DIRECT DOWNLOAD");
  try {
    const url = `https://docs.google.com/document/d/${tempCopyId}/export?format=pdf`;
    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const pdfBlob = response.getBlob().setName(`Werkbon_${bonId}.pdf`);
      DriveApp.getFolderById(folderId).createFile(pdfBlob);
      console.timeEnd("Step 7: ULTRA-FAST PDF EXPORT USING DIRECT DOWNLOAD");
    } else {
      throw new Error("The export system returned status code " + response.getResponseCode());
    }

    // Delete the temporary Google Docs file
    Drive.Files.remove(tempCopyId);
    ss.toast(`Werkbon ${bonId} was generated in seconds!`);
  } catch (e) {
    console.timeEnd("Step 7: ULTRA-FAST PDF EXPORT (FAILED; FALLING BACK TO STANDARD MODE)");
    try {
      const pdfBlob = tempCopy.getAs(MimeType.PDF);
      DriveApp.getFolderById(folderId).createFile(pdfBlob).setName(`Werkbon_${bonId}.pdf`);
      tempCopy.setTrashed(true);
      ss.toast(`Generated successfully (standard mode).`);
    } catch(err) {
      ss.toast(`Failed to create the PDF. The Docs file was kept in the folder.`, "Warning", 10);
    }
  }
}

function runFullWorkflow() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  try {
    console.log("=== START FULL WERKBON PROCESS ===");

    processNewReceipts();

    SpreadsheetApp.flush();
    Utilities.sleep(1000);

    generateWerkbon();

    console.log("=== FULL WERKBON PROCESS FINISHED ===");
    ss.toast("Receipt processed, materials added, and Werkbon PDF created.", "Done", 8);

  } catch (error) {
    console.error("Full workflow error: " + error.message);
    ss.toast(error.message, "Error", 10);
  }
}

// === ALL HELPER FUNCTIONS ===

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🔧 Generator Werkbon")
    .addItem("🚀 Full workflow", "runFullWorkflow")
    .addSeparator()
    .addItem("📷 Process receipt only", "processNewReceipts")
    .addItem("📄 Create PDF only", "generateWerkbon")
    .addToUi();
}

function fillTableRowsFast(table, dataRows, config) {
  if (!table) return;

  console.log("=== START fillTableRowsFast ===");
  console.log("Data rows received for processing: " + dataRows.length);

  // 1. Template row (usually row[1])
  const templateRow = table.getRow(1);
  const numCells = templateRow.getNumCells();

  // 2. Save the template cell styles
  const cellStyles = [];
  for (let c = 0; c < numCells; c++) {
    try {
      cellStyles.push({
        attributes: templateRow.getCell(c).getAttributes()
      });
    } catch (e) {
      cellStyles.push(null);
    }
  }

  // 3. Remove the template row
  try {
    table.removeRow(1);
  } catch (e) {
    console.log("Failed to remove the template row: " + e.message);
  }

  // 4. Exit if there is no data
  if (!dataRows || dataRows.length === 0) {
    console.log("No data; the table remains empty.");
    return;
  }

  // 5. Create data rows
  for (let i = 0; i < dataRows.length; i++) {
    const data = dataRows[i];
    console.log(`Creating row #${i}`);

    // Create a new row
    const newRow = table.appendTableRow();

    // Create cells
    for (let c = 0; c < numCells; c++) {
      const newCell = newRow.appendTableCell();

      // Apply the template style
      if (cellStyles[c]) {
        try { newCell.setAttributes(cellStyles[c].attributes); } catch (e) {}
      }

      // Clear the cell completely
      try {
        while (newCell.getNumChildren() > 0) {
          newCell.removeChild(newCell.getChild(0));
        }
      } catch (e) {}
    }

    // 6. Populate the cells
    config.forEach(cfg => {
      const rawVal = data[cfg.col];
      let valStr = rawVal !== undefined && rawVal !== null ? rawVal.toString().trim() : '';

      if (cfg.isEuro) {
        valStr = formatEuro(rawVal);
      }

      const cellIndex = cfg.cellIndex;

      if (cellIndex < numCells) {
        try {
          const cell = newRow.getCell(cellIndex);

          // Clear the cell completely
          while (cell.getNumChildren() > 0) {
            cell.removeChild(cell.getChild(0));
          }

          // Create one paragraph
          const p = cell.appendParagraph(valStr);

          // Apply the text style
          p.setAttributes({
            [DocumentApp.Attribute.FONT_SIZE]: 11,
            [DocumentApp.Attribute.BOLD]: false
          });

        } catch (e) {
          console.log("Error while populating cell: " + e.message);
        }
      }
    });

    console.log(`Row #${i} populated.`);
  }

  console.log("=== fillTableRowsFast finished ===");
}



function CleanParagraphsInRow(row) {
  if (!row) return;

  for (let j = 0; j < row.getNumCells(); j++) {
    const cell = row.getCell(j);
    try {
      // Use subtle padding without modifying paragraphs
      cell.setPaddingTop(5);
      cell.setPaddingBottom(5);
    } catch (e) {}

    // Do NOT modify children or paragraphs to avoid breaking the structure
  }
}



function filterDataInMemory(dataMatrix, id) {
  if (!dataMatrix || dataMatrix.length === 0) {
    console.log("⚠ Error: An empty data array was provided for filtering.");
    return [];
  }
  
  const targetId = cleanId(id);
  console.log(`=== START FULL-DATASET FILTERING FOR ID: [${targetId}] ===`);
  console.log(`Total rows to analyze on the sheet: ${dataMatrix.length}`);
  
  const filtered = [];
  
  // Iterate through every row from top to bottom (skipping the header at i=0)
  for (let i = 1; i < dataMatrix.length; i++) {
    const row = dataMatrix[i];
    if (!row || row.length === 0) continue; // Guard against empty row objects
    
    const rawRowId = row[0];
    const rowId = cleanId(rawRowId);
    
    // Add the row to the result when an exact ID match is found
    if (rowId === targetId) {
      filtered.push(row);
    }
  }
  
  console.log(`=== FULL-DATASET FILTERING FINISHED. MATCHED ROWS: ${filtered.length} ===`);
  return filtered;
}

function cleanId(value) {
  if (value === null || value === undefined) return '';
  
  // Convert to a string and remove ALL whitespace characters
  let str = value.toString().replace(/[\s\u00A0]+/g, '').trim();
  
  // If this is a decimal integer (for example, "4.0"), convert it to "4"
  if (!isNaN(str) && str.indexOf('.') !== -1 && !isNaN(parseFloat(str))) {
    // If only zeros follow the decimal point, return the integer part
    if (parseFloat(str) === Math.floor(parseFloat(str))) {
      return Math.floor(parseFloat(str)).toString();
    }
  }
  
  return str;
}

function getLocatieDataFast(locatiesData, code) {
  const defaultResult = { naamLocatie: code, adres: '', postcode: '', woonplaats: '' };
  if (!locatiesData || locatiesData.length < 2) return defaultResult;
  
  const targetCode = cleanId(code);
  for (let i = 1; i < locatiesData.length; i++) {
    if (cleanId(locatiesData[i][0]) === targetCode) {
      return {
        naamLocatie: locatiesData[i][2] || '',
        adres: locatiesData[i][5] || '',
        postcode: locatiesData[i][6] || '',
        woonplaats: locatiesData[i][7] || ''
      };
    }
  }
  return defaultResult;
}

function appendAanvullingen(body, rows) {
  if (!body || !rows || rows.length === 0) {
    console.log("appendAanvullingen: the document body is empty or there are no additional rows.");
    return;
  }

  body.appendParagraph('Aanvullingen')
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  const werkzaamheden = rows.filter(row => row[1].toString().trim() === 'Werkzaamheden');
  const opmerkingen   = rows.filter(row => row[1].toString().trim() === 'Opmerking');
  const bijlagen      = rows.filter(row => row[1].toString().trim() === 'Bijlage');

  if (werkzaamheden.length > 0) {
    body.appendParagraph('Uitgevoerde werkzaamheden')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    werkzaamheden.forEach(row => {
      body.appendParagraph(row[2]).setBullet(true);
    });
  }

  if (opmerkingen.length > 0) {
    // Add an empty line for visual spacing
    body.appendParagraph('');
    body.appendParagraph('Opmerkingen:')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    opmerkingen.forEach(row => {
      body.appendParagraph(row[2]);
    });
  }

  if (bijlagen.length > 0) {
    body.appendParagraph('');
    body.appendParagraph('Bijlagen:')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    bijlagen.forEach(row => {
      body.appendParagraph(row[2]);
    });
  }
}


function formatEuro(value) {
  if (value === null || value === undefined || value === '') return '€ 0,00';
  const number = Number(value);
  if (isNaN(number)) return value.toString();
  return '€ ' + number.toFixed(2).replace('.', ',');
}
