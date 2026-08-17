const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Template = require('../models/Template');
const Submission = require('../models/Submission');
const FormAssignment = require('../models/FormAssignment');
const authMiddleware = require('../middleware/auth');
const { requireAdmin, requireClient } = require('../middleware/roles');
const { generateFinalPdf } = require('../utils/formFiller');
const { generateReportPdf } = require('../utils/pdfReport');

const router = express.Router();

const sanitizeForFilename = (str) =>
  String(str || 'form').replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_') || 'form';

// ---- Admin: create a link + client credentials for a template ----
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { templateId, clientName, clientEmail, password } = req.body;

    if (!templateId || !clientName || !clientEmail || !password) {
      return res.status(400).json({ message: 'templateId, clientName, clientEmail and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const template = await Template.findOne({ _id: templateId, userId: req.userId });
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const existingUser = await User.findOne({ email: clientEmail.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const clientUser = new User({
      name: clientName,
      email: clientEmail,
      password,
      role: 'client',
    });
    await clientUser.save();

    const token = crypto.randomBytes(16).toString('hex');

    const assignment = new FormAssignment({
      adminId: req.userId,
      templateId,
      clientUserId: clientUser._id,
      clientName,
      clientEmail,
      token,
    });
    await assignment.save();

    clientUser.assignmentId = assignment._id;
    await clientUser.save();

    res.status(201).json({
      message: 'Link created',
      assignment: {
        id: assignment._id,
        token: assignment.token,
        status: assignment.status,
        clientName: assignment.clientName,
        clientEmail: assignment.clientEmail,
        templateId: assignment.templateId,
        templateName: template.name,
        createdAt: assignment.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error creating link', error: err.message });
  }
});

// ---- Admin: list links ----
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const assignments = await FormAssignment.find({ adminId: req.userId })
      .populate('templateId', 'name sourceType')
      .sort({ createdAt: -1 });

    res.json(
      assignments.map((a) => ({
        id: a._id,
        token: a.token,
        status: a.status,
        clientName: a.clientName,
        clientEmail: a.clientEmail,
        template: a.templateId
          ? { id: a.templateId._id, name: a.templateId.name, sourceType: a.templateId.sourceType }
          : null,
        submissionId: a.submissionId,
        createdAt: a.createdAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: 'Error fetching links', error: err.message });
  }
});

// ---- Admin: revoke a link ----
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const assignment = await FormAssignment.findOne({ _id: req.params.id, adminId: req.userId });
    if (!assignment) {
      return res.status(404).json({ message: 'Link not found' });
    }

    await User.findByIdAndDelete(assignment.clientUserId);
    await assignment.deleteOne();

    res.json({ message: 'Link revoked' });
  } catch (err) {
    res.status(500).json({ message: 'Error revoking link', error: err.message });
  }
});

// ---- Admin: download the completed PDF for a submitted link ----
router.get('/:id/download', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const assignment = await FormAssignment.findOne({ _id: req.params.id, adminId: req.userId });
    if (!assignment) {
      return res.status(404).json({ message: 'Link not found' });
    }
    if (assignment.status !== 'submitted' || !assignment.submissionId) {
      return res.status(400).json({ message: 'This form has not been submitted yet' });
    }

    const submission = await Submission.findById(assignment.submissionId);
    const template = await Template.findById(assignment.templateId);
    if (!submission || !template) {
      return res.status(404).json({ message: 'Submission or template not found' });
    }

    const dataObj = Object.fromEntries(submission.data);
    const { buffer, contentType, extension } = await generateFinalPdf(template, dataObj);

    const filename = `${sanitizeForFilename(assignment.clientName)}-${sanitizeForFilename(template.name)}.${extension}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: 'Error generating PDF', error: err.message });
  }
});

// ---- Admin: download a client's filing as a PDF record ----
router.get('/:id/download-report', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const assignment = await FormAssignment.findOne({ _id: req.params.id, adminId: req.userId });
    if (!assignment) {
      return res.status(404).json({ message: 'Link not found' });
    }
    if (assignment.status !== 'submitted' || !assignment.submissionId) {
      return res.status(400).json({ message: 'This form has not been submitted yet' });
    }

    const submission = await Submission.findById(assignment.submissionId);
    const template = await Template.findById(assignment.templateId).select('-fileData');
    if (!submission || !template) {
      return res.status(404).json({ message: 'Submission or template not found' });
    }

    const buffer = await generateReportPdf(template, Object.fromEntries(submission.data));

    const filename = `${sanitizeForFilename(assignment.clientName)}-${sanitizeForFilename(template.name)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: 'Error generating PDF', error: err.message });
  }
});

