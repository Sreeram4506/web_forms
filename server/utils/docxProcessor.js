const mammoth = require('mammoth');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const PLACEHOLDER_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

/**
 * Detect fillable fields in a .docx by scanning for {{Field Name}} placeholders.
 * Returns the same descriptor shape as pdfProcessor's detectPDFFields so the
 * rest of the pipeline can treat PDF- and DOCX-sourced templates identically.
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
    });
  }

  return fields;
}

/**
 * Replace {{Field Name}} placeholders in a .docx with submitted values.
 *
 * Signature fields hold a base64 image data URL, which is meaningless as
 * visible document text, so they're rendered as a readable marker instead;
 * the actual image stays attached to the submission and is viewable from
 * the admin dashboard.
 *
 * @param {Buffer} docxBuffer raw .docx bytes of the template
 * @param {Object} data values keyed by field name
 * @param {Array} fields template field descriptors (for signature detection)
 * @returns {Buffer} filled .docx bytes
 */
function fillDocxTemplate(docxBuffer, data = {}, fields = []) {
  const signatureFieldNames = new Set(
    fields.filter((f) => f.type === 'signature').map((f) => f.name)
  );

  const renderData = { ...data };
  for (const name of signatureFieldNames) {
    renderData[name] = renderData[name]
      ? '[Signature attached — view in dashboard]'
      : '';
  }

  const zip = new PizZip(docxBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => '',
  });

  doc.render(renderData);

  return doc.getZip().generate({ type: 'nodebuffer' });
}

module.exports = {
  detectDocxFields,
  fillDocxTemplate,
};
