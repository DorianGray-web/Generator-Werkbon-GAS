// =========================================================================
// EXPERIMENTAL STAGE-1-V3 PHYSICAL RECEIPT EVIDENCE
// =========================================================================

/**
 * Stage-1-v3 stops at immutable, model-reported physical evidence.
 *
 * This module deliberately contains no OpenAI request, observedLines
 * projection, product grouping, financial interpretation, or production
 * routing. Model-reported topology and annotations remain evidence, not truth.
 */

function buildStage1V3PhysicalEvidenceJsonSchema_() {
  const stringArray = {
    type: "array",
    minItems: 1,
    items: { type: "string" },
  };
  const summaryBaseProperties = {
    sourceRowId: { type: "string" },
    labelCellRefs: stringArray,
    valueCellRefs: stringArray,
  };
  const productCountEvidence = {
    type: "object",
    additionalProperties: false,
    properties: summaryBaseProperties,
    required: ["sourceRowId", "labelCellRefs", "valueCellRefs"],
  };
  const totalEvidence = {
    type: "object",
    additionalProperties: false,
    properties: {
      sourceRowId: summaryBaseProperties.sourceRowId,
      labelCellRefs: summaryBaseProperties.labelCellRefs,
      valueCellRefs: summaryBaseProperties.valueCellRefs,
      totalTypeEvidence: {
        type: ["string", "null"],
        enum: ["inclVAT", "exclVAT", null],
      },
    },
    required: [
      "sourceRowId",
      "labelCellRefs",
      "valueCellRefs",
      "totalTypeEvidence",
    ],
  };

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      schemaVersion: {
        type: "string",
        enum: ["stage1-v3"],
      },
      physicalRows: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            rowId: { type: "string" },
            order: { type: "integer", minimum: 1 },
            rawText: { type: "string" },
            indentationEvidence: {
              type: "string",
              enum: ["left_aligned", "indented", "unclear"],
            },
            roleEvidence: {
              type: "string",
              enum: ["header", "product", "summary", "unknown"],
            },
            cells: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  cellId: { type: "string" },
                  columnOrder: { type: "integer", minimum: 1 },
                  rawText: { type: "string" },
                  emptyEvidence: { type: "boolean" },
                  headerCellRef: { type: ["string", "null"] },
                  meaningEvidence: {
                    type: "string",
                    enum: [
                      "quantity",
                      "description",
                      "unit_price",
                      "line_total",
                      "summary_label",
                      "summary_value",
                      "other",
                      "unknown",
                    ],
                  },
                },
                required: [
                  "cellId",
                  "columnOrder",
                  "rawText",
                  "emptyEvidence",
                  "headerCellRef",
                  "meaningEvidence",
                ],
              },
            },
          },
          required: [
            "rowId",
            "order",
            "rawText",
            "indentationEvidence",
            "roleEvidence",
            "cells",
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
    },
    required: ["schemaVersion", "physicalRows", "summaryEvidence"],
  };
}

function parseOpenAIStage1V3Response_(responseText) {
  return parseOpenAIStage1V3Envelope_(responseText).evidence;
}

function parseOpenAIStage1V3Envelope_(responseText) {
  let responseJson;
  try {
    responseJson = JSON.parse(responseText);
  } catch (error) {
    throw new Error("OpenAI Stage-1-v3 response was not valid JSON.");
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
    throw new Error("OpenAI Stage-1-v3 returned no JSON evidence content.");
  }

  let evidence;
  try {
    evidence = JSON.parse(content);
  } catch (error) {
    throw new Error(
      "OpenAI Stage-1-v3 content was not valid JSON evidence.",
    );
  }

  validateStage1V3PhysicalEvidence_(evidence);
  return {
    responseJson: responseJson,
    evidence: deepFreezeStage1V3Evidence_(evidence),
  };
}

