const express = require('express');
const Submission = require('../models/Submission');
const Template = require('../models/Template');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const { generateFinalPdf } = require('../utils/formFiller');
const { generateReportPdf } = require('../utils/pdfReport');

const router = express.Router();

router.use(authMiddleware, requireAdmin);

// Create or update submission
router.post('/', async (req, res) => {
  try {
    const { templateId, data, status } = req.body;

    if (!templateId) {
      return res.status(400).json({ message: 'Template ID is required' });
    }

    // Verify template exists and belongs to user
    const template = await Template.findOne({
      _id: templateId,
      userId: req.userId,
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Create new submission
    const submission = new Submission({
      userId: req.userId,
      templateId,
      data: new Map(Object.entries(data || {})),
      status: status || 'draft',
    });

    await submission.save();

    res.status(201).json({
      message: 'Submission created',
      submission: {
        id: submission._id,
        templateId: submission.templateId,
        data: Object.fromEntries(submission.data),
        status: submission.status,
        createdAt: submission.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error creating submission', error: err.message });
  }
});

// Update submission
router.put('/:id', async (req, res) => {
  try {
    const { data, status } = req.body;

    const submission = await Submission.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        data: new Map(Object.entries(data || {})),
        status: status || 'draft',
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json({
      message: 'Submission updated',
      submission: {
        id: submission._id,
        templateId: submission.templateId,
        data: Object.fromEntries(submission.data),
        status: submission.status,
        updatedAt: submission.updatedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error updating submission', error: err.message });
  }
});

// Get submission
router.get('/:id', async (req, res) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).populate('templateId', '-fileData');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json({
      id: submission._id,
      templateId: submission.templateId,
      data: Object.fromEntries(submission.data),
      status: submission.status,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching submission', error: err.message });
  }
});

// Get all submissions for a template
router.get('/template/:templateId', async (req, res) => {
  try {
    const submissions = await Submission.find({
      userId: req.userId,
      templateId: req.params.templateId,
    });

    const formattedSubmissions = submissions.map(sub => ({
      id: sub._id,
      templateId: sub.templateId,
      data: Object.fromEntries(sub.data),
      status: sub.status,
      createdAt: sub.createdAt,
    }));

    res.json(formattedSubmissions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching submissions', error: err.message });
  }
});

// Generate PDF from submission
router.post('/:id/generate-pdf', async (req, res) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const template = await Template.findById(submission.templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Convert map to object for fill pipeline
    const dataObj = Object.fromEntries(submission.data);

    // Fill template with submission data (PDF or DOCX source)
    const { buffer, contentType, extension } = await generateFinalPdf(template, dataObj);

    // Send file as response
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="filled-${template.name}.${extension}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: 'Error generating PDF', error: err.message });
  }
});

// Download the submission as a PDF record of every question and its answer.
// Separate from /generate-pdf, which returns the filled source document in
// its original format (a .docx template stays a .docx there).
router.post('/:id/report-pdf', async (req, res) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const template = await Template.findById(submission.templateId).select('-fileData');
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const buffer = await generateReportPdf(template, Object.fromEntries(submission.data));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${template.name}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: 'Error generating PDF', error: err.message });
  }
});

// Delete submission
router.delete('/:id', async (req, res) => {
  try {
    const submission = await Submission.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json({ message: 'Submission deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting submission', error: err.message });
  }
});

module.exports = router;
