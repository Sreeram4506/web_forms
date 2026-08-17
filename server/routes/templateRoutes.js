const express = require('express');
const multer = require('multer');
const Template = require('../models/Template');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const { detectPDFFields } = require('../utils/pdfProcessor');
const { detectDocxFields } = require('../utils/docxProcessor');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

router.use(authMiddleware, requireAdmin);

// Upload and detect PDF/DOCX template
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let sourceType;
    let fields;

    if (req.file.mimetype === 'application/pdf') {
      sourceType = 'pdf';
      fields = await detectPDFFields(req.file.buffer);
    } else if (req.file.mimetype === DOCX_MIME) {
      sourceType = 'docx';
      fields = await detectDocxFields(req.file.buffer);
    } else {
      return res.status(400).json({ message: 'Only PDF or Word (.docx) files are allowed' });
    }

    // Create template
    const template = new Template({
      userId: req.userId,
      name,
      description,
      sourceType,
      fileName: req.file.originalname,
      fileData: req.file.buffer,
      fields,
    });

    await template.save();

    res.status(201).json({
      message: 'Template uploaded successfully',
      template: {
        id: template._id,
        name: template.name,
        description: template.description,
        sourceType: template.sourceType,
        fields: template.fields,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error uploading template', error: err.message });
  }
});

// Get all templates for user
router.get('/', async (req, res) => {
  try {
    const templates = await Template.find({ userId: req.userId }).select('-fileData');
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching templates', error: err.message });
  }
});

// Get single template
router.get('/:id', async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Don't send large file data in response
    const response = template.toObject();
    delete response.fileData;
    res.json(response);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching template', error: err.message });
  }
});

// Update template fields
router.put('/:id', async (req, res) => {
  try {
    const { fields } = req.body;

    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { fields },
      { new: true }
    ).select('-fileData');

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ message: 'Template updated', template });
  } catch (err) {
    res.status(500).json({ message: 'Error updating template', error: err.message });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    const template = await Template.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting template', error: err.message });
  }
});

module.exports = router;
