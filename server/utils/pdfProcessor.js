const {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFOptionList,
  StandardFonts,
} = require('pdf-lib');

const CHECKBOX_GROUP_PREFIX = '__checkbox_group__';

// Turns a raw field-name segment ("interests_music", "phoneNumber") into a
// readable label ("Interests Music", "Phone Number") for options and group
// labels that have no on-page text to draw from.
function humanizeSegment(segment) {
  const spaced = segment
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  return spaced ? spaced.replace(/\b\w/g, (c) => c.toUpperCase()) : segment;
}

// Groups sibling PDFCheckBox fields into one multiple-choice question.
//
// A standalone tick box ("I agree to the terms") is a real yes/no and stays
// type 'boolean'. But a form author who wants a "select all that apply"
// question authors it as several independent checkboxes organized under one
// non-terminal parent node in the AcroForm field tree (Adobe Acrobat and
// LiveCycle both do this) — pdf-lib exposes that as a dot-joined fully
// qualified name, e.g. "Interests.Music", "Interests.Art", "Interests.Sports".
// Two or more checkboxes sharing that parent are read as one field's options
// rather than N disconnected true/false toggles, matching how a checkbox
// table in a Word template already becomes one choice-multi question.
//
// checkboxMap keys the resolved option label back to the exact underlying
// checkbox field name, so a later admin edit to the options list (reorder,
// delete) can't desync an index-based mapping — filling only ever looks up
// a selected label, so a stale/removed one simply fills nothing instead of
// checking the wrong box.
function groupCheckboxFields(descriptors) {
  const byParent = new Map();
  descriptors.forEach((d) => {
    if (d.type !== 'boolean') return;
    const dot = d.name.lastIndexOf('.');
    if (dot <= 0) return;
    const parent = d.name.slice(0, dot);
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(d);
  });

  const consumedNames = new Set();
  const grouped = [];

  for (const [parent, members] of byParent) {
    if (members.length < 2) continue;
    members.forEach((m) => consumedNames.add(m.name));

    const options = [];
    const checked = [];
    const checkboxMap = {};
    members.forEach((m) => {
      const label = humanizeSegment(m.name.slice(parent.length + 1));
      options.push(label);
      checkboxMap[label] = m.name;
      if (m.defaultValue === 'true') checked.push(label);
    });

    const parentLeaf = parent.slice(parent.lastIndexOf('.') + 1);

    grouped.push({
      name: `${CHECKBOX_GROUP_PREFIX}${parent}`,
      label: humanizeSegment(parentLeaf),
      hint: '',
      type: 'choice-multi',
      defaultValue: checked.join(', '),
      required: members.some((m) => m.required),
      options,
      allowOther: false,
      source: 'checkbox-group',
      checkboxMap,
    });
  }

  const ungrouped = descriptors.filter((d) => !consumedNames.has(d.name));
  return [...ungrouped, ...grouped];
}

/**
 * Detect the fillable form fields inside a PDF.
 *
 * Uses pdf-lib's AcroForm reader, which returns the field name, concrete type
 * and (for choice fields) the available options. Throws if the buffer is not a
 * readable PDF so the caller can surface a real error to the user.
 *
 * Sibling checkboxes authored as one logical question (see
 * groupCheckboxFields) are collapsed into a single choice-multi descriptor
 * rather than returned as separate boolean fields.
 *
 * @param {Buffer} pdfBuffer raw PDF bytes
 * @returns {Promise<Array>} detected field descriptors
 */
async function detectPDFFields(pdfBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const descriptors = fields.map((field) => {
    const name = field.getName();
    const descriptor = {
      name,
      label: name,
      hint: '',
      type: 'text',
      defaultValue: '',
      required: false,
      options: [],
      allowOther: false,
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
      descriptor.type = 'boolean';
      descriptor.defaultValue = field.isChecked() ? 'true' : 'false';
    } else if (field instanceof PDFDropdown) {
      descriptor.type = 'choice-single';
      descriptor.options = field.getOptions();
      descriptor.defaultValue = (field.getSelected() || [])[0] || '';
    } else if (field instanceof PDFOptionList) {
      descriptor.type = 'choice-single';
      descriptor.options = field.getOptions();
      descriptor.defaultValue = (field.getSelected() || [])[0] || '';
    } else if (field instanceof PDFRadioGroup) {
      descriptor.type = 'choice-single';
      descriptor.options = field.getOptions();
      descriptor.defaultValue = field.getSelected() || '';
    }

    return descriptor;
  });

  return groupCheckboxFields(descriptors);
}

