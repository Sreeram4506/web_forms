const {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFOptionList,
  StandardFonts,
} = require('pdf-lib');

/**
 * Detect the fillable form fields inside a PDF.
 *
 * Uses pdf-lib's AcroForm reader, which returns the field name, concrete type
 * and (for choice fields) the available options. Throws if the buffer is not a
 * readable PDF so the caller can surface a real error to the user.
 *
 * @param {Buffer} pdfBuffer raw PDF bytes
 * @returns {Promise<Array>} detected field descriptors
 */
async function detectPDFFields(pdfBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  return fields.map((field) => {
    const descriptor = {
      name: field.getName(),
      type: 'text',
      defaultValue: '',
      required: false,
      options: [],
    };

    try {
      descriptor.required = field.isRequired();
    } catch (err) {
      // Some producers omit the flag; default to not required.
    }

    if (field instanceof PDFTextField) {
      descriptor.type = 'text';
      descriptor.defaultValue = field.getText() || '';
    } else if (field instanceof PDFCheckBox) {
      descriptor.type = 'checkbox';
      descriptor.defaultValue = field.isChecked() ? 'true' : 'false';
    } else if (field instanceof PDFDropdown) {
      descriptor.type = 'dropdown';
      descriptor.options = field.getOptions();
      descriptor.defaultValue = (field.getSelected() || [])[0] || '';
    } else if (field instanceof PDFOptionList) {
      descriptor.type = 'dropdown';
      descriptor.options = field.getOptions();
      descriptor.defaultValue = (field.getSelected() || [])[0] || '';
    } else if (field instanceof PDFRadioGroup) {
      descriptor.type = 'radio';
      descriptor.options = field.getOptions();
      descriptor.defaultValue = field.getSelected() || '';
    }

    return descriptor;
  });
}

/**
 * Fill a PDF's form fields from a plain object of { fieldName: value }.
 *
 * Returns the flattened PDF bytes so the downloaded document is a finished,
 * non-editable record of what the client submitted.
 *
 * @param {Buffer} pdfBuffer raw PDF bytes of the template
 * @param {Object} data values keyed by field name
 * @returns {Promise<Uint8Array>} filled PDF bytes
 */
async function fillPDF(pdfBuffer, data = {}) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  // Embed a standard font so flatten() can render appearances for fields whose
  // template supplied no default appearance resource.
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const skipped = [];

  form.getFields().forEach((field) => {
    const name = field.getName();
    if (!Object.prototype.hasOwnProperty.call(data, name)) return;

    const raw = data[name];
    if (raw === undefined || raw === null) return;
    const value = String(raw);

    try {
      if (field instanceof PDFTextField) {
        field.setText(value);
      } else if (field instanceof PDFCheckBox) {
        const truthy = ['true', 'on', 'yes', '1', 'checked'].includes(
          value.toLowerCase()
        );
        if (truthy) field.check();
        else field.uncheck();
      } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
        if (value === '') return;
        // Accept values outside the declared option list rather than throwing.
        if (!field.getOptions().includes(value)) field.addOptions([value]);
        field.select(value);
      } else if (field instanceof PDFRadioGroup) {
        if (value === '') return;
        if (field.getOptions().includes(value)) field.select(value);
        else skipped.push(`${name} (no such radio option: ${value})`);
      }
    } catch (err) {
      skipped.push(`${name} (${err.message})`);
    }
  });

  if (skipped.length) {
    console.warn('fillPDF skipped fields:', skipped.join(', '));
  }

  // Regenerate appearance streams with an embedded font BEFORE flattening.
  // Without this, templates whose fields carry no default-appearance font
  // resource flatten to visually EMPTY boxes even though the values were set.
  form.updateFieldAppearances(helvetica);

  // Flatten so the result is a fixed document, not a re-editable form.
  form.flatten();

  return pdfDoc.save();
}

module.exports = {
  detectPDFFields,
  fillPDF,
};
