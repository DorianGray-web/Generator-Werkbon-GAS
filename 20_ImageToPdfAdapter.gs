// =========================================================================
// PRODUCTION IMAGE-TO-PDF ADAPTER
// =========================================================================

const IMAGE_PDF_ADAPTER_LAYOUT_ = Object.freeze({
  pageWidthPoints: 595.28,
  pageHeightPoints: 841.89,
  marginPoints: 36,
  docsEnvelopeWidthPixels: 384,
  docsEnvelopeHeightPixels: 640,
});

/**
 * Converts one validated JPEG or PNG Blob into one validated in-memory PDF.
 *
 * @param {Object} imageBlob Apps Script Blob-compatible image input.
 * @return {Promise<Object>} Bounded conversion result for package assembly.
 */
async function convertImageBlobToPdf(imageBlob) {
  return convertImageBlobToPdfWithDependencies_(
    imageBlob,
    imagePdfProductionDependencies_(),
  );
}

function imagePdfProductionDependencies_() {
  return {
    createDocument: function (name) {
      return DocumentApp.create(name);
    },
    getFileById: function (fileId) {
      return DriveApp.getFileById(fileId);
    },
    createUuid: function () {
      return Utilities.getUuid();
    },
    loadPdfDocument: function (bytes) {
      return PDFLib.PDFDocument.load(bytes);
    },
  };
}

async function convertImageBlobToPdfWithDependencies_(imageBlob, dependencies) {
  const source = inspectImagePdfSource_(imageBlob);
  const requestedGeometry = calculateImagePdfContainSizing_(
    source.geometry.widthPixels,
    source.geometry.heightPixels,
    IMAGE_PDF_ADAPTER_LAYOUT_.docsEnvelopeWidthPixels,
    IMAGE_PDF_ADAPTER_LAYOUT_.docsEnvelopeHeightPixels,
  );

  let temporaryDocument = null;
  let temporaryDocumentId = null;
  let temporaryFile = null;
  let result = null;
  let conversionFailure = null;
  let cleanupFailure = null;

  try {
    temporaryDocument = dependencies.createDocument(
      "IMAGE_PDF_TEMP_" + dependencies.createUuid(),
    );
    temporaryDocumentId = temporaryDocument.getId();
    temporaryFile = dependencies.getFileById(temporaryDocumentId);

    const body = temporaryDocument.getBody();
    body
      .setPageWidth(IMAGE_PDF_ADAPTER_LAYOUT_.pageWidthPoints)
      .setPageHeight(IMAGE_PDF_ADAPTER_LAYOUT_.pageHeightPoints)
      .setMarginTop(IMAGE_PDF_ADAPTER_LAYOUT_.marginPoints)
      .setMarginBottom(IMAGE_PDF_ADAPTER_LAYOUT_.marginPoints)
      .setMarginLeft(IMAGE_PDF_ADAPTER_LAYOUT_.marginPoints)
      .setMarginRight(IMAGE_PDF_ADAPTER_LAYOUT_.marginPoints);

    const insertedImage = body.appendImage(imageBlob);
    insertedImage
      .setWidth(requestedGeometry.widthPixels)
      .setHeight(requestedGeometry.heightPixels);

    const geometryProjection = projectImagePdfObservedGeometry_(
      requestedGeometry,
      insertedImage.getWidth(),
      insertedImage.getHeight(),
    );

    temporaryDocument.saveAndClose();

    const pdfBlob = temporaryFile.getAs("application/pdf");
    const pdfInspection = await validateSinglePageImagePdf_(
      pdfBlob,
      dependencies.loadPdfDocument,
    );

    result = {
      pdfBlob: pdfBlob,
      sourceMime: source.mime,
      sourceGeometry: source.geometry,
      requestedGeometry: requestedGeometry,
      observedGeometry: geometryProjection.observedGeometry,
      dimensionsChanged: geometryProjection.dimensionsChanged,
      pageCount: pdfInspection.pageCount,
    };
  } catch (error) {
    conversionFailure = imagePdfNormalizeConversionError_(error);
  } finally {
    if (temporaryDocumentId) {
      try {
        const cleanupFile =
          temporaryFile || dependencies.getFileById(temporaryDocumentId);
        cleanupFile.setTrashed(true);
        const cleanupVerified =
          dependencies.getFileById(temporaryDocumentId).isTrashed() === true;
        if (!cleanupVerified) {
          throw new Error("Temporary image-conversion Doc was not verified trashed.");
        }
      } catch (error) {
        cleanupFailure = imagePdfError_(
          "TEMP_DOC_CLEANUP_FAILED",
          imagePdfErrorMessage_(error),
        );
      }
    }
  }

  if (cleanupFailure) {
    console.error(cleanupFailure.message);
    throw cleanupFailure;
  }
  if (conversionFailure) {
    throw conversionFailure;
  }

  console.log(
    JSON.stringify({
      operation: "image_to_pdf",
      sourceMime: result.sourceMime,
      sourceGeometry: result.sourceGeometry,
      requestedGeometry: result.requestedGeometry,
      observedGeometry: result.observedGeometry,
      dimensionsChanged: result.dimensionsChanged,
      pageCount: result.pageCount,
      cleanupVerified: true,
    }),
  );
  return result;
}

