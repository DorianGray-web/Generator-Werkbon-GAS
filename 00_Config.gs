// =========================================================================
// PROJECT CONFIGURATION
// =========================================================================

const CONFIG = {
  openAIApiKey: PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY'),
  openAIReceiptsFolderId: PropertiesService.getScriptProperties().getProperty('OPENAI_RECEIPTS_FOLDER_ID'),
  spreadsheetId: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'),
  templateDocId: PropertiesService.getScriptProperties().getProperty('TEMPLATE_DOC_ID'),
  pdfOutputFolderId: PropertiesService.getScriptProperties().getProperty('PDF_OUTPUT_FOLDER_ID'),
  debugOpenAIResponseLogging: PropertiesService.getScriptProperties().getProperty('DEBUG_OPENAI_RESPONSE_LOGGING'),
};

const SHEETS = {
  werkbonnen: 'Werkbonnen',
  uren: 'Werkbon_Uren',
  materialen: 'Werkbon_Materialen',
  aanvullingen: 'Werkbon_Aanvullingen',
  locaties: 'Locaties',
};

const OPENAI = {
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o',
  temperature: 0.0,
};

const RECEIPTS = {
  processedPrefix: '[Recognized] ',
};

const DOCUMENT_TABLE_INDEX = {
  uren: 2,
  materialen: 3,
};

function getRequiredConfigValue(value, propertyName) {
  if (!value || value.toString().trim() === '') {
    throw new Error(
      `Missing required script property: ${propertyName}. ` +
      'Set it in Apps Script Project Settings > Script properties.'
    );
  }

  return value.toString().trim();
}

function getRequiredScriptProperty(propertyName) {
  return getRequiredConfigValue(
    PropertiesService.getScriptProperties().getProperty(propertyName),
    propertyName
  );
}

function isDebugEnabled(value) {
  return value && value.toString().trim().toLowerCase() === 'true';
}

function isOpenAIResponseDebugEnabled() {
  return isDebugEnabled(CONFIG.debugOpenAIResponseLogging);
}
