// =========================================================================
// OPENAI CLIENT
// =========================================================================

/**
 * Conservative project-level safety policy for the initial PDF ingestion implementation.
 * Intended to bound base64 payload size and processing time.
 * A representative real invoice is approximately 58 KB, so the initial 5 MiB project limit provides substantial headroom.
 * May be revised later based on controlled E2E evidence.
 */
const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB

/**
 * Sends a receipt (image or PDF) to OpenAI and returns structured receipt data.
 * Returns an object with items, additionalCosts, vat, and totals when possible.
 */
function analyzeReceiptWithOpenAI(file) {
  const openAIApiKey = getRequiredConfigValue(CONFIG.openAIApiKey, 'OPENAI_API_KEY');

  if (!file) {
    console.error("CRITICAL ERROR: analyzeReceiptWithOpenAI was called, but the 'file' argument is empty (undefined)!");
    return { items: [] };
  }

  const mimeType = file.getMimeType();

  if (mimeType === 'application/pdf') {
    const size = file.getSize();
    if (size > MAX_PDF_SIZE_BYTES) {
      throw new Error(`PDF file is too large for processing (${size} bytes). The project uses a conservative 5 MiB limit for PDF ingestion to bound payload size and processing time.`);
    }

    const blob = file.getBlob();
    const base64Data = Utilities.base64Encode(blob.getBytes());

    const payload = buildOpenAIPdfPayload(mimeType, base64Data);
    const options = {
      method: 'post',
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(OPENAI.responsesApiUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      throw new Error(`OpenAI API returned an error: ${responseCode} - ${responseText}`);
    }

    return parseOpenAIPdfReceiptResponse(responseText);
  } else if (mimeType.indexOf('image/') === 0) {
    const blob = file.getBlob();
    const base64Data = Utilities.base64Encode(blob.getBytes());
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
  } else {
    throw new Error(`Unsupported MIME type for receipt analysis: ${mimeType}`);
  }
}

function buildOpenAIReceiptPayload(mimeType, base64Data) {
  const systemPrompt =
    'You are a professional AI parser for construction delivery notes, invoices, and receipts. ' +
    'Your task is to analyze the image and extract purchased materials and additional costs accurately using the printed values on the document. ' +

    'A product name may span multiple consecutive lines. ' +
    'Do not treat every text line as a separate product. ' +
    'If a line has no printed price of its own, it MUST be appended to the previous item’s name as a characteristic or description. ' +
    'Never create a separate item from a description/characteristic line. ' +
    'Never duplicate a price onto a line that has no printed price. ' +
    'Merge consecutive description lines into one item until a new item begins. ' +
    'A new item normally begins when one or more of these signs are present: ' +
    'a quantity appears at the far left; the previous item has reached its unit price or line total; the receipt layout clearly starts a new product block. ' +
    'Prices printed on the right belong to the complete product block, not necessarily only to the text on the same visual line. ' +

    'For each product item: preserve the exact printed name; extract quantity, unitPrice and lineTotal exactly as printed on the document. ' +
    'The "quantity" field MUST represent the number of purchased sales units shown on the receipt. ' +
    'Do not invent quantities or prices. Use the values visible on the receipt. ' +

    'Also extract additional positive costs that the buyer actually pays: ' +
    '- shipping / vrachtkosten / bezorgkosten / delivery → type: "shipping" ' +
    '- fees, toeslagen, verwijderingsbijdrage, handling, milieubijdrage, etc. → type: "fee" ' +
    'Use the exact printed amount for each. ' +

    'Extract VAT information if present: rate (e.g. 0.21 for 21%) and the VAT amount. ' +
    'Extract the key document totals when visible: total excl. VAT (exclBTW), VAT amount, total incl. VAT (inclBTW). ' +

    'IMPORTANT: ' +
    '- Only extract positive expense amounts that represent goods or services paid for. ' +
    '- Ignore discounts, loyalty points, coupons, premium reductions, negative amounts, payment methods (PIN, cash, card, reeds betaald, openstaand bedrag, change, etc.). ' +
    '- Do not create expense rows for payment or settlement information. ' +
    '- Prefer the printed values on the document over any calculated ones. ' +
    '- If a line total is printed, use it. ' +

    'Return the result STRICTLY as a valid JSON object (no Markdown, no ```json). ' +
    'Use this structure: ' +
    '{' +
    '  "items": [{"name": "exact printed name", "quantity": number, "unitPrice": number, "lineTotal": number}], ' +
    '  "additionalCosts": [{"name": "exact label", "type": "shipping" or "fee", "amount": number}], ' +
    '  "vat": {"rate": number or null, "amount": number or null}, ' +
    '  "totals": {"exclVAT": number or null, "inclVAT": number or null, "vatAmount": number or null} ' +
    '}';

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

function buildOpenAIPdfPayload(mimeType, base64Data) {
  const systemPrompt =
    'You are a professional AI parser for construction delivery notes, invoices, and receipts. ' +
    'Your task is to analyze the document and extract purchased materials and additional costs accurately using the printed values on the document. ' +

    'A product name may span multiple consecutive lines. ' +
    'Do not treat every text line as a separate product. ' +
    'If a line has no printed price of its own, it MUST be appended to the previous item’s name as a characteristic or description. ' +
    'Never create a separate item from a description/characteristic line. ' +
    'Never duplicate a price onto a line that has no printed price. ' +
    'Merge consecutive description lines into one item until a new item begins. ' +
    'A new item normally begins when one or more of these signs are present: ' +
    'a quantity appears at the far left; the previous item has reached its unit price or line total; the receipt layout clearly starts a new product block. ' +
    'Prices printed on the right belong to the complete product block, not necessarily only to the text on the same visual line. ' +

    'For each product item: preserve the exact printed name; extract quantity, unitPrice and lineTotal exactly as printed on the document. ' +
    'The "quantity" field MUST represent the number of purchased sales units shown on the receipt. ' +
    'Do not invent quantities or prices. Use the values visible on the receipt. ' +

    'Also extract additional positive costs that the buyer actually pays: ' +
    '- shipping / vrachtkosten / bezorgkosten / delivery → type: "shipping" ' +
    '- fees, toeslagen, verwijderingsbijdrage, handling, milieubijdrage, etc. → type: "fee" ' +
    'Use the exact printed amount for each. ' +

    'Extract VAT information if present: rate (e.g. 0.21 for 21%) and the VAT amount. ' +
    'Extract the key document totals when visible: total excl. VAT (exclBTW), VAT amount, total incl. VAT (inclBTW). ' +

    'IMPORTANT: ' +
    '- Only extract positive expense amounts that represent goods or services paid for. ' +
    '- Ignore discounts, loyalty points, coupons, premium reductions, negative amounts, payment methods (PIN, cash, card, reeds betaald, openstaand bedrag, change, etc.). ' +
    '- Do not create expense rows for payment or settlement information. ' +
    '- Prefer the printed values on the document over any calculated ones. ' +
    '- If a line total is printed, use it. ' +

    'Return the result STRICTLY as a valid JSON object (no Markdown, no ```json). ' +
    'Use this structure: ' +
    '{' +
    '  "items": [{"name": "exact printed name", "quantity": number, "unitPrice": number, "lineTotal": number}], ' +
    '  "additionalCosts": [{"name": "exact label", "type": "shipping" or "fee", "amount": number}], ' +
    '  "vat": {"rate": number or null, "amount": number or null}, ' +
    '  "totals": {"exclVAT": number or null, "inclVAT": number or null, "vatAmount": number or null} ' +
    '}';

  return {
    model: OPENAI.model,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: systemPrompt },
          {
            type: 'input_file',
            filename: 'receipt.pdf',
            file_data: `data:${mimeType};base64,${base64Data}`,
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

    // 1. Legacy flat array [...]
    if (Array.isArray(parsedData)) {
      return {
        items: validateReceiptItems(parsedData),
        additionalCosts: [],
        vat: null,
        totals: null
      };
    }

    // 2. Legacy { materials: [...] }
    if (parsedData && parsedData.materials && Array.isArray(parsedData.materials)) {
      return {
        items: validateReceiptItems(parsedData.materials),
        additionalCosts: [],
        vat: null,
        totals: null
      };
    }

    // 3. Current structured { items, additionalCosts, vat, totals }
    if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
      return {
        items: validateReceiptItems(parsedData.items || []),
        additionalCosts: validateAdditionalCosts(parsedData.additionalCosts || []),
        vat: parsedData.vat || null,
        totals: parsedData.totals || null
      };
    }

    console.error('OpenAI returned JSON, but it could not be interpreted as receipt data.');
    logRawOpenAIResponseForDebug(resultText);
    return { items: [], additionalCosts: [], vat: null, totals: null };
  } catch (e) {
    console.error('Failed to parse JSON from OpenAI.');
    logRawOpenAIResponseForDebug(resultText);
    return { items: [], additionalCosts: [], vat: null, totals: null };
  }
}

function parseOpenAIPdfReceiptResponse(responseText) {
  const jsonResponse = JSON.parse(responseText);
  const outputTexts = [];

  // Responses output may contain reasoning/tool items before or between messages.
  // Collect output_text content from every output item, preserving response order.
  if (Array.isArray(jsonResponse.output)) {
    jsonResponse.output.forEach(function(outputItem) {
      if (!outputItem || !Array.isArray(outputItem.content)) return;

      outputItem.content.forEach(function(contentPart) {
        if (
          contentPart &&
          contentPart.type === 'output_text' &&
          typeof contentPart.text === 'string' &&
          contentPart.text.trim() !== ''
        ) {
          outputTexts.push(contentPart.text.trim());
        }
      });
    });
  }

  if (outputTexts.length === 0) {
    throw new Error('OpenAI Responses API response did not contain output_text.');
  }

  let resultText = outputTexts.join('\n');

  if (isOpenAIResponseDebugEnabled()) {
    Logger.log('RESPONSE FROM OPENAI: ' + resultText);
  }

  if (resultText.indexOf('```') !== -1) {
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
  }

  try {
    const parsedData = JSON.parse(resultText);

    // 1. Legacy flat array [...]
    if (Array.isArray(parsedData)) {
      return {
        items: validateReceiptItems(parsedData),
        additionalCosts: [],
        vat: null,
        totals: null
      };
    }

    // 2. Legacy { materials: [...] }
    if (parsedData && parsedData.materials && Array.isArray(parsedData.materials)) {
      return {
        items: validateReceiptItems(parsedData.materials),
        additionalCosts: [],
        vat: null,
        totals: null
      };
    }

    // 3. Current structured { items, additionalCosts, vat, totals }
    if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
      return {
        items: validateReceiptItems(parsedData.items || []),
        additionalCosts: validateAdditionalCosts(parsedData.additionalCosts || []),
        vat: parsedData.vat || null,
        totals: parsedData.totals || null
      };
    }

    console.error('OpenAI returned JSON, but it could not be interpreted as receipt data.');
    logRawOpenAIResponseForDebug(resultText);
    return { items: [], additionalCosts: [], vat: null, totals: null };
  } catch (e) {
    console.error('Failed to parse JSON from OpenAI.');
    logRawOpenAIResponseForDebug(resultText);
    return { items: [], additionalCosts: [], vat: null, totals: null };
  }
}

function validateReceiptItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const validItems = [];

  items.forEach(function(item, index) {
    if (!item || typeof item !== 'object') {
      console.log(`Receipt item #${index + 1} skipped: invalid item structure.`);
      return;
    }

    const name = String(item.name || '').trim();
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice !== undefined ? item.unitPrice : item.price);
    const lineTotalValue = Number(
      item.lineTotal !== undefined ? item.lineTotal : (quantity * unitPrice)
    );
    const price = Number.isFinite(unitPrice) ? unitPrice : Number(item.price);

    if (name === '') {
      console.log(`Receipt item #${index + 1} skipped: empty product name.`);
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      console.log(`Receipt item #${index + 1} skipped: invalid quantity for "${name}".`);
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      console.log(`Receipt item #${index + 1} skipped: invalid price for "${name}".`);
      return;
    }

    if (
      Number.isFinite(lineTotalValue) &&
      Number.isFinite(quantity) &&
      Number.isFinite(unitPrice) &&
      Math.abs(lineTotalValue - (quantity * unitPrice)) > 0.01
    ) {
      console.log(`Receipt item #${index + 1} skipped: inconsistent line total for "${name}".`);
      return;
    }

    validItems.push({
      name: name,
      quantity: quantity,
      unitPrice: unitPrice,
      lineTotal: Number.isFinite(lineTotalValue) ? lineTotalValue : (quantity * unitPrice),
      price: price   // keep for backward compatibility with existing merge logic
    });
  });

  return validItems;
}