// ---- Public: minimal info for the client login screen ----
router.get('/link/:token', async (req, res) => {
  try {
    const assignment = await FormAssignment.findOne({ token: req.params.token })
      .populate('templateId', 'name')
      .populate('adminId', 'name');
    if (!assignment) {
      return res.status(404).json({ message: 'This link is invalid or has been revoked' });
    }

    res.json({
      clientName: assignment.clientName,
      templateName: assignment.templateId?.name || 'Form',
      firmName: assignment.adminId?.name || null,
      status: assignment.status,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching link', error: err.message });
  }
});

// ---- Public: client login scoped to a link ----
router.post('/link/:token/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const assignment = await FormAssignment.findOne({ token: req.params.token });
    if (!assignment) {
      return res.status(404).json({ message: 'This link is invalid or has been revoked' });
    }

    const clientUser = await User.findById(assignment.clientUserId);
    if (!clientUser || clientUser.email !== email.toLowerCase()) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await clientUser.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const jwtToken = jwt.sign(
      { userId: clientUser._id, role: 'client', assignmentId: assignment._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token: jwtToken,
      clientName: clientUser.name,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in', error: err.message });
  }
});

// ---- Client: fetch my assigned form ----
router.get('/mine', authMiddleware, requireClient, async (req, res) => {
  try {
    const assignment = await FormAssignment.findById(req.assignmentId).populate(
      'templateId',
      'name description fields sourceType'
    );
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    let submission = null;
    if (assignment.submissionId) {
      const sub = await Submission.findById(assignment.submissionId);
      if (sub) {
        submission = { data: Object.fromEntries(sub.data), status: sub.status };
      }
    }

    res.json({
      status: assignment.status,
      clientName: assignment.clientName,
      template: assignment.templateId
        ? {
            name: assignment.templateId.name,
            description: assignment.templateId.description,
            fields: assignment.templateId.fields,
          }
        : null,
      submission,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching your form', error: err.message });
  }
});

// ---- Client: save a draft or submit my form ----
router.post('/mine/submit', authMiddleware, requireClient, async (req, res) => {
  try {
    const { data, status } = req.body;

    const assignment = await FormAssignment.findById(req.assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    if (assignment.status === 'submitted') {
      return res.status(409).json({ message: 'This form has already been submitted' });
    }

    const nextStatus = status === 'submitted' ? 'submitted' : 'draft';

    let submission;
    if (assignment.submissionId) {
      submission = await Submission.findByIdAndUpdate(
        assignment.submissionId,
        { data: new Map(Object.entries(data || {})), status: nextStatus, updatedAt: new Date() },
        { new: true }
      );
    } else {
      submission = new Submission({
        userId: req.userId,
        templateId: assignment.templateId,
        assignmentId: assignment._id,
        data: new Map(Object.entries(data || {})),
        status: nextStatus,
      });
      await submission.save();
      assignment.submissionId = submission._id;
    }

    if (nextStatus === 'submitted') {
      assignment.status = 'submitted';
    }
    await assignment.save();

    res.json({
      message: nextStatus === 'submitted' ? 'Form submitted successfully' : 'Draft saved',
      status: assignment.status,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting form', error: err.message });
  }
});

module.exports = router;
