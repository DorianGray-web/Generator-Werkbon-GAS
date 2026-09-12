#!/usr/bin/env node
/**
 * P5.3 local/offline synthetic PDF measurement harness.
 *
 * EXPERIMENTAL / NON-PRODUCTION. It reads exactly one GAS evidence JSON file
 * and two explicitly supplied synthetic PDFs. It never accesses Drive, Docs,
 * GAS, Media, real documents, or production data.
 */

import {
  createHash,
} from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import {
  existsSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  pathToFileURL,
} from "node:url";

const CONTRACT = Object.freeze({
  experimentId: "P5_3_DOC_IMAGE_RENDERED_GEOMETRY_V1",
  nodeVersion: "24.14.0",
  pdfJsVersion: "5.6.205",
  canvasVersion: "0.1.100",
  renderScale: 4,
  contentInsetPoints: 36,
  darkLuminanceMaximum: 112,
  perimeterCoverageMinimum: 0.9,
  markerTemplateAgreementMinimum: 0.78,
  innerPerimeterCoverageMinimum: 0.8,
  innerAnchorScoreMaximum: 0.15,
  innerAnchorAmbiguityMarginMinimum: 0.05,
  edgeProfileTangentStart: 0.3,
  edgeProfileTangentEnd: 0.7,
  fixtureIds: Object.freeze(["PORTRAIT", "LANDSCAPE"]),
  generatedOutputNames: Object.freeze({
    PORTRAIT: "portrait-rendered.png",
    LANDSCAPE: "landscape-rendered.png",
    result: "measurement-result.json",
  }),
});

function fail(message, details = null) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function parseArguments(argv) {
  const options = {
    selfTest: false,
    evidencePath: null,
    portraitPath: null,
    landscapePath: null,
    outputDirectory: null,
    nodeModulesPath: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--self-test") {
      options.selfTest = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      fail("Missing value for " + token + ".");
    }
    if (token === "--evidence") {
      options.evidencePath = path.resolve(value);
    } else if (token === "--portrait-pdf") {
      options.portraitPath = path.resolve(value);
    } else if (token === "--landscape-pdf") {
      options.landscapePath = path.resolve(value);
    } else if (token === "--output-dir") {
      options.outputDirectory = path.resolve(value);
    } else if (token === "--node-modules") {
      options.nodeModulesPath = path.resolve(value);
    } else {
      fail("Unsupported argument " + token + ".");
    }
    index += 1;
  }

  if (!options.nodeModulesPath) {
    fail(
      "--node-modules must explicitly identify the reviewed bundled dependency root.",
    );
  }
  if (
    !options.selfTest &&
    (!options.evidencePath ||
      !options.portraitPath ||
      !options.landscapePath)
  ) {
    fail(
      "Normal mode requires --evidence, --portrait-pdf, and --landscape-pdf.",
    );
  }
  return options;
}

async function readPackageVersion(packageRoot) {
  const packageJson = JSON.parse(
    await readFile(path.join(packageRoot, "package.json"), "utf8"),
  );
  return packageJson.version;
}

async function resolvePinnedPackage(
  nodeModulesPath,
  packageName,
  expectedVersion,
) {
  const directRoot = path.join(nodeModulesPath, ...packageName.split("/"));
  if (
    existsSync(path.join(directRoot, "package.json")) &&
    (await readPackageVersion(directRoot)) === expectedVersion
  ) {
    return directRoot;
  }

  const pnpmDirectory = path.join(nodeModulesPath, ".pnpm");
  if (!existsSync(pnpmDirectory)) {
    fail("Bundled pnpm package directory is unavailable.", {
      nodeModulesPath,
    });
  }
  const token = packageName.replace("/", "+") + "@" + expectedVersion;
  const candidates = (await readdir(pnpmDirectory))
    .filter((entry) => entry === token || entry.startsWith(token + "_"))
    .sort();
  for (const entry of candidates) {
    const candidateRoot = path.join(
      pnpmDirectory,
      entry,
      "node_modules",
      ...packageName.split("/"),
    );
    if (
      existsSync(path.join(candidateRoot, "package.json")) &&
      (await readPackageVersion(candidateRoot)) === expectedVersion
    ) {
      return candidateRoot;
    }
  }
  fail(
    packageName + " " + expectedVersion + " is unavailable in the explicit dependency root.",
  );
}

