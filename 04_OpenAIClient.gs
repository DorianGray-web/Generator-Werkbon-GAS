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
const STAGE1_V3_DIAGNOSTIC_MODEL_ = "gpt-4o-2024-08-06";

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
  const analysisRoute = getReceiptAnalysisRoute_(
    mimeType,
    isStagedImageExtractionEnabled(),
  );

  if (analysisRoute === 'pdf') {
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
  } else if (
    analysisRoute === 'legacy-image' ||
    analysisRoute === 'staged-image'
  ) {
    const blob = file.getBlob();
    const base64Data = Utilities.base64Encode(blob.getBytes());
    return executeImageReceiptAnalysisRoute_(
      analysisRoute === 'staged-image',
      function () {
        return analyzeImageReceiptWithStagedExtraction_(
          mimeType,
          base64Data,
          openAIApiKey,
        );
      },
      function () {
        return analyzeImageReceiptWithLegacyExtraction_(
          mimeType,
          base64Data,
          openAIApiKey,
        );
      },
    );
  } else {
    throw new Error(`Unsupported MIME type for receipt analysis: ${mimeType}`);
  }
}

function getReceiptAnalysisRoute_(mimeType, stagedImageEnabled) {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.indexOf('image/') === 0) {
    return stagedImageEnabled ? 'staged-image' : 'legacy-image';
  }
  return 'unsupported';
}

function executeImageReceiptAnalysisRoute_(
  stagedEnabled,
  stagedAnalyzer,
  legacyAnalyzer,
) {
  return stagedEnabled ? stagedAnalyzer() : legacyAnalyzer();
}

