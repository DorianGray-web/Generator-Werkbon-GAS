// =========================================================================
// DOCUMENT TABLE HELPERS
// =========================================================================

function fillTableRowsFast(table, dataRows, config) {
  if (!table) return;

  console.log('=== START fillTableRowsFast ===');
  console.log('Data rows received for processing: ' + dataRows.length);

  const templateRow = table.getRow(1);
  const numCells = templateRow.getNumCells();
  const cellStyles = getTemplateCellStyles(templateRow, numCells);

  try {
    table.removeRow(1);
  } catch (e) {
    console.log('Failed to remove the template row: ' + e.message);
  }

  if (!dataRows || dataRows.length === 0) {
    console.log('No data; the table remains empty.');
    return;
  }

  for (let i = 0; i < dataRows.length; i++) {
    appendConfiguredTableRow(table, dataRows[i], config, cellStyles, numCells, i);
  }

  console.log('=== fillTableRowsFast finished ===');
}

function getTemplateCellStyles(templateRow, numCells) {
  const cellStyles = [];

  for (let c = 0; c < numCells; c++) {
    try {
      cellStyles.push({
        attributes: templateRow.getCell(c).getAttributes(),
      });
    } catch (e) {
      cellStyles.push(null);
    }
  }

  return cellStyles;
}

function appendConfiguredTableRow(table, data, config, cellStyles, numCells, rowIndex) {
  console.log(`Creating row #${rowIndex}`);

  const newRow = table.appendTableRow();

  for (let c = 0; c < numCells; c++) {
    const newCell = newRow.appendTableCell();

    if (cellStyles[c]) {
      try {
        newCell.setAttributes(cellStyles[c].attributes);
      } catch (e) {}
    }

    clearCell(newCell);
  }

  config.forEach(cfg => populateConfiguredCell(newRow, data, cfg, numCells));
  console.log(`Row #${rowIndex} populated.`);
}

function populateConfiguredCell(row, data, cfg, numCells) {
  const cellIndex = cfg.cellIndex;

  if (cellIndex >= numCells) {
    return;
  }

  const rawVal = data[cfg.col];
  let valStr = rawVal !== undefined && rawVal !== null ? rawVal.toString().trim() : '';

  if (cfg.isEuro) {
    valStr = formatEuro(rawVal);
  }

  try {
    const cell = row.getCell(cellIndex);
    clearCell(cell);

    const p = cell.appendParagraph(valStr);
    p.setAttributes({
      [DocumentApp.Attribute.FONT_SIZE]: 11,
      [DocumentApp.Attribute.BOLD]: false,
    });
  } catch (e) {
    console.log('Error while populating cell: ' + e.message);
  }
}

function clearCell(cell) {
  try {
    while (cell.getNumChildren() > 0) {
      cell.removeChild(cell.getChild(0));
    }
  } catch (e) {}
}

function cleanParagraphsInRow(row) {
  if (!row) return;

  for (let j = 0; j < row.getNumCells(); j++) {
    const cell = row.getCell(j);

    try {
      cell.setPaddingTop(5);
      cell.setPaddingBottom(5);
    } catch (e) {}
  }
}