function inspectImagePdfSource_(imageBlob) {
  if (
    !imageBlob ||
    typeof imageBlob.getContentType !== "function" ||
    typeof imageBlob.getBytes !== "function"
  ) {
    throw imagePdfError_(
      "IMAGE_CONVERSION_FAILED",
      "A Blob-compatible image input is required.",
    );
  }

  let mime;
  let gasBytes;
  try {
    mime = imageBlob.getContentType();
  } catch (error) {
    throw imagePdfError_(
      "IMAGE_CONVERSION_FAILED",
      "Image MIME could not be read: " + imagePdfErrorMessage_(error),
    );
  }
  if (mime !== "image/jpeg" && mime !== "image/png") {
    throw imagePdfError_(
      "UNSUPPORTED_EVIDENCE_TYPE",
      "Image MIME must be image/jpeg or image/png.",
    );
  }

  try {
    gasBytes = imageBlob.getBytes();
  } catch (error) {
    throw imagePdfError_(
      "IMAGE_CONVERSION_FAILED",
      "Image bytes could not be read: " + imagePdfErrorMessage_(error),
    );
  }
  if (!gasBytes || gasBytes.length === 0) {
    throw imagePdfError_("IMAGE_CONVERSION_FAILED", "Image Blob is empty.");
  }

  const bytes = imagePdfUnsignedBytes_(gasBytes);
  const geometry = mime === "image/png"
    ? parseImagePdfPngGeometry_(bytes)
    : parseImagePdfJpegGeometry_(bytes);

  return {
    mime: mime,
    geometry: geometry,
  };
}

function parseImagePdfPngGeometry_(bytes) {
  const validSignature =
    bytes &&
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a &&
    imagePdfReadUint32_(bytes, 8) === 13 &&
    bytes[12] === 0x49 &&
    bytes[13] === 0x48 &&
    bytes[14] === 0x44 &&
    bytes[15] === 0x52;
  if (!validSignature) {
    throw imagePdfError_(
      "IMAGE_GEOMETRY_UNRESOLVED",
      "PNG signature or IHDR is invalid.",
    );
  }

  return imagePdfGeometryRecord_(
    imagePdfReadUint32_(bytes, 16),
    imagePdfReadUint32_(bytes, 20),
  );
}

