const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  name: String,
  type: String,
  defaultValue: String,
  required: Boolean,
  options: [String], // For dropdown/checkbox options
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