async function loadRenderer(nodeModulesPath) {
  const observedNodeVersion = process.versions.node;
  if (observedNodeVersion !== CONTRACT.nodeVersion) {
    fail("Bundled Node.js version mismatch.", {
      expected: CONTRACT.nodeVersion,
      observed: observedNodeVersion,
    });
  }

  const canvasRoot = await resolvePinnedPackage(
    nodeModulesPath,
    "@napi-rs/canvas",
    CONTRACT.canvasVersion,
  );
  if (process.platform !== "win32" || process.arch !== "x64") {
    fail("The reviewed P5.3 canvas runtime is Windows x64 only.", {
      platform: process.platform,
      architecture: process.arch,
    });
  }
  const canvasNativeRoot = await resolvePinnedPackage(
    nodeModulesPath,
    "@napi-rs/canvas-win32-x64-msvc",
    CONTRACT.canvasVersion,
  );
  const pdfJsRoot = await resolvePinnedPackage(
    nodeModulesPath,
    "pdfjs-dist",
    CONTRACT.pdfJsVersion,
  );
  const nativeLibraryPath = path.join(
    canvasNativeRoot,
    "skia.win32-x64-msvc.node",
  );
  if (!existsSync(nativeLibraryPath)) {
    fail("The pinned canvas native binary is unavailable.", {
      nativeLibraryPath,
    });
  }
  const previousNativeLibraryPath =
    process.env.NAPI_RS_NATIVE_LIBRARY_PATH;
  process.env.NAPI_RS_NATIVE_LIBRARY_PATH = nativeLibraryPath;
  let canvasModule;
  try {
    canvasModule = await import(
      pathToFileURL(path.join(canvasRoot, "index.js")).href
    );
  } finally {
    if (previousNativeLibraryPath === undefined) {
      delete process.env.NAPI_RS_NATIVE_LIBRARY_PATH;
    } else {
      process.env.NAPI_RS_NATIVE_LIBRARY_PATH =
        previousNativeLibraryPath;
    }
  }
  const canvasApi = canvasModule.default || canvasModule;
  const createCanvas = canvasModule.createCanvas || canvasApi.createCanvas;
  const DOMMatrix = canvasModule.DOMMatrix || canvasApi.DOMMatrix;
  const ImageData = canvasModule.ImageData || canvasApi.ImageData;
  const Path2D = canvasModule.Path2D || canvasApi.Path2D;
  if (!createCanvas || !DOMMatrix || !ImageData || !Path2D) {
    fail("@napi-rs/canvas did not expose the reviewed rendering primitives.");
  }

  globalThis.DOMMatrix = DOMMatrix;
  globalThis.ImageData = ImageData;
  globalThis.Path2D = Path2D;

  const pdfjs = await import(
    pathToFileURL(path.join(pdfJsRoot, "legacy", "build", "pdf.mjs")).href
  );
  if (pdfjs.version !== CONTRACT.pdfJsVersion) {
    fail("PDF.js runtime version mismatch.", {
      expected: CONTRACT.pdfJsVersion,
      observed: pdfjs.version,
    });
  }

  return {
    pdfjs,
    createCanvas,
    versions: {
      node: observedNodeVersion,
      pdfjs: pdfjs.version,
      canvas: await readPackageVersion(canvasRoot),
    },
    resolvedPackageRoots: {
      pdfjs: pdfJsRoot,
      canvas: canvasRoot,
      canvasNative: canvasNativeRoot,
    },
  };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readAndVerifyLocalPdf(filePath, sourceEvidence) {
  const bytes = await readFile(filePath);
  const actual = {
    path: filePath,
    byteLength: bytes.length,
    sha256: sha256(bytes),
  };
  const expected = sourceEvidence.evidencePdf.postStore;
  if (
    !sourceEvidence.evidencePdf.identityVerified ||
    expected.mime !== "application/pdf" ||
    actual.byteLength !== expected.byteLength ||
    actual.sha256 !== expected.sha256
  ) {
    fail("Local PDF provenance mismatch for " + sourceEvidence.fixture.id + ".", {
      expected,
      actual,
    });
  }
  return {
    originalBytes: bytes,
    provenance: {
      expected,
      actual,
      exactMatch: true,
    },
  };
}

function closeEnough(first, second, tolerance = 0.02) {
  return Math.abs(first - second) <= tolerance;
}

function boxFromPdfJsView(view) {
  const left = Math.min(view[0], view[2]);
  const bottom = Math.min(view[1], view[3]);
  const right = Math.max(view[0], view[2]);
  const top = Math.max(view[1], view[3]);
  return {
    x: left,
    y: bottom,
    width: right - left,
    height: top - bottom,
  };
}

function boxesMatch(first, second) {
  return (
    closeEnough(first.x, second.x) &&
    closeEnough(first.y, second.y) &&
    closeEnough(first.width, second.width) &&
    closeEnough(first.height, second.height)
  );
}

function luminanceAt(data, width, x, y) {
  const offset = (y * width + x) * 4;
  return (
    data[offset] * 0.2126 +
    data[offset + 1] * 0.7152 +
    data[offset + 2] * 0.0722
  );
}

function isDark(data, width, x, y) {
  return luminanceAt(data, width, x, y) <= CONTRACT.darkLuminanceMaximum;
}

function observedDarkBounds(imageData) {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      if (isDark(imageData.data, imageData.width, x, y)) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (!Number.isFinite(left)) {
    return null;
  }
  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function longestDarkRunInRow(data, width, y) {
  let longest = 0;
  let current = 0;
  for (let x = 0; x < width; x += 1) {
    if (isDark(data, width, x, y)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function longestDarkRunInColumn(data, width, height, x) {
  let longest = 0;
  let current = 0;
  for (let y = 0; y < height; y += 1) {
    if (isDark(data, width, x, y)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function groupConsecutiveCoordinates(coordinates) {
  const groups = [];
  for (const coordinate of coordinates) {
    const current = groups[groups.length - 1];
    if (!current || coordinate > current.end + 1) {
      groups.push({ start: coordinate, end: coordinate });
    } else {
      current.end = coordinate;
    }
  }
  return groups.map((group) => ({
    ...group,
    center: (group.start + group.end) / 2,
    thickness: group.end - group.start + 1,
  }));
}

function findLongLineBands(imageData) {
  const { data, width, height } = imageData;
  const horizontalCoordinates = [];
  const verticalCoordinates = [];
  const minimumHorizontalRun = Math.max(20, Math.floor(width * 0.15));
  const minimumVerticalRun = Math.max(20, Math.floor(height * 0.15));
  for (let y = 0; y < height; y += 1) {
    if (longestDarkRunInRow(data, width, y) >= minimumHorizontalRun) {
      horizontalCoordinates.push(y);
    }
  }
  for (let x = 0; x < width; x += 1) {
    if (
      longestDarkRunInColumn(data, width, height, x) >= minimumVerticalRun
    ) {
      verticalCoordinates.push(x);
    }
  }
  return {
    horizontal: groupConsecutiveCoordinates(horizontalCoordinates),
    vertical: groupConsecutiveCoordinates(verticalCoordinates),
  };
}

function lineDarkFraction(data, width, height, axis, fixed, start, end) {
  let dark = 0;
  let total = 0;
  if (axis === "horizontal") {
    const y = Math.max(0, Math.min(height - 1, fixed));
    for (let x = Math.max(0, start); x <= Math.min(width - 1, end); x += 1) {
      total += 1;
      if (isDark(data, width, x, y)) {
        dark += 1;
      }
    }
  } else {
    const x = Math.max(0, Math.min(width - 1, fixed));
    for (let y = Math.max(0, start); y <= Math.min(height - 1, end); y += 1) {
      total += 1;
      if (isDark(data, width, x, y)) {
        dark += 1;
      }
    }
  }
  return total ? dark / total : 0;
}

function bestBandCoverage(
  data,
  width,
  height,
  axis,
  fixed,
  start,
  end,
  radius,
) {
  let best = 0;
  for (let delta = -radius; delta <= radius; delta += 1) {
    best = Math.max(
      best,
      lineDarkFraction(
        data,
        width,
        height,
        axis,
        fixed + delta,
        start,
        end,
      ),
    );
  }
  return best;
}

function expectedMarkerDark(markerId, u, v) {
  if (markerId === "topLeft") {
    return true;
  }
  if (markerId === "topRight") {
    return v <= u;
  }
  if (markerId === "bottomLeft") {
    return u <= 0.28 || v >= 0.72;
  }
  if (markerId === "bottomRight") {
    return Math.abs(u - 0.5) + Math.abs(v - 0.5) <= 0.5;
  }
  fail("Unknown marker contract " + markerId + ".");
}

function nearbyDark(data, width, height, x, y, radius = 1) {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const observedX = Math.max(0, Math.min(width - 1, x + dx));
      const observedY = Math.max(0, Math.min(height - 1, y + dy));
      if (isDark(data, width, observedX, observedY)) {
        return true;
      }
    }
  }
  return false;
}

function mapSourceBoxWithTransform(sourceBox, transform) {
  return {
    left: transform.translateX + transform.scaleX * sourceBox[0],
    top: transform.translateY + transform.scaleY * sourceBox[1],
    right: transform.translateX + transform.scaleX * sourceBox[2],
    bottom: transform.translateY + transform.scaleY * sourceBox[3],
  };
}

function markerTemplateAgreement(
  data,
  rasterWidth,
  rasterHeight,
  transform,
  fixture,
  markerId,
) {
  const sourceBox = fixture.geometry.markers[markerId];
  const mapped = mapSourceBoxWithTransform(sourceBox, transform);

  let agreements = 0;
  let samples = 0;
  const gridSize = 9;
  for (let row = 0; row < gridSize; row += 1) {
    for (let column = 0; column < gridSize; column += 1) {
      const u = (column + 0.5) / gridSize;
      const v = (row + 0.5) / gridSize;
      const x = Math.round(mapped.left + u * (mapped.right - mapped.left));
      const y = Math.round(mapped.top + v * (mapped.bottom - mapped.top));
      const observedDark = nearbyDark(
        data,
        rasterWidth,
        rasterHeight,
        x,
        y,
        0,
      );
      if (observedDark === expectedMarkerDark(markerId, u, v)) {
        agreements += 1;
      }
      samples += 1;
    }
  }
  const agreement = agreements / samples;
  const searchExpansion = Math.max(
    2,
    Math.ceil(Math.min(transform.scaleX, transform.scaleY) * 4),
  );
  const search = {
    left: Math.floor(mapped.left - searchExpansion),
    top: Math.floor(mapped.top - searchExpansion),
    right: Math.ceil(mapped.right + searchExpansion),
    bottom: Math.ceil(mapped.bottom + searchExpansion),
  };
  let observedLeft = Infinity;
  let observedTop = Infinity;
  let observedRight = -Infinity;
  let observedBottom = -Infinity;
  for (
    let y = Math.max(0, search.top);
    y <= Math.min(rasterHeight - 1, search.bottom);
    y += 1
  ) {
    for (
      let x = Math.max(0, search.left);
      x <= Math.min(rasterWidth - 1, search.right);
      x += 1
    ) {
      if (isDark(data, rasterWidth, x, y)) {
        observedLeft = Math.min(observedLeft, x);
        observedTop = Math.min(observedTop, y);
        observedRight = Math.max(observedRight, x);
        observedBottom = Math.max(observedBottom, y);
      }
    }
  }
  const observedBounds = Number.isFinite(observedLeft)
    ? {
        left: observedLeft,
        top: observedTop,
        right: observedRight,
        bottom: observedBottom,
        centerX: (observedLeft + observedRight) / 2,
        centerY: (observedTop + observedBottom) / 2,
      }
    : null;
  return {
    mappedBoundsPixels: mapped,
    observedBoundsPixels: observedBounds,
    agreement,
    present:
      agreement >= CONTRACT.markerTemplateAgreementMinimum &&
      observedBounds !== null,
    threshold: CONTRACT.markerTemplateAgreementMinimum,
    sampleGrid: gridSize + "x" + gridSize,
  };
}

function sourceInnerCoordinates(fixture) {
  const inset = fixture.geometry.innerInsetPixels;
  const halfThickness = (fixture.geometry.innerThicknessPixels - 1) / 2;
  return {
    left: inset + halfThickness,
    right: fixture.widthPixels - 1 - inset - halfThickness,
    top: inset + halfThickness,
    bottom: fixture.heightPixels - 1 - inset - halfThickness,
  };
}

function locateIndependentInnerPerimeter(imageData, fixture) {
  const bands = findLongLineBands(imageData);
  const sourceInner = sourceInnerCoordinates(fixture);
  const candidates = [];
  for (let topIndex = 0; topIndex < bands.horizontal.length; topIndex += 1) {
    for (
      let bottomIndex = topIndex + 1;
      bottomIndex < bands.horizontal.length;
      bottomIndex += 1
    ) {
      const top = bands.horizontal[topIndex];
      const bottom = bands.horizontal[bottomIndex];
      for (let leftIndex = 0; leftIndex < bands.vertical.length; leftIndex += 1) {
        for (
          let rightIndex = leftIndex + 1;
          rightIndex < bands.vertical.length;
          rightIndex += 1
        ) {
          const left = bands.vertical[leftIndex];
          const right = bands.vertical[rightIndex];
          const scaleX =
            (right.center - left.center) /
            (sourceInner.right - sourceInner.left);
          const scaleY =
            (bottom.center - top.center) /
            (sourceInner.bottom - sourceInner.top);
          if (!(scaleX > 0) || !(scaleY > 0)) {
            continue;
          }
          const coverage = {
            top: lineDarkFraction(
              imageData.data,
              imageData.width,
              imageData.height,
              "horizontal",
              Math.round(top.center),
              Math.round(left.center),
              Math.round(right.center),
            ),
            right: lineDarkFraction(
              imageData.data,
              imageData.width,
              imageData.height,
              "vertical",
              Math.round(right.center),
              Math.round(top.center),
              Math.round(bottom.center),
            ),
            bottom: lineDarkFraction(
              imageData.data,
              imageData.width,
              imageData.height,
              "horizontal",
              Math.round(bottom.center),
              Math.round(left.center),
              Math.round(right.center),
            ),
            left: lineDarkFraction(
              imageData.data,
              imageData.width,
              imageData.height,
              "vertical",
              Math.round(left.center),
              Math.round(top.center),
              Math.round(bottom.center),
            ),
          };
          const minimumCoverage = Math.min(...Object.values(coverage));
          const expectedHorizontalThickness =
            fixture.geometry.innerThicknessPixels * scaleY;
          const expectedVerticalThickness =
            fixture.geometry.innerThicknessPixels * scaleX;
          const thicknessError =
            Math.abs(top.thickness / expectedHorizontalThickness - 1) +
            Math.abs(bottom.thickness / expectedHorizontalThickness - 1) +
            Math.abs(left.thickness / expectedVerticalThickness - 1) +
            Math.abs(right.thickness / expectedVerticalThickness - 1);
          const score =
            thicknessError / 4 +
            Object.values(coverage).reduce(
              (sum, value) => sum + (1 - value),
              0,
            ) / 4;
          candidates.push({
            top,
            right,
            bottom,
            left,
            scaleX,
            scaleY,
            coverage,
            minimumCoverage,
            score,
          });
        }
      }
    }
  }
  candidates.sort((first, second) => first.score - second.score);
  const best = candidates[0] || null;
  const runnerUp = candidates[1] || null;
  const confidenceMargin = runnerUp ? runnerUp.score - best.score : Infinity;
  const reliable = Boolean(
    best &&
      best.minimumCoverage >= CONTRACT.innerPerimeterCoverageMinimum &&
      best.score <= CONTRACT.innerAnchorScoreMaximum &&
      confidenceMargin >= CONTRACT.innerAnchorAmbiguityMarginMinimum,
  );
  const state = !best
    ? "INNER_PERIMETER_MISSING"
    : reliable
      ? "INNER_PERIMETER_LOCATED"
      : "INNER_PERIMETER_AMBIGUOUS";
  if (!best) {
    return { state, reliable: false, candidatesConsidered: candidates.length };
  }
  return {
    state,
    reliable,
    candidatesConsidered: candidates.length,
    score: best.score,
    runnerUpScore: runnerUp ? runnerUp.score : null,
    confidenceMargin,
    observed: {
      leftCenter: best.left.center,
      rightCenter: best.right.center,
      topCenter: best.top.center,
      bottomCenter: best.bottom.center,
      horizontalSpan: best.right.center - best.left.center,
      verticalSpan: best.bottom.center - best.top.center,
    },
    coverage: best.coverage,
    bands: {
      left: best.left,
      right: best.right,
      top: best.top,
      bottom: best.bottom,
    },
  };
}

function transformFromInnerPerimeter(inner, fixture) {
  if (!inner.reliable) {
    return null;
  }
  const sourceInner = sourceInnerCoordinates(fixture);
  const scaleX =
    inner.observed.horizontalSpan /
    (sourceInner.right - sourceInner.left);
  const scaleY =
    inner.observed.verticalSpan /
    (sourceInner.bottom - sourceInner.top);
  const translateX = inner.observed.leftCenter - scaleX * sourceInner.left;
  const translateY = inner.observed.topCenter - scaleY * sourceInner.top;
  return {
    convention:
      "Inclusive source pixel centers span 0 through width-1 and 0 through height-1.",
    scaleX,
    translateX,
    scaleY,
    translateY,
    predictedOriginalBounds: {
      left: translateX,
      right: translateX + scaleX * (fixture.widthPixels - 1),
      top: translateY,
      bottom: translateY + scaleY * (fixture.heightPixels - 1),
    },
  };
}

function markerLatticeTransform(markers, fixture) {
  if (Object.values(markers).some((marker) => !marker.present)) {
    return { reliable: false, state: "MARKER_LATTICE_INCOMPLETE" };
  }
  const centers = {};
  for (const [markerId, marker] of Object.entries(markers)) {
    const sourceBox = fixture.geometry.markers[markerId];
    centers[markerId] = {
      sourceX: (sourceBox[0] + sourceBox[2]) / 2,
      sourceY: (sourceBox[1] + sourceBox[3]) / 2,
      observedX: marker.observedBoundsPixels.centerX,
      observedY: marker.observedBoundsPixels.centerY,
    };
  }
  const horizontalPairs = [
    ["topLeft", "topRight"],
    ["bottomLeft", "bottomRight"],
  ];
  const verticalPairs = [
    ["topLeft", "bottomLeft"],
    ["topRight", "bottomRight"],
  ];
  const scaleX = horizontalPairs.reduce((sum, pair) => {
    return sum +
      (centers[pair[1]].observedX - centers[pair[0]].observedX) /
        (centers[pair[1]].sourceX - centers[pair[0]].sourceX);
  }, 0) / horizontalPairs.length;
  const scaleY = verticalPairs.reduce((sum, pair) => {
    return sum +
      (centers[pair[1]].observedY - centers[pair[0]].observedY) /
        (centers[pair[1]].sourceY - centers[pair[0]].sourceY);
  }, 0) / verticalPairs.length;
  const translateX = Object.values(centers).reduce(
    (sum, center) => sum + center.observedX - scaleX * center.sourceX,
    0,
  ) / 4;
  const translateY = Object.values(centers).reduce(
    (sum, center) => sum + center.observedY - scaleY * center.sourceY,
    0,
  ) / 4;
  return {
    reliable: scaleX > 0 && scaleY > 0,
    state: scaleX > 0 && scaleY > 0
      ? "MARKER_LATTICE_LOCATED"
      : "MARKER_LATTICE_INVALID",
    scaleX,
    translateX,
    scaleY,
    translateY,
    centers,
  };
}

function edgeObservedDarkness(imageData, side, fixed, start, end) {
  if (
    ((side === "top" || side === "bottom") &&
      (fixed < 0 || fixed >= imageData.height)) ||
    ((side === "left" || side === "right") &&
      (fixed < 0 || fixed >= imageData.width))
  ) {
    return 0;
  }
  if (side === "top" || side === "bottom") {
    return lineDarkFraction(
      imageData.data,
      imageData.width,
      imageData.height,
      "horizontal",
      fixed,
      start,
      end,
    );
  }
  return lineDarkFraction(
    imageData.data,
    imageData.width,
    imageData.height,
    "vertical",
    fixed,
    start,
    end,
  );
}

function sourcePixelCenterIndex(sourceCoordinate) {
  // Pixel center k owns [k - 0.5, k + 0.5). An exact half-pixel tie
  // therefore belongs to the next higher center (for example, 5.5 -> 6).
  return Math.floor(sourceCoordinate + 0.5);
}

function sourceEdgeOccupancy(
  geometry,
  sourceNormalLength,
  sourcePixelIndex,
) {
  if (sourcePixelIndex < 0 || sourcePixelIndex >= sourceNormalLength) {
    return "OUTSIDE_SOURCE";
  }
  if (sourcePixelIndex < geometry.outerThicknessPixels) {
    return "OUTER_BLACK";
  }
  if (sourcePixelIndex < geometry.innerInsetPixels) {
    return "WHITE_GAP";
  }
  if (
    sourcePixelIndex <
    geometry.innerInsetPixels + geometry.innerThicknessPixels
  ) {
    return "INNER_BLACK";
  }
  return "INTERIOR";
}

function discriminativeCropEvidence(observed, crop) {
  let discriminatingMismatchAdvantage = 0;
  let discriminatingSampleCount = 0;
  for (let depth = 0; depth < observed.length; depth += 1) {
    const sample = observed[depth];
    const cropExpectation =
      depth >= crop &&
      (sample.sourceOccupancyClass === "OUTER_BLACK" ||
        sample.sourceOccupancyClass === "INNER_BLACK")
        ? 1
        : 0;
    if (cropExpectation === sample.expectedIntactDarkness) {
      continue;
    }
    discriminatingSampleCount += 1;
    discriminatingMismatchAdvantage +=
      Math.abs(sample.observedDarkness - sample.expectedIntactDarkness) -
      Math.abs(sample.observedDarkness - cropExpectation);
  }
  return {
    discriminatingSampleCount,
    cropEvidenceStrength: discriminatingSampleCount > 0
      ? discriminatingMismatchAdvantage / discriminatingSampleCount
      : null,
  };
}

function measureEdgeProfile(
  imageData,
  fixture,
  transform,
  side,
  observedBoundary,
) {
  const horizontal = side === "top" || side === "bottom";
  const normalScale = horizontal ? transform.scaleY : transform.scaleX;
  const normalTranslate = horizontal
    ? transform.translateY
    : transform.translateX;
  const sourceNormalLength = horizontal
    ? fixture.heightPixels
    : fixture.widthPixels;
  const predicted = transform.predictedOriginalBounds[side];
  const direction = side === "top" || side === "left" ? 1 : -1;
  const tangentSourceLength = horizontal
    ? fixture.widthPixels - 1
    : fixture.heightPixels - 1;
  const tangentTranslate = horizontal
    ? transform.translateX
    : transform.translateY;
  const tangentScale = horizontal ? transform.scaleX : transform.scaleY;
  const tangentStart = Math.round(
    tangentTranslate +
      tangentScale * tangentSourceLength * CONTRACT.edgeProfileTangentStart,
  );
  const tangentEnd = Math.round(
    tangentTranslate +
      tangentScale * tangentSourceLength * CONTRACT.edgeProfileTangentEnd,
  );
  const sourceProfileDepth =
    fixture.geometry.innerInsetPixels +
    fixture.geometry.innerThicknessPixels +
    2;
  const renderedProfileDepth = Math.max(
    4,
    Math.ceil(sourceProfileDepth * normalScale),
  );
  const maximumCropHypothesis = Math.max(
    1,
    Math.ceil(fixture.geometry.outerThicknessPixels * normalScale) + 2,
  );
  const observed = [];
  for (let depth = 0; depth < renderedProfileDepth; depth += 1) {
    const predictedGeometricRasterPosition = predicted + direction * depth;
    const rasterCoordinate = Math.round(predictedGeometricRasterPosition);
    const sourceCoordinate =
      (rasterCoordinate - normalTranslate) / normalScale;
    const sourceDepth = direction > 0
      ? sourceCoordinate
      : sourceNormalLength - 1 - sourceCoordinate;
    const sourcePixelIndex = sourcePixelCenterIndex(sourceDepth);
    const occupancy = sourceEdgeOccupancy(
      fixture.geometry,
      sourceNormalLength,
      sourcePixelIndex,
    );
    const observedDarkness = edgeObservedDarkness(
      imageData,
      side,
      rasterCoordinate,
      tangentStart,
      tangentEnd,
    );
    const expectedIntactDarkness =
      occupancy === "OUTER_BLACK" || occupancy === "INNER_BLACK" ? 1 : 0;
    observed.push({
      depth,
      predictedGeometricRasterPosition,
      rasterCoordinate,
      roundedSampledCoordinate: rasterCoordinate,
      inverseMappedSourceCoordinate: sourceCoordinate,
      inwardSourceDepth: sourceDepth,
      sourcePixelIndex,
      sourceOccupancyClass: occupancy,
      observedDarkness,
      expectedIntactDarkness,
      intactMatch: observedDarkness === expectedIntactDarkness,
    });
  }
  const scores = [];
  for (let crop = 0; crop <= maximumCropHypothesis; crop += 1) {
    let absoluteError = 0;
    for (let depth = 0; depth < observed.length; depth += 1) {
      const sample = observed[depth];
      const expectedDark =
        depth >= crop &&
        (sample.sourceOccupancyClass === "OUTER_BLACK" ||
          sample.sourceOccupancyClass === "INNER_BLACK")
          ? 1
          : 0;
      const cropMismatch = Math.abs(sample.observedDarkness - expectedDark);
      absoluteError += cropMismatch;
    }
    const discriminative = discriminativeCropEvidence(observed, crop);
    scores.push({
      cropRenderedPixels: crop,
      score: 1 - absoluteError / observed.length,
      ...discriminative,
    });
  }
  scores.sort((first, second) => second.score - first.score);
  const intact = scores.find((candidate) => candidate.cropRenderedPixels === 0);
  const bestPositive = scores
    .filter((candidate) => candidate.cropRenderedPixels > 0)
    .sort((first, second) =>
      second.cropEvidenceStrength - first.cropEvidenceStrength ||
      second.score - first.score ||
      first.cropRenderedPixels - second.cropRenderedPixels)[0];
  const transitionSamples = observed.filter(
    (sample, index) =>
      index === 0 ||
      sample.sourceOccupancyClass !==
        observed[index - 1].sourceOccupancyClass,
  );
  const intactMismatchSamples = observed.filter(
    (sample) => !sample.intactMatch,
  );
  const topologySamples = observed.filter((sample) =>
    sample.sourceOccupancyClass === "OUTER_BLACK" ||
    sample.sourceOccupancyClass === "WHITE_GAP" ||
    sample.sourceOccupancyClass === "INNER_BLACK");
  const intactBandTopologySupport = topologySamples.length > 0
    ? 1 - topologySamples.reduce(
        (sum, sample) =>
          sum + Math.abs(
            sample.observedDarkness - sample.expectedIntactDarkness,
          ),
        0,
      ) / topologySamples.length
    : 0;
  const inwardDirection = side === "top" || side === "left" ? 1 : -1;
  const localizationResidual = Number.isFinite(observedBoundary)
    ? inwardDirection * (observedBoundary - predicted)
    : null;
  const outerCellBoundary = Number.isFinite(observedBoundary)
    ? observedBoundary - inwardDirection * 0.5
    : null;
  const result = {
    side,
    edgeObservedBoundary: Number.isFinite(observedBoundary)
      ? {
          pixelCenter: observedBoundary,
          outerPixelCellBoundary: outerCellBoundary,
        }
      : null,
    edgePredictedBoundary: {
      pixelCenter: predicted,
      outerPixelCellBoundary: predicted - inwardDirection * 0.5,
      source: "INNER_PERIMETER_TRANSFORM",
    },
    edgeLocalizationResidual: localizationResidual,
    edgeLocalizationAbsoluteResidual: localizationResidual === null
      ? null
      : Math.abs(localizationResidual),
    predictedOriginalEdgePixelCenter: predicted,
    intactHypothesisScore: intact.score,
    intactBandTopologySupport,
    bestCropHypothesisPixels: bestPositive.cropRenderedPixels,
    cropHypothesisScore: bestPositive.score,
    bestCropHypothesis: {
      pixels: bestPositive.cropRenderedPixels,
      score: bestPositive.score,
      confidence: Math.max(0, bestPositive.cropEvidenceStrength),
      discriminatingSampleCount: bestPositive.discriminatingSampleCount,
    },
    cropEvidenceStrength: bestPositive.cropEvidenceStrength,
    cropAdvantageOverIntact: bestPositive.score - intact.score,
    bestHypothesisPixels: scores[0].cropRenderedPixels,
    bestHypothesisScore: scores[0].score,
    sampledProfileLength: observed.length,
    tangentSample: { start: tangentStart, end: tangentEnd },
    sampleCoordinateConvention: {
      sourcePixelCenters: "integer coordinates 0..N-1",
      sourcePixelCell: "[k - 0.5, k + 0.5)",
      exactHalfPixelTie: "next higher source pixel center",
    },
    sampleProvenanceSummary: {
      sampleCount: observed.length,
      transitionSamples,
      intactMismatchCount: intactMismatchSamples.length,
      intactMismatchSamples: intactMismatchSamples.slice(0, 8),
      intactMismatchSamplesTruncated: intactMismatchSamples.length > 8,
    },
  };
  Object.defineProperty(result, "sampleProvenance", {
    value: observed,
    enumerable: false,
  });
  return result;
}

function docsSizingEvidence(fixture, sizingPolicy) {
  const requestedWidth = sizingPolicy &&
    (sizingPolicy.requestedWidthPixels ?? sizingPolicy.appliedWidthPixels);
  const requestedHeight = sizingPolicy &&
    (sizingPolicy.requestedHeightPixels ?? sizingPolicy.appliedHeightPixels);
  const observedWidth = sizingPolicy && sizingPolicy.observedWidthPixels;
  const observedHeight = sizingPolicy && sizingPolicy.observedHeightPixels;
  const sourceRatio = fixture.widthPixels / fixture.heightPixels;
  const requestedAvailable = requestedWidth > 0 && requestedHeight > 0;
  const observedAvailable = observedWidth > 0 && observedHeight > 0;
  const requestedDocsAnisotropy = requestedAvailable
    ? (requestedWidth / fixture.widthPixels) /
      (requestedHeight / fixture.heightPixels)
    : null;
  const observedDocsAnisotropy = observedAvailable
    ? (observedWidth / fixture.widthPixels) /
      (observedHeight / fixture.heightPixels)
    : null;
  return {
    sourceGeometry: {
      width: fixture.widthPixels,
      height: fixture.heightPixels,
      ratio: sourceRatio,
    },
    requestedDocsSizing: {
      width: requestedAvailable ? requestedWidth : null,
      height: requestedAvailable ? requestedHeight : null,
      requestedDocsAnisotropy,
      available: requestedAvailable,
    },
    observedDocsSizing: {
      width: observedAvailable ? observedWidth : null,
      height: observedAvailable ? observedHeight : null,
      observedDocsAnisotropy,
      available: observedAvailable,
    },
    setterInducedAnisotropy:
      requestedAvailable && observedAvailable
        ? observedDocsAnisotropy / requestedDocsAnisotropy - 1
        : null,
    setterGeometryChangeRecorded: requestedAvailable && observedAvailable,
  };
}

function rawFixtureGeometryEvidence(imageData, fixture, sizingPolicy) {
  const innerPerimeter = locateIndependentInnerPerimeter(imageData, fixture);
  const transform = transformFromInnerPerimeter(innerPerimeter, fixture);
  const outerRenderedBounds = observedDarkBounds(imageData);
  const sizingEvidence = docsSizingEvidence(fixture, sizingPolicy);
  if (!transform) {
    return {
      innerPerimeter,
      transform: null,
      markers: null,
      markerLattice: null,
      edges: null,
      outerRenderedBounds,
      sizingEvidence,
    };
  }
  const markers = {};
  for (const markerId of [
    "topLeft",
    "topRight",
    "bottomLeft",
    "bottomRight",
  ]) {
    markers[markerId] = markerTemplateAgreement(
      imageData.data,
      imageData.width,
      imageData.height,
      transform,
      fixture,
      markerId,
    );
  }
  const markerLattice = markerLatticeTransform(markers, fixture);
  const edges = {};
  for (const side of ["top", "right", "bottom", "left"]) {
    edges[side] = measureEdgeProfile(
      imageData,
      fixture,
      transform,
      side,
      outerRenderedBounds ? outerRenderedBounds[side] : null,
    );
  }
  const observedDocsAnisotropy =
    sizingEvidence.observedDocsSizing.observedDocsAnisotropy;
  const innerRenderedAnisotropy = transform.scaleX / transform.scaleY;
  const markerRenderedAnisotropy = markerLattice.reliable
    ? markerLattice.scaleX / markerLattice.scaleY
    : null;
  const outerRenderedAnisotropy = outerRenderedBounds
    ? (outerRenderedBounds.width / fixture.widthPixels) /
      (outerRenderedBounds.height / fixture.heightPixels)
    : null;
  return {
    innerPerimeter,
    transform,
    markers,
    markerLattice,
    edges,
    outerRenderedBounds,
    sizingEvidence,
    renderedAnisotropy: {
      outer: outerRenderedAnisotropy,
      inner: innerRenderedAnisotropy,
      marker: markerRenderedAnisotropy,
    },
    rendererResidualFromObservedSizing: {
      outer: observedDocsAnisotropy !== null && outerRenderedAnisotropy !== null
        ? outerRenderedAnisotropy / observedDocsAnisotropy - 1
        : null,
      inner: observedDocsAnisotropy !== null
        ? innerRenderedAnisotropy / observedDocsAnisotropy - 1
        : null,
      marker:
        observedDocsAnisotropy !== null && markerRenderedAnisotropy !== null
          ? markerRenderedAnisotropy / observedDocsAnisotropy - 1
          : null,
    },
    anchorScaleRelativeErrorX: markerLattice.reliable
      ? Math.abs(markerLattice.scaleX / transform.scaleX - 1)
      : Infinity,
    anchorScaleRelativeErrorY: markerLattice.reliable
      ? Math.abs(markerLattice.scaleY / transform.scaleY - 1)
      : Infinity,
    anchorTranslationErrorPixels: markerLattice.reliable
      ? Math.max(
          Math.abs(markerLattice.translateX - transform.translateX),
          Math.abs(markerLattice.translateY - transform.translateY),
        )
      : Infinity,
  };
}

function classifyFixtureGeometry(raw, fixture, calibration) {
  if (!raw.transform || !raw.innerPerimeter.reliable) {
    return {
      detector: {
        type:
          "independent inner-perimeter transform, redundant marker lattice, and two-band edge profiles",
        darkLuminanceMaximum: CONTRACT.darkLuminanceMaximum,
        noOcr: true,
        noMl: true,
      },
      visualState: "VISUAL_INTEGRITY_UNRESOLVED",
      innerPerimeter: raw.innerPerimeter,
      sourceToRenderTransform: null,
      markerLatticeTransform: null,
      markerLatticeAgreement: { passed: false },
      markers: null,
      allFourMarkersPresent: false,
      fiducialIntegrityPassed: false,
      edgeSurvivalPassed: false,
      perimeterComplete: false,
      edges: null,
      visibleBoundsPixels: null,
      distortion: {
        ...raw.sizingEvidence,
        renderedAnisotropy: {
          outer: null,
          inner: null,
          marker: null,
        },
        rendererResidualFromObservedSizing: {
          outer: null,
          inner: null,
          marker: null,
        },
        rendererResidualWithinMeasuredLocalizationUncertainty: null,
        productionToleranceDefined: false,
      },
      calibration,
      boundaryUncertaintyPixels:
        calibration.edgeLocalizationUncertaintyPixels,
    };
  }
  const allFourMarkersPresent = Object.values(raw.markers).every(
    (marker) => marker.present,
  );
  const anchorsAgree = Boolean(
    raw.markerLattice.reliable &&
      raw.anchorScaleRelativeErrorX <= calibration.anchorScaleRelativeError &&
      raw.anchorScaleRelativeErrorY <= calibration.anchorScaleRelativeError &&
      raw.anchorTranslationErrorPixels <=
        calibration.anchorTranslationErrorPixels,
  );
  const edges = {};
  for (const side of ["top", "right", "bottom", "left"]) {
    const edge = raw.edges[side];
    let state = "EDGE_UNRESOLVED";
    const observedBoundaryAvailable = edge.edgeObservedBoundary !== null;
    const localizationWithinUncertainty = observedBoundaryAvailable &&
      edge.edgeLocalizationAbsoluteResidual <=
        calibration.edgeLocalizationUncertaintyPixels;
    const inwardLossBeyondUncertainty = observedBoundaryAvailable &&
      edge.edgeLocalizationResidual >
        calibration.edgeLocalizationUncertaintyPixels;
    const outwardDisplacementBeyondUncertainty = observedBoundaryAvailable &&
      edge.edgeLocalizationResidual <
        -calibration.edgeLocalizationUncertaintyPixels;
    const intactTopologySupported =
      edge.intactBandTopologySupport >=
        calibration.intactBandTopologySupportMinimum;
    const positiveCropEvidenceStrong =
      edge.cropEvidenceStrength >= calibration.cropEvidenceMinimum &&
      edge.bestCropHypothesis.pixels > 0;
    const positiveCropEvidenceAbsent =
      edge.cropEvidenceStrength <= calibration.intactCropEvidenceMaximum;
    if (
      anchorsAgree &&
      observedBoundaryAvailable &&
      (inwardLossBeyondUncertainty || positiveCropEvidenceStrong)
    ) {
      state = "EDGE_LOSS_DETECTED";
    } else if (
      anchorsAgree &&
      localizationWithinUncertainty &&
      !outwardDisplacementBeyondUncertainty &&
      intactTopologySupported &&
      positiveCropEvidenceAbsent
    ) {
      state = "EDGE_INTACT";
    }
    edges[side] = {
      state,
      edgeObservedBoundary: edge.edgeObservedBoundary,
      edgePredictedBoundary: edge.edgePredictedBoundary,
      edgeLocalizationResidual: edge.edgeLocalizationResidual,
      edgeLocalizationAbsoluteResidual:
        edge.edgeLocalizationAbsoluteResidual,
      localizationWithinUncertainty,
      inwardLossBeyondUncertainty,
      outwardDisplacementBeyondUncertainty,
      uncertaintyRenderedPixels: calibration.edgeLocalizationUncertaintyPixels,
      uncertaintyPdfPoints:
        calibration.edgeLocalizationUncertaintyPixels /
        CONTRACT.renderScale,
      intactHypothesisScore: edge.intactHypothesisScore,
      intactBandTopologySupport: edge.intactBandTopologySupport,
      intactTopologySupported,
      bestCropHypothesis: edge.bestCropHypothesis,
      bestCropHypothesisPixels: edge.bestCropHypothesisPixels,
      cropHypothesisScore: edge.cropHypothesisScore,
      cropEvidenceStrength: edge.cropEvidenceStrength,
      cropEvidenceConfidence: Math.max(0, edge.cropEvidenceStrength),
      cropHypothesisSeparationMagnitude: Math.abs(edge.cropEvidenceStrength),
      positiveCropEvidenceStrong,
      cropAdvantageOverIntact: edge.cropAdvantageOverIntact,
      sampleCoordinateConvention: edge.sampleCoordinateConvention,
      sampleProvenanceSummary: edge.sampleProvenanceSummary,
    };
  }
  const edgeStates = Object.values(edges).map((edge) => edge.state);
  const edgeSurvivalPassed = edgeStates.every(
    (state) => state === "EDGE_INTACT",
  );
  const edgeLossDetected = edgeStates.some(
    (state) => state === "EDGE_LOSS_DETECTED",
  );
  const setterGeometryChangeRecorded =
    raw.sizingEvidence.setterGeometryChangeRecorded;
  const residual = raw.rendererResidualFromObservedSizing;
  const rendererEvidenceAvailable = setterGeometryChangeRecorded &&
    Number.isFinite(residual.outer) &&
    Number.isFinite(residual.inner) &&
    Number.isFinite(residual.marker);
  const rendererResidualWithinMeasuredLocalizationUncertainty =
    rendererEvidenceAvailable
      ? Boolean(
          anchorsAgree &&
          Math.abs(residual.outer) <=
            calibration.outerRendererResidualAnisotropy &&
          Math.abs(residual.inner) <=
            calibration.innerRendererResidualAnisotropy &&
          Math.abs(residual.marker) <=
            calibration.markerRendererResidualAnisotropy
        )
      : null;
  const visualState = edgeLossDetected ||
    rendererResidualWithinMeasuredLocalizationUncertainty === false ||
    !allFourMarkersPresent
    ? "VISUAL_INTEGRITY_FAILED"
    : edgeSurvivalPassed &&
        anchorsAgree &&
        rendererResidualWithinMeasuredLocalizationUncertainty === true &&
        setterGeometryChangeRecorded
      ? "VISUAL_INTEGRITY_PASSED"
      : "VISUAL_INTEGRITY_UNRESOLVED";
  const visibleBoundsPixels = raw.outerRenderedBounds
    ? { ...raw.outerRenderedBounds }
    : null;
  return {
    detector: {
      type:
        "independent inner-perimeter transform, redundant marker lattice, and two-band edge profiles",
      darkLuminanceMaximum: CONTRACT.darkLuminanceMaximum,
      noOcr: true,
      noMl: true,
    },
    visualState,
    innerPerimeter: raw.innerPerimeter,
    sourceToRenderTransform: raw.transform,
    markerLatticeTransform: raw.markerLattice,
    markerLatticeAgreement: {
      scaleRelativeErrorX: raw.anchorScaleRelativeErrorX,
      scaleRelativeErrorY: raw.anchorScaleRelativeErrorY,
      translationErrorPixels: raw.anchorTranslationErrorPixels,
      passed: anchorsAgree,
    },
    markers: raw.markers,
    allFourMarkersPresent,
    fiducialIntegrityPassed: allFourMarkersPresent && anchorsAgree,
    edges,
    edgeSurvivalPassed,
    perimeterComplete: edgeSurvivalPassed,
    visibleBoundsPixels,
    distortion: {
      ...raw.sizingEvidence,
      renderedAnisotropy: raw.renderedAnisotropy,
      rendererResidualFromObservedSizing: residual,
      uncertainty: {
        outerRendererResidualAnisotropy:
          calibration.outerRendererResidualAnisotropy,
        innerRendererResidualAnisotropy:
          calibration.innerRendererResidualAnisotropy,
        markerRendererResidualAnisotropy:
          calibration.markerRendererResidualAnisotropy,
      },
      rendererResidualWithinMeasuredLocalizationUncertainty,
      setterGeometryChangeRecorded,
      productionToleranceDefined: false,
    },
    calibration,
    boundaryUncertaintyPixels:
      calibration.edgeLocalizationUncertaintyPixels,
  };
}

function detectFixtureGeometry(imageData, fixture, sizingPolicy, calibration) {
  const raw = rawFixtureGeometryEvidence(imageData, fixture, sizingPolicy);
  return classifyFixtureGeometry(raw, fixture, calibration);
}

function mapBoundsToPdf(viewport, bounds) {
  const corners = [
    viewport.convertToPdfPoint(bounds.left, bounds.top),
    viewport.convertToPdfPoint(bounds.right, bounds.top),
    viewport.convertToPdfPoint(bounds.left, bounds.bottom),
    viewport.convertToPdfPoint(bounds.right, bounds.bottom),
  ];
  const xs = corners.map((point) => point[0]);
  const ys = corners.map((point) => point[1]);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    bottom: Math.min(...ys),
    top: Math.max(...ys),
  };
}

function normativeContentRectangle(effectiveBox) {
  const inset = CONTRACT.contentInsetPoints;
  return {
    left: effectiveBox.x + inset,
    right: effectiveBox.x + effectiveBox.width - inset,
    bottom: effectiveBox.y + inset,
    top: effectiveBox.y + effectiveBox.height - inset,
    insetPoints: inset,
  };
}

function boundsInsideContentRectangle(bounds, content, uncertaintyPoints) {
  return (
    bounds.left - uncertaintyPoints >= content.left &&
    bounds.right + uncertaintyPoints <= content.right &&
    bounds.bottom - uncertaintyPoints >= content.bottom &&
    bounds.top + uncertaintyPoints <= content.top
  );
}

async function renderAndMeasure(renderer, sourceEvidence, verifiedPdf) {
  const defensiveCopy = new Uint8Array(verifiedPdf.originalBytes);
  const loadingTask = renderer.pdfjs.getDocument({
    data: defensiveCopy,
    disableWorker: true,
    isEvalSupported: false,
  });
  const document = await loadingTask.promise;
  if (document.numPages !== 1) {
    fail("P5.3 source PDF does not contain exactly one page.", {
      fixtureId: sourceEvidence.fixture.id,
      pageCount: document.numPages,
    });
  }

  const page = await document.getPage(1);
  const effectiveBox = boxFromPdfJsView(page.view);
  const gasPage = sourceEvidence.exportedPdf.pages[0];
  if (!boxesMatch(effectiveBox, gasPage.effectiveBox)) {
    fail("Local PDF.js effective page box differs from GAS structural evidence.", {
      fixtureId: sourceEvidence.fixture.id,
      gas: gasPage.effectiveBox,
      local: effectiveBox,
    });
  }

  const viewport = page.getViewport({
    scale: CONTRACT.renderScale,
  });
  const rasterWidth = Math.ceil(viewport.width);
  const rasterHeight = Math.ceil(viewport.height);
  const canvas = renderer.createCanvas(rasterWidth, rasterHeight);
  const context = canvas.getContext("2d");
  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, rasterWidth, rasterHeight);
  context.restore();

  await page.render({
    canvasContext: context,
    viewport,
    background: "#ffffff",
    intent: "print",
  }).promise;

  const imageData = context.getImageData(0, 0, rasterWidth, rasterHeight);
  const docsSizing = {
    ...sourceEvidence.sizingPolicy,
    ...sourceEvidence.insertedImage,
  };
  const detection = detectFixtureGeometry(
    imageData,
    sourceEvidence.fixture,
    docsSizing,
    getDetectorCalibration(),
  );
  const visibleBoundsPdf = detection.visibleBoundsPixels
    ? mapBoundsToPdf(viewport, detection.visibleBoundsPixels)
    : null;
  const contentRectangle = normativeContentRectangle(effectiveBox);
  const uncertaintyPoints =
    detection.boundaryUncertaintyPixels / CONTRACT.renderScale;
  const insideContentRectangle = visibleBoundsPdf
    ? boundsInsideContentRectangle(
        visibleBoundsPdf,
        contentRectangle,
        uncertaintyPoints,
      )
    : false;
  const measuredRenderedWidth = detection.visibleBoundsPixels
    ? detection.visibleBoundsPixels.width
    : null;
  const measuredRenderedHeight = detection.visibleBoundsPixels
    ? detection.visibleBoundsPixels.height
    : null;
  const sourceRatio =
    sourceEvidence.fixture.widthPixels /
    sourceEvidence.fixture.heightPixels;
  const renderedRatio = measuredRenderedWidth && measuredRenderedHeight
    ? measuredRenderedWidth / measuredRenderedHeight
    : null;
  const pngBytes = canvas.toBuffer("image/png");

  const measurement = {
    fixtureId: sourceEvidence.fixture.id,
    localProvenance: verifiedPdf.provenance,
    pdf: {
      pageCount: document.numPages,
      exactlyOnePage: document.numPages === 1,
      overflowPage: document.numPages !== 1,
      effectiveBox,
      effectiveBoxSource: gasPage.effectiveBoxSource,
      declaredRotationDegrees: page.rotate,
    },
    renderer: {
      scalePixelsPerPdfPoint: CONTRACT.renderScale,
      viewportTransform: Array.from(viewport.transform),
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      rasterWidth,
      rasterHeight,
      fullPage: true,
      background: "white",
      autoCrop: false,
      ocr: false,
      deskew: false,
      enhancement: false,
    },
    detection,
    sourceGeometry: detection.distortion.sourceGeometry,
    requestedDocsSizing: detection.distortion.requestedDocsSizing,
    observedDocsSizing: detection.distortion.observedDocsSizing,
    setterInducedAnisotropy:
      detection.distortion.setterInducedAnisotropy,
    renderedAnisotropy: detection.distortion.renderedAnisotropy,
    rendererResidualFromObservedSizing:
      detection.distortion.rendererResidualFromObservedSizing,
    visibleBoundsPdf,
    normativeContentRectangle: contentRectangle,
    boundsInsideNormativeContentRectangle: insideContentRectangle,
    sourceRatio,
    renderedRatio,
    relativeAspectError: renderedRatio === null
      ? null
      : Math.abs(renderedRatio / sourceRatio - 1),
    measurementUncertainty: {
      renderedPixels: detection.boundaryUncertaintyPixels,
      pdfPoints: uncertaintyPoints,
      statement:
        "Detector uncertainty is the maximum localization residual observed across deterministic intact controls.",
    },
    renderedPng: {
      byteLength: pngBytes.length,
      sha256: sha256(pngBytes),
      persisted: false,
    },
  };

  await document.destroy();
  return {
    measurement,
    pngBytes,
  };
}

function validateGasEvidence(evidence) {
  if (
    evidence.experimentId !== CONTRACT.experimentId ||
    evidence.version !== 1 ||
    !Array.isArray(evidence.sources) ||
    evidence.sources.length !== 2
  ) {
    fail("Unexpected or incomplete P5.3 GAS evidence contract.");
  }
  const ids = evidence.sources.map((source) => source.fixture.id);
  if (JSON.stringify(ids) !== JSON.stringify(CONTRACT.fixtureIds)) {
    fail("P5.3 fixture order or identity mismatch.", {
      expected: CONTRACT.fixtureIds,
      observed: ids,
    });
  }
  for (const source of evidence.sources) {
    if (
      source.fixture.mime !==
        (source.fixture.id === "PORTRAIT" ? "image/jpeg" : "image/png") ||
      source.fixture.expectedByteLength > 1024 * 1024 ||
      !source.fixture.identityVerified ||
      !source.conversionSucceeded ||
      !source.exportedPdf ||
      source.exportedPdf.mime !== "application/pdf" ||
      !source.exportedPdf.nonEmpty ||
      !source.exportedPdf.loadSucceeded ||
      source.exportedPdf.pageCount !== 1 ||
      source.exportedPdf.overflowPage ||
      !source.temporaryDocument.cleanup.verifiedTrashed ||
      !source.evidencePdf ||
      !source.evidencePdf.fileId ||
      !source.evidencePdf.identityVerified
    ) {
      fail("GAS hard-gate evidence is incomplete for " + source.fixture.id + ".");
    }
  }
  if (
    !evidence.p4Merge ||
    !evidence.p4Merge.succeeded ||
    JSON.stringify(evidence.p4Merge.sourceOrder) !==
      JSON.stringify(CONTRACT.fixtureIds) ||
    evidence.p4Merge.mime !== "application/pdf" ||
    !evidence.p4Merge.nonEmpty ||
    !evidence.p4Merge.structuralReloadSucceeded ||
    evidence.p4Merge.pageCount !== 2 ||
    !evidence.p4Merge.pageCountMatches ||
    !evidence.p4Merge.geometrySequenceMatches
  ) {
    fail("Required unchanged-P4 merge evidence is incomplete.");
  }
}

async function validateOutputDirectory(options) {
  if (!options.outputDirectory) {
    return;
  }
  const basename = path.basename(options.outputDirectory);
  if (!/^\.?p5-3-evidence(?:-[a-z0-9_-]+)?$/i.test(basename)) {
    fail(
      "Output directory must be an explicitly named P5.3 evidence directory.",
      { outputDirectory: options.outputDirectory },
    );
  }
  await mkdir(options.outputDirectory, { recursive: true });
  const allowed = new Set([
    path.resolve(options.evidencePath),
    path.resolve(options.portraitPath),
    path.resolve(options.landscapePath),
    path.join(
      options.outputDirectory,
      CONTRACT.generatedOutputNames.PORTRAIT,
    ),
    path.join(
      options.outputDirectory,
      CONTRACT.generatedOutputNames.LANDSCAPE,
    ),
    path.join(
      options.outputDirectory,
      CONTRACT.generatedOutputNames.result,
    ),
  ]);
  for (const entry of await readdir(options.outputDirectory)) {
    const resolved = path.resolve(options.outputDirectory, entry);
    if (!allowed.has(resolved)) {
      fail("Unexpected file in bounded P5.3 evidence directory.", {
        path: resolved,
      });
    }
  }
}

function orderedHardGates(evidence, measurements) {
  const gates = {
    bothConversionsSucceeded: evidence.sources.every(
      (source) => source.conversionSucceeded,
    ),
    applicationPdfAndNonEmpty: evidence.sources.every(
      (source) =>
        source.exportedPdf.mime === "application/pdf" &&
        source.exportedPdf.nonEmpty,
    ),
    structuralLoadSucceeded: evidence.sources.every(
      (source) => source.exportedPdf.loadSucceeded,
    ),
    exactlyOnePagePerSource: measurements.every(
      (measurement) => measurement.pdf.exactlyOnePage,
    ),
    noOverflowPage: measurements.every(
      (measurement) => !measurement.pdf.overflowPage,
    ),
    gasPrePostDriveByteIdentity: evidence.sources.every(
      (source) => source.evidencePdf.identityVerified,
    ),
    localDownloadedByteIdentity: measurements.every(
      (measurement) => measurement.localProvenance.exactMatch,
    ),
    gasStructuralAndProvenancePassed: evidence.sources.every(
      (source) =>
        source.conversionSucceeded &&
        source.exportedPdf.loadSucceeded &&
        source.exportedPdf.pageCount === 1 &&
        !source.exportedPdf.overflowPage &&
        source.evidencePdf.identityVerified,
    ),
    localDownloadedProvenancePassed: measurements.every(
      (measurement) => measurement.localProvenance.exactMatch,
    ),
    edgeSurvivalPassed: measurements.every(
      (measurement) => measurement.detection.edgeSurvivalPassed,
    ),
    fiducialIntegrityPassed: measurements.every(
      (measurement) => measurement.detection.fiducialIntegrityPassed,
    ),
    containmentPassed: measurements.every(
      (measurement) =>
        measurement.boundsInsideNormativeContentRectangle,
    ),
    rendererResidualWithinMeasuredLocalizationUncertainty: measurements.every(
      (measurement) =>
        measurement.detection.distortion
          .rendererResidualWithinMeasuredLocalizationUncertainty === true,
    ),
    setterGeometryChangeRecorded: measurements.every(
      (measurement) =>
        measurement.detection.distortion.setterGeometryChangeRecorded === true,
    ),
    p4EvidencePassed: Boolean(
      evidence.p4Merge &&
        evidence.p4Merge.succeeded &&
        evidence.p4Merge.pageCountMatches &&
        evidence.p4Merge.geometrySequenceMatches,
    ),
    conversionDocsTrashedAndVerified: evidence.sources.every(
      (source) =>
        source.temporaryDocument.cleanup.verifiedTrashed,
    ),
  };
  const firstFailure =
    Object.entries(gates).find((entry) => entry[1] !== true) || null;
  return {
    gates,
    allPassed: firstFailure === null,
    firstMaterialFailure: firstFailure
      ? {
          gate: firstFailure[0],
          observed: firstFailure[1],
        }
      : null,
  };
}

async function persistResults(options, rendered, result) {
  if (!options.outputDirectory) {
    return;
  }
  for (const item of rendered) {
    const outputPath = path.join(
      options.outputDirectory,
      CONTRACT.generatedOutputNames[item.measurement.fixtureId],
    );
    await writeFile(outputPath, item.pngBytes);
    item.measurement.renderedPng.persisted = true;
    item.measurement.renderedPng.path = outputPath;
  }
  const resultPath = path.join(
    options.outputDirectory,
    CONTRACT.generatedOutputNames.result,
  );
  await writeFile(resultPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  result.outputPath = resultPath;
}

function setPixel(data, width, height, x, y, dark) {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }
  const offset = (y * width + x) * 4;
  const value = dark ? 0 : 255;
  data[offset] = value;
  data[offset + 1] = value;
  data[offset + 2] = value;
  data[offset + 3] = 255;
}

function fillRectangle(data, width, height, box, dark = true) {
  for (let y = box[1]; y <= box[3]; y += 1) {
    for (let x = box[0]; x <= box[2]; x += 1) {
      setPixel(data, width, height, x, y, dark);
    }
  }
}

function blankImageData(width, height, value = 255) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }
  return { data, width, height };
}

function drawMarker(imageData, markerId, box) {
  for (let y = box[1]; y <= box[3]; y += 1) {
    for (let x = box[0]; x <= box[2]; x += 1) {
      const u = (x - box[0]) / (box[2] - box[0]);
      const v = (y - box[1]) / (box[3] - box[1]);
      if (expectedMarkerDark(markerId, u, v)) {
        setPixel(
          imageData.data,
          imageData.width,
          imageData.height,
          x,
          y,
          true,
        );
      }
    }
  }
}

function syntheticDetectorFixture(orientation = "portrait", geometry = {}) {
  const portrait = orientation === "portrait";
  const width = portrait ? 240 : 400;
  const height = portrait ? 400 : 240;
  const outerThickness = geometry.outerThicknessPixels ?? 6;
  const innerInset = geometry.innerInsetPixels ?? 24;
  const innerThickness = geometry.innerThicknessPixels ?? 4;
  const markerInset = geometry.markerInsetPixels ?? 36;
  const markerExtent = geometry.markerExtentPixels ?? 28;
  const markers = {
    topLeft: [
      markerInset,
      markerInset,
      markerInset + markerExtent,
      markerInset + markerExtent,
    ],
    topRight: [
      width - 1 - markerInset - markerExtent,
      markerInset,
      width - 1 - markerInset,
      markerInset + markerExtent,
    ],
    bottomLeft: [
      markerInset,
      height - 1 - markerInset - markerExtent,
      markerInset + markerExtent,
      height - 1 - markerInset,
    ],
    bottomRight: [
      width - 1 - markerInset - markerExtent,
      height - 1 - markerInset - markerExtent,
      width - 1 - markerInset,
      height - 1 - markerInset,
    ],
  };
  const imageData = blankImageData(width, height);
  const data = imageData.data;
  fillRectangle(data, width, height, [0, 0, width - 1, outerThickness - 1]);
  fillRectangle(data, width, height, [
    0,
    height - outerThickness,
    width - 1,
    height - 1,
  ]);
  fillRectangle(data, width, height, [0, 0, outerThickness - 1, height - 1]);
  fillRectangle(data, width, height, [
    width - outerThickness,
    0,
    width - 1,
    height - 1,
  ]);
  fillRectangle(data, width, height, [
    innerInset,
    innerInset,
    width - 1 - innerInset,
    innerInset + innerThickness - 1,
  ]);
  fillRectangle(data, width, height, [
    innerInset,
    height - innerInset - innerThickness,
    width - 1 - innerInset,
    height - 1 - innerInset,
  ]);
  fillRectangle(data, width, height, [
    innerInset,
    innerInset,
    innerInset + innerThickness - 1,
    height - 1 - innerInset,
  ]);
  fillRectangle(data, width, height, [
    width - innerInset - innerThickness,
    innerInset,
    width - 1 - innerInset,
    height - 1 - innerInset,
  ]);
  for (const [markerId, box] of Object.entries(markers)) {
    drawMarker(imageData, markerId, box);
  }
  return {
    imageData,
    fixture: {
      id: "SELF_TEST_" + orientation.toUpperCase(),
      widthPixels: width,
      heightPixels: height,
      geometry: {
        outerPerimeterAtImageEdge: true,
        outerThicknessPixels: outerThickness,
        innerInsetPixels: innerInset,
        innerThicknessPixels: innerThickness,
        markers,
      },
    },
  };
}

function cloneImageData(imageData) {
  return {
    data: new Uint8ClampedArray(imageData.data),
    width: imageData.width,
    height: imageData.height,
  };
}

function resizeNearest(imageData, width, height) {
  const resized = blankImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.round(y * (imageData.height - 1) / (height - 1));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.round(x * (imageData.width - 1) / (width - 1));
      const sourceOffset = (sourceY * imageData.width + sourceX) * 4;
      const targetOffset = (y * width + x) * 4;
      resized.data.set(
        imageData.data.subarray(sourceOffset, sourceOffset + 4),
        targetOffset,
      );
    }
  }
  return resized;
}