function validateStage1V3PhysicalEvidence_(evidence) {
  assertStage1V3PlainObject_(evidence, "evidence");
  assertStage1V3ExactKeys_(
    evidence,
    ["schemaVersion", "physicalRows", "summaryEvidence"],
    "evidence",
  );
  if (evidence.schemaVersion !== "stage1-v3") {
    throw new Error("Stage-1-v3 evidence.schemaVersion is unsupported.");
  }
  if (!Array.isArray(evidence.physicalRows)) {
    throw new Error("Stage-1-v3 evidence.physicalRows must be an array.");
  }

  const rowEntries = {};
  const cellEntries = {};
  let previousRowOrder = 0;

  evidence.physicalRows.forEach(function (row, rowIndex) {
    const rowPath = "evidence.physicalRows[" + rowIndex + "]";
    assertStage1V3PlainObject_(row, rowPath);
    assertStage1V3ExactKeys_(
      row,
      [
        "rowId",
        "order",
        "rawText",
        "indentationEvidence",
        "roleEvidence",
        "cells",
      ],
      rowPath,
    );
    assertStage1V3Identity_(row.rowId, rowEntries, rowPath + ".rowId");
    if (!Number.isInteger(row.order) || row.order <= previousRowOrder) {
      throw new Error("Stage-1-v3 " + rowPath + ".order is invalid.");
    }
    previousRowOrder = row.order;
    if (typeof row.rawText !== "string") {
      throw new Error("Stage-1-v3 " + rowPath + ".rawText must be a string.");
    }
    if (
      ["left_aligned", "indented", "unclear"].indexOf(
        row.indentationEvidence,
      ) < 0
    ) {
      throw new Error(
        "Stage-1-v3 " + rowPath + ".indentationEvidence is unsupported.",
      );
    }
    if (
      ["header", "product", "summary", "unknown"].indexOf(
        row.roleEvidence,
      ) < 0
    ) {
      throw new Error(
        "Stage-1-v3 " + rowPath + ".roleEvidence is unsupported.",
      );
    }
    if (!Array.isArray(row.cells) || row.cells.length === 0) {
      throw new Error(
        "Stage-1-v3 " + rowPath + ".cells must be a non-empty array.",
      );
    }

    rowEntries[row.rowId] = {
      row: row,
      path: rowPath,
    };
    let previousColumnOrder = 0;
    row.cells.forEach(function (cell, cellIndex) {
      const cellPath = rowPath + ".cells[" + cellIndex + "]";
      assertStage1V3PlainObject_(cell, cellPath);
      assertStage1V3ExactKeys_(
        cell,
        [
          "cellId",
          "columnOrder",
          "rawText",
          "emptyEvidence",
          "headerCellRef",
          "meaningEvidence",
        ],
        cellPath,
      );
      assertStage1V3Identity_(cell.cellId, cellEntries, cellPath + ".cellId");
      if (
        !Number.isInteger(cell.columnOrder) ||
        cell.columnOrder <= previousColumnOrder
      ) {
        throw new Error(
          "Stage-1-v3 " + cellPath + ".columnOrder is invalid.",
        );
      }
      previousColumnOrder = cell.columnOrder;
      if (typeof cell.rawText !== "string") {
        throw new Error(
          "Stage-1-v3 " + cellPath + ".rawText must be a string.",
        );
      }
      if (
        typeof cell.emptyEvidence !== "boolean" ||
        cell.emptyEvidence !== (cell.rawText === "")
      ) {
        throw new Error(
          "Stage-1-v3 " + cellPath + ".emptyEvidence contradicts rawText.",
        );
      }
      if (
        cell.emptyEvidence &&
        ["other", "unknown"].indexOf(cell.meaningEvidence) < 0
      ) {
        throw new Error(
          "Stage-1-v3 " + cellPath +
            ".meaningEvidence contradicts empty evidence.",
        );
      }
      if (
        cell.headerCellRef !== null &&
        (typeof cell.headerCellRef !== "string" ||
          cell.headerCellRef.trim() === "")
      ) {
        throw new Error(
          "Stage-1-v3 " + cellPath + ".headerCellRef is invalid.",
        );
      }
      if (
        [
          "quantity",
          "description",
          "unit_price",
          "line_total",
          "summary_label",
          "summary_value",
          "other",
          "unknown",
        ].indexOf(cell.meaningEvidence) < 0
      ) {
        throw new Error(
          "Stage-1-v3 " + cellPath + ".meaningEvidence is unsupported.",
        );
      }

      cellEntries[cell.cellId] = {
        cell: cell,
        row: row,
        path: cellPath,
      };
    });
  });

  Object.keys(cellEntries).forEach(function (cellId) {
    const entry = cellEntries[cellId];
    const reference = entry.cell.headerCellRef;
    if (reference === null) return;
    if (reference === cellId) {
      throw new Error(
        "Stage-1-v3 " + entry.path + ".headerCellRef cannot self-reference.",
      );
    }
    const headerEntry = cellEntries[reference];
    if (
      !headerEntry ||
      headerEntry.row.roleEvidence !== "header" ||
      headerEntry.row.order >= entry.row.order ||
      headerEntry.cell.columnOrder !== entry.cell.columnOrder
    ) {
      throw new Error(
        "Stage-1-v3 " + entry.path +
          ".headerCellRef is not a matching earlier header cell.",
      );
    }
  });

  validateStage1V3SummaryEvidence_(
    evidence.summaryEvidence,
    rowEntries,
    cellEntries,
  );
  return evidence;
}

