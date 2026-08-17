const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: true,
  },
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormAssignment',
  },
  data: {
    type: Map,
    of: String,
  },
  status: {
    type: String,
    enum: ['draft', 'submitted'],
    default: 'draft',
  },
  filledPdfPath: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Submission', submissionSchema);