function cropImage(imageData, side, pixels) {
  const width = imageData.width -
    (side === "left" || side === "right" ? pixels : 0);
  const height = imageData.height -
    (side === "top" || side === "bottom" ? pixels : 0);
  const cropped = blankImageData(width, height);
  const sourceOffsetX = side === "left" ? pixels : 0;
  const sourceOffsetY = side === "top" ? pixels : 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceOffset =
        ((y + sourceOffsetY) * imageData.width + x + sourceOffsetX) * 4;
      const targetOffset = (y * width + x) * 4;
      cropped.data.set(
        imageData.data.subarray(sourceOffset, sourceOffset + 4),
        targetOffset,
      );
    }
  }
  return cropped;
}

function mapLuminance(imageData, mapper) {
  const result = cloneImageData(imageData);
  for (let offset = 0; offset < result.data.length; offset += 4) {
    const value = mapper(result.data[offset], offset / 4);
    result.data[offset] = value;
    result.data[offset + 1] = value;
    result.data[offset + 2] = value;
  }
  return result;
}

function blurImage(imageData) {
  const result = blankImageData(imageData.width, imageData.height);
  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      let sum = 0;
      let samples = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const observedX = Math.max(0, Math.min(imageData.width - 1, x + dx));
          const observedY = Math.max(0, Math.min(imageData.height - 1, y + dy));
          sum += imageData.data[(observedY * imageData.width + observedX) * 4];
          samples += 1;
        }
      }
      const value = Math.round(sum / samples);
      const offset = (y * imageData.width + x) * 4;
      result.data[offset] = value;
      result.data[offset + 1] = value;
      result.data[offset + 2] = value;
      result.data[offset + 3] = 255;
    }
  }
  return result;
}

