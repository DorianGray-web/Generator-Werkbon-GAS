/**
 * P5.2 bounded deterministic Google Docs image-layout experiment.
 *
 * Uses two deterministic in-memory fixtures and at most two temporary Docs.
 * Exported and merged PDF Blobs remain in memory. Every created Doc is moved
 * to trash in a finally block and its trash state is verified.
 *
 * @return {Promise<Object>} Structured conversion, layout, and cleanup evidence.
 */
async function runDocImageToPdfCompatibilityExperiment() {
  console.log("P5_2_DETERMINISTIC_DOC_IMAGE_LAYOUT_EXPERIMENT_STARTED");

  const layout = {
    name: "A4 portrait",
    rationale: "ISO A4 210 x 297 mm converted at 72 points per inch",
    pageWidthPoints: 595.28,
    pageHeightPoints: 841.89,
    marginTopPoints: 36,
    marginBottomPoints: 36,
    marginLeftPoints: 36,
    marginRightPoints: 36,
  };
  const fixtureDefinitions = getDocImageToPdfFixtureDefinitions_();
  const result = {
    experiment: "P5_2_DETERMINISTIC_DOC_IMAGE_LAYOUT",
    layout: layout,
    sources: [],
    temporaryDocumentsCreated: 0,
    temporaryDocumentsTrashedAndVerified: 0,
    composition: null,
    classificationEvidence: null,
    classification: "DOC_IMAGE_TO_PDF_VALIDATION_UNRESOLVED",
  };
  const convertedPdfBlobs = [];

  for (let index = 0; index < fixtureDefinitions.length; index += 1) {
    const fixture = fixtureDefinitions[index];
    const sourceBlob = Utilities.newBlob(
      Utilities.base64Decode(fixture.base64),
      fixture.mime,
      fixture.name,
    );
    if (
      sourceBlob.getContentType() !== fixture.mime ||
      sourceBlob.getBytes().length !== fixture.expectedByteLength
    ) {
      throw new Error(
        "P5.2 synthetic " + fixture.format + " fixture identity mismatch.",
      );
    }

    const conversion = await convertImageFixtureThroughTemporaryDoc_(
      fixture,
      sourceBlob,
      layout,
    );
    result.sources.push(conversion.record);
    convertedPdfBlobs.push(conversion.pdfBlob);
    if (conversion.record.temporaryDocument.creationSucceeded) {
      result.temporaryDocumentsCreated += 1;
    }
    if (conversion.record.temporaryDocument.cleanup.verifiedTrashed) {
      result.temporaryDocumentsTrashedAndVerified += 1;
    }
  }

  const conversionsValid = result.sources.every(function (source) {
    return source.conversionSucceeded;
  });
  if (conversionsValid) {
    const expectedPages = [];
    result.sources.forEach(function (source) {
      source.exportedPdf.pages.forEach(function (page) {
        expectedPages.push({
          widthPoints: page.widthPoints,
          heightPoints: page.heightPoints,
          orientation: page.orientation,
        });
      });
    });

    try {
      const mergedBlob = await mergePdfBlobsInOrder([
        convertedPdfBlobs[0],
        convertedPdfBlobs[1],
      ]);
      const mergedBytes = mergedBlob.getBytes();
      const mergedInspection = await inspectDocImagePdfBlob_(mergedBlob);
      result.composition = {
        attempted: true,
        call: "mergePdfBlobsInOrder([jpegDocPdfBlob, pngDocPdfBlob])",
        succeeded: true,
        mime: mergedBlob.getContentType(),
        byteLength: mergedBytes.length,
        nonEmpty: mergedBytes.length > 0,
        loadSucceeded: true,
        pageCount: mergedInspection.pageCount,
        pages: mergedInspection.pages,
        expectedPageCount: expectedPages.length,
        pageCountMatches:
          mergedInspection.pageCount === expectedPages.length,
        geometryOrderMatches:
          JSON.stringify(mergedInspection.pages) ===
            JSON.stringify(expectedPages),
      };
    } catch (error) {
      result.composition = {
        attempted: true,
        call: "mergePdfBlobsInOrder([jpegDocPdfBlob, pngDocPdfBlob])",
        succeeded: false,
        error: docImageToPdfErrorRecord_(error),
      };
    }
  } else {
    result.composition = {
      attempted: false,
      reason: "Both independent Doc-derived PDFs were not valid.",
    };
  }

  const cleanupReliable =
    result.temporaryDocumentsCreated === fixtureDefinitions.length &&
    result.temporaryDocumentsTrashedAndVerified ===
      result.temporaryDocumentsCreated;
  const compositionCompatible = Boolean(
    result.composition &&
      result.composition.succeeded &&
      result.composition.mime === "application/pdf" &&
      result.composition.nonEmpty &&
      result.composition.loadSucceeded &&
      result.composition.pageCountMatches &&
      result.composition.geometryOrderMatches,
  );
  const layoutsControlled = result.sources.every(function (source) {
    return Boolean(
      source.conversionSucceeded &&
        source.deterministicLayout.appliedDimensionsFitContentBox &&
        source.insertedImage.explicitDimensionsRetained &&
        source.insertedImage.aspectRatioDeviationAddedByDocs === 0 &&
        source.exportedPdf.pageCount === 1 &&
        !source.exportedPdf.unexpectedAdditionalPages,
    );
  });

  result.classificationEvidence = {
    conversionsStructurallyValid: conversionsValid,
    cleanupReliable: cleanupReliable,
    controlledLayoutsObserved: layoutsControlled,
    compositionCompatible: compositionCompatible,
  };
  if (!cleanupReliable) {
    result.classification = "DOC_IMAGE_TO_PDF_CLEANUP_FAILURE";
  } else if (!conversionsValid) {
    result.classification =
      "DOC_IMAGE_TO_PDF_CONVERSION_LIMITATION_OBSERVED";
  } else if (!compositionCompatible) {
    result.classification = "DOC_IMAGE_TO_PDF_VALIDATION_UNRESOLVED";
  } else if (!layoutsControlled) {
    result.classification =
      "DOC_IMAGE_TO_PDF_STRUCTURALLY_VALID_BUT_LAYOUT_ADJUSTMENT_REQUIRED";
  } else {
    result.classification =
      "DOC_IMAGE_TO_PDF_DETERMINISTIC_LAYOUT_VALIDATED";
  }

  console.log(JSON.stringify(result));
  return result;
}