function parseImagePdfJpegGeometry_(bytes) {
  if (!bytes || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw imagePdfError_(
      "IMAGE_GEOMETRY_UNRESOLVED",
      "JPEG SOI signature is invalid.",
    );
  }

  let offset = 2;
  let geometry = null;
  let hasUnresolvedExif = false;

  while (offset < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) {
      offset += 1;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= bytes.length) {
      break;
    }

    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      continue;
    }
    if (offset + 1 >= bytes.length) {
      if (marker === 0xe1) {
        throw imagePdfError_(
          "IMAGE_GEOMETRY_UNRESOLVED",
          "JPEG APP1 segment length is invalid.",
        );
      }
      break;
    }

    const segmentLength = bytes[offset] * 256 + bytes[offset + 1];
    const segmentEnd = offset + segmentLength;
    if (segmentLength < 2 || segmentEnd > bytes.length) {
      if (marker === 0xe1) {
        throw imagePdfError_(
          "IMAGE_GEOMETRY_UNRESOLVED",
          "JPEG APP1 segment length is invalid.",
        );
      }
      break;
    }

    if (
      marker === 0xe1 &&
      segmentLength >= 8 &&
      bytes[offset + 2] === 0x45 &&
      bytes[offset + 3] === 0x78 &&
      bytes[offset + 4] === 0x69 &&
      bytes[offset + 5] === 0x66 &&
      bytes[offset + 6] === 0x00 &&
      bytes[offset + 7] === 0x00
    ) {
      const orientation = parseJpegExifOrientation_(
        bytes,
        offset + 8,
        segmentEnd,
      );
      if (orientation === null) {
        hasUnresolvedExif = true;
      }
      // 1 (SHORT or LONG) and 0 (LONG only) are accepted as identity; do not set flag
    }

    if (imagePdfIsJpegStartOfFrame_(marker)) {
      if (segmentLength < 8) {
        break;
      }
      geometry = imagePdfGeometryRecord_(
        bytes[offset + 5] * 256 + bytes[offset + 6],
        bytes[offset + 3] * 256 + bytes[offset + 4],
      );
    }
    offset = segmentEnd;
  }

  if (hasUnresolvedExif) {
    throw imagePdfError_(
      "IMAGE_GEOMETRY_UNRESOLVED",
      "JPEG contains EXIF metadata whose display orientation is unresolved.",
    );
  }
  if (!geometry) {
    throw imagePdfError_(
      "IMAGE_GEOMETRY_UNRESOLVED",
      "JPEG SOF dimensions were not found.",
    );
  }
  return geometry;
}

function imagePdfIsJpegStartOfFrame_(marker) {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}

function parseJpegExifOrientation_(bytes, tiffOffset, segmentEnd) {
  if (!bytes || tiffOffset + 8 > segmentEnd || segmentEnd > bytes.length) {
    return null;
  }

  const b0 = bytes[tiffOffset];
  const b1 = bytes[tiffOffset + 1];
  let littleEndian;
  if (b0 === 0x49 && b1 === 0x49) {
    littleEndian = true;
  } else if (b0 === 0x4d && b1 === 0x4d) {
    littleEndian = false;
  } else {
    return null;
  }

  const magic = imagePdfReadUint16_(bytes, tiffOffset + 2, littleEndian);
  if (magic !== 0x002a) {
    return null;
  }

  const ifdOffset = imagePdfReadUint32Endian_(bytes, tiffOffset + 4, littleEndian);
  if (ifdOffset < 8) {
    return null;
  }
  const ifdStart = tiffOffset + ifdOffset;
  if (ifdStart + 2 > segmentEnd) {
    return null;
  }

  const entryCount = imagePdfReadUint16_(bytes, ifdStart, littleEndian);
  const entriesStart = ifdStart + 2;
  const tableEnd = entriesStart + entryCount * 12;
  if (tableEnd > segmentEnd) {
    return null;
  }

  for (let i = 0; i < entryCount; i++) {
    const entryPos = entriesStart + i * 12;
    const tag = imagePdfReadUint16_(bytes, entryPos, littleEndian);
    if (tag === 0x0112) {
      const type = imagePdfReadUint16_(bytes, entryPos + 2, littleEndian);
      const count = imagePdfReadUint32Endian_(bytes, entryPos + 4, littleEndian);
      if (count !== 1) {
        return null;
      }

      let value;
      if (type === 3) { // SHORT
        value = imagePdfReadUint16_(bytes, entryPos + 8, littleEndian);
        if (value === 1) {
          return 1;
        }
        return null; // SHORT 0 or other -> unresolved
      } else if (type === 4) { // LONG
        value = imagePdfReadUint32Endian_(bytes, entryPos + 8, littleEndian);
        if (value === 1 || value === 0) {
          return value;
        }
        return null;
      }
      return null; // unsupported type
    }
  }

  return null; // no Orientation tag
}