function blendWithBlur(imageData, amount) {
  const blurred = blurImage(imageData);
  const result = cloneImageData(imageData);
  for (let offset = 0; offset < result.data.length; offset += 4) {
    const value = Math.round(
      imageData.data[offset] * (1 - amount) + blurred.data[offset] * amount,
    );
    result.data[offset] = value;
    result.data[offset + 1] = value;
    result.data[offset + 2] = value;
  }
  return result;
}

function placeWithSubpixelOffset(imageData, offsetX, offsetY, padding = 4) {
  const result = blankImageData(
    imageData.width + padding * 2,
    imageData.height + padding * 2,
  );
  const translatedX = padding + offsetX;
  const translatedY = padding + offsetY;
  function sourceValue(x, y) {
    if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
      return 255;
    }
    return imageData.data[(y * imageData.width + x) * 4];
  }
  for (let y = 0; y < result.height; y += 1) {
    const sourceY = y - translatedY;
    const y0 = Math.floor(sourceY);
    const fy = sourceY - y0;
    for (let x = 0; x < result.width; x += 1) {
      const sourceX = x - translatedX;
      const x0 = Math.floor(sourceX);
      const fx = sourceX - x0;
      const top = sourceValue(x0, y0) * (1 - fx) +
        sourceValue(x0 + 1, y0) * fx;
      const bottom = sourceValue(x0, y0 + 1) * (1 - fx) +
        sourceValue(x0 + 1, y0 + 1) * fx;
      const value = Math.round(top * (1 - fy) + bottom * fy);
      const offset = (y * result.width + x) * 4;
      result.data[offset] = value;
      result.data[offset + 1] = value;
      result.data[offset + 2] = value;
      result.data[offset + 3] = 255;
    }
  }
  return {
    imageData: result,
    trueBounds: {
      left: translatedX,
      right: translatedX + imageData.width - 1,
      top: translatedY,
      bottom: translatedY + imageData.height - 1,
    },
  };
}

