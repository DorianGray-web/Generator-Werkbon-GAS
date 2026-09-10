/**
 * Merges ordered Apps Script PDF Blobs into one validated PDF Blob.
 *
 * This internal primitive is intentionally independent from Drive, receipt,
 * Werkbon, archival-package, image-conversion, and financial workflows.
 *
 * @param {Object[]} pdfBlobs Ordered application/pdf Blob-compatible inputs.
 * @return {Promise<Object>} A validated, non-empty application/pdf Blob.
 */
async function mergePdfBlobsInOrder(pdfBlobs) {
  if (!Array.isArray(pdfBlobs) || pdfBlobs.length === 0) {
    throw new Error("PDF merge requires a non-empty array of PDF Blobs.");
  }
  if (typeof PDFLib === "undefined" || !PDFLib.PDFDocument) {
    throw new Error("PDF merge dependency pdf-lib v1.17.1 is unavailable.");
  }

  const PDFDocument = PDFLib.PDFDocument;
  const mergedDocument = await PDFDocument.create();
  let expectedPageCount = 0;

  for (let sourceIndex = 0; sourceIndex < pdfBlobs.length; sourceIndex += 1) {
    const source = pdfBlobs[sourceIndex];
    if (
      !source ||
      typeof source.getContentType !== "function" ||
      typeof source.getBytes !== "function"
    ) {
      throw new Error(
        "PDF merge source at index " + sourceIndex +
          " is not a usable Apps Script Blob.",
      );
    }
    let sourceContentType;
    try {
      sourceContentType = source.getContentType();
    } catch (error) {
      throw new Error(
        "Failed to inspect PDF merge source at index " + sourceIndex + ": " +
          pdfMergeErrorMessage_(error),
      );
    }
    if (sourceContentType !== "application/pdf") {
      throw new Error(
        "PDF merge source at index " + sourceIndex +
          " must have content type application/pdf.",
      );
    }

    let sourceGasBytes;
    try {
      sourceGasBytes = source.getBytes();
    } catch (error) {
      throw new Error(
        "Failed to read PDF merge source at index " + sourceIndex + ": " +
          pdfMergeErrorMessage_(error),
      );
    }
    if (!sourceGasBytes || sourceGasBytes.length === 0) {
      throw new Error(
        "PDF merge source at index " + sourceIndex + " is empty.",
      );
    }

    let sourceDocument;
    try {
      sourceDocument = await PDFDocument.load(
        pdfMergeGasBytesToUint8Array_(sourceGasBytes),
      );
    } catch (error) {
      throw new Error(
        "Failed to load PDF merge source at index " + sourceIndex + ": " +
          pdfMergeErrorMessage_(error),
      );
    }

    const sourcePageCount = sourceDocument.getPageCount();

    let copiedPages;
    try {
      copiedPages = await mergedDocument.copyPages(
        sourceDocument,
        sourceDocument.getPageIndices(),
      );
      copiedPages.forEach(function (page) {
        mergedDocument.addPage(page);
      });
    } catch (error) {
      throw new Error(
        "Failed to copy or append PDF merge source at index " + sourceIndex +
          ": " +
          pdfMergeErrorMessage_(error),
      );
    }
    expectedPageCount += sourcePageCount;
  }

  let mergedBytes;
  try {
    mergedBytes = await mergedDocument.save({ objectsPerTick: Infinity });
  } catch (error) {
    throw new Error(
      "Failed to serialize merged PDF: " + pdfMergeErrorMessage_(error),
    );
  }
  if (!mergedBytes || mergedBytes.length === 0) {
    throw new Error("Merged PDF serialization produced no bytes.");
  }

  const mergedBlob = Utilities.newBlob(
    pdfMergeUint8ArrayToGasBytes_(mergedBytes),
    "application/pdf",
    "merged.pdf",
  );
  const mergedBlobBytes = mergedBlob.getBytes();
  if (!mergedBlobBytes || mergedBlobBytes.length === 0) {
    throw new Error("Merged PDF Blob is empty.");
  }
  if (mergedBlob.getContentType() !== "application/pdf") {
    throw new Error("Merged PDF Blob MIME type is not application/pdf.");
  }

  let validatedDocument;
  try {
    validatedDocument = await PDFDocument.load(
      pdfMergeGasBytesToUint8Array_(mergedBlobBytes),
    );
  } catch (error) {
    throw new Error(
      "Failed to reload merged PDF: " + pdfMergeErrorMessage_(error),
    );
  }
  const observedPageCount = validatedDocument.getPageCount();
  if (observedPageCount !== expectedPageCount) {
    throw new Error(
      "Merged PDF page count mismatch: expected " + expectedPageCount +
        " but observed " + observedPageCount + ".",
    );
  }

  return mergedBlob;
}

function pdfMergeGasBytesToUint8Array_(gasBytes) {
  const uint8Bytes = new Uint8Array(gasBytes.length);
  for (let index = 0; index < gasBytes.length; index += 1) {
    const value = gasBytes[index];
    uint8Bytes[index] = value < 0 ? value + 256 : value;
  }
  return uint8Bytes;
}

function pdfMergeUint8ArrayToGasBytes_(uint8Bytes) {
  const gasBytes = new Array(uint8Bytes.length);
  for (let index = 0; index < uint8Bytes.length; index += 1) {
    const value = uint8Bytes[index];
    gasBytes[index] = value > 127 ? value - 256 : value;
  }
  return gasBytes;
}

function pdfMergeErrorMessage_(error) {
  return error && error.message ? error.message : String(error);
}
