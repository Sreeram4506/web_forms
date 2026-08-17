const mammoth = require('mammoth');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const {
  detectCheckboxGroups,
  applyCheckboxSelections,
  detectResponseFields,
  applyResponseAnswers,
} = require('./docxChoiceDetector');

const PLACEHOLDER_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

/**
 * Detect fillable fields in a .docx from three sources: explicit
 * {{Field Name}} placeholders, checkbox-style questions authored as a Word
 * table (☐ Option per cell), and free-text "Response:" blank lines (legacy
 * [Bracket Placeholder] or plain underline padding, no placeholder tag at
 * all). Returns the same descriptor shape as pdfProcessor's detectPDFFields
 * so the rest of the pipeline can treat PDF- and DOCX-sourced templates
 * identically.
 *
 * @param {Buffer} docxBuffer raw .docx bytes
 * @returns {Promise<Array>} detected field descriptors
 */
async function detectDocxFields(docxBuffer) {
  const { value: text } = await mammoth.extractRawText({ buffer: docxBuffer });

  const seen = new Set();
  const fields = [];
  let match;
  while ((match = PLACEHOLDER_RE.exec(text)) !== null) {
    const name = match[1].trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    fields.push({
      name,
      label: name,
      hint: '',
      type: 'text',
      defaultValue: '',
      required: true,
      options: [],
      allowOther: false,
      source: 'placeholder',
    });
  }

  const checkboxFields = detectCheckboxGroups(docxBuffer);

  // A fillable template pairs a checkbox group's "Other:" row with its own
  // {{placeholder}} for the typed answer. That placeholder was also picked up
  // by the scan above, which surfaced the same question twice: once as the
  // real choice group, and again as a standalone text field with an opaque
  // name like "Other - Table 6". The group owns it, so drop the duplicate.
  const ownedByCheckbox = new Set(
    checkboxFields.map((f) => f.otherPlaceholder).filter(Boolean)
  );

  const deduped = fields.filter((f) => !ownedByCheckbox.has(f.name));
  deduped.push(...checkboxFields);
  deduped.push(...detectResponseFields(docxBuffer));

  return deduped;
}

/**
 * Fill a .docx from its detected fields, whichever source each one came
 * from. Checkbox-table fields have no {{}} placeholder to substitute — they
 * get applied first as a direct structural edit (toggle ☐/☑, insert Other
 * text) — then the remaining {{Field Name}} placeholders render normally.
 *
 * Signature fields hold a base64 image data URL, which is meaningless as
 * visible document text, so they're rendered as a readable marker instead;
 * the actual image stays attached to the submission and is viewable from
 * the admin dashboard.
 *
 * @param {Buffer} docxBuffer raw .docx bytes of the template
 * @param {Object} data values keyed by field name
 * @param {Array} fields template field descriptors (for signature/checkbox detection)
 * @returns {Buffer} filled .docx bytes
 */
function fillDocxTemplate(docxBuffer, data = {}, fields = []) {
  const checkboxFields = fields.filter((f) => f.source === 'checkbox-table');
  const docxAfterCheckboxes = applyCheckboxSelections(docxBuffer, data, checkboxFields);

  const responseFields = fields.filter((f) => f.source === 'response-line');
  const docxAfterResponses = applyResponseAnswers(docxAfterCheckboxes, data, responseFields);

  const signatureFieldNames = new Set(
    fields.filter((f) => f.type === 'signature').map((f) => f.name)
  );

  const renderData = { ...data };
  for (const name of signatureFieldNames) {
    renderData[name] = renderData[name]
      ? '[Signature attached — view in dashboard]'
      : '';
  }

  // Route a checkbox group's typed "Other" answer into the {{placeholder}}
  // its row carries, so the render pass writes it in the document's own spot.
  for (const field of checkboxFields) {
    if (!field.otherPlaceholder) continue;
    const value = data[field.name];
    if (!value) continue;
    const known = new Set(field.options || []);
    const typed = value
      .split(', ')
      .filter(Boolean)
      .find((part) => !known.has(part));
    if (typed) renderData[field.otherPlaceholder] = typed;
  }

  const zip = new PizZip(docxAfterResponses);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => '',
  });

  doc.render(renderData);

  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = {
  detectDocxFields,
  fillDocxTemplate,
};
