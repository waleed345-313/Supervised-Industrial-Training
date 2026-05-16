const express = require('express');
const User = require('../models/User');
const Student = require('../models/Student');
const bcrypt = require('bcryptjs');

const router = express.Router();

function normalizeUser(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  return { id: String(_id || obj.id), ...rest };
}

// @route   GET /api/users
// @desc    Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users.map(normalizeUser));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (includes student details when applicable)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    let responseUser = normalizeUser(user);

    if (user.role === 'student') {
      try {
        const student = await Student.findOne({ user: user._id })
          .populate('allocatedCompany', 'name')
          .populate('shortlistedCompany', 'name');
        if (student) {
          const sitPhaseForClient =
            student.currentStatus === 'allocated' ? student.sitPhase || 'sit_1' : student.sitPhase || undefined;
          responseUser = {
            ...responseUser,
            studentId: student.studentId,
            cgpa: student.cgpa,
            specialization: student.specialization,
            applicationCount: student.applicationCount,
            maxApplications: student.maxApplications,
            currentStatus: student.currentStatus,
            allocatedCompany: student.allocatedCompany?._id ? String(student.allocatedCompany._id) : student.allocatedCompany ? String(student.allocatedCompany) : undefined,
            allocatedCompanyId: student.allocatedCompany?._id ? String(student.allocatedCompany._id) : student.allocatedCompany ? String(student.allocatedCompany) : undefined,
            allocatedCompanyName: student.allocatedCompany?.name,
            shortlistedCompany: student.shortlistedCompany?._id ? String(student.shortlistedCompany._id) : student.shortlistedCompany ? String(student.shortlistedCompany) : undefined,
            shortlistedCompanyId: student.shortlistedCompany?._id ? String(student.shortlistedCompany._id) : student.shortlistedCompany ? String(student.shortlistedCompany) : undefined,
            shortlistedCompanyName: student.shortlistedCompany?.name,
            ...(sitPhaseForClient ? { sitPhase: sitPhaseForClient } : {}),
          };
        }
      } catch (err) {
        console.error('Error fetching linked student for user', err.message);
      }
    }

    res.json(responseUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
router.put('/:id', async (req, res) => {
  try {
    const update = { ...req.body };

    if (typeof update.role === 'string' && !['company_focal', 'industrial_supervisor'].includes(update.role)) {
      update.companyId = null;
    }

    // If password is provided, hash it before saving (auth/login expects bcrypt hash)
    if (typeof update.password === 'string') {
      const trimmed = update.password.trim();
      if (trimmed.length === 0) {
        delete update.password;
      } else {
        const salt = await bcrypt.genSalt(10);
        update.password = await bcrypt.hash(trimmed, salt);
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(normalizeUser(user));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;