function eraseEdgePixels(imageData, side, pixels) {
  const result = cloneImageData(imageData);
  const box = side === "top"
    ? [0, 0, result.width - 1, pixels - 1]
    : side === "right"
      ? [result.width - pixels, 0, result.width - 1, result.height - 1]
      : side === "bottom"
        ? [0, result.height - pixels, result.width - 1, result.height - 1]
        : [0, 0, pixels - 1, result.height - 1];
  fillRectangle(result.data, result.width, result.height, box, false);
  return result;
}

function sizingForImage(fixture, imageData) {
  return {
    appliedWidthPixels: imageData.width,
    appliedHeightPixels: imageData.height,
    requestedWidthPixels: imageData.width,
    requestedHeightPixels: imageData.height,
    observedWidthPixels: imageData.width,
    observedHeightPixels: imageData.height,
  };
}

function buildCalibrationPositiveCases() {
  const portrait = syntheticDetectorFixture("portrait");
  const landscape = syntheticDetectorFixture("landscape");
  const shortProfile = syntheticDetectorFixture("portrait", {
    innerInsetPixels: 20,
    innerThicknessPixels: 4,
    markerInsetPixels: 32,
    markerExtentPixels: 26,
  });
  const longProfile = syntheticDetectorFixture("landscape", {
    innerInsetPixels: 28,
    innerThicknessPixels: 4,
    markerInsetPixels: 42,
    markerExtentPixels: 28,
  });
  const thinInnerLine = syntheticDetectorFixture("portrait", {
    innerThicknessPixels: 3,
    markerInsetPixels: 38,
  });
  function scaledPlaced(base, scale, offsetX, offsetY) {
    const scaled = resizeNearest(
      base.imageData,
      Math.round(base.imageData.width * scale),
      Math.round(base.imageData.height * scale),
    );
    const placed = placeWithSubpixelOffset(scaled, offsetX, offsetY);
    return {
      imageData: placed.imageData,
      sizingPolicy: sizingForImage(base.fixture, scaled),
    };
  }
  const scaleBelowOne = scaledPlaced(portrait, 0.75, 0, 0);
  const scaleAboveOne = scaledPlaced(landscape, 1.375, 0.625, 0.125);
  const integerScale = scaledPlaced(portrait, 2, 0.375, 0.875);
  const shortPhase = scaledPlaced(shortProfile, 1, 0.25, 0.75);
  const longPhase = scaledPlaced(longProfile, 1.25, 0.125, 0.375);
  const tonalPhase = placeWithSubpixelOffset(
    mapLuminance(
      blendWithBlur(landscape.imageData, 0.3),
      (value) => value < 128 ? 24 : 236,
    ),
    0.875,
    0.375,
  );
  return [
    {
      caseId: "CAL_POS_TONAL_CANONICAL",
      purpose: "Canonical geometry with calibration-only tonal values.",
      metricsContributed: ["edge", "anchor", "anisotropy", "endpoint"],
      parameterTuple: "cal|portrait|scale=1|black=8|white=248",
      fixture: portrait.fixture,
      imageData: mapLuminance(
        portrait.imageData,
        (value) => value < 128 ? 8 : 248,
      ),
    },
    {
      caseId: "CAL_POS_LANDSCAPE_CANONICAL",
      purpose: "Independent landscape orientation calibration control.",
      metricsContributed: ["edge", "anchor", "anisotropy", "endpoint"],
      parameterTuple: "cal|landscape|scale=1|phase=0",
      fixture: landscape.fixture,
      imageData: cloneImageData(landscape.imageData),
    },
    {
      caseId: "CAL_POS_SCALE_0_75_PHASE_ZERO",
      purpose: "Below-one non-integer scale at integer raster phase.",
      metricsContributed: ["edge", "anchor", "anisotropy", "endpoint"],
      parameterTuple: "cal|portrait|scale=0.75|offset=0,0",
      fixture: portrait.fixture,
      ...scaleBelowOne,
    },
    {
      caseId: "CAL_POS_SCALE_1_375_PHASE_0_625_0_125",
      purpose: "Above-one non-integer scale crossed with fractional phase.",
      metricsContributed: ["edge", "anchor", "anisotropy", "endpoint"],
      parameterTuple: "cal|landscape|scale=1.375|offset=0.625,0.125",
      fixture: landscape.fixture,
      ...scaleAboveOne,
    },
    {
      caseId: "CAL_POS_INTEGER_SCALE_2_PHASE_0_375_0_875",
      purpose: "Integer scale crossed with a different raster phase.",
      metricsContributed: ["edge", "anchor", "anisotropy", "endpoint"],
      parameterTuple: "cal|portrait|scale=2|offset=0.375,0.875",
      fixture: portrait.fixture,
      ...integerScale,
    },
    {
      caseId: "CAL_POS_SHORT_PROFILE_PHASE_0_25_0_75",
      purpose: "Short profile and fractional phase.",
      metricsContributed: ["edge", "anchor", "anisotropy", "endpoint"],
      parameterTuple:
        "cal|portrait|innerInset=20|innerThickness=4|scale=1|offset=0.25,0.75",
      fixture: shortProfile.fixture,
      ...shortPhase,
    },
    {
      caseId: "CAL_POS_LONG_PROFILE_PHASE_0_125_0_375",
      purpose: "Long profile, alternate marker position, and fractional phase.",
      metricsContributed: ["edge", "anchor", "anisotropy", "endpoint"],
      parameterTuple:
        "cal|landscape|innerInset=28|innerThickness=4|scale=1.25|offset=0.125,0.375",
      fixture: longProfile.fixture,
      ...longPhase,
    },
    {
      caseId: "CAL_POS_TONAL_BLUR_PHASE_0_875_0_375",
      purpose: "Bounded antialiasing and luminance at an independent phase.",
      metricsContributed: ["edge", "anchor", "anisotropy", "endpoint"],
      parameterTuple:
        "cal|landscape|blurBlend=0.3|black=24|white=236|offset=0.875,0.375",
      fixture: landscape.fixture,
      imageData: tonalPhase.imageData,
      sizingPolicy: sizingForImage(landscape.fixture, landscape.imageData),
    },
    {
      caseId: "CAL_POS_INNER_LINE_THICKNESS_3",
      purpose: "Thin inner-perimeter and alternate marker-position control.",
      metricsContributed: ["anchor", "anisotropy", "endpoint"],
      parameterTuple:
        "cal|portrait|innerThickness=3|markerInset=38|phase=0",
      fixture: thinInnerLine.fixture,
      imageData: thinInnerLine.imageData,
    },
  ].map((testCase) => ({
    ...testCase,
    sizingPolicy: testCase.sizingPolicy ||
      sizingForImage(testCase.fixture, testCase.imageData),
  }));
}

