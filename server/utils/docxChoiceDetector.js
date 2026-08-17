const PizZip = require('pizzip');

const CHECKBOX_GLYPHS = '☐☑☒';
const OTHER_RE = /^other\s*:?$/i;

// Matches a run holding only a checkbox glyph, immediately followed by the
// run holding that option's label text. Word frequently splits a sentence
// across multiple <w:r> runs (spellcheck, formatting boundaries), but the
// glyph itself is always alone in its own run in every sample this was
// built against, which is what makes this reliable rather than a guess.
const CHECKBOX_PAIR_RE = new RegExp(
  `(<w:r>(?:(?!<w:r>).)*?<w:t[^>]*>)(\\s*)([${CHECKBOX_GLYPHS}])(\\s*)(</w:t></w:r>)` +
    `(<w:r>(?:(?!<w:r>).)*?<w:t[^>]*>)([^<]*)(</w:t></w:r>)`,
  'gs'
);

function decodeXmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripTags(xml) {
  // Insert a boundary at paragraph/table edges first so stripping tags
  // never silently glues two separate paragraphs' text into one word.
  return decodeXmlEntities(
    xml.replace(/<\/w:p>/g, '</w:p> ').replace(/<\/w:tbl>/g, '</w:tbl> ').replace(/<[^>]+>/g, '')
  );
}

function labelBefore(documentXml, table, allTables) {
  const tableListIndex = allTables.findIndex((t) => t.start === table.start);
  const prevEnd = tableListIndex > 0 ? allTables[tableListIndex - 1].end : 0;
  const before = stripTags(documentXml.slice(prevEnd, table.start));
  const segments = before
    .split(/[\s\xa0]{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  return segments.length ? segments[segments.length - 1] : null;
}

/**
 * Auto-detects multiple-choice questions authored as a checkbox table
 * (☐ Option, one per table cell) rather than a {{Field Name}} placeholder.
 * Each qualifying table becomes one choice-multi field: the question label
 * is read from the text immediately preceding the table, its options come
 * from each checkbox's paired label run, and a literal "Other" row (with or
 * without a trailing colon) is recognized as the field's allowOther toggle
 * instead of a regular option.
 *
 * @param {Buffer} docxBuffer raw .docx bytes
 * @returns {Array} field descriptors with source:'checkbox-table' + tableIndex
 */
function detectCheckboxGroups(docxBuffer) {
  const zip = new PizZip(docxBuffer);
  const documentXml = zip.file('word/document.xml').asText();

  const allTables = [...documentXml.matchAll(/<w:tbl>.*?<\/w:tbl>/gs)].map((m, i) => ({
    index: i,
    start: m.index,
    end: m.index + m[0].length,
    xml: m[0],
  }));
  const checkboxTables = allTables.filter((t) => new RegExp(`[${CHECKBOX_GLYPHS}]`).test(t.xml));

  const fields = [];
  checkboxTables.forEach((table, seq) => {
    const options = [];
    let allowOther = false;

    for (const m of table.xml.matchAll(CHECKBOX_PAIR_RE)) {
      const raw = decodeXmlEntities(m[7]).trim();
      if (!raw) continue;
      if (OTHER_RE.test(raw)) {
        allowOther = true;
        continue;
      }
      options.push(raw.replace(/:$/, '').trim());
    }

    if (options.length === 0) return;

    const label = labelBefore(documentXml, table, allTables) || `Question ${seq + 1}`;

    fields.push({
      name: `__checkbox_table_${table.index}`,
      label,
      hint: '',
      type: 'choice-multi',
      defaultValue: '',
      required: false,
      options,
      allowOther,
      source: 'checkbox-table',
      tableIndex: table.index,
    });
  });

  return fields;
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Splits a choice-multi field's resolved comma-joined value (the same
// encoding FieldInput.js produces client-side) into the subset that matches
// known options versus free "Other" text, so the two can be handled
// differently: known options just toggle a checkbox, Other also needs new
// text written into the document.
function splitResolvedValue(value, options) {
  const parts = value ? value.split(', ').filter(Boolean) : [];
  const selected = new Set(parts.filter((p) => options.includes(p)));
  const otherText = parts.find((p) => !options.includes(p)) || '';
  return { selected, otherText };
}

function toggleTableCheckboxes(tableXml, selected, otherText) {
  return tableXml.replace(CHECKBOX_PAIR_RE, (full, r1, sp1, glyph, sp2, r1close, r2, label, r2close) => {
    const decoded = decodeXmlEntities(label).trim();
    const isOtherRow = OTHER_RE.test(decoded);
    const cleanLabel = decoded.replace(/:$/, '').trim();
    const shouldCheck = isOtherRow ? !!otherText : selected.has(cleanLabel);
    const newGlyph = shouldCheck ? '☑' : '☐';

    const labelRun = `${r2}${label}${r2close}`;
    const otherAddition =
      isOtherRow && otherText
        ? `<w:r><w:t xml:space="preserve"> ${escapeXml(otherText)}</w:t></w:r>`
        : '';

    return `${r1}${sp1}${newGlyph}${sp2}${r1close}${labelRun}${otherAddition}`;
  });
}

/**
 * Applies checkbox-table selections directly to the document XML: toggles
 * ☐ to ☑ for each chosen option, and — for a field with allowOther — writes
 * the typed free text as a new run right after the "Other" label.
 *
 * Runs on the raw zip before docxtemplater's {{}} render pass, since these
 * fields have no {{}} placeholder to substitute; they're a structural edit
 * to an existing table, not a template tag.
 *
 * Tables are patched in reverse document order so that each earlier
 * splice's offsets stay valid even after a later table's XML changes length
 * (inserting Other text is the only operation that isn't length-neutral).
 *
 * @param {Buffer} docxBuffer raw .docx bytes
 * @param {Object} data values keyed by field name
 * @param {Array} checkboxFields field descriptors with source:'checkbox-table'
 * @returns {Buffer} docx bytes with checkbox tables patched in place
 */
function applyCheckboxSelections(docxBuffer, data, checkboxFields) {
  if (!checkboxFields || checkboxFields.length === 0) return docxBuffer;

  const zip = new PizZip(docxBuffer);
  const file = zip.file('word/document.xml');
  let documentXml = file.asText();

  const allTables = [...documentXml.matchAll(/<w:tbl>.*?<\/w:tbl>/gs)].map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
    xml: m[0],
  }));

  const edits = checkboxFields
    .map((field) => {
      const table = allTables[field.tableIndex];
      if (!table) return null;
      const value = data[field.name];
      if (!value) return null;
      const { selected, otherText } = splitResolvedValue(value, field.options);
      const newXml = toggleTableCheckboxes(table.xml, selected, field.allowOther ? otherText : '');
      return { start: table.start, end: table.end, newXml };
    })
    .filter(Boolean)
    .sort((a, b) => b.start - a.start); // reverse order: patch from the end backwards

  for (const edit of edits) {
    documentXml = documentXml.slice(0, edit.start) + edit.newXml + documentXml.slice(edit.end);
  }

  zip.file('word/document.xml', documentXml);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = {
  detectCheckboxGroups,
  applyCheckboxSelections,
  CHECKBOX_PAIR_RE,
  OTHER_RE,
  decodeXmlEntities,
};
