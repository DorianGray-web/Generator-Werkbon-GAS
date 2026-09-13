// =========================================================================
// PRODUCTION WERKBON PDF PACKAGE BUILDER
// =========================================================================

/**
 * Builds one validated in-memory Werkbon PDF package.
 *
 * @param {Object} options Package inputs.
 * @param {string} options.bonId Non-empty Werkbon identifier.
 * @param {Object} options.werkbonPdfBlob Already-exported Werkbon PDF Blob.
 * @param {Array[]} options.materialRows All raw bon-matched Materials rows.
 * @return {Promise<Object>} The final validated application/pdf Blob.
 */
async function buildWerkbonPdfPackage(options) {
  return buildWerkbonPdfPackageWithDependencies_(
    options,
    pdfPackageProductionDependencies_(),
  );
}

function pdfPackageProductionDependencies_() {
  return {
    getRecognizedFiles: function () {
      const folderId = getRequiredConfigValue(
        CONFIG.openAIReceiptsFolderId,
        "OPENAI_RECEIPTS_FOLDER_ID",
      );
      return DriveApp.getFolderById(folderId).getFiles();
    },
    inspectPdfBlob: function (pdfBlob) {
      return inspectPackagePdfBlob_(pdfBlob);
    },
    convertImage: function (imageBlob) {
      return convertImageBlobToPdf(imageBlob);
    },
    mergePdfs: function (pdfBlobs) {
      return mergePdfBlobsInOrder(pdfBlobs);
    },
  };
}

async function buildWerkbonPdfPackageWithDependencies_(options, dependencies) {
  if (!options || typeof options !== "object") {
    throw new Error("PDF package options are required.");
  }
  if (typeof options.bonId !== "string" || options.bonId.trim() === "") {
    throw new Error("PDF package bonId must be a non-empty string.");
  }

  const bonId = options.bonId.trim();
  const werkbonInspection = await dependencies.inspectPdfBlob(
    options.werkbonPdfBlob,
  );
  const evidenceKeys = extractUniqueEvidenceKeys_(options.materialRows);

  if (evidenceKeys.length === 0) {
    console.log(
      JSON.stringify({
        operation: "pdf_package",
        bonId: bonId,
        expectedPageCount: werkbonInspection.pageCount,
        actualPageCount: werkbonInspection.pageCount,
      }),
    );
    return options.werkbonPdfBlob;
  }

  const evidenceIndex = indexRecognizedFilesByReceiptKey_(
    dependencies.getRecognizedFiles(),
    evidenceKeys,
  );
  const resolvedSources = resolveEvidenceSources_(evidenceKeys, evidenceIndex);
  const normalizedEvidence = [];

  for (let index = 0; index < resolvedSources.length; index += 1) {
    const normalized = await normalizePackageEvidenceSource_(
      resolvedSources[index],
      dependencies,
    );
    normalizedEvidence.push(normalized);
    console.log(
      JSON.stringify({
        operation: "pdf_package_evidence",
        bonId: bonId,
        evidenceOrdinal: index + 1,
        receiptKey: normalized.receiptKey,
        sourceMime: normalized.sourceMime,
        sourcePageCount: normalized.pageCount,
        dimensionsChanged: normalized.dimensionsChanged,
      }),
    );
  }

  const expectedPageCount = calculateExpectedPackagePages_(
    werkbonInspection.pageCount,
    normalizedEvidence,
  );
  const orderedPdfBlobs = [options.werkbonPdfBlob].concat(
    normalizedEvidence.map(function (evidence) {
      return evidence.pdfBlob;
    }),
  );

  let finalPdfBlob;
  try {
    finalPdfBlob = await dependencies.mergePdfs(orderedPdfBlobs);
  } catch (error) {
    const message = pdfPackageErrorMessage_(error);
    if (/^PACKAGE_MERGE_FAILED:/.test(message)) {
      throw error;
    }
    throw pdfPackageError_("PACKAGE_MERGE_FAILED", message);
  }

  const finalInspection = await dependencies.inspectPdfBlob(finalPdfBlob);
  if (finalInspection.pageCount !== expectedPageCount) {
    throw pdfPackageError_(
      "PACKAGE_PAGE_COUNT_MISMATCH",
      "Expected " + expectedPageCount +
        " package pages but observed " + finalInspection.pageCount + ".",
    );
  }

  console.log(
    JSON.stringify({
      operation: "pdf_package",
      bonId: bonId,
      expectedPageCount: expectedPageCount,
      actualPageCount: finalInspection.pageCount,
    }),
  );
  return finalPdfBlob;
}

function extractUniqueEvidenceKeys_(materialRows) {
  if (!Array.isArray(materialRows)) {
    throw new Error("PDF package materialRows must be an array.");
  }

  const seen = Object.create(null);
  const evidenceKeys = [];
  materialRows.forEach(function (row) {
    const receiptKey = row && row.length > 5 && row[5] !== null &&
      row[5] !== undefined
      ? String(row[5]).trim()
      : "";
    if (receiptKey !== "" && !seen[receiptKey]) {
      seen[receiptKey] = true;
      evidenceKeys.push(receiptKey);
    }
  });
  return evidenceKeys;
}

function indexRecognizedFilesByReceiptKey_(files, requestedKeys) {
  if (!files || typeof files.hasNext !== "function" ||
      typeof files.next !== "function") {
    throw new Error("Recognized receipt file iterator is required.");
  }

  const requested = Object.create(null);
  requestedKeys.forEach(function (receiptKey) {
    requested[receiptKey] = true;
  });
  const index = Object.create(null);
  const processedPrefix = RECEIPTS.processedPrefix;

  while (files.hasNext()) {
    const file = files.next();
    const name = String(file.getName() || "");
    if (name.indexOf(processedPrefix) !== 0) {
      continue;
    }
    const candidateKey = generateReceiptKey(name);
    if (!requested[candidateKey]) {
      continue;
    }
    if (!index[candidateKey]) {
      index[candidateKey] = [];
    }
    index[candidateKey].push(file);
  }
  return index;
}