function buildPositiveHoldoutCases() {
  const portrait = syntheticDetectorFixture("portrait");
  const landscape = syntheticDetectorFixture("landscape");
  const fractional = placeWithSubpixelOffset(
    portrait.imageData,
    0.65,
    0.35,
  );
  const scaled = resizeNearest(portrait.imageData, 300, 500);
  const luminance = mapLuminance(
    landscape.imageData,
    (value) => value < 128 ? 40 : 220,
  );
  const degraded = mapLuminance(
    blendWithBlur(portrait.imageData, 0.4),
    (value, pixelIndex) => {
      const perturbed = value + (pixelIndex % 5 - 2) * 5;
      return Math.max(0, Math.min(255, Math.round(perturbed / 8) * 8));
    },
  );
  return [
    {
      caseId: "HOLD_POS_INTACT_PORTRAIT",
      purpose: "Unmodified portrait holdout.",
      parameterTuple: "holdout|portrait|scale=1|black=0|white=255",
      fixture: portrait.fixture,
      imageData: cloneImageData(portrait.imageData),
    },
    {
      caseId: "HOLD_POS_INTACT_LANDSCAPE",
      purpose: "Unmodified landscape holdout.",
      parameterTuple: "holdout|landscape|scale=1|black=0|white=255",
      fixture: landscape.fixture,
      imageData: cloneImageData(landscape.imageData),
    },
    {
      caseId: "HOLD_POS_SCALE_1_25",
      purpose: "Unseen uniform scale holdout.",
      parameterTuple: "holdout|portrait|scale=1.25",
      fixture: portrait.fixture,
      imageData: scaled,
    },
    {
      caseId: "HOLD_POS_SUBPIXEL_0_65_0_35",
      purpose: "Unseen bilinear fractional-placement holdout.",
      parameterTuple: "holdout|portrait|offset=0.65,0.35|padding=4",
      fixture: portrait.fixture,
      imageData: fractional.imageData,
      sizingPolicy: sizingForImage(portrait.fixture, portrait.imageData),
    },
    {
      caseId: "HOLD_POS_LUMINANCE_40_220",
      purpose: "Unseen landscape luminance holdout.",
      parameterTuple: "holdout|landscape|black=40|white=220",
      fixture: landscape.fixture,
      imageData: luminance,
    },
    {
      caseId: "HOLD_POS_DEGRADATION_0_4",
      purpose: "Unseen blur and quantization holdout.",
      parameterTuple: "holdout|portrait|blurBlend=0.4|quantize=8",
      fixture: portrait.fixture,
      imageData: degraded,
    },
  ].map((testCase) => ({
    ...testCase,
    name: testCase.caseId,
    expected: "VISUAL_INTEGRITY_PASSED",
    sizingPolicy: testCase.sizingPolicy ||
      sizingForImage(testCase.fixture, testCase.imageData),
  }));
}

let detectorCalibration = null;
const calibrationObjectReferences = new WeakSet();

function buildCalibrationCases() {
  const positive = buildCalibrationPositiveCases();
  const base = syntheticDetectorFixture("portrait");
  const cropProbes = ["top", "right", "bottom", "left"].map((side) => ({
    caseId: "CAL_CROP_MASK_" + side.toUpperCase() + "_2",
    purpose: "Two-pixel " + side + " edge masked score probe.",
    metricsContributed: ["crop-score-separation"],
    parameterTuple: "cal|mask|" + side + "|pixels=2",
    side,
    fixture: base.fixture,
    imageData: eraseEdgePixels(base.imageData, side, 2),
    sizingPolicy: sizingForImage(base.fixture, base.imageData),
  }));
  const distortionProbes = [
    {
      caseId: "CAL_DISTORT_HORIZONTAL_1_2",
      purpose: "Known horizontal non-uniform distortion separability probe.",
      metricsContributed: ["distortion-separability"],
      parameterTuple: "cal|distortion|scaleX=1.2|scaleY=1",
      width: Math.round(base.imageData.width * 1.2),
      height: base.imageData.height,
    },
    {
      caseId: "CAL_DISTORT_VERTICAL_0_8",
      purpose: "Known vertical non-uniform distortion separability probe.",
      metricsContributed: ["distortion-separability"],
      parameterTuple: "cal|distortion|scaleX=1|scaleY=0.8",
      width: base.imageData.width,
      height: Math.round(base.imageData.height * 0.8),
    },
  ].map((testCase) => ({
    ...testCase,
    fixture: base.fixture,
    imageData: resizeNearest(
      base.imageData,
      testCase.width,
      testCase.height,
    ),
    sizingPolicy: sizingForImage(base.fixture, base.imageData),
  }));
  return { positive, cropProbes, distortionProbes };
}

function getDetectorCalibration() {
  if (detectorCalibration) {
    return detectorCalibration;
  }
  const corpus = buildCalibrationCases();
  for (const testCase of [
    ...corpus.positive,
    ...corpus.cropProbes,
    ...corpus.distortionProbes,
  ]) {
    calibrationObjectReferences.add(testCase);
  }
  const positives = corpus.positive;
  const positiveRaw = positives.map((testCase) => ({
    testCase,
    raw: rawFixtureGeometryEvidence(
      testCase.imageData,
      testCase.fixture,
      testCase.sizingPolicy,
    ),
  }));
  if (positiveRaw.some((entry) => !entry.raw.transform || !entry.raw.markerLattice.reliable)) {
    fail("Independent anchor calibration failed.", {
      classification: "BLOCKED_BY_ANCHOR_DETECTION",
      cases: positiveRaw.map((entry) => ({
        name: entry.testCase.name,
        innerState: entry.raw.innerPerimeter.state,
        markerState: entry.raw.markerLattice && entry.raw.markerLattice.state,
      })),
    });
  }
  const cropProbeRaw = corpus.cropProbes.map((testCase) => ({
      testCase,
      raw: rawFixtureGeometryEvidence(
        testCase.imageData,
        testCase.fixture,
        testCase.sizingPolicy,
      ),
    }));
  const distortionProbeRaw = corpus.distortionProbes.map((testCase) => ({
    testCase,
    raw: rawFixtureGeometryEvidence(
      testCase.imageData,
      testCase.fixture,
      testCase.sizingPolicy,
    ),
  }));
  const positiveEdges = positiveRaw.flatMap((entry) =>
    Object.values(entry.raw.edges));
  const cropProbeEdges = cropProbeRaw.map(
    (entry) => entry.raw.edges[entry.testCase.side],
  );
  const intactCropEvidenceMaximum = Math.max(
    ...positiveEdges.map((edge) => edge.cropEvidenceStrength),
  );
  const cropEvidenceMinimum = Math.min(
    ...cropProbeEdges.map((edge) => edge.cropEvidenceStrength),
  );
  if (!(intactCropEvidenceMaximum < cropEvidenceMinimum)) {
    fail("Calibration crop probes are not separable from intact controls.", {
      classification: "BLOCKED_BY_EDGE_SEPARABILITY",
      intactCropEvidenceMaximum,
      cropEvidenceMinimum,
    });
  }
  const localizationResiduals = positiveEdges.map(
    (edge) => edge.edgeLocalizationAbsoluteResidual,
  );
  const outerResiduals = positiveRaw.map(
    ({ raw }) => Math.abs(raw.rendererResidualFromObservedSizing.outer),
  );
  const innerResiduals = positiveRaw.map(
    ({ raw }) => Math.abs(raw.rendererResidualFromObservedSizing.inner),
  );
  const markerResiduals = positiveRaw.map(
    ({ raw }) => Math.abs(raw.rendererResidualFromObservedSizing.marker),
  );
  if (
    [...localizationResiduals, ...outerResiduals, ...innerResiduals,
      ...markerResiduals].some((value) => !Number.isFinite(value))
  ) {
    fail("Calibration produced unavailable localization evidence.", {
      classification: "BLOCKED_BY_LOCALIZATION_CALIBRATION",
    });
  }
  const numericSlack = Number.EPSILON * 64;
  const outerRendererResidualAnisotropy =
    Math.max(...outerResiduals) + numericSlack;
  const innerRendererResidualAnisotropy =
    Math.max(...innerResiduals) + numericSlack;
  const markerRendererResidualAnisotropy =
    Math.max(...markerResiduals) + numericSlack;
  const distortionProbeSeparability = distortionProbeRaw.map(
    ({ testCase, raw }) => ({
      caseId: testCase.caseId,
      separated: Boolean(
        Math.abs(raw.rendererResidualFromObservedSizing.outer) >
          outerRendererResidualAnisotropy ||
        Math.abs(raw.rendererResidualFromObservedSizing.inner) >
          innerRendererResidualAnisotropy ||
        Math.abs(raw.rendererResidualFromObservedSizing.marker) >
          markerRendererResidualAnisotropy
      ),
    }),
  );
  if (distortionProbeSeparability.some((probe) => !probe.separated)) {
    fail("Distortion probes are not separable from uniform controls.", {
      classification: "BLOCKED_BY_DISTORTION_SEPARABILITY",
      distortionProbeSeparability,
    });
  }
  detectorCalibration = Object.freeze({
    method:
      "Maximum independent intact-control localization residuals and a discriminative-sample crop evidence envelope.",
    coordinateConvention:
      "Inclusive source pixel centers span 0..width-1 and 0..height-1; transformed endpoint residuals are calibrated directly.",
    positiveControlCount: positives.length,
    cropProbeControlCount: cropProbeRaw.length,
    distortionProbeControlCount: distortionProbeRaw.length,
    corpus: Object.freeze([
      ...positives.map((testCase) => Object.freeze({
        caseId: testCase.caseId,
        purpose: testCase.purpose,
        metricsContributed: Object.freeze([...testCase.metricsContributed]),
        parameterTuple: testCase.parameterTuple,
        source: "SYNTHETIC_GENERATED",
      })),
      ...corpus.cropProbes.map((testCase) => Object.freeze({
        caseId: testCase.caseId,
        purpose: testCase.purpose,
        metricsContributed: Object.freeze([...testCase.metricsContributed]),
        parameterTuple: testCase.parameterTuple,
        source: "SYNTHETIC_GENERATED",
      })),
      ...corpus.distortionProbes.map((testCase) => Object.freeze({
        caseId: testCase.caseId,
        purpose: testCase.purpose,
        metricsContributed: Object.freeze([...testCase.metricsContributed]),
        parameterTuple: testCase.parameterTuple,
        source: "SYNTHETIC_GENERATED",
      })),
    ]),
    edgeLocalizationUncertaintyPixels:
      Math.max(...localizationResiduals) + numericSlack,
    intactBandTopologySupportMinimum:
      Math.min(...positiveEdges.map(
        (edge) => edge.intactBandTopologySupport,
      )) -
      numericSlack,
    intactCropEvidenceMaximum:
      intactCropEvidenceMaximum + numericSlack,
    cropEvidenceMinimum: cropEvidenceMinimum - numericSlack,
    cropEvidenceSeparationMargin:
      cropEvidenceMinimum - intactCropEvidenceMaximum,
    anchorScaleRelativeError: Math.max(
      ...positiveRaw.flatMap(({ raw }) => [
        raw.anchorScaleRelativeErrorX,
        raw.anchorScaleRelativeErrorY,
      ]),
    ) + numericSlack,
    anchorTranslationErrorPixels: Math.max(
      ...positiveRaw.map(({ raw }) => raw.anchorTranslationErrorPixels),
    ) + numericSlack,
    outerRendererResidualAnisotropy,
    innerRendererResidualAnisotropy,
    markerRendererResidualAnisotropy,
    distortionProbeSeparability: Object.freeze(
      distortionProbeSeparability.map((probe) => Object.freeze(probe)),
    ),
    productionToleranceDefined: false,
  });
  return detectorCalibration;
}

function overwriteRectangle(imageData, box, dark = false) {
  fillRectangle(
    imageData.data,
    imageData.width,
    imageData.height,
    box,
    dark,
  );
}

function buildCropHoldoutCases() {
  const base = syntheticDetectorFixture("portrait");
  const cases = [];
  for (const side of ["top", "right", "bottom", "left"]) {
    for (const pixels of [1, 3, 8]) {
      cases.push({
        caseId: "HOLD_CROP_" + side.toUpperCase() + "_" + pixels,
        name: side.toUpperCase() + " crop " + pixels + " px",
        purpose: "Physical shallow/deep edge crop holdout.",
        parameterTuple:
          "holdout|physical-crop|" + side + "|pixels=" + pixels,
        expected: "NOT_ACCEPTED",
        fixture: base.fixture,
        imageData: cropImage(base.imageData, side, pixels),
        sizingPolicy: sizingForImage(base.fixture, base.imageData),
      });
    }
  }
  const partial = cloneImageData(base.imageData);
  overwriteRectangle(partial, [72, 0, 167, 2]);
  cases.push({
    caseId: "HOLD_CROP_PARTIAL_TOP_BAND",
    name: "partial outer-band removal",
    purpose: "Partial central outer-band loss holdout.",
    parameterTuple: "holdout|partial-mask|top|pixels=3|x=72..167",
    expected: "NOT_ACCEPTED",
    fixture: base.fixture,
    imageData: partial,
    sizingPolicy: sizingForImage(base.fixture, base.imageData),
  });
  cases.push({
    caseId: "HOLD_CROP_MARKERS_VISIBLE",
    name: "crop with all four markers visible",
    purpose: "Edge loss while all marker boxes remain visible.",
    parameterTuple: "holdout|physical-crop|top|pixels=3|markers=visible",
    expected: "NOT_ACCEPTED",
    fixture: base.fixture,
    imageData: cropImage(base.imageData, "top", 3),
    sizingPolicy: sizingForImage(base.fixture, base.imageData),
  });
  const cropped = cropImage(base.imageData, "left", 3);
  cases.push({
    caseId: "HOLD_CROP_RESIZE_RESTORE",
    name: "crop followed by resize to original dimensions",
    purpose: "Physical crop followed by apparent-dimension restoration.",
    parameterTuple: "holdout|physical-crop|left|pixels=3|resize=240x400",
    expected: "NOT_ACCEPTED",
    fixture: base.fixture,
    imageData: resizeNearest(cropped, base.imageData.width, base.imageData.height),
    sizingPolicy: sizingForImage(base.fixture, base.imageData),
  });
  const ambiguous = cloneImageData(base.imageData);
  for (let x = 72; x <= 167; x += 1) {
    setPixel(ambiguous.data, ambiguous.width, ambiguous.height, x, 0, x % 2 === 0);
  }
  cases.push({
    caseId: "HOLD_CROP_AMBIGUOUS_TOP",
    name: "ambiguous competing intact/crop hypothesis",
    purpose: "Explicitly tied intact/crop edge evidence.",
    parameterTuple: "holdout|alternating-mask|top|x=72..167",
    expected: "NOT_ACCEPTED",
    fixture: base.fixture,
    imageData: ambiguous,
    sizingPolicy: sizingForImage(base.fixture, base.imageData),
  });
  return cases;
}