async function convertImageFixtureThroughTemporaryDoc_(
  fixture,
  sourceBlob,
  layout,
) {
  const record = {
    source: {
      format: fixture.format,
      mime: sourceBlob.getContentType(),
      byteLength: sourceBlob.getBytes().length,
      widthPixels: fixture.widthPixels,
      heightPixels: fixture.heightPixels,
      orientation: fixture.orientation,
    },
    configuredLayout: layout,
    deterministicLayout: null,
    temporaryDocument: {
      namePrefix: "P5_2_TEMP_",
      creationSucceeded: false,
      saveAndCloseSucceeded: false,
      cleanup: {
        attempted: false,
        setTrashedSucceeded: false,
        verifiedTrashed: false,
        error: null,
      },
    },
    appendImage: {
      succeeded: false,
      error: null,
    },
    insertedImage: null,
    exportMechanism:
      'DriveApp.getFileById(documentId).getAs("application/pdf")',
    exportedPdf: null,
    conversionSucceeded: false,
    primaryError: null,
  };
  let temporaryDocument = null;
  let temporaryDocumentId = null;
  let temporaryFile = null;
  let exportedPdfBlob = null;

  try {
    temporaryDocument = DocumentApp.create(
      "P5_2_TEMP_" + fixture.format + "_" + Utilities.getUuid(),
    );
    temporaryDocumentId = temporaryDocument.getId();
    record.temporaryDocument.creationSucceeded = true;
    temporaryFile = DriveApp.getFileById(temporaryDocumentId);

    const body = temporaryDocument.getBody();
    body
      .setPageWidth(layout.pageWidthPoints)
      .setPageHeight(layout.pageHeightPoints)
      .setMarginTop(layout.marginTopPoints)
      .setMarginBottom(layout.marginBottomPoints)
      .setMarginLeft(layout.marginLeftPoints)
      .setMarginRight(layout.marginRightPoints);

    const deterministicLayout = calculateDocImageContainLayout_(
      fixture.widthPixels,
      fixture.heightPixels,
      layout,
    );
    record.deterministicLayout = deterministicLayout;

    let insertedImage;
    try {
      insertedImage = body.appendImage(sourceBlob);
      insertedImage
        .setWidth(deterministicLayout.appliedTargetWidth)
        .setHeight(deterministicLayout.appliedTargetHeight);
      record.appendImage.succeeded = true;
    } catch (error) {
      record.appendImage.error = docImageToPdfErrorRecord_(error);
      throw error;
    }

    const insertedWidth = insertedImage.getWidth();
    const insertedHeight = insertedImage.getHeight();
    const observedAspectRatio = insertedWidth / insertedHeight;
    const observedAspectRatioDeviation = Math.abs(
      observedAspectRatio - deterministicLayout.sourceAspectRatio,
    );
    record.insertedImage = {
      widthPixels: insertedWidth,
      heightPixels: insertedHeight,
      explicitDimensionsRetained:
        insertedWidth === deterministicLayout.appliedTargetWidth &&
        insertedHeight === deterministicLayout.appliedTargetHeight,
      docsChangedExplicitDimensions:
        insertedWidth !== deterministicLayout.appliedTargetWidth ||
        insertedHeight !== deterministicLayout.appliedTargetHeight,
      observedAspectRatio: observedAspectRatio,
      observedAspectRatioDeviation: observedAspectRatioDeviation,
      aspectRatioDeviationAddedByDocs: Math.abs(
        observedAspectRatioDeviation -
          deterministicLayout.appliedAspectRatioDeviation,
      ),
    };

    temporaryDocument.saveAndClose();
    record.temporaryDocument.saveAndCloseSucceeded = true;

    exportedPdfBlob = temporaryFile.getAs("application/pdf");
    const exportedBytes = exportedPdfBlob.getBytes();
    const exportedMime = exportedPdfBlob.getContentType();
    if (exportedMime !== "application/pdf") {
      throw new Error(
        "Temporary Doc export returned MIME " + exportedMime + ".",
      );
    }
    if (!exportedBytes || exportedBytes.length === 0) {
      throw new Error("Temporary Doc export returned no PDF bytes.");
    }

    const inspection = await inspectDocImagePdfBlob_(exportedPdfBlob);
    record.exportedPdf = {
      succeeded: true,
      mime: exportedMime,
      byteLength: exportedBytes.length,
      nonEmpty: true,
      loadSucceeded: true,
      pageCount: inspection.pageCount,
      pages: inspection.pages,
      configuredPageGeometryObserved: inspection.pages.every(function (page) {
        return (
          Math.abs(page.widthPoints - layout.pageWidthPoints) <= 0.5 &&
          Math.abs(page.heightPoints - layout.pageHeightPoints) <= 0.5
        );
      }),
      unexpectedAdditionalPages: inspection.pageCount !== 1,
    };
    record.conversionSucceeded = true;
  } catch (error) {
    record.primaryError = docImageToPdfErrorRecord_(error);
  } finally {
    if (temporaryDocumentId) {
      record.temporaryDocument.cleanup.attempted = true;
      try {
        const cleanupFile =
          temporaryFile || DriveApp.getFileById(temporaryDocumentId);
        cleanupFile.setTrashed(true);
        record.temporaryDocument.cleanup.setTrashedSucceeded = true;
        record.temporaryDocument.cleanup.verifiedTrashed =
          DriveApp.getFileById(temporaryDocumentId).isTrashed() === true;
      } catch (cleanupError) {
        record.temporaryDocument.cleanup.error =
          docImageToPdfErrorRecord_(cleanupError);
      }
    }
  }

  return {
    record: record,
    pdfBlob: record.conversionSucceeded ? exportedPdfBlob : null,
  };
}

