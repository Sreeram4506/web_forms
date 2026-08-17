const mammoth = require('mammoth');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const puppeteer = require('puppeteer');

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
      type: 'text',
      defaultValue: '',
      required: true,
      options: [],
    });
  }

  return fields;
}

/**
 * Replace {{Field Name}} placeholders in a .docx with submitted values.
 *
 * @param {Buffer} docxBuffer raw .docx bytes of the template
 * @param {Object} data values keyed by field name
 * @returns {Buffer} filled .docx bytes
 */
function fillDocxTemplate(docxBuffer, data = {}) {
  const zip = new PizZip(docxBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => '',
  });

  doc.render(data);

  return doc.getZip().generate({ type: 'nodebuffer' });
}

/**
 * Render a filled .docx to PDF via mammoth (docx -> HTML) + a headless
 * Chromium print (HTML -> PDF), since no LibreOffice binary is assumed to be
 * available on the host.
 *
 * @param {Buffer} docxBuffer filled .docx bytes
 * @returns {Promise<Buffer>} PDF bytes
 */
async function docxToPdf(docxBuffer) {
  const { value: html } = await mammoth.convertToHtml({ buffer: docxBuffer });
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Helvetica, Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: #111; }
  p { margin: 0 0 10px; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ccc; padding: 4px 8px; }
</style>
</head>
<body>${html}</body>
</html>`;

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = {
  detectDocxFields,
  fillDocxTemplate,
  docxToPdf,
};
