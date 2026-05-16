const express = require('express');
const ProgressReport = require('../models/ProgressReport');

const router = express.Router();

// @route   GET /api/progress-reports
// @desc    Get all progress reports
router.get('/', async (req, res) => {
  try {
    const progressReports = await ProgressReport.find();
    res.json(progressReports);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/progress-reports/:id
// @desc    Get progress report by ID
router.get('/:id', async (req, res) => {
  try {
    const progressReport = await ProgressReport.findById(req.params.id);
    if (!progressReport) {
      return res.status(404).json({ msg: 'Progress report not found' });
    }
    res.json(progressReport);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/progress-reports
// @desc    Create a progress report
router.post('/', async (req, res) => {
  try {
    const progressReport = new ProgressReport(req.body);
    await progressReport.save();
    res.json(progressReport);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/progress-reports/:id
// @desc    Update progress report
router.put('/:id', async (req, res) => {
  try {
    const progressReport = await ProgressReport.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!progressReport) {
      return res.status(404).json({ msg: 'Progress report not found' });
    }
    res.json(progressReport);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/progress-reports/:id
// @desc    Delete progress report
router.delete('/:id', async (req, res) => {
  try {
    const progressReport = await ProgressReport.findByIdAndDelete(req.params.id);
    if (!progressReport) {
      return res.status(404).json({ msg: 'Progress report not found' });
    }
    res.json({ msg: 'Progress report deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;