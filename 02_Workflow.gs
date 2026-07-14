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

    generateWerkbon();

    console.log('=== FULL WERKBON PROCESS FINISHED ===');
    ss.toast('Receipt processed, materials added, and Werkbon PDF created.', 'Done', 8);
  } catch (error) {
    console.error('Full workflow error: ' + error.message);
    ss.toast(error.message, 'Error', 10);
  }
}
