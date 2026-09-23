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
    resolveLifecycle: function (ss) {
      const generalSheet = ss.getSheetByName(SHEETS.werkbonnen);
      if (!generalSheet) throw new Error("The 'Werkbonnen' sheet was not found!");
      return getWerkbonLifecycleState_(generalSheet);
    },
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
    const lifecycle = dependencies.resolveLifecycle(ss);

    dependencies.processNewReceipts(lifecycle.bonId);

    if (lifecycle.status === 'actief') {
      dependencies.toast(
        ss,
        'Receipt processing completed. Werkbon remains active. Final PDF was not created.',
        'Done',
        8
      );
      return;
    }

    dependencies.flush();
    dependencies.sleep();

    await dependencies.generateWerkbon(ss, lifecycle.bonId);

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