function resolveEvidenceSources_(evidenceKeys, evidenceIndex) {
  return evidenceKeys.map(function (receiptKey) {
    const matches = evidenceIndex[receiptKey] || [];
    if (matches.length === 0) {
      throw pdfPackageError_(
        "EVIDENCE_NOT_FOUND",
        "No recognized source exists for receiptKey " + receiptKey + ".",
      );
    }
    if (matches.length > 1) {
      throw pdfPackageError_(
        "EVIDENCE_AMBIGUOUS",
        "Multiple recognized sources exist for receiptKey " + receiptKey + ".",
      );
    }
    return {
      receiptKey: receiptKey,
      file: matches[0],
    };
  });
}

async function normalizePackageEvidenceSource_(resolvedSource, dependencies) {
  const sourceMime = resolvedSource.file.getMimeType();

  if (sourceMime === "application/pdf") {
    const sourceBlob = resolvedSource.file.getBlob();
    const inspection = await dependencies.inspectPdfBlob(sourceBlob);
    return {
      receiptKey: resolvedSource.receiptKey,
      sourceMime: sourceMime,
      pdfBlob: sourceBlob,
      pageCount: inspection.pageCount,
      dimensionsChanged: null,
    };
  }

  if (sourceMime === "image/jpeg" || sourceMime === "image/png") {
    const sourceBlob = resolvedSource.file.getBlob();
    const conversion = await dependencies.convertImage(sourceBlob);
    return {
      receiptKey: resolvedSource.receiptKey,
      sourceMime: sourceMime,
      pdfBlob: conversion.pdfBlob,
      pageCount: conversion.pageCount,
      dimensionsChanged: conversion.dimensionsChanged,
    };
  }

  throw pdfPackageError_(
    "UNSUPPORTED_EVIDENCE_TYPE",
    "Evidence MIME must be application/pdf, image/jpeg, or image/png.",
  );
}

async function inspectPackagePdfBlob_(pdfBlob, loadPdfDocument) {
  if (
    !pdfBlob ||
    typeof pdfBlob.getContentType !== "function" ||
    typeof pdfBlob.getBytes !== "function"
  ) {
    throw pdfPackageError_(
      "PDF_INVALID",
      "Package PDF input must be an application/pdf Blob.",
    );
  }

  let contentType;
  let gasBytes;
  try {
    contentType = pdfBlob.getContentType();
    gasBytes = pdfBlob.getBytes();
  } catch (error) {
    throw pdfPackageError_(
      "PDF_INVALID",
      "Package PDF could not be read: " + pdfPackageErrorMessage_(error),
    );
  }
  if (contentType !== "application/pdf") {
    throw pdfPackageError_(
      "PDF_INVALID",
      "Package PDF input must be an application/pdf Blob.",
    );
  }
  if (!gasBytes || gasBytes.length === 0) {
    throw pdfPackageError_("PDF_INVALID", "Package PDF input is empty.");
  }

  const loader = loadPdfDocument || function (bytes, options) {
    return PDFLib.PDFDocument.load(bytes, options);
  };
  let document;
  try {
    document = await loader(pdfMergeGasBytesToUint8Array_(gasBytes), {
      parseSpeed: PDFLib.ParseSpeeds.Fastest,
    });
  } catch (error) {
    throw pdfPackageError_(
      "PDF_INVALID",
      "Package PDF could not be loaded: " + pdfPackageErrorMessage_(error),
    );
  }

  let pageCount;
  let pages;
  try {
    pageCount = document.getPageCount();
    pages = document.getPages();
  } catch (error) {
    throw pdfPackageError_(
      "PDF_INVALID",
      "Package PDF pages could not be inspected: " +
        pdfPackageErrorMessage_(error),
    );
  }
  if (!Number.isInteger(pageCount) || pageCount < 1 ||
      !pages || pages.length !== pageCount) {
    throw pdfPackageError_(
      "PDF_INVALID",
      "Package PDF must contain at least one inspectable page.",
    );
  }

  for (let index = 0; index < pages.length; index += 1) {
    const size = pages[index] && typeof pages[index].getSize === "function"
      ? pages[index].getSize()
      : null;
    if (!size || !Number.isFinite(size.width) ||
        !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) {
      throw pdfPackageError_(
        "PDF_INVALID",
        "Package PDF page geometry is invalid.",
      );
    }
  }

  return { pageCount: pageCount };
}

function calculateExpectedPackagePages_(werkbonPageCount, normalizedEvidence) {
  if (!Number.isInteger(werkbonPageCount) || werkbonPageCount < 1 ||
      !Array.isArray(normalizedEvidence)) {
    throw pdfPackageError_(
      "PDF_INVALID",
      "Expected package pages require valid page counts.",
    );
  }

  return normalizedEvidence.reduce(function (total, evidence) {
    if (!evidence || !Number.isInteger(evidence.pageCount) ||
        evidence.pageCount < 1) {
      throw pdfPackageError_(
        "PDF_INVALID",
        "Expected package pages require valid page counts.",
      );
    }
    return total + evidence.pageCount;
  }, werkbonPageCount);
}

function pdfPackageError_(code, message) {
  return new Error(code + ": " + message);
}

function pdfPackageErrorMessage_(error) {
  return error && error.message ? error.message : String(error);
}
