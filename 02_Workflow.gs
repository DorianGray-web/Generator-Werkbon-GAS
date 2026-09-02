// =========================================================================
// MAIN WORKFLOW
// =========================================================================

function runFullWorkflow() {
  const spreadsheetId = getRequiredConfigValue(CONFIG.spreadsheetId, 'SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);

  try {
    console.log('=== START FULL WERKBON PROCESS ===');

    processNewReceipts();

    SpreadsheetApp.flush();
    Utilities.sleep(1000);

    generateWerkbon(ss);

    console.log('=== FULL WERKBON PROCESS FINISHED ===');
    safeToast(ss, 'Receipt processed, materials added, and Werkbon PDF created.', 'Done', 8);
  } catch (error) {
    console.error('Full workflow error: ' + error.message);
    safeToast(ss, error.message, 'Error', 10);
  }
}