function buildDistortionHoldoutCases() {
  const base = syntheticDetectorFixture("portrait");
  const definitions = [
    ["horizontal x1.5", 1.5, 1],
    ["vertical x1.5", 1, 1.5],
    ["horizontal x0.5", 0.5, 1],
    ["vertical x0.5", 1, 0.5],
    ["horizontal x1.10", 1.1, 1],
    ["vertical x1.10", 1, 1.1],
    ["catastrophic relativeAspectError approximately 0.5", 0.5, 1],
  ];
  const cases = definitions.map(([name, scaleX, scaleY]) => ({
    caseId: "HOLD_DISTORT_" + name.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
    name,
    purpose: "Non-uniform distortion holdout.",
    parameterTuple:
      "holdout|distortion|scaleX=" + scaleX + "|scaleY=" + scaleY,
    expected: "NOT_ACCEPTED",
    fixture: base.fixture,
    imageData: resizeNearest(
      base.imageData,
      Math.round(base.imageData.width * scaleX),
      Math.round(base.imageData.height * scaleY),
    ),
    sizingPolicy: sizingForImage(base.fixture, base.imageData),
  }));
  const cropped = cropImage(base.imageData, "left", 3);
  cases.push({
    caseId: "HOLD_DISTORT_CROP_RESTORE",
    name: "crop plus non-uniform resize restoring outer dimensions",
    purpose: "Crop plus non-uniform apparent-dimension restoration.",
    parameterTuple:
      "holdout|physical-crop|left|pixels=3|nonuniform-restore=240x400",
    expected: "NOT_ACCEPTED",
    fixture: base.fixture,
    imageData: resizeNearest(cropped, base.imageData.width, base.imageData.height),
    sizingPolicy: sizingForImage(base.fixture, base.imageData),
  });
  return cases;
}

function shiftMarkersForDisagreement(base, shiftX, shiftY) {
  const result = cloneImageData(base.imageData);
  for (const box of Object.values(base.fixture.geometry.markers)) {
    overwriteRectangle(result, box);
  }
  for (const [markerId, box] of Object.entries(base.fixture.geometry.markers)) {
    drawMarker(
      result,
      markerId,
      [box[0] + shiftX, box[1] + shiftY, box[2] + shiftX, box[3] + shiftY],
    );
  }
  return result;
}

function buildAnchorHoldoutCases() {
  const base = syntheticDetectorFixture("portrait");
  const geometry = base.fixture.geometry;
  const missingInner = cloneImageData(base.imageData);
  const inset = geometry.innerInsetPixels;
  const thickness = geometry.innerThicknessPixels;
  overwriteRectangle(missingInner, [inset, inset, base.imageData.width - 1 - inset, inset + thickness - 1]);
  overwriteRectangle(missingInner, [inset, base.imageData.height - inset - thickness, base.imageData.width - 1 - inset, base.imageData.height - 1 - inset]);
  overwriteRectangle(missingInner, [inset, inset, inset + thickness - 1, base.imageData.height - 1 - inset]);
  overwriteRectangle(missingInner, [base.imageData.width - inset - thickness, inset, base.imageData.width - 1 - inset, base.imageData.height - 1 - inset]);
  const missingMarker = cloneImageData(base.imageData);
  overwriteRectangle(missingMarker, geometry.markers.topLeft);
  const corruptMarker = cloneImageData(base.imageData);
  overwriteRectangle(corruptMarker, geometry.markers.topRight, true);
  const shiftedMarkers = shiftMarkersForDisagreement(base, 2, 1);
  return [
    {
      caseId: "HOLD_ANCHOR_MISSING_INNER",
      name: "missing inner perimeter",
      purpose: "Missing primary-anchor holdout.",
      parameterTuple: "holdout|anchor|inner=missing",
      fixture: base.fixture,
      imageData: missingInner,
    },
    {
      caseId: "HOLD_ANCHOR_MISSING_MARKER",
      name: "missing marker",
      purpose: "Incomplete marker-lattice holdout.",
      parameterTuple: "holdout|anchor|marker=topLeft-missing",
      fixture: base.fixture,
      imageData: missingMarker,
    },
    {
      caseId: "HOLD_ANCHOR_CORRUPT_MARKER",
      name: "corrupted marker",
      purpose: "Corrupted asymmetric-marker holdout.",
      parameterTuple: "holdout|anchor|marker=topRight-solid",
      fixture: base.fixture,
      imageData: corruptMarker,
    },
    {
      caseId: "HOLD_ANCHOR_LATTICE_SHIFT_2_1",
      name: "inner versus marker lattice disagreement",
      purpose: "Intact inner perimeter with deliberately shifted marker lattice.",
      parameterTuple: "holdout|anchor|markerShift=2,1",
      fixture: base.fixture,
      imageData: shiftedMarkers,
    },
  ].map((testCase) => ({
    ...testCase,
    expected: "NOT_ACCEPTED",
    sizingPolicy: sizingForImage(base.fixture, base.imageData),
  }));
}

function buildEdgeMechanismRegressionCases() {
  const short = syntheticDetectorFixture("portrait");
  const long = syntheticDetectorFixture("landscape", {
    innerInsetPixels: 28,
    markerInsetPixels: 42,
  });
  function scaled(base) {
    return resizeNearest(
      base.imageData,
      Math.round(base.imageData.width * 1.5),
      Math.round(base.imageData.height * 1.5),
    );
  }
  const shortScaled = scaled(short);
  const longScaled = scaled(long);
  const longPhaseScaled = resizeNearest(
    long.imageData,
    Math.round(long.imageData.width * 1.25),
    Math.round(long.imageData.height * 1.25),
  );
  const longPhase = placeWithSubpixelOffset(longPhaseScaled, 0.15, 0.35);
  const secondPhase = placeWithSubpixelOffset(short.imageData, 0.1, 0.9);
  return [
    {
      caseId: "HOLD_MECH_LONG_PROFILE_SCALE_1_25_PHASE_0_15_0_35",
      purpose: "Long-profile intact boundary at an unseen fractional phase.",
      parameterTuple:
        "holdout|mechanism|innerInset=28|scale=1.25|offset=0.15,0.35",
      role: "LONG_PHASE_INTACT",
      fixture: long.fixture,
      imageData: longPhase.imageData,
      sizingPolicy: sizingForImage(long.fixture, longPhaseScaled),
    },
    {
      caseId: "HOLD_MECH_SHORT_SCALE_1_5_INTACT",
      purpose: "Short-profile intact evidence at an unseen non-integer scale.",
      parameterTuple:
        "holdout|mechanism|innerInset=24|scale=1.5|edge=intact",
      role: "SHORT_SCALE_INTACT",
      fixture: short.fixture,
      imageData: shortScaled,
      sizingPolicy: sizingForImage(short.fixture, shortScaled),
    },
    {
      caseId: "HOLD_MECH_LONG_SCALE_1_5_INTACT",
      purpose: "Long-profile equivalent intact evidence at the same scale.",
      parameterTuple:
        "holdout|mechanism|innerInset=28|scale=1.5|edge=intact",
      role: "LONG_SCALE_INTACT",
      fixture: long.fixture,
      imageData: longScaled,
      sizingPolicy: sizingForImage(long.fixture, longScaled),
    },
    {
      caseId: "HOLD_MECH_SHORT_SCALE_1_5_CROP",
      purpose: "Short-profile one-row crop evidence at non-integer scale.",
      parameterTuple:
        "holdout|mechanism|innerInset=24|scale=1.5|edge=mask-1",
      role: "SHORT_SCALE_CROP",
      fixture: short.fixture,
      imageData: eraseEdgePixels(shortScaled, "top", 1),
      sizingPolicy: sizingForImage(short.fixture, shortScaled),
    },
    {
      caseId: "HOLD_MECH_LONG_SCALE_1_5_CROP",
      purpose: "Long-profile equivalent one-row crop evidence.",
      parameterTuple:
        "holdout|mechanism|innerInset=28|scale=1.5|edge=mask-1",
      role: "LONG_SCALE_CROP",
      fixture: long.fixture,
      imageData: eraseEdgePixels(longScaled, "top", 1),
      sizingPolicy: sizingForImage(long.fixture, longScaled),
    },
    {
      caseId: "HOLD_MECH_BOUNDARY_PHASE_0_1_0_9",
      purpose: "Independent intact-boundary phase regression.",
      parameterTuple:
        "holdout|mechanism|innerInset=24|scale=1|offset=0.1,0.9",
      role: "SECOND_PHASE_INTACT",
      fixture: short.fixture,
      imageData: secondPhase.imageData,
      sizingPolicy: sizingForImage(short.fixture, short.imageData),
    },
  ];
}

function runEdgeMechanismRegressions(cases, calibration) {
  const byRole = Object.fromEntries(cases.map((testCase) => [
    testCase.role,
    testCase,
  ]));
  const detections = ["LONG_PHASE_INTACT", "SECOND_PHASE_INTACT"].map(
    (role) => ({
      role,
      detection: detectFixtureGeometry(
        byRole[role].imageData,
        byRole[role].fixture,
        byRole[role].sizingPolicy,
        calibration,
      ),
    }),
  );
  const strengths = {};
  for (const role of [
    "SHORT_SCALE_INTACT",
    "LONG_SCALE_INTACT",
    "SHORT_SCALE_CROP",
    "LONG_SCALE_CROP",
  ]) {
    const testCase = byRole[role];
    const raw = rawFixtureGeometryEvidence(
      testCase.imageData,
      testCase.fixture,
      testCase.sizingPolicy,
    );
    if (!raw.edges) {
      fail("Edge mechanism anchor detection failed.", {
        classification: "BLOCKED_BY_EDGE_MECHANISM_REGRESSION",
        role,
        innerState: raw.innerPerimeter.state,
      });
    }
    strengths[role] = {
      sampledProfileLength: raw.edges.top.sampledProfileLength,
      cropEvidenceStrength: raw.edges.top.cropEvidenceStrength,
    };
  }
  const intactStrengthDifference = Math.abs(
    strengths.SHORT_SCALE_INTACT.cropEvidenceStrength -
      strengths.LONG_SCALE_INTACT.cropEvidenceStrength,
  );
  const cropStrengthDifference = Math.abs(
    strengths.SHORT_SCALE_CROP.cropEvidenceStrength -
      strengths.LONG_SCALE_CROP.cropEvidenceStrength,
  );
  const assertions = {
    unseenLongProfilePhaseAccepted: detections[0].detection.visualState ===
      "VISUAL_INTEGRITY_PASSED",
    secondBoundaryPhaseAccepted: detections[1].detection.visualState ===
      "VISUAL_INTEGRITY_PASSED",
    irrelevantProfileLengthsDiffer:
      strengths.SHORT_SCALE_INTACT.sampledProfileLength !==
        strengths.LONG_SCALE_INTACT.sampledProfileLength,
    intactCropEvidenceLengthInvariant:
      intactStrengthDifference <= Number.EPSILON * 64,
    positiveCropEvidenceLengthInvariant:
      cropStrengthDifference <= Number.EPSILON * 64,
    cropEvidenceSignPreserved:
      strengths.SHORT_SCALE_INTACT.cropEvidenceStrength < 0 &&
      strengths.LONG_SCALE_INTACT.cropEvidenceStrength < 0 &&
      strengths.SHORT_SCALE_CROP.cropEvidenceStrength > 0 &&
      strengths.LONG_SCALE_CROP.cropEvidenceStrength > 0,
  };
  if (Object.values(assertions).some((value) => value !== true)) {
    fail("Edge mechanism regression failed.", {
      classification: "BLOCKED_BY_EDGE_MECHANISM_REGRESSION",
      assertions,
      strengths,
      detections: detections.map(({ role, detection }) => ({
        role,
        visualState: detection.visualState,
        edgeStates: detection.edges && Object.fromEntries(
          Object.entries(detection.edges).map(([side, edge]) => [
            side,
            edge.state,
          ]),
        ),
      })),
    });
  }
  return {
    assertions,
    strengths,
    cases: cases.map(({ caseId, purpose, parameterTuple }) => ({
      caseId,
      purpose,
      parameterTuple,
    })),
  };
}

function buildDistortionMechanismRegressionCases() {
  const base = syntheticDetectorFixture("portrait");
  const requestedWidth = 360;
  const requestedHeight = 600;
  const observedWidth = 360;
  const observedHeight = 599;
  return [
    {
      caseId: "HOLD_MECH_SETTER_HEIGHT_MINUS_ONE",
      purpose:
        "One-pixel observed setter change separated from renderer residual.",
      parameterTuple:
        "holdout|mechanism|requested=360x600|observed=360x599",
      role: "SETTER_HEIGHT_MINUS_ONE",
      fixture: base.fixture,
      imageData: resizeNearest(base.imageData, observedWidth, observedHeight),
      sizingPolicy: {
        requestedWidthPixels: requestedWidth,
        requestedHeightPixels: requestedHeight,
        observedWidthPixels: observedWidth,
        observedHeightPixels: observedHeight,
      },
    },
    {
      caseId: "HOLD_MECH_OBSERVED_DOCS_SIZE_MISSING",
      purpose: "Missing observed Docs dimensions remain unresolved.",
      parameterTuple:
        "holdout|mechanism|requested=240x400|observed=missing",
      role: "OBSERVED_DOCS_SIZE_MISSING",
      fixture: base.fixture,
      imageData: cloneImageData(base.imageData),
      sizingPolicy: {
        requestedWidthPixels: base.imageData.width,
        requestedHeightPixels: base.imageData.height,
      },
    },
  ];
}