async function inspectDocImagePdfBlob_(pdfBlob) {
  const document = await PDFLib.PDFDocument.load(
    pdfMergeGasBytesToUint8Array_(pdfBlob.getBytes()),
  );
  const pageCount = document.getPageCount();
  if (pageCount < 1) {
    throw new Error("Doc-derived image PDF contains no pages.");
  }

  return {
    pageCount: pageCount,
    pages: document.getPages().map(function (page) {
      const size = page.getSize();
      return {
        widthPoints: size.width,
        heightPoints: size.height,
        orientation: docImageToPdfOrientation_(size.width, size.height),
      };
    }),
  };
}

function calculateDocImageContainLayout_(sourceWidth, sourceHeight, layout) {
  const usableWidth =
    layout.pageWidthPoints -
    layout.marginLeftPoints -
    layout.marginRightPoints;
  const usableHeight =
    layout.pageHeightPoints -
    layout.marginTopPoints -
    layout.marginBottomPoints;
  const sourceAspectRatio = sourceWidth / sourceHeight;
  const scale = Math.min(
    usableWidth / sourceWidth,
    usableHeight / sourceHeight,
  );
  const rawTargetWidth = sourceWidth * scale;
  const rawTargetHeight = sourceHeight * scale;
  const appliedTargetWidth = Math.floor(rawTargetWidth);
  const appliedTargetHeight = Math.floor(rawTargetHeight);
  const appliedAspectRatio = appliedTargetWidth / appliedTargetHeight;

  return {
    sourceAspectRatio: sourceAspectRatio,
    usableContentBox: {
      widthPoints: usableWidth,
      heightPoints: usableHeight,
    },
    scale: scale,
    rawTargetWidth: rawTargetWidth,
    rawTargetHeight: rawTargetHeight,
    roundingPolicy:
      "Math.floor applied independently to both dimensions after one common contain scale",
    appliedTargetWidth: appliedTargetWidth,
    appliedTargetHeight: appliedTargetHeight,
    appliedAspectRatio: appliedAspectRatio,
    appliedAspectRatioDeviation: Math.abs(
      appliedAspectRatio - sourceAspectRatio,
    ),
    appliedDimensionsFitContentBox:
      appliedTargetWidth <= usableWidth &&
      appliedTargetHeight <= usableHeight,
    crop: false,
    rotation: false,
    independentAxisStretch: false,
  };
}

