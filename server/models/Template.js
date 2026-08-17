const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  name: String, // underlying placeholder/AcroForm key, used to fill the source document
  label: String, // friendly text shown to whoever fills the form; defaults to name
  hint: String, // optional help text shown under the label
  type: String, // 'text' | 'choice-single' | 'choice-multi' | 'signature'
  defaultValue: String,
  required: Boolean,
  options: [String], // choice-single/choice-multi option list
  allowOther: Boolean, // adds an "Other (please specify)" choice with free text
}, { _id: false });

const templateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  sourceType: {
    type: String,
    enum: ['pdf', 'docx'],
    default: 'pdf',
  },
  fileName: {
    type: String,
    required: true,
  },
  fileData: {
    type: Buffer,
    required: true,
  },
  fields: [fieldSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Template', templateSchema);