function validateStage1V3SummaryEvidence_(
  summaryEvidence,
  rowEntries,
  cellEntries,
) {
  assertStage1V3PlainObject_(summaryEvidence, "evidence.summaryEvidence");
  assertStage1V3ExactKeys_(
    summaryEvidence,
    ["printedProductCount", "printedTotal"],
    "evidence.summaryEvidence",
  );
  validateStage1V3SummaryEntry_(
    summaryEvidence.printedProductCount,
    "evidence.summaryEvidence.printedProductCount",
    false,
    rowEntries,
    cellEntries,
  );
  validateStage1V3SummaryEntry_(
    summaryEvidence.printedTotal,
    "evidence.summaryEvidence.printedTotal",
    true,
    rowEntries,
    cellEntries,
  );
}

function validateStage1V3SummaryEntry_(
  summaryEntry,
  path,
  isTotal,
  rowEntries,
  cellEntries,
) {
  if (summaryEntry === null) return;

  assertStage1V3PlainObject_(summaryEntry, path);
  const keys = ["sourceRowId", "labelCellRefs", "valueCellRefs"];
  if (isTotal) keys.push("totalTypeEvidence");
  assertStage1V3ExactKeys_(summaryEntry, keys, path);
  if (
    typeof summaryEntry.sourceRowId !== "string" ||
    summaryEntry.sourceRowId.trim() === "" ||
    !rowEntries[summaryEntry.sourceRowId]
  ) {
    throw new Error("Stage-1-v3 " + path + ".sourceRowId is invalid.");
  }
  if (
    !Array.isArray(summaryEntry.labelCellRefs) ||
    summaryEntry.labelCellRefs.length === 0 ||
    !Array.isArray(summaryEntry.valueCellRefs) ||
    summaryEntry.valueCellRefs.length === 0
  ) {
    throw new Error(
      "Stage-1-v3 " + path + " must contain label and value cell refs.",
    );
  }
  if (
    isTotal &&
    summaryEntry.totalTypeEvidence !== null &&
    summaryEntry.totalTypeEvidence !== "inclVAT" &&
    summaryEntry.totalTypeEvidence !== "exclVAT"
  ) {
    throw new Error(
      "Stage-1-v3 " + path + ".totalTypeEvidence is unsupported.",
    );
  }

  const seenRefs = {};
  summaryEntry.labelCellRefs
    .concat(summaryEntry.valueCellRefs)
    .forEach(function (cellRef, refIndex) {
      const refPath = path + ".cellRefs[" + refIndex + "]";
      if (
        typeof cellRef !== "string" ||
        cellRef.trim() === "" ||
        !cellEntries[cellRef]
      ) {
        throw new Error("Stage-1-v3 " + refPath + " is invalid.");
      }
      if (seenRefs[cellRef]) {
        throw new Error("Stage-1-v3 " + path + " contains duplicate cell refs.");
      }
      seenRefs[cellRef] = true;
      if (cellEntries[cellRef].row.rowId !== summaryEntry.sourceRowId) {
        throw new Error(
          "Stage-1-v3 " + refPath + " belongs to another source row.",
        );
      }
    });
}

function assertStage1V3Identity_(value, seen, path) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Stage-1-v3 " + path + " must be a non-empty string.");
  }
  if (seen[value]) {
    throw new Error("Stage-1-v3 " + path + " is duplicated.");
  }
}

function assertStage1V3PlainObject_(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Stage-1-v3 " + path + " must be an object.");
  }
}

function assertStage1V3ExactKeys_(value, allowedKeys, path) {
  const keys = Object.keys(value).sort();
  const expected = allowedKeys.slice().sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error("Stage-1-v3 " + path + " has invalid fields.");
  }
}

function deepFreezeStage1V3Evidence_(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.keys(value).forEach(function (key) {
    deepFreezeStage1V3Evidence_(value[key]);
  });
  return Object.freeze(value);
}