function docImageToPdfOrientation_(width, height) {
  if (width > height) {
    return "landscape";
  }
  if (height > width) {
    return "portrait";
  }
  return "square";
}

function docImageToPdfErrorRecord_(error) {
  return {
    type: error && error.name ? error.name : "Error",
    message: error && error.message ? error.message : String(error),
  };
}

function getDocImageToPdfFixtureDefinitions_() {
  return [
    {
      format: "JPEG",
      mime: "image/jpeg",
      name: "p5-synthetic-portrait.jpg",
      widthPixels: 30,
      heightPixels: 60,
      orientation: "portrait",
      expectedByteLength: 792,
      base64:
        "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoH" +
        "BwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQME" +
        "BAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU" +
        "FBQUFBQUFBQUFBQUFBT/wAARCAA8AB4DASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEA" +
        "AAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIh" +
        "MUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6" +
        "Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZ" +
        "mqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx" +
        "8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREA" +
        "AgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAV" +
        "YnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hp" +
        "anN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPE" +
        "xcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDy" +
        "Siiivy8/vAKKKKAOr/4QX/p+/wDIX/2VH/CC/wDT9/5C/wDsq6uipuf5o/8AEYeO" +
        "P+g//wApUf8A5Wcp/wAIL/0/f+Qv/sqP+EF/6fv/ACF/9lXV0UXD/iMPHH/Qf/5S" +
        "o/8AysKK8Por+j/+IO/9R/8A5S/+6HwX9if9PPw/4J7hRXh9FH/EHf8AqP8A/KX/" +
        "AN0D+xP+nn4f8EKKKK/pA+oCiiigD//Z",
    },
    {
      format: "PNG",
      mime: "image/png",
      name: "p5-synthetic-landscape.png",
      widthPixels: 60,
      heightPixels: 30,
      orientation: "landscape",
      expectedByteLength: 249,
      base64:
        "iVBORw0KGgoAAAANSUhEUgAAADwAAAAeCAYAAABwmH1PAAAAAXNSR0IArs4c6QAA" +
        "AARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACOSURBVFhH7c+h" +
        "AcJAAATBlJNK0BRLOekFPHduXp4Yv3s99/096f68zno/R13/wSqCVYkWG1YRrEq0" +
        "2LCKYFWixYZVBKsSLTasIliVaLFhFcGqRIsNqwhWJVpsWEWwKtFiwyqCVYkWG1YR" +
        "rEq02LCKYFWixYZVBKsSLTasIliVaLFhFcGqRIsNqwhWJVr8AGBPhYqfg9ewAAAAA" +
        "ElFTkSuQmCC",
    },
  ];
}