// Finds the page a form field's widget annotation is drawn on, by walking
// each page's /Annots array and comparing dereferenced dict identity — pdf-lib
// caches indirect objects per PDFContext, so the same ref always resolves to
// the same JS object within one loaded document.
function findWidgetPage(pdfDoc, widget) {
  for (const page of pdfDoc.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i++) {
      if (annots.lookup(i) === widget.dict) return page;
    }
  }
  return null;
}

const SIGNATURE_MIME_RE = /^data:image\/(png|jpe?g);base64,(.+)$/i;

// Draws an uploaded signature image into a text field's on-page position
// instead of setting text, since PDF AcroForms have no native "image field".
async function embedSignatureIntoField(pdfDoc, field, dataUrl) {
  const match = SIGNATURE_MIME_RE.exec(dataUrl);
  if (!match) {
    console.warn(`Signature field ${field.getName()}: unsupported image format, skipped`);
    return;
  }

  const [, format, base64] = match;
  const bytes = Buffer.from(base64, 'base64');
  const image = /png/i.test(format) ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

  const widgets = field.acroField.getWidgets();
  widgets.forEach((widget) => {
    const page = findWidgetPage(pdfDoc, widget);
    if (!page) return;

    const rect = widget.getRectangle();
    const scaled = image.scaleToFit(rect.width, rect.height);
    page.drawImage(image, {
      x: rect.x + (rect.width - scaled.width) / 2,
      y: rect.y + (rect.height - scaled.height) / 2,
      width: scaled.width,
      height: scaled.height,
    });
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
 * @param {Array} fields template field descriptors (for signature detection)
 * @returns {Promise<Uint8Array>} filled PDF bytes
 */
async function fillPDF(pdfBuffer, data = {}, fields = []) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  // Embed a standard font so flatten() can render appearances for fields whose
  // template supplied no default appearance resource.
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const signatureFieldNames = new Set(
    fields.filter((f) => f.type === 'signature').map((f) => f.name)
  );

  const skipped = [];

  for (const field of form.getFields()) {
    const name = field.getName();
    if (!Object.prototype.hasOwnProperty.call(data, name)) continue;

    const raw = data[name];
    if (raw === undefined || raw === null) continue;
    const value = String(raw);

    try {
      if (signatureFieldNames.has(name)) {
        if (value) await embedSignatureIntoField(pdfDoc, field, value);
        continue;
      }

      if (field instanceof PDFTextField) {
        field.setText(value);
      } else if (field instanceof PDFCheckBox) {
        const truthy = ['true', 'on', 'yes', '1', 'checked'].includes(
          value.toLowerCase()
        );
        if (truthy) field.check();
        else field.uncheck();
      } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
        if (value === '') continue;
        // Accept values outside the declared option list rather than throwing.
        if (!field.getOptions().includes(value)) field.addOptions([value]);
        field.select(value);
      } else if (field instanceof PDFRadioGroup) {
        if (value === '') continue;
        if (field.getOptions().includes(value)) field.select(value);
        else skipped.push(`${name} (no such radio option: ${value})`);
      }
    } catch (err) {
      skipped.push(`${name} (${err.message})`);
    }
  }

  // Checkbox-group fields (see groupCheckboxFields) have no real PDF field of
  // their own — their submitted value lives under a synthetic group name and
  // has to be fanned back out to each member checkbox individually.
  for (const group of fields) {
    if (group.source !== 'checkbox-group' || !group.checkboxMap) continue;
    const raw = data[group.name];
    if (raw === undefined || raw === null) continue;
    const selected = new Set(String(raw).split(', ').filter(Boolean));

    for (const [optionLabel, memberName] of Object.entries(group.checkboxMap)) {
      try {
        const checkbox = form.getCheckBox(memberName);
        if (selected.has(optionLabel)) checkbox.check();
        else checkbox.uncheck();
      } catch (err) {
        skipped.push(`${memberName} (${err.message})`);
      }
    }
  }

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
