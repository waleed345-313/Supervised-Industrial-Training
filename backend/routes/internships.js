const express = require('express');
const mongoose = require('mongoose');
const Internship = require('../models/internship');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

async function assertCompanyFocal(req, res) {
  const user = await User.findById(req.user.id);
  if (!user || user.role !== 'company_focal') {
    res.status(403).json({ msg: 'Only company focal persons can manage internship postings' });
    return null;
  }
  if (!user.companyId) {
    res.status(400).json({ msg: 'Your account is not linked to a company' });
    return null;
  }
  return user;
}

function internshipBelongsToUser(internshipDoc, companyId) {
  const cid = internshipDoc.company;
  const c = cid && cid.toString ? cid.toString() : String(cid);
  return c === companyId.toString();
}

// Compute internship status based on deadline and seats filled
function computeInternshipStatus(internship) {
  const now = new Date();
  const deadline = internship.deadline ? new Date(internship.deadline) : null;
  const seats = internship.seats || 0;
  const seatsFilled = internship.seatsFilled || 0;

  // If deadline has passed, status is closed
  if (deadline && now > deadline) {
    return 'closed';
  }

  // If seats are filled, status is filled
  if (seatsFilled >= seats && seats > 0) {
    return 'filled';
  }

  // Otherwise, status is open
  return 'open';
}

// Add computed status to internship object
function addComputedStatus(internship) {
  const plain = internship.toObject ? internship.toObject() : internship;
  plain.status = computeInternshipStatus(plain);
  return plain;
}

// @route   GET /api/internships/company/me
// @desc    Internships posted by this company focal's company
router.get('/company/me', auth, async (req, res) => {
  try {
    const user = await assertCompanyFocal(req, res);
    if (!user) return;

    const list = await Internship.find({ company: user.companyId })
      .populate('company')
      .sort({ postedDate: -1 });
    
    // Add computed status to each internship
    const listWithStatus = list.map(addComputedStatus);
    res.json(listWithStatus);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/internships
// @desc    List internships (optional openOnly for student browse, gender filter for students)
router.get('/', async (req, res) => {
  try {
    const openOnly = req.query.openOnly === '1' || req.query.openOnly === 'true';
    const studentGender = req.query.studentGender;
    
    let filter = {};
    
    // If studentGender is provided, filter internships based on gender preference
    if (studentGender && ['Male', 'Female', 'Other'].includes(studentGender)) {
      filter = {
        ...filter,
        $or: [
          { gender: 'Customized' }, // Both can apply
          { gender: studentGender }  // Specific gender match
        ]
      };
    }
    
    const internships = await Internship.find(filter).populate('company').sort({ postedDate: -1 });
    
    // Filter out internships from inactive companies and add computed status
    const activeInternships = internships.filter(i => {
      const company = i.company;
      if (!company) return false;
      return company.isActive !== false;
    });
    
    // Add computed status to each internship
    const internshipsWithStatus = activeInternships.map(addComputedStatus);
    
    // If openOnly, filter to show only open internships based on computed status
    const result = openOnly 
      ? internshipsWithStatus.filter(i => i.status === 'open')
      : internshipsWithStatus;
    
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/internships/:id
// @desc    Get internship by ID
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ msg: 'Internship not found' });
    }
    const internship = await Internship.findById(req.params.id).populate('company');
    if (!internship) {
      return res.status(404).json({ msg: 'Internship not found' });
    }
    // Add computed status
    const internshipWithStatus = addComputedStatus(internship);
    res.json(internshipWithStatus);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/internships
// @desc    Create internship (company focal; stored against their registered company)
router.post('/', auth, async (req, res) => {
  try {
    const user = await assertCompanyFocal(req, res);
    if (!user) return;

    const Company = require('../models/Company');
    const company = await Company.findById(user.companyId);
    if (!company) {
      return res.status(400).json({ msg: 'Company not found' });
    }

    const payload = { ...req.body };
    delete payload.company;
    payload.company = user.companyId;
    // Use company location instead of form location
    payload.location = company.location;

    if (payload.deadline) {
      payload.deadline = new Date(payload.deadline);
    } else {
      delete payload.deadline;
    }

    const internship = new Internship(payload);
    await internship.save();
    const populated = await Internship.findById(internship._id).populate('company');
    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/internships/:id
// @desc    Update internship (same company only)
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await assertCompanyFocal(req, res);
    if (!user) return;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ msg: 'Internship not found' });
    }

    const existing = await Internship.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ msg: 'Internship not found' });
    }
    if (!internshipBelongsToUser(existing, user.companyId)) {
      return res.status(403).json({ msg: 'Cannot edit this internship' });
    }

    const Company = require('../models/Company');
    const company = await Company.findById(user.companyId);
    if (!company) {
      return res.status(400).json({ msg: 'Company not found' });
    }

    const payload = { ...req.body };
    delete payload.company;
    payload.company = user.companyId;
    // Use company location instead of form location
    payload.location = company.location;

    if (payload.deadline) {
      payload.deadline = new Date(payload.deadline);
    } else {
      delete payload.deadline;
    }

    const internship = await Internship.findByIdAndUpdate(req.params.id, payload, { new: true }).populate('company');
    res.json(internship);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/internships/:id
// @desc    Delete internship (same company only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await assertCompanyFocal(req, res);
    if (!user) return;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ msg: 'Internship not found' });
    }

    const existing = await Internship.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ msg: 'Internship not found' });
    }
    if (!internshipBelongsToUser(existing, user.companyId)) {
      return res.status(403).json({ msg: 'Cannot delete this internship' });
    }

    await Internship.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Internship deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
