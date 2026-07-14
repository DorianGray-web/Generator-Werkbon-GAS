// =========================================================================
// SPREADSHEET MENU
// =========================================================================

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🔧 Generator Werkbon')
      .addItem('🚀 Full workflow', 'runFullWorkflow')
      .addSeparator()
      .addItem('📷 Process receipt only', 'processNewReceipts')
      .addItem('📄 Create PDF only', 'generateWerkbon')
      .addToUi();
  } catch (error) {
    console.log('The custom menu can only be created from the spreadsheet UI context.');
  }
}