function analyzeImageReceiptWithLegacyExtraction_(
  mimeType,
  base64Data,
  openAIApiKey,
) {
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

function analyzeImageReceiptWithStagedExtraction_(
  mimeType,
  base64Data,
  openAIApiKey,
) {
  const payload = buildOpenAIStage1V2Payload_(mimeType, base64Data);
  const response = UrlFetchApp.fetch(OPENAI.apiUrl, {
    method: 'post',
    headers: {
      Authorization: `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    throw createStagedImageExtractionError_(
      'perception',
      'STAGE1_HTTP_' + responseCode,
    );
  }

  const evidence = parseStagedImageEvidenceOrThrow_(response.getContentText());
  return buildStagedCanonicalReceiptOrThrow_(evidence);
}

function parseStagedImageEvidenceOrThrow_(responseText) {
  try {
    return parseOpenAIStage1V2Response_(responseText);
  } catch (error) {
    throw createStagedImageExtractionError_(
      'perception',
      'INVALID_STAGE1_RESPONSE',
    );
  }
}

function buildStagedCanonicalReceiptOrThrow_(evidence) {
  const stagedResult = buildStagedReceiptCandidate(evidence);

  if (!stagedResult.structuralStatus.resolved) {
    throw createStagedImageExtractionError_(
      'structure',
      firstStagedIssueCode_(
        stagedResult.structuralStatus.conflicts,
        'UNRESOLVED_STRUCTURE',
      ),
    );
  }
  if (!stagedResult.financialStatus.resolved) {
    if (
      stagedResult.financialStatus.code === "AMBIGUOUS_PRINTED_TOTAL_TYPE"
    ) {
      return buildForwardPricedAnchorCanonicalReceiptOrThrow_(stagedResult);
    }
    throw createStagedImageExtractionError_(
      'financial',
      stagedResult.financialStatus.code || 'UNRESOLVED_FINANCIAL_EVIDENCE',
    );
  }
  if (!stagedResult.canonicalReceipt) {
    throw createStagedImageExtractionError_(
      'canonical',
      'CANONICAL_GATE_REJECTED',
    );
  }

  return stagedResult.canonicalReceipt;
}

function buildForwardPricedAnchorCanonicalReceiptOrThrow_(stagedResult) {
  const boundedRelease =
    buildForwardPricedAnchorCanonicalRelease_(stagedResult);

  if (!boundedRelease.releaseStatus.eligible) {
    throw createStagedImageExtractionError_(
      'canonical',
      firstStagedIssueCode_(
        boundedRelease.conflicts,
        'FORWARD_PRICED_ANCHOR_RELEASE_REJECTED',
      ),
    );
  }

  return boundedRelease.canonicalReceipt;
}

function firstStagedIssueCode_(issues, fallbackCode) {
  return Array.isArray(issues) && issues.length > 0 && issues[0].code
    ? issues[0].code
    : fallbackCode;
}

function createStagedImageExtractionError_(stage, code) {
  const error = new Error(
    'Staged image receipt extraction failed [' + stage + ':' + code + '].',
  );
  error.name = 'StagedImageExtractionError';
  error.stage = stage;
  error.code = code;
  return error;
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

function buildOpenAIStage1V2Payload_(mimeType, base64Data) {
  const prompt =
    "Produce Stage-1-v2 literal visual evidence for this receipt image. " +
    "Inspect the complete printed product area, including its title and column-header lines, every physical product-description line, and nearby printed product-count, Netto, BTW amount, and total lines. " +
    "Return exactly one observedLines entry for every relevant physical printed line in visual top-to-bottom order. " +
    "Preserve the complete physical line in rawText as literally as possible, including punctuation and decimal separators. " +
    "For each line, copy only text visibly present on that same physical line into leadingQuantityText, descriptionText, unitPriceText, and lineTotalText; use null when a column is blank or not visible. " +
    "Do not create canonical products. Do not merge physical lines. Do not move a quantity or price between lines. " +
    "Do not calculate, reconcile, correct, or repair arithmetic. Do not use a printed total or product count to change any line observation. " +
    'Classify actual purchased-material evidence as roleEvidence "product". Use roleEvidence "summary" for printed total, optional printed product count, and explicit Netto or BTW amount rows in the same financial summary block. ' +
    'Use roleEvidence "informational" only for explicit non-product terminal receipt observations such as payment or tender lines, change lines, VAT breakdown lines outside that summary block, or other clearly non-product informational rows. Preserve each such visible line as its own observedLines entry. ' +
    'Classify roleEvidence only as "header", "product", "summary", "informational", or "unknown". ' +
    'roleEvidence is perception evidence, not authoritative truth; never use "informational" to hide an ambiguous or potentially product-like row, and use roleEvidence "unknown" whenever the visual role is uncertain or unresolved. ' +
    "For printedProductCount and printedTotal, preserve rawText and separately copy the visible labelText and valueText, linking each object to its physical observed line through sourceLineOrder. " +
    'First inspect the complete financial summary and decide whether one or more complete explicit VAT-summary relationships qualify for financialEvidence.vatBreakdowns before extracting any atomic financial observation. For this Stage-1 contract, vatBreakdowns and monetaryObservations are mutually exclusive representation modes. If vatBreakdowns.length > 0, emit those tuples, set monetaryObservations = [], do not perform atomic Netto or BTW extraction, and do not duplicate any rate, taxable-base, VAT-amount, or related-total component into monetaryObservations. ' +
    'When the document visibly presents an explicit VAT summary relationship in which a printed VAT percentage is applied to a taxable amount, together with the corresponding VAT amount and a related resulting total, emit one financialEvidence.vatBreakdowns tuple. The taxable base does not require the literal label "Netto"; wording such as "BTW van" may identify the visibly associated amount as taxableBase. ' +
    'Multiple tuple components may originate from the same physical summary line. Set componentProvenance for every component to its literal value and actual summary source line. Set associationEvidence to "explicit_vat_summary_relationship" only when that relationship is visually explicit. Do not emit that same relationship as monetaryObservations. ' +
    'For each vatBreakdown, sourceLineOrders must contain exactly the unique sourceLineOrder values referenced by componentProvenance.rate, componentProvenance.taxableBase, componentProvenance.vatAmount, and componentProvenance.total. Include no additional contextual summary lines: every sourceLineOrders entry must prove at least one tuple component, and every component provenance line must appear in sourceLineOrders. If all four components come from the same physical summary line, sourceLineOrders must contain exactly one value; for example, all components on line 16 means sourceLineOrders = [16]. Do not include an adjacent contextual line such as line 17 merely because it is part of the same visual summary area. Preserve valid multi-line tuples: if rate, taxable base, and VAT amount come from line 12 while total comes from line 13, sourceLineOrders = [12, 13]. ' +
    'Set totalVatBasisEvidence to "inclVAT" only when the printed VAT-summary layout visibly identifies the related total as the result of that taxable-base and VAT relationship; otherwise use null. A bare or unrelated "Totaal" label remains insufficient. Emit vatBreakdowns as an empty array when no complete explicit relationship is visible. ' +
    'Only if no complete explicit VAT-summary relationship exists, set vatBreakdowns = [] and then consider atomic monetaryObservations. monetaryObservations may be populated only when vatBreakdowns = []. In that mode, for each atomic explicit Netto or BTW amount summary row that represents one explicit financial meaning tied to one amount, add one financialEvidence.monetaryObservations entry with a unique evidenceId and a single sourceLineOrders entry linked to that same observed summary line. Copy its literal rawText, labelText, and valueText; use reportedMeaningEvidence "document_total" with reportedVatBasisEvidence "exclVAT" for Netto, or "vat_amount" with null basis for BTW; use reportedScopeEvidence "document". Do not invent missing rows or amounts. Do not duplicate printedTotal in monetaryObservations. A grouped VAT-summary row or block containing visibly related rate, taxable-base, VAT-amount, and related-total evidence is not atomic and must not be collapsed into one monetaryObservation. ' +
    'Do not infer a VAT breakdown from supplier identity, document title, row position, amount magnitude, or arithmetic. Do not treat taxableBase as a document exclVAT total, and do not treat total as inclVAT without explicit basis authority. ' +
    'For printedTotal, totalTypeEvidence may be "inclVAT" or "exclVAT" only when that meaning is visually explicit; otherwise totalTypeEvidence must be null. ' +
    'Never infer "inclVAT" merely from a label such as "Totaal". ' +
    "Return only the JSON object required by the response schema.";

  return {
    model: OPENAI.model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: "data:" + mimeType + ";base64," + base64Data,
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "stage1_v2_receipt_evidence",
        strict: true,
        schema: buildStage1V2JsonSchema_(),
      },
    },
    temperature: OPENAI.temperature,
  };
}

/**
 * Builds the manual-only Stage-1-v3 physical-evidence request.
 *
 * This payload has no production caller. Its pinned model is intentionally
 * isolated from OPENAI.model so a controlled diagnostic cannot change the
 * production Stage-1-v2 configuration.
 */
function buildOpenAIStage1V3DiagnosticPayload_(mimeType, base64Data) {
  assertStage1V3DiagnosticImageMimeType_(mimeType);

  const prompt =
    "Produce Stage-1-v3 physical receipt evidence for this image. " +
    "Describe only visible physical evidence before any downstream receipt interpretation. " +
    "Report all relevant physical rows in visual top-to-bottom order, using a stable unique rowId for every row within this response. " +
    "For every row, preserve literal row text in rawText and report all meaningful visible cells or fragments in visual left-to-right columnOrder, using a stable unique cellId for every cell within this response. " +
    "Preserve literal cell text in each cell rawText. Report an explicit empty cell position with rawText as an empty string and emptyEvidence true only when that empty position is visually supported; otherwise do not invent the cell. " +
    'Report indentationEvidence only as "left_aligned", "indented", or "unclear" and roleEvidence only as "header", "product", "summary", or "unknown". ' +
    'Report meaningEvidence only with a schema-supported value and use "unknown" whenever the physical role or meaning is uncertain. ' +
    "Set headerCellRef only when the physical earlier-header-to-cell association in the same visual column is visibly supported; otherwise use null. " +
    "Summary evidence may reference only actual rowIds and cellIds reported in this response, and all label/value references for one summary must belong to its actual source row. " +
    'Set totalTypeEvidence to "inclVAT" or "exclVAT" only when that VAT basis is visually explicit; otherwise use null. ' +
    "Do not move a price to another physical row. Do not move a quantity to another physical row. Do not merge physical rows. " +
    "Do not reconstruct an expected product block, use a printed product count or printed total to repair topology, or use arithmetic or quantity-times-price reasoning to infer missing values or choose associations. " +
    "Do not reconcile values, infer VAT meaning, apply merchant-specific assumptions, invent missing cells, or silently correct OCR or transcription. " +
    "Do not construct a canonical receipt. Describe what is visibly present, not what the receipt is expected to mean. " +
    "Return only the JSON object required by the response schema.";

  return {
    model: STAGE1_V3_DIAGNOSTIC_MODEL_,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: "data:" + mimeType + ";base64," + base64Data,
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "stage1_v3_physical_receipt_evidence",
        strict: true,
        schema: buildStage1V3PhysicalEvidenceJsonSchema_(),
      },
    },
    temperature: OPENAI.temperature,
  };
}

/**
 * Executes exactly one isolated Stage-1-v3 request. A transport may be
 * injected by deterministic tests; production routing never calls this.
 */
function requestOpenAIStage1V3Diagnostic_(
  mimeType,
  base64Data,
  openAIApiKey,
  fetchFunction,
) {
  const payload = buildOpenAIStage1V3DiagnosticPayload_(mimeType, base64Data);
  const transport =
    typeof fetchFunction === "function"
      ? fetchFunction
      : function (url, options) {
          return UrlFetchApp.fetch(url, options);
        };
  const response = transport(OPENAI.apiUrl, {
    method: "post",
    headers: {
      Authorization: "Bearer " + openAIApiKey,
      "Content-Type": "application/json",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    throw createStage1V3DiagnosticError_(
      "transport",
      "STAGE1_V3_HTTP_" + responseCode,
    );
  }

  const responseText = response.getContentText();
  let evidence;
  try {
    evidence = parseOpenAIStage1V3Response_(responseText);
  } catch (error) {
    throw createStage1V3DiagnosticError_(
      "contract",
      "INVALID_STAGE1_V3_RESPONSE",
      error,
    );
  }

  return {
    requestedModel: payload.model,
    responseJson: JSON.parse(responseText),
    evidence: evidence,
  };
}

function assertStage1V3DiagnosticImageMimeType_(mimeType) {
  if (typeof mimeType !== "string" || mimeType.indexOf("image/") !== 0) {
    throw createStage1V3DiagnosticError_(
      "preflight",
      "UNSUPPORTED_STAGE1_V3_IMAGE_MIME",
    );
  }
}

const STAGE1_V3_DIAGNOSTIC_CAUSE_NAME_MAX_LENGTH_ = 80;
const STAGE1_V3_DIAGNOSTIC_CAUSE_MESSAGE_MAX_LENGTH_ = 512;
const STAGE1_V3_DIAGNOSTIC_CAUSE_NAME_FALLBACK_ = "Error";
const STAGE1_V3_DIAGNOSTIC_CAUSE_MESSAGE_FALLBACK_ =
  "Stage-1-v3 parser/validator failed without a usable message.";

function normalizeStage1V3DiagnosticCause_(cause) {
  function readStringProperty(propertyName) {
    if (
      !cause ||
      (typeof cause !== "object" && typeof cause !== "function")
    ) {
      return "";
    }
    try {
      const propertyValue = cause[propertyName];
      return typeof propertyValue === "string" ? propertyValue : "";
    } catch (error) {
      return "";
    }
  }

  function normalizeText(value, fallback, maximumLength) {
    const normalized = value
      .replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const usable = normalized || fallback;
    return usable.length > maximumLength
      ? usable.slice(0, maximumLength)
      : usable;
  }

  return {
    causeName: normalizeText(
      readStringProperty("name"),
      STAGE1_V3_DIAGNOSTIC_CAUSE_NAME_FALLBACK_,
      STAGE1_V3_DIAGNOSTIC_CAUSE_NAME_MAX_LENGTH_,
    ),
    causeMessage: normalizeText(
      readStringProperty("message"),
      STAGE1_V3_DIAGNOSTIC_CAUSE_MESSAGE_FALLBACK_,
      STAGE1_V3_DIAGNOSTIC_CAUSE_MESSAGE_MAX_LENGTH_,
    ),
  };
}

function createStage1V3DiagnosticError_(stage, code, cause) {
  const normalizedCause =
    arguments.length > 2
      ? normalizeStage1V3DiagnosticCause_(cause)
      : null;
  let message =
    "Stage-1-v3 diagnostic failed [" + stage + ":" + code + "].";
  if (normalizedCause) {
    message += " Cause: " + normalizedCause.causeMessage;
  }
  const error = new Error(message);
  error.name = "Stage1V3DiagnosticError";
  error.stage = stage;
  error.code = code;
  if (normalizedCause) {
    error.causeName = normalizedCause.causeName;
    error.causeMessage = normalizedCause.causeMessage;
  }
  return error;
}

function buildStage1V2JsonSchema_() {
  const nullableString = { type: ["string", "null"] };
  const summaryBaseProperties = {
    sourceLineOrder: { type: "integer", minimum: 1 },
    rawText: { type: "string" },
    labelText: { type: "string" },
    valueText: { type: "string" },
  };
  const productCountEvidence = {
    type: "object",
    additionalProperties: false,
    properties: summaryBaseProperties,
    required: ["sourceLineOrder", "rawText", "labelText", "valueText"],
  };
  const totalEvidence = {
    type: "object",
    additionalProperties: false,
    properties: {
      sourceLineOrder: summaryBaseProperties.sourceLineOrder,
      rawText: summaryBaseProperties.rawText,
      labelText: summaryBaseProperties.labelText,
      valueText: summaryBaseProperties.valueText,
      totalTypeEvidence: {
        type: ["string", "null"],
        enum: ["inclVAT", "exclVAT", null],
      },
    },
    required: [
      "sourceLineOrder",
      "rawText",
      "labelText",
      "valueText",
      "totalTypeEvidence",
    ],
  };

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      observedLines: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            order: { type: "integer", minimum: 1 },
            rawText: { type: "string" },
            leadingQuantityText: nullableString,
            descriptionText: nullableString,
            unitPriceText: nullableString,
            lineTotalText: nullableString,
            indentation: {
              type: "string",
              enum: ["left_aligned", "indented", "unclear"],
            },
            roleEvidence: {
              type: "string",
              enum: [
                "header",
                "product",
                "summary",
                "informational",
                "unknown",
              ],
            },
          },
          required: [
            "order",
            "rawText",
            "leadingQuantityText",
            "descriptionText",
            "unitPriceText",
            "lineTotalText",
            "indentation",
            "roleEvidence",
          ],
        },
      },
      summaryEvidence: {
        type: "object",
        additionalProperties: false,
        properties: {
          printedProductCount: {
            anyOf: [productCountEvidence, { type: "null" }],
          },
          printedTotal: {
            anyOf: [totalEvidence, { type: "null" }],
          },
        },
        required: ["printedProductCount", "printedTotal"],
      },
      financialEvidence: {
        type: "object",
        additionalProperties: false,
        properties: {
          monetaryObservations: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                evidenceId: { type: "string" },
                sourceLineOrders: {
                  type: "array",
                  items: { type: "integer", minimum: 1 },
                },
                rawText: { type: "string" },
                labelText: { type: "string" },
                valueText: { type: "string" },
                reportedMeaningEvidence: {
                  type: "string",
                  enum: ["document_total", "vat_amount"],
                },
                reportedVatBasisEvidence: {
                  type: ["string", "null"],
                  enum: ["exclVAT", null],
                },
                reportedScopeEvidence: {
                  type: "string",
                  enum: ["document"],
                },
              },
              required: [
                "evidenceId", "sourceLineOrders", "rawText", "labelText",
                "valueText", "reportedMeaningEvidence",
                "reportedVatBasisEvidence", "reportedScopeEvidence",
              ],
            },
          },
          vatBreakdowns: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                evidenceId: { type: "string" },
                sourceLineOrders: {
                  type: "array",
                  minItems: 1,
                  items: { type: "integer", minimum: 1 },
                },
                rateText: { type: "string" },
                taxableBaseText: { type: "string" },
                vatAmountText: { type: "string" },
                totalText: { type: "string" },
                reportedScopeEvidence: {
                  type: "string",
                  enum: ["document"],
                },
                totalVatBasisEvidence: {
                  type: ["string", "null"],
                  enum: ["inclVAT", null],
                },
                componentProvenance: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    rate: buildStage1V2VatComponentProvenanceSchema_(),
                    taxableBase: buildStage1V2VatComponentProvenanceSchema_(),
                    vatAmount: buildStage1V2VatComponentProvenanceSchema_(),
                    total: buildStage1V2VatComponentProvenanceSchema_(),
                  },
                  required: ["rate", "taxableBase", "vatAmount", "total"],
                },
                associationEvidence: {
                  type: "string",
                  enum: ["explicit_vat_summary_relationship"],
                },
              },
              required: [
                "evidenceId", "sourceLineOrders", "rateText",
                "taxableBaseText", "vatAmountText", "totalText",
                "reportedScopeEvidence", "totalVatBasisEvidence",
                "componentProvenance", "associationEvidence",
              ],
            },
          },
        },
        required: ["monetaryObservations", "vatBreakdowns"],
      },
    },
    required: ["observedLines", "summaryEvidence", "financialEvidence"],
  };
}

function buildStage1V2VatComponentProvenanceSchema_() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      sourceLineOrder: { type: "integer", minimum: 1 },
      valueText: { type: "string" },
    },
    required: ["sourceLineOrder", "valueText"],
  };
}

function parseOpenAIStage1V2Response_(responseText) {
  return parseOpenAIStage1V2Envelope_(responseText).evidence;
}

function parseOpenAIStage1V2Envelope_(responseText) {
  let responseJson;
  try {
    responseJson = JSON.parse(responseText);
  } catch (error) {
    throw new Error("OpenAI Stage-1-v2 response was not valid JSON.");
  }

  const choice =
    responseJson &&
    Array.isArray(responseJson.choices) &&
    responseJson.choices.length > 0
      ? responseJson.choices[0]
      : null;
  const content =
    choice && choice.message && typeof choice.message.content === "string"
      ? choice.message.content
      : "";

  if (content.trim() === "") {
    throw new Error("OpenAI Stage-1-v2 returned no JSON evidence content.");
  }

  let evidence;
  try {
    evidence = JSON.parse(content);
  } catch (error) {
    throw new Error("OpenAI Stage-1-v2 content was not valid JSON evidence.");
  }

  validateStage1V2Evidence_(evidence);
  return { responseJson: responseJson, evidence: evidence };
}

function validateStage1V2Evidence_(evidence) {
  assertStage1V2PlainObject_(evidence, "evidence");
  assertStage1V2ExactKeys_(
    evidence,
    evidence.financialEvidence === undefined
      ? ["observedLines", "summaryEvidence"]
      : ["observedLines", "summaryEvidence", "financialEvidence"],
    "evidence",
  );

  if (!Array.isArray(evidence.observedLines)) {
    throw new Error("Stage-1-v2 evidence.observedLines must be an array.");
  }

  evidence.observedLines.forEach(function (line, index) {
    const path = "observedLines[" + index + "]";
    assertStage1V2PlainObject_(line, path);
    assertStage1V2ExactKeys_(
      line,
      [
        "order",
        "rawText",
        "leadingQuantityText",
        "descriptionText",
        "unitPriceText",
        "lineTotalText",
        "indentation",
        "roleEvidence",
      ],
      path,
    );

    if (!Number.isInteger(line.order) || line.order <= 0) {
      throw new Error("Stage-1-v2 " + path + ".order must be a positive integer.");
    }
    if (typeof line.rawText !== "string") {
      throw new Error("Stage-1-v2 " + path + ".rawText must be a string.");
    }
    [
      "leadingQuantityText",
      "descriptionText",
      "unitPriceText",
      "lineTotalText",
    ].forEach(function (fieldName) {
      const value = line[fieldName];
      if (value !== null && typeof value !== "string") {
        throw new Error(
          "Stage-1-v2 " + path + "." + fieldName +
            " must be a string or null.",
        );
      }
    });
    if (
      ["left_aligned", "indented", "unclear"].indexOf(line.indentation) < 0
    ) {
      throw new Error("Stage-1-v2 " + path + ".indentation is unsupported.");
    }
    if (
      ["header", "product", "summary", "informational", "unknown"].indexOf(
        line.roleEvidence,
      ) < 0
    ) {
      throw new Error("Stage-1-v2 " + path + ".roleEvidence is unsupported.");
    }
  });

  assertStage1V2PlainObject_(evidence.summaryEvidence, "summaryEvidence");
  assertStage1V2ExactKeys_(
    evidence.summaryEvidence,
    ["printedProductCount", "printedTotal"],
    "summaryEvidence",
  );
  validateStage1V2SummaryObject_(
    evidence.summaryEvidence.printedProductCount,
    "summaryEvidence.printedProductCount",
    false,
  );
  validateStage1V2SummaryObject_(
    evidence.summaryEvidence.printedTotal,
    "summaryEvidence.printedTotal",
    true,
  );
  if (evidence.financialEvidence !== undefined) {
    assertStage1V2PlainObject_(evidence.financialEvidence, "financialEvidence");
    const hasVatBreakdowns = Object.prototype.hasOwnProperty.call(
      evidence.financialEvidence,
      "vatBreakdowns",
    );
    assertStage1V2ExactKeys_(
      evidence.financialEvidence,
      hasVatBreakdowns
        ? ["monetaryObservations", "vatBreakdowns"]
        : ["monetaryObservations"],
      "financialEvidence",
    );
    if (!Array.isArray(evidence.financialEvidence.monetaryObservations)) {
      throw new Error("Stage-1-v2 financialEvidence.monetaryObservations must be an array.");
    }
    evidence.financialEvidence.monetaryObservations.forEach(function (item, index) {
      const path = "financialEvidence.monetaryObservations[" + index + "]";
      assertStage1V2PlainObject_(item, path);
      const observationKeys = [
        "evidenceId", "sourceLineOrders", "rawText", "labelText", "valueText",
        "reportedMeaningEvidence", "reportedVatBasisEvidence",
        "reportedScopeEvidence",
      ];
      // A missing label is the sole missing field eligible for source-grounded
      // recovery; all other missing or extra fields retain strict rejection.
      assertStage1V2ExactKeys_(item,
        Object.prototype.hasOwnProperty.call(item, "labelText")
          ? observationKeys
          : observationKeys.filter(function (key) {
              return key !== "labelText";
            }), path);
      if (typeof item.evidenceId !== "string" || !item.evidenceId.trim() ||
          !Array.isArray(item.sourceLineOrders) || item.sourceLineOrders.length !== 1 ||
          !Number.isInteger(item.sourceLineOrders[0]) || item.sourceLineOrders[0] <= 0 ||
          ["rawText", "valueText"].some(function (field) {
            return typeof item[field] !== "string" || !item[field].trim();
          }) || (item.labelText !== undefined && item.labelText !== null &&
            typeof item.labelText !== "string")) {
        throw new Error("Stage-1-v2 " + path + " has invalid source evidence.");
      }
      let label = typeof item.labelText === "string"
        ? item.labelText.trim().toLowerCase().replace(/[.:]/g, "").trim()
        : "";
      const recoveryCode = !label
        ? "MONETARY_LABEL_MISSING_OR_BLANK"
        : label !== "netto" && label !== "btw"
          ? "MONETARY_LABEL_UNSUPPORTED_STRING"
          : null;
      if (recoveryCode !== null) {
        item.labelText = recoverStage1V2KnownMonetaryLabel_(
          item, evidence, path,
        );
        label = item.labelText.toLowerCase();
      }
      const isNetto = label === "netto";
      const isBtw = label === "btw";
      if ((!isNetto && !isBtw) ||
          item.reportedMeaningEvidence !== (isNetto ? "document_total" : "vat_amount") ||
          item.reportedVatBasisEvidence !== (isNetto ? "exclVAT" : null) ||
          item.reportedScopeEvidence !== "document" ||
          item.rawText.toLowerCase().indexOf(label) < 0 ||
          item.rawText.indexOf(item.valueText) < 0) {
        throw new Error("Stage-1-v2 " + path + " has unsupported financial meaning.");
      }
    });
    if (hasVatBreakdowns) {
      validateStage1V2VatBreakdowns_(evidence);
    }
  }
}

function recoverStage1V2KnownMonetaryLabel_(item, evidence, path) {
  const order = item.sourceLineOrders[0];
  const sourceLines = evidence.observedLines.filter(function (line) {
    return line.order === order;
  });
  const sourceLine = sourceLines.length === 1 ? sourceLines[0] : null;
  const duplicateReference =
    evidence.financialEvidence.monetaryObservations.filter(function (other) {
      return other && Array.isArray(other.sourceLineOrders) &&
        other.sourceLineOrders.indexOf(order) >= 0;
    }).length !== 1;
  if (!sourceLine || sourceLine.roleEvidence !== "summary" ||
      sourceLine.rawText !== item.rawText || duplicateReference ||
      (evidence.summaryEvidence.printedTotal &&
        evidence.summaryEvidence.printedTotal.sourceLineOrder === order) ||
      (evidence.summaryEvidence.printedProductCount &&
        evidence.summaryEvidence.printedProductCount.sourceLineOrder === order)) {
    throw new Error("Stage-1-v2 " + path + " has invalid source evidence.");
  }
  // An anchored two-token monetary row is the only accepted recovery source.
  // Its one value must exactly match the observation; no amount is repaired.
  const sourceMatch = sourceLine.rawText.trim().match(
    /^(Netto|BTW)\s+(\d{1,6}[.,]\d{2})$/i,
  );
  if (!sourceMatch) {
    throw new Error("Stage-1-v2 " + path + " has unsupported financial meaning.");
  }
  const literalLabel = sourceMatch[1].toLowerCase();
  if (item.valueText.trim() !== sourceMatch[2]) {
    throw new Error("Stage-1-v2 " + path + " has invalid source evidence.");
  }
  if (item.reportedMeaningEvidence !==
        (literalLabel === "netto" ? "document_total" : "vat_amount") ||
      item.reportedVatBasisEvidence !==
        (literalLabel === "netto" ? "exclVAT" : null) ||
      item.reportedScopeEvidence !== "document") {
    throw new Error("Stage-1-v2 " + path + " has unsupported financial meaning.");
  }
  return sourceMatch[1];
}

function validateStage1V2VatBreakdowns_(evidence) {
  const financialEvidence = evidence.financialEvidence;
  const vatBreakdowns = financialEvidence.vatBreakdowns;
  if (!Array.isArray(vatBreakdowns)) {
    throw new Error("Stage-1-v2 financialEvidence.vatBreakdowns must be an array.");
  }
  if (
    vatBreakdowns.length > 0 &&
    financialEvidence.monetaryObservations.length > 0
  ) {
    throw new Error(
      "Stage-1-v2 financialEvidence has overlapping financial representations.",
    );
  }

  const observationByOrder = {};
  evidence.observedLines.forEach(function (line) {
    if (!observationByOrder[line.order]) observationByOrder[line.order] = [];
    observationByOrder[line.order].push(line);
  });
  const reservedOrders = {};
  [
    evidence.summaryEvidence.printedProductCount,
    evidence.summaryEvidence.printedTotal,
  ].forEach(function (item) {
    if (item) reservedOrders[item.sourceLineOrder] = true;
  });
  const monetaryEvidenceIds = {};
  financialEvidence.monetaryObservations.forEach(function (item) {
    monetaryEvidenceIds[item.evidenceId] = true;
    item.sourceLineOrders.forEach(function (order) {
      reservedOrders[order] = true;
    });
  });

  const seenEvidenceIds = {};
  const seenSourceOrders = {};
  vatBreakdowns.forEach(function (tuple, index) {
    const path = "financialEvidence.vatBreakdowns[" + index + "]";
    assertStage1V2PlainObject_(tuple, path);
    assertStage1V2ExactKeys_(tuple, [
      "evidenceId", "sourceLineOrders", "rateText", "taxableBaseText",
      "vatAmountText", "totalText", "reportedScopeEvidence",
      "totalVatBasisEvidence", "componentProvenance", "associationEvidence",
    ], path);
    if (
      typeof tuple.evidenceId !== "string" || !tuple.evidenceId.trim() ||
      seenEvidenceIds[tuple.evidenceId] || monetaryEvidenceIds[tuple.evidenceId]
    ) {
      throw new Error("Stage-1-v2 " + path + " has invalid evidence identity.");
    }
    seenEvidenceIds[tuple.evidenceId] = true;
    if (
      !Array.isArray(tuple.sourceLineOrders) ||
      tuple.sourceLineOrders.length === 0 ||
      tuple.sourceLineOrders.some(function (order, orderIndex) {
        return !Number.isInteger(order) || order <= 0 ||
          tuple.sourceLineOrders.indexOf(order) !== orderIndex;
      })
    ) {
      throw new Error("Stage-1-v2 " + path + " has invalid source evidence.");
    }
    tuple.sourceLineOrders.forEach(function (order) {
      const lines = observationByOrder[order] || [];
      if (
        lines.length !== 1 || lines[0].roleEvidence !== "summary" ||
        reservedOrders[order] || seenSourceOrders[order]
      ) {
        throw new Error("Stage-1-v2 " + path + " has invalid source evidence.");
      }
      seenSourceOrders[order] = true;
    });
    if (
      !isStage1V2VatRateText_(tuple.rateText) ||
      !isStage1V2PlainAmountText_(tuple.taxableBaseText) ||
      !isStage1V2PlainAmountText_(tuple.vatAmountText) ||
      !isStage1V2PlainAmountText_(tuple.totalText) ||
      tuple.reportedScopeEvidence !== "document" ||
      ["inclVAT", null].indexOf(tuple.totalVatBasisEvidence) < 0 ||
      tuple.associationEvidence !== "explicit_vat_summary_relationship"
    ) {
      throw new Error("Stage-1-v2 " + path + " has unsupported VAT breakdown semantics.");
    }

    assertStage1V2PlainObject_(
      tuple.componentProvenance,
      path + ".componentProvenance",
    );
    const componentSpecs = [
      ["rate", "rateText"],
      ["taxableBase", "taxableBaseText"],
      ["vatAmount", "vatAmountText"],
      ["total", "totalText"],
    ];
    assertStage1V2ExactKeys_(
      tuple.componentProvenance,
      componentSpecs.map(function (spec) { return spec[0]; }),
      path + ".componentProvenance",
    );
    const usedSourceOrders = {};
    const usedFragments = {};
    componentSpecs.forEach(function (spec) {
      const componentName = spec[0];
      const textField = spec[1];
      const componentPath = path + ".componentProvenance." + componentName;
      const provenance = tuple.componentProvenance[componentName];
      assertStage1V2PlainObject_(provenance, componentPath);
      assertStage1V2ExactKeys_(
        provenance,
        ["sourceLineOrder", "valueText"],
        componentPath,
      );
      const sourceLineOrder = provenance.sourceLineOrder;
      const valueText = provenance.valueText;
      const sourceLines = observationByOrder[sourceLineOrder] || [];
      const sourceLine = sourceLines.length === 1 ? sourceLines[0] : null;
      const fragmentKey = String(sourceLineOrder) + "\n" + String(valueText);
      if (
        tuple.sourceLineOrders.indexOf(sourceLineOrder) < 0 ||
        valueText !== tuple[textField] ||
        !sourceLine || sourceLine.roleEvidence !== "summary" ||
        sourceLine.rawText.indexOf(valueText) < 0 ||
        sourceLine.rawText.indexOf(valueText) !==
          sourceLine.rawText.lastIndexOf(valueText) ||
        usedFragments[fragmentKey]
      ) {
        throw new Error(
          "Stage-1-v2 " + path + " has ambiguous component provenance.",
        );
      }
      usedFragments[fragmentKey] = true;
      usedSourceOrders[sourceLineOrder] = true;
    });
    if (tuple.sourceLineOrders.some(function (order) {
      return !usedSourceOrders[order];
    })) {
      throw new Error(
        "Stage-1-v2 " + path + " has ambiguous association evidence.",
      );
    }
  });
}

function isStage1V2VatRateText_(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?%$/.exec(value.trim());
  if (!match) return false;
  const basisPoints = Number(match[1]) * 100 +
    Number((match[2] || "").padEnd(2, "0") || 0);
  return basisPoints > 0 && basisPoints <= 10000;
}

function isStage1V2PlainAmountText_(value) {
  return typeof value === "string" && /^\d{1,6}[.,]\d{2}$/.test(value.trim());
}

function validateStage1V2SummaryObject_(evidence, path, isTotal) {
  if (evidence === null) return;

  assertStage1V2PlainObject_(evidence, path);
  const keys = ["sourceLineOrder", "rawText", "labelText", "valueText"];
  if (isTotal) keys.push("totalTypeEvidence");
  assertStage1V2ExactKeys_(evidence, keys, path);

  if (!Number.isInteger(evidence.sourceLineOrder) || evidence.sourceLineOrder <= 0) {
    throw new Error("Stage-1-v2 " + path + ".sourceLineOrder is invalid.");
  }
  ["rawText", "labelText", "valueText"].forEach(function (fieldName) {
    if (typeof evidence[fieldName] !== "string") {
      throw new Error(
        "Stage-1-v2 " + path + "." + fieldName + " must be a string.",
      );
    }
  });

  if (
    isTotal &&
    evidence.totalTypeEvidence !== null &&
    evidence.totalTypeEvidence !== "inclVAT" &&
    evidence.totalTypeEvidence !== "exclVAT"
  ) {
    throw new Error("Stage-1-v2 " + path + ".totalTypeEvidence is unsupported.");
  }
}

function assertStage1V2PlainObject_(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Stage-1-v2 " + path + " must be an object.");
  }
}

function assertStage1V2ExactKeys_(value, allowedKeys, path) {
  const keys = Object.keys(value).sort();
  const expected = allowedKeys.slice().sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error("Stage-1-v2 " + path + " has invalid fields.");
  }
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
        items: validateReceiptItems(parsedData.items || [], {
          vat: parsedData.vat,
          totals: parsedData.totals
        }),
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

function validateReceiptItems(items, pdfValidationContext) {
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
      if (!matchesSingleItemPdfCrossVatBasis_(
        items, quantity, unitPrice, lineTotalValue, pdfValidationContext
      )) {
        console.log(`Receipt item #${index + 1} skipped: inconsistent line total for "${name}".`);
        return;
      }
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

function matchesSingleItemPdfCrossVatBasis_(items, quantity, unitPrice, lineTotal, context) {
  if (items.length !== 1 || !context || !context.totals) return false;

  const totals = context.totals;
  const vat = context.vat;
  const hasVatAmount = vat && vat.amount !== null && vat.amount !== undefined;
  const hasTotalsVatAmount = totals.vatAmount !== null && totals.vatAmount !== undefined;
  if (
    (!hasVatAmount && !hasTotalsVatAmount) ||
    (hasVatAmount && !Number.isFinite(vat.amount)) ||
    (hasTotalsVatAmount && !Number.isFinite(totals.vatAmount))
  ) return false;

  const vatAmount = hasVatAmount ? vat.amount : totals.vatAmount;
  return Number.isFinite(quantity) && Number.isFinite(unitPrice) &&
    Number.isFinite(lineTotal) &&
    Number.isFinite(totals.exclVAT) && Number.isFinite(totals.inclVAT) &&
    totals.exclVAT >= 0 && totals.inclVAT > 0 && vatAmount > 0 &&
    Math.abs(quantity * unitPrice - totals.inclVAT) <= 0.01 &&
    Math.abs(lineTotal - totals.exclVAT) <= 0.01 &&
    Math.abs(totals.exclVAT + vatAmount - totals.inclVAT) <= 0.01 &&
    (!hasVatAmount || !hasTotalsVatAmount ||
      Math.abs(vat.amount - totals.vatAmount) <= 0.01);
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