function validateAdditionalCosts(additionalCosts) {
  if (!Array.isArray(additionalCosts)) {
    return [];
  }

  const valid = [];

  additionalCosts.forEach(function(cost, index) {
    if (!cost || typeof cost !== 'object') return;

    const name = String(cost.name || '').trim();
    const type = String(cost.type || 'fee').toLowerCase();
    const amount = Number(cost.amount);

    if (name === '' || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    // Normalize type - strict whitelist: shipping or fee only
    let normalizedType = null;
    if (type.indexOf('ship') !== -1 || type.indexOf('vracht') !== -1 || type.indexOf('bezorg') !== -1) {
      normalizedType = 'shipping';
    } else if (type.indexOf('fee') !== -1 || type.indexOf('toeslag') !== -1 || type.indexOf('bijdrage') !== -1) {
      normalizedType = 'fee';
    }

    if (normalizedType === null) {
      return; // ignore discount_or_reward, payment_information, unknown
    }

    valid.push({
      name: name,
      type: normalizedType,
      amount: amount
    });
  });

  return valid;
}

function logRawOpenAIResponseForDebug(resultText) {
  if (isOpenAIResponseDebugEnabled()) {
    console.error('Raw OpenAI response:', resultText);
  }
}

/**
 * Small helper to surface documentTotalInclVat from OpenAI totals.
 * Used by normalization logic for column G.
 */
function getDocumentTotalInclVat(totals) {
  if (!totals) return 0;
  const incl = Number(totals.inclVAT);
  return (Number.isFinite(incl) && incl > 0) ? incl : 0;
}