function calculateImagePdfContainSizing_(
  sourceWidth,
  sourceHeight,
  envelopeWidth,
  envelopeHeight,
) {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    !Number.isFinite(envelopeWidth) ||
    !Number.isFinite(envelopeHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    envelopeWidth <= 0 ||
    envelopeHeight <= 0
  ) {
    throw imagePdfError_(
      "IMAGE_GEOMETRY_UNRESOLVED",
      "Contain sizing requires positive finite dimensions.",
    );
  }

  const scale = Math.min(
    envelopeWidth / sourceWidth,
    envelopeHeight / sourceHeight,
  );
  const widthPixels = Math.max(1, Math.floor(sourceWidth * scale));
  const heightPixels = Math.max(1, Math.floor(sourceHeight * scale));
  const geometry = imagePdfGeometryRecord_(widthPixels, heightPixels);

  geometry.scale = scale;
  geometry.sourceAspectRatio = sourceWidth / sourceHeight;
  geometry.appliedAspectRatio = widthPixels / heightPixels;
  return geometry;
}

function projectImagePdfObservedGeometry_(requestedGeometry, observedWidth, observedHeight) {
  const observedGeometry = imagePdfGeometryRecord_(observedWidth, observedHeight);
  return {
    requestedGeometry: requestedGeometry,
    observedGeometry: observedGeometry,
    dimensionsChanged:
      requestedGeometry.widthPixels !== observedGeometry.widthPixels ||
      requestedGeometry.heightPixels !== observedGeometry.heightPixels,
  };
}

async function validateSinglePageImagePdf_(pdfBlob, loadPdfDocument) {
  if (
    !pdfBlob ||
    typeof pdfBlob.getContentType !== "function" ||
    typeof pdfBlob.getBytes !== "function" ||
    pdfBlob.getContentType() !== "application/pdf"
  ) {
    throw imagePdfError_(
      "PDF_INVALID",
      "Image conversion did not return an application/pdf Blob.",
    );
  }

  const gasBytes = pdfBlob.getBytes();
  if (!gasBytes || gasBytes.length === 0) {
    throw imagePdfError_("PDF_INVALID", "Image-conversion PDF is empty.");
  }

  let document;
  try {
    document = await loadPdfDocument(
      pdfMergeGasBytesToUint8Array_(gasBytes),
    );
  } catch (error) {
    throw imagePdfError_(
      "PDF_INVALID",
      "Image-conversion PDF could not be loaded: " +
        imagePdfErrorMessage_(error),
    );
  }

  const pageCount = document.getPageCount();
  if (pageCount !== 1) {
    throw imagePdfError_(
      "PDF_INVALID",
      "Image conversion must produce exactly one PDF page.",
    );
  }
  const pages = document.getPages();
  const size = pages && pages[0] && pages[0].getSize
    ? pages[0].getSize()
    : null;
  if (
    !size ||
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0
  ) {
    throw imagePdfError_(
      "PDF_INVALID",
      "Image-conversion PDF page geometry is invalid.",
    );
  }

  return {
    pageCount: pageCount,
    pageGeometry: {
      widthPoints: size.width,
      heightPoints: size.height,
    },
  };
}

function imagePdfGeometryRecord_(width, height) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw imagePdfError_(
      "IMAGE_GEOMETRY_UNRESOLVED",
      "Image geometry must be positive and finite.",
    );
  }
  return {
    widthPixels: width,
    heightPixels: height,
    orientation: width > height
      ? "landscape"
      : height > width
        ? "portrait"
        : "square",
  };
}

function imagePdfReadUint32_(bytes, offset) {
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function imagePdfReadUint16_(bytes, offset, littleEndian) {
  if (littleEndian) {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function imagePdfReadUint32Endian_(bytes, offset, littleEndian) {
  if (littleEndian) {
    return (
      bytes[offset] +
      bytes[offset + 1] * 0x100 +
      bytes[offset + 2] * 0x10000 +
      bytes[offset + 3] * 0x1000000
    );
  }
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function imagePdfUnsignedBytes_(gasBytes) {
  return gasBytes.map(function (value) {
    return value < 0 ? value + 256 : value;
  });
}

function imagePdfNormalizeConversionError_(error) {
  const message = imagePdfErrorMessage_(error);
  if (
    /^(UNSUPPORTED_EVIDENCE_TYPE|IMAGE_GEOMETRY_UNRESOLVED|IMAGE_CONVERSION_FAILED|PDF_INVALID):/.test(
      message,
    )
  ) {
    return error;
  }
  return imagePdfError_("IMAGE_CONVERSION_FAILED", message);
}

function imagePdfError_(code, message) {
  return new Error(code + ": " + message);
}

function imagePdfErrorMessage_(error) {
  return error && error.message ? error.message : String(error);
}