function runDistortionMechanismRegressions(cases, calibration) {
  const results = cases.map((testCase) => ({
    role: testCase.role,
    detection: detectFixtureGeometry(
      testCase.imageData,
      testCase.fixture,
      testCase.sizingPolicy,
      calibration,
    ),
  }));
  const setterChange = results.find(
    (result) => result.role === "SETTER_HEIGHT_MINUS_ONE",
  ).detection;
  const missingObserved = results.find(
    (result) => result.role === "OBSERVED_DOCS_SIZE_MISSING",
  ).detection;
  const assertions = {
    setterChangeRecorded:
      setterChange.distortion.setterGeometryChangeRecorded === true,
    setterChangePreserved:
      setterChange.distortion.setterInducedAnisotropy !== 0,
    setterChangeNotClassifiedAsRendererDistortion:
      setterChange.distortion
        .rendererResidualWithinMeasuredLocalizationUncertainty === true,
    setterChangeControlAccepted:
      setterChange.visualState === "VISUAL_INTEGRITY_PASSED",
    missingObservedSizingNotSubstituted:
      missingObserved.distortion.observedDocsSizing.available === false &&
      missingObserved.distortion.setterInducedAnisotropy === null,
    missingObservedSizingUnresolved:
      missingObserved.distortion.setterGeometryChangeRecorded === false &&
      missingObserved.distortion
        .rendererResidualWithinMeasuredLocalizationUncertainty === null &&
      missingObserved.visualState === "VISUAL_INTEGRITY_UNRESOLVED",
  };
  if (Object.values(assertions).some((value) => value !== true)) {
    fail("Distortion mechanism regression failed.", {
      classification: "BLOCKED_BY_DISTORTION_MECHANISM_REGRESSION",
      assertions,
      results: results.map(({ role, detection }) => ({
        role,
        visualState: detection.visualState,
        distortion: detection.distortion,
      })),
    });
  }
  return {
    assertions,
    setterChange: setterChange.distortion,
    missingObservedSizing: missingObserved.distortion,
    cases: cases.map(({ caseId, purpose, parameterTuple }) => ({
      caseId,
      purpose,
      parameterTuple,
    })),
  };
}

function summarizeDetectorCases(cases, calibration, expectedAccepted) {
  const results = cases.map((testCase) => {
    const detection = detectFixtureGeometry(
      testCase.imageData,
      testCase.fixture,
      testCase.sizingPolicy,
      calibration,
    );
    return {
      caseId: testCase.caseId,
      name: testCase.name,
      purpose: testCase.purpose,
      parameterTuple: testCase.parameterTuple,
      expected: testCase.expected,
      actual: detection.visualState,
      visualState: detection.visualState,
      accepted: detection.visualState === "VISUAL_INTEGRITY_PASSED",
      edgeStates: detection.edges
        ? Object.fromEntries(
            Object.entries(detection.edges).map(([side, edge]) => [side, edge.state]),
          )
        : null,
      innerState: detection.innerPerimeter.state,
      markerState: detection.markerLatticeTransform
        ? detection.markerLatticeTransform.state
        : null,
      distortionPassed: detection.distortion
        ? detection.distortion
            .rendererResidualWithinMeasuredLocalizationUncertainty === true
        : false,
      setterGeometryChangeRecorded: detection.distortion
        ? detection.distortion.setterGeometryChangeRecorded === true
        : false,
    };
  });
  const unexpected = results.filter((result) =>
    expectedAccepted ? !result.accepted : result.accepted);
  return {
    count: results.length,
    passed: results.length - unexpected.length,
    failed: unexpected.length,
    expectedAccepted,
    cases: results,
  };
}

function assertCorpusIndependence(calibration, holdoutGroups) {
  const holdouts = Object.values(holdoutGroups).flat();
  const calibrationIds = new Set(
    calibration.corpus.map((entry) => entry.caseId),
  );
  const calibrationTuples = new Set(
    calibration.corpus.map((entry) => entry.parameterTuple),
  );
  const holdoutIds = holdouts.map((testCase) => testCase.caseId);
  const duplicateHoldoutIds = holdoutIds.filter(
    (caseId, index) => holdoutIds.indexOf(caseId) !== index,
  );
  const overlappingIds = holdoutIds.filter((caseId) =>
    calibrationIds.has(caseId));
  const overlappingParameterTuples = holdouts
    .filter((testCase) => calibrationTuples.has(testCase.parameterTuple))
    .map((testCase) => testCase.parameterTuple);
  const reusedObjects = holdouts
    .filter((testCase) => calibrationObjectReferences.has(testCase))
    .map((testCase) => testCase.caseId);
  const assertions = {
    calibrationFrozen: Object.isFrozen(calibration),
    calibrationCorpusFrozen:
      Object.isFrozen(calibration.corpus) &&
      calibration.corpus.every((entry) => Object.isFrozen(entry)),
    uniqueHoldoutCaseIds: duplicateHoldoutIds.length === 0,
    noCalibrationHoldoutCaseIdOverlap: overlappingIds.length === 0,
    noCalibrationHoldoutParameterOverlap:
      overlappingParameterTuples.length === 0,
    noCalibrationObjectReusedAsHoldout: reusedObjects.length === 0,
    calibrationContainsSyntheticOnly: calibration.corpus.every(
      (entry) => entry.source === "SYNTHETIC_GENERATED",
    ),
  };
  if (Object.values(assertions).some((value) => value !== true)) {
    fail("Calibration/holdout corpus independence assertion failed.", {
      classification: "BLOCKED_BY_REMAINING_CIRCULARITY",
      assertions,
      duplicateHoldoutIds,
      overlappingIds,
      overlappingParameterTuples,
      reusedObjects,
    });
  }
  return {
    ...assertions,
    calibrationCaseIds: [...calibrationIds],
    holdoutCaseIds: holdoutIds,
  };
}

function buildMinimalPdfBytes() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 200] /Resources << >> /Contents 4 0 R >>",
    "<< /Length 24 >>\nstream\n0 0 0 rg 10 20 30 40 re f\nendstream",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += index + 1 + " 0 obj\n" + object + "\nendobj\n";
  });
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += "xref\n0 " + (objects.length + 1) + "\n";
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += String(offset).padStart(10, "0") + " 00000 n \n";
  });
  pdf +=
    "trailer\n<< /Size " +
    (objects.length + 1) +
    " /Root 1 0 R >>\nstartxref\n" +
    xrefOffset +
    "\n%%EOF\n";
  return Buffer.from(pdf, "ascii");
}

async function runSelfTest(renderer) {
  const calibration = getDetectorCalibration();
  const calibrationSnapshot = JSON.stringify(calibration);
  const holdoutCases = {
    positive: buildPositiveHoldoutCases(),
    crop: buildCropHoldoutCases(),
    distortion: buildDistortionHoldoutCases(),
    anchor: buildAnchorHoldoutCases(),
    mechanism: buildEdgeMechanismRegressionCases(),
    distortionMechanism: buildDistortionMechanismRegressionCases(),
  };
  const independence = assertCorpusIndependence(calibration, holdoutCases);
  const edgeMechanismRegressions = runEdgeMechanismRegressions(
    holdoutCases.mechanism,
    calibration,
  );
  const distortionMechanismRegressions = runDistortionMechanismRegressions(
    holdoutCases.distortionMechanism,
    calibration,
  );
  const positiveHoldouts = summarizeDetectorCases(
    holdoutCases.positive,
    calibration,
    true,
  );
  const cropHoldouts = summarizeDetectorCases(
    holdoutCases.crop,
    calibration,
    false,
  );
  const distortionHoldouts = summarizeDetectorCases(
    holdoutCases.distortion,
    calibration,
    false,
  );
  const anchorHoldouts = summarizeDetectorCases(
    holdoutCases.anchor,
    calibration,
    false,
  );
  const calibrationUnchangedAfterHoldouts =
    JSON.stringify(calibration) === calibrationSnapshot;
  if (!calibrationUnchangedAfterHoldouts || !Object.isFrozen(calibration)) {
    fail("Frozen calibration changed during holdout evaluation.", {
      classification: "BLOCKED_BY_REMAINING_CIRCULARITY",
      calibrationUnchangedAfterHoldouts,
      calibrationFrozen: Object.isFrozen(calibration),
    });
  }
  const detectorHoldouts = {
    positiveHoldouts,
    cropHoldouts,
    distortionHoldouts,
    anchorHoldouts,
  };
  const onePixelCropHoldouts = cropHoldouts.cases.filter((testCase) =>
    /^HOLD_CROP_(TOP|RIGHT|BOTTOM|LEFT)_1$/.test(testCase.caseId));
  const positiveOrOnePixelSeparationFailed =
    positiveHoldouts.failed > 0 ||
    onePixelCropHoldouts.length !== 4 ||
    onePixelCropHoldouts.some((testCase) => testCase.accepted);
  if (positiveOrOnePixelSeparationFailed) {
    fail("Independent positive/one-pixel-crop holdout separation failed.", {
      classification: "BLOCKED_BY_HOLDOUT_SEPARABILITY",
      calibration,
      independence,
      calibrationUnchangedAfterHoldouts,
      positiveHoldouts,
      onePixelCropHoldouts,
      detectorHoldouts,
    });
  }
  const failedGroups = Object.entries(detectorHoldouts)
    .filter(([, group]) => group.failed > 0)
    .map(([name]) => name);
  if (failedGroups.length > 0) {
    fail("P5.3 independent holdout matrix failed.", {
      classification: "BLOCKED_BY_HOLDOUT_FALSE_PASS",
      failedGroups,
      detectorHoldouts,
    });
  }

  const pdfBytes = buildMinimalPdfBytes();
  const document = await renderer.pdfjs.getDocument({
    data: new Uint8Array(pdfBytes),
    disableWorker: true,
    isEvalSupported: false,
  }).promise;
  const page = await document.getPage(1);
  const viewport = page.getViewport({ scale: CONTRACT.renderScale });
  const canvas = renderer.createCanvas(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height),
  );
  const context = canvas.getContext("2d");
  await page.render({
    canvasContext: context,
    viewport,
    background: "#ffffff",
    intent: "print",
  }).promise;
  const pixels = context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  );
  let darkPixels = 0;
  for (let y = 0; y < pixels.height; y += 1) {
    for (let x = 0; x < pixels.width; x += 1) {
      if (isDark(pixels.data, pixels.width, x, y)) {
        darkPixels += 1;
      }
    }
  }
  if (
    document.numPages !== 1 ||
    canvas.width !== 400 ||
    canvas.height !== 800 ||
    darkPixels === 0
  ) {
    fail("PDF.js/canvas renderer self-test failed.", {
      pageCount: document.numPages,
      width: canvas.width,
      height: canvas.height,
      darkPixels,
    });
  }
  await document.destroy();
  return {
    status: "P5_3_LOCAL_HARNESS_SELF_TEST_PASSED",
    versions: renderer.versions,
    calibration: {
      frozenBeforeHoldouts: true,
      unchangedAfterHoldouts: calibrationUnchangedAfterHoldouts,
      values: calibration,
      cases: calibration.corpus,
    },
    independence,
    edgeMechanismRegressions,
    distortionMechanismRegressions,
    holdouts: detectorHoldouts,
    renderer: {
      pageCount: 1,
      rasterWidth: canvas.width,
      rasterHeight: canvas.height,
      darkPixels,
    },
    writesPerformed: false,
  };
}

async function runMeasurement(options, renderer) {
  await validateOutputDirectory(options);
  const evidence = JSON.parse(await readFile(options.evidencePath, "utf8"));
  validateGasEvidence(evidence);

  const sourceById = Object.fromEntries(
    evidence.sources.map((source) => [source.fixture.id, source]),
  );
  const localInputs = {
    PORTRAIT: options.portraitPath,
    LANDSCAPE: options.landscapePath,
  };

  // Verify both exact downloads before PDF.js receives either byte array.
  const verified = {};
  for (const fixtureId of CONTRACT.fixtureIds) {
    verified[fixtureId] = await readAndVerifyLocalPdf(
      localInputs[fixtureId],
      sourceById[fixtureId],
    );
  }

  const rendered = [];
  for (const fixtureId of CONTRACT.fixtureIds) {
    rendered.push(
      await renderAndMeasure(
        renderer,
        sourceById[fixtureId],
        verified[fixtureId],
      ),
    );
  }

  const measurements = rendered.map((item) => item.measurement);
  const hardGateResult = orderedHardGates(evidence, measurements);
  const hasUnresolvedVisualIntegrity = measurements.some(
    (measurement) =>
      measurement.detection.visualState === "VISUAL_INTEGRITY_UNRESOLVED",
  );
  const hasFailedVisualIntegrity = measurements.some(
    (measurement) =>
      measurement.detection.visualState === "VISUAL_INTEGRITY_FAILED",
  );
  const result = {
    experimentId: CONTRACT.experimentId,
    version: 1,
    status: hasFailedVisualIntegrity
      ? "P5_3_VISUAL_INTEGRITY_FAILED"
      : hasUnresolvedVisualIntegrity
        ? "P5_3_VISUAL_INTEGRITY_UNRESOLVED"
        : hardGateResult.allPassed
          ? "P5_3_CONTROLLED_FIXTURE_EVIDENCE_ACCEPTED"
          : "P5_3_GAS_HARD_GATE_FAILED",
    renderer: {
      ...renderer.versions,
      scalePixelsPerPdfPoint: CONTRACT.renderScale,
      packageRoots: renderer.resolvedPackageRoots,
      offline: true,
      productionDependency: false,
    },
    sources: measurements,
    p4MergeEvidence: evidence.p4Merge,
    hardGates: hardGateResult.gates,
    firstMaterialFailure:
      evidence.firstMaterialFailure ||
      hardGateResult.firstMaterialFailure,
    aspectRatioPolicy: {
      treatedAsMeasurement: true,
      productionToleranceDefined: false,
    },
  };

  await persistResults(options, rendered, result);
  return result;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const renderer = await loadRenderer(options.nodeModulesPath);
  if (options.selfTest) {
    return runSelfTest(renderer);
  }
  return runMeasurement(options, renderer);
}

try {
  const result = await main();
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (
    result.status !== "P5_3_CONTROLLED_FIXTURE_EVIDENCE_ACCEPTED" &&
    result.status !== "P5_3_LOCAL_HARNESS_SELF_TEST_PASSED"
  ) {
    process.exitCode = 1;
  }
} catch (error) {
  process.stdout.write(
    JSON.stringify(
      {
        experimentId: CONTRACT.experimentId,
        version: 1,
        status: "P5_3_LOCAL_HARNESS_FAILED",
        firstMaterialFailure: {
          type: error.name || "Error",
          message: error.message || String(error),
          details: error.details || null,
        },
      },
      null,
      2,
    ) + "\n",
  );
  process.exitCode = 1;
}
