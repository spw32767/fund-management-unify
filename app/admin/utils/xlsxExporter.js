const encoder = new TextEncoder();

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (data) => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (~crc) >>> 0;
};

const toExcelColumn = (index) => {
  let dividend = index + 1;
  let columnName = '';
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return columnName;
};

const xmlEscape = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const buildSheetXml = (columns, rows) => {
  const lines = [];
  lines.push(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '  <sheetData>'
  );

  const allRows = [columns.map((col) => col.header), ...rows.map((row) => columns.map((col) => row[col.key]))];

  allRows.forEach((cells, rowIndex) => {
    const rowNumber = rowIndex + 1;
    lines.push(`    <row r="${rowNumber}">`);

    cells.forEach((cellValue, cellIndex) => {
      const cellRef = `${toExcelColumn(cellIndex)}${rowNumber}`;
      if (cellValue === null || cellValue === undefined || cellValue === '') {
        return;
      }
      if (typeof cellValue === 'number' && Number.isFinite(cellValue)) {
        lines.push(`      <c r="${cellRef}"><v>${cellValue}</v></c>`);
      } else {
        const text = xmlEscape(cellValue);
        lines.push(
          `      <c r="${cellRef}" t="inlineStr"><is><t>${text}</t></is></c>`
        );
      }
    });

    lines.push('    </row>');
  });

  lines.push('  </sheetData>', '</worksheet>');
  return lines.join('\n');
};

const buildContentTypesXml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

const buildRelsXml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const buildWorkbookXml = (sheetName) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

const buildWorkbookRelsXml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const buildStylesXml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1">
    <font>
      <sz val="11"/>
      <color theme="1"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
  </fonts>
  <fills count="1">
    <fill>
      <patternFill patternType="none"/>
    </fill>
  </fills>
  <borders count="1">
    <border>
      <left/>
      <right/>
      <top/>
      <bottom/>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;

const buildAppXml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Fund Management Export</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant>
        <vt:lpstr>Worksheets</vt:lpstr>
      </vt:variant>
      <vt:variant>
        <vt:i4>1</vt:i4>
      </vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="1" baseType="lpstr">
      <vt:lpstr>Submissions</vt:lpstr>
    </vt:vector>
  </TitlesOfParts>
  <Company></Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0300</AppVersion>
</Properties>`;

const buildCoreXml = () => {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Submissions Export</dc:title>
  <dc:subject>Fund submissions</dc:subject>
  <dc:creator>Fund Management System</dc:creator>
  <cp:keywords>submissions,export</cp:keywords>
  <dc:description>คำร้องที่ส่งออกจากระบบ</dc:description>
  <cp:lastModifiedBy>Fund Management System</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
};

const fileEntries = (columns, rows, sheetName) => {
  const sheetXml = buildSheetXml(columns, rows);
  return [
    { path: '[Content_Types].xml', content: buildContentTypesXml() },
    { path: '_rels/.rels', content: buildRelsXml() },
    { path: 'docProps/app.xml', content: buildAppXml() },
    { path: 'docProps/core.xml', content: buildCoreXml() },
    { path: 'xl/workbook.xml', content: buildWorkbookXml(sheetName) },
    { path: 'xl/_rels/workbook.xml.rels', content: buildWorkbookRelsXml() },
    { path: 'xl/styles.xml', content: buildStylesXml() },
    { path: 'xl/worksheets/sheet1.xml', content: sheetXml },
  ];
};

const encodeFile = (path, content) => {
  const data = encoder.encode(content);
  const nameBytes = encoder.encode(path);
  const crc = crc32(data);
  const size = data.length;

  const localHeader = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(localHeader.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  localHeader.set(nameBytes, 30);

  const centralHeader = new Uint8Array(46 + nameBytes.length);
  const centralView = new DataView(centralHeader.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(4, 20, true);
  centralView.setUint16(6, 20, true);
  centralView.setUint16(8, 0, true);
  centralView.setUint16(10, 0, true);
  centralView.setUint16(12, 0, true);
  centralView.setUint16(14, 0, true);
  centralView.setUint32(16, crc, true);
  centralView.setUint32(20, size, true);
  centralView.setUint32(24, size, true);
  centralView.setUint16(28, nameBytes.length, true);
  centralView.setUint16(30, 0, true);
  centralView.setUint16(32, 0, true);
  centralView.setUint16(34, 0, true);
  centralView.setUint16(36, 0, true);
  centralView.setUint32(40, 0, true);
  centralHeader.set(nameBytes, 46);

  return { data, nameBytes, localHeader, centralHeader, size, crc };
};

export const buildXlsxBinary = (columns, rows, sheetName = 'Submissions') => {
  const files = fileEntries(columns, rows, sheetName).map((entry) => ({
    path: entry.path,
    ...encodeFile(entry.path, entry.content),
  }));

  let offset = 0;
  files.forEach((file) => {
    const view = new DataView(file.centralHeader.buffer);
    view.setUint32(42, offset, true);
    offset += file.localHeader.length + file.size;
  });

  const centralOffset = offset;
  let centralSize = 0;
  files.forEach((file) => {
    centralSize += file.centralHeader.length;
  });

  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  endView.setUint16(20, 0, true);

  const totalSize =
    files.reduce((sum, file) => sum + file.localHeader.length + file.size, 0) +
    centralSize +
    endRecord.length;
  const output = new Uint8Array(totalSize);
  let pointer = 0;

  files.forEach((file) => {
    output.set(file.localHeader, pointer);
    pointer += file.localHeader.length;
    output.set(file.data, pointer);
    pointer += file.size;
  });

  files.forEach((file) => {
    output.set(file.centralHeader, pointer);
    pointer += file.centralHeader.length;
  });

  output.set(endRecord, pointer);

  return output;
};

export const downloadXlsx = (columns, rows, { sheetName = 'Submissions', filename = 'export.xlsx' } = {}) => {
  const binary = buildXlsxBinary(columns, rows, sheetName);
  const blob = new Blob([binary], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};