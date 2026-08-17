const { fillPDF } = require('./pdfProcessor');
const { fillDocxTemplate, docxToPdf } = require('./docxProcessor');

/**
 * Fill a template with submitted data and produce the final downloadable
 * file, regardless of whether the template originated as a PDF or a Word
 * document.
 *
 * @param {Object} template mongoose Template document (needs sourceType, fileData, name)
 * @param {Object} dataObj values keyed by field name
 * @returns {Promise<{ buffer: Buffer|Uint8Array, contentType: string, extension: string }>}
 */
async function generateFinalPdf(template, dataObj = {}) {
  if (template.sourceType === 'docx') {
    const filledDocx = fillDocxTemplate(template.fileData, dataObj);
    try {
      const pdfBuffer = await docxToPdf(filledDocx);
      return { buffer: pdfBuffer, contentType: 'application/pdf', extension: 'pdf' };
    } catch (err) {
      console.warn('docxToPdf failed, falling back to .docx output:', err.message);
      return {
        buffer: filledDocx,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: 'docx',
      };
    }
  }

  const pdfBytes = await fillPDF(template.fileData, dataObj);
  return { buffer: Buffer.from(pdfBytes), contentType: 'application/pdf', extension: 'pdf' };
}

module.exports = { generateFinalPdf };
