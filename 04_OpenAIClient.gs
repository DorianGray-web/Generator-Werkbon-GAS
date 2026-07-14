// =========================================================================
// OPENAI CLIENT
// =========================================================================

/**
 * Sends a receipt image to OpenAI Vision and returns extracted material rows.
 */
function analyzeReceiptWithOpenAI(file) {
  const openAIApiKey = getRequiredConfigValue(CONFIG.openAIApiKey, 'OPENAI_API_KEY');

  if (!file) {
    console.error("CRITICAL ERROR: analyzeReceiptWithOpenAI was called, but the 'file' argument is empty (undefined)!");
    return [];
  }

  const blob = file.getBlob();
  const base64Data = Utilities.base64Encode(blob.getBytes());
  const mimeType = blob.getContentType();

  const payload = buildOpenAIReceiptPayload(mimeType, base64Data);
  const options = {
    method: 'post',
    headers: {
      Authorization: `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(OPENAI.apiUrl, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (responseCode !== 200) {
    throw new Error(`OpenAI API returned an error: ${responseCode} - ${responseText}`);
  }

  return parseOpenAIReceiptResponse(responseText);
}

function buildOpenAIReceiptPayload(mimeType, base64Data) {
  const systemPrompt =
    'You are a professional AI parser for construction delivery notes, invoices, and receipts. ' +
    'Your task is to analyze the image and extract ALL construction materials, tools, and consumables. ' +
    'Ignore the receipt total, taxes (BTW/VAT), discounts, delivery fees, returnable packaging, and pallet deposits. ' +
    'Return the result STRICTLY as a valid JSON array of objects, without Markdown formatting (no ```json ... ```). ' +
    'Response format: [{"name": "Exact product name in the receipt language", "quantity": numeric_quantity, "price": numeric_unit_price}]';

  return {
    model: OPENAI.model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: systemPrompt },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Data}` },
          },
        ],
      },
    ],
    temperature: OPENAI.temperature,
  };
}

function parseOpenAIReceiptResponse(responseText) {
  const jsonResponse = JSON.parse(responseText);
  let resultText = jsonResponse.choices[0].message.content.trim();

  if (isOpenAIResponseDebugEnabled()) {
    Logger.log('RESPONSE FROM OPENAI: ' + resultText);
  }

  if (resultText.indexOf('```') !== -1) {
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
  }

  try {
    const parsedData = JSON.parse(resultText);

    if (Array.isArray(parsedData)) {
      return parsedData;
    }

    if (parsedData.materials && Array.isArray(parsedData.materials)) {
      return parsedData.materials;
    }

    if (parsedData.items && Array.isArray(parsedData.items)) {
      return parsedData.items;
    }

    console.error('OpenAI returned JSON, but it is not an array of receipt items.');
    logRawOpenAIResponseForDebug(resultText);
    return [];
  } catch (e) {
    console.error('Failed to parse JSON from OpenAI.');
    logRawOpenAIResponseForDebug(resultText);
    return [];
  }
}

function logRawOpenAIResponseForDebug(resultText) {
  if (isOpenAIResponseDebugEnabled()) {
    console.error('Raw OpenAI response:', resultText);
  }
}
