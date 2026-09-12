// =========================================================================
// MAIN WORKFLOW
// =========================================================================

async function runFullWorkflow() {
  return runFullWorkflowWithDependencies_({
    openSpreadsheet: function () {
      const spreadsheetId = getRequiredConfigValue(
        CONFIG.spreadsheetId,
        'SPREADSHEET_ID'
      );
      return SpreadsheetApp.openById(spreadsheetId);
    },
    processNewReceipts: processNewReceipts,
    flush: function () { SpreadsheetApp.flush(); },
    sleep: function () { Utilities.sleep(1000); },
    generateWerkbon: generateWerkbon,
    toast: safeToast,
  });
}

async function runFullWorkflowWithDependencies_(dependencies) {
  const ss = dependencies.openSpreadsheet();

  try {
    console.log('=== START FULL WERKBON PROCESS ===');

    dependencies.processNewReceipts();

    dependencies.flush();
    dependencies.sleep();

    await dependencies.generateWerkbon(ss);

    console.log('=== FULL WERKBON PROCESS FINISHED ===');
    dependencies.toast(
      ss,
      'Receipt processed, materials added, and Werkbon PDF created.',
      'Done',
      8
    );
  } catch (error) {
    console.error('Full workflow error: ' + error.message);
    dependencies.toast(ss, error.message, 'Error', 10);
  }
}
