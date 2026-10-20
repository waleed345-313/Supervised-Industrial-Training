const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Company = require('../models/Company');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    let responseUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      ...(user.companyId ? { companyId: String(user.companyId) } : {}),
      ...(user.username ? { username: user.username } : {}),
      ...(user.department ? { department: user.department } : {}),
    };

    // If this is a student, include linked student details
    if (user.role === 'student') {
      // Prefer student fields stored on User (admin-managed), fallback to Student collection
      responseUser = {
        ...responseUser,
        ...(user.studentId ? { studentId: user.studentId } : {}),
        ...(typeof user.cgpa === 'number' ? { cgpa: user.cgpa } : {}),
        ...(user.batch ? { batch: user.batch } : {}),
        ...(user.section ? { section: user.section } : {}),
        ...(user.gender ? { gender: user.gender } : {}),
      };

      try {
        const student = await Student.findOne({ user: user._id })
          .populate('allocatedCompany', 'name')
          .populate('shortlistedCompany', 'name');
        if (student) {
          const sitPhaseForClient =
            student.currentStatus === 'allocated' ? student.sitPhase || 'sit_1' : student.sitPhase || undefined;
          responseUser = {
            ...responseUser,
            studentId: responseUser.studentId || student.studentId,
            cgpa: typeof responseUser.cgpa === 'number' ? responseUser.cgpa : student.cgpa,
            specialization: student.specialization,
            specializations: Array.isArray(student.specializations) && student.specializations.length > 0
              ? student.specializations
              : student.specialization
                ? String(student.specialization).split(';').map((s) => s.trim()).filter(Boolean)
                : [],
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

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: 3600 },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: responseUser });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/change-password
// @desc    Change password for the authenticated user
router.post('/change-password', auth, [
  body('currentPassword', 'Current password is required').exists(),
  body('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/register
// @desc    Register a user
router.post('/register', [
  body('name', 'Name is required').not().isEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  body('role', 'Role is required').not().isEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role, department, companyId, username, studentId, cgpa, batch, section, gender } = req.body;

  try {
    let normalizedCgpa = cgpa;
    if (role === 'student' && cgpa != null && cgpa !== '') {
      const n = Number(cgpa);
      if (!Number.isFinite(n) || n < 0 || n > 4) {
        return res.status(400).json({ msg: 'CGPA must be between 0 and 4' });
      }
      normalizedCgpa = n;
    }
    const needsCompany = role === 'company_focal' || role === 'industrial_supervisor';
    if (needsCompany) {
      if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ msg: 'A registered company is required for this role' });
      }
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(400).json({ msg: 'Company not found' });
      }
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      name,
      email,
      password,
      role,
      department,
      companyId: needsCompany ? companyId : undefined,
      username,
      studentId,
      cgpa: normalizedCgpa,
      batch,
      section,
      gender,
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: 3600 },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            ...(user.companyId ? { companyId: String(user.companyId) } : {}),
            ...(user.username ? { username: user.username } : {}),
            ...(user.department ? { department: user.department } : {}),
            ...(user.role === 'student' && user.gender ? { gender: user.gender } : {}),
          },
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;