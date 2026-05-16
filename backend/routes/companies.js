const express = require('express');
const mongoose = require('mongoose');
const Company = require('../models/Company');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

function normalizeCompany(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const assignedSupervisor = o.assignedSupervisor;
  const supervisorId = assignedSupervisor
    ? String(assignedSupervisor._id || assignedSupervisor.id || assignedSupervisor)
    : undefined;
  return {
    id: String(o._id),
    ...o,
    supervisorId,
    supervisorName: assignedSupervisor?.name || undefined,
    assignedSupervisor: assignedSupervisor
      ? {
          id: String(assignedSupervisor._id || assignedSupervisor.id || ''),
          ...assignedSupervisor,
        }
      : assignedSupervisor,
  };
}

// @route   GET /api/companies
// @desc    Get all companies
router.get('/', async (req, res) => {
  try {
    const companies = await Company.find().populate('assignedSupervisor', 'name email department');
    res.json(companies.map(normalizeCompany));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/companies/:id
// @desc    Get company by ID
router.get('/:id', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).populate('assignedSupervisor', 'name email department');
    if (!company) {
      return res.status(404).json({ msg: 'Company not found' });
    }
    res.json(normalizeCompany(company));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/companies
// @desc    Create a company
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'manager_placements') {
    return res.status(403).json({ msg: 'Access denied' });
  }
  try {
    const {
      name,
      industry,
      location,
      website,
      description,
      logo,
      contactPerson,
      contactEmail,
      assignedSupervisor,
      isActive,
    } = req.body || {};

    const company = new Company({
      name,
      industry,
      location,
      website,
      description,
      logo,
      contactPerson,
      contactEmail,
      assignedSupervisor,
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
    });
    await company.save();
    const saved = await Company.findById(company._id).populate('assignedSupervisor', 'name email department');
    res.json(normalizeCompany(saved));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/companies/:id
// @desc    Update company
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'manager_placements') {
    return res.status(403).json({ msg: 'Access denied' });
  }
  try {
    const {
      name,
      industry,
      location,
      website,
      description,
      logo,
      contactPerson,
      contactEmail,
      assignedSupervisor,
      isActive,
    } = req.body || {};

    const updates = {
      ...(typeof name === 'string' ? { name } : {}),
      ...(typeof industry === 'string' ? { industry } : {}),
      ...(typeof location === 'string' ? { location } : {}),
      ...(typeof website === 'string' ? { website } : {}),
      ...(typeof description === 'string' ? { description } : {}),
      ...(typeof logo === 'string' ? { logo } : {}),
      ...(typeof contactPerson === 'string' ? { contactPerson } : {}),
      ...(typeof contactEmail === 'string' ? { contactEmail } : {}),
      ...(assignedSupervisor ? { assignedSupervisor } : {}),
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
    };

    const company = await Company.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!company) {
      return res.status(404).json({ msg: 'Company not found' });
    }
    const updated = await Company.findById(company._id).populate('assignedSupervisor', 'name email department');
    res.json(normalizeCompany(updated));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/companies/:id/assign-supervisor
// @desc    Assign academic supervisor to company
router.put('/:id/assign-supervisor', auth, async (req, res) => {
  try {
    // Check user role - allow university_focal or admin
    if (!['university_focal', 'admin', 'manager_placements'].includes(req.user.role)) {
      return res.status(403).json({ msg: 'Access denied. Only university focal persons can assign supervisors.' });
    }

    const { supervisorId } = req.body;
    const companyId = req.params.id;

    // Validate company ID
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ msg: 'Invalid company ID format' });
    }

    // Validate supervisor ID if provided
    if (supervisorId && !mongoose.Types.ObjectId.isValid(supervisorId)) {
      return res.status(400).json({ msg: 'Invalid supervisor ID format' });
    }

    // If assigning a supervisor, verify they exist and have the correct role
    let supervisor = null;
    if (supervisorId) {
      supervisor = await User.findOne({
        _id: supervisorId,
        role: 'academic_supervisor'
      });
      if (!supervisor) {
        return res.status(400).json({ msg: 'Academic supervisor not found or invalid role' });
      }
    }

    // Get the current company to check previous supervisor
    const currentCompany = await Company.findById(companyId);
    if (!currentCompany) {
      return res.status(404).json({ msg: 'Company not found' });
    }

    const previousSupervisorId = currentCompany?.assignedSupervisor;

    // Update the company assignment
    const company = await Company.findByIdAndUpdate(
      companyId,
      { assignedSupervisor: supervisorId || null },
      { new: true }
    ).populate('assignedSupervisor', 'name email department');

    // CRITICAL: Update students' academicSupervisor field
    const Student = require('../models/Student');
    
    if (supervisorId) {
      // Assigning new supervisor: Update all students ALLOCATED or SHORTLISTED to this company
      await Student.updateMany(
        {
          $and: [
            {
              $or: [
                { allocatedCompany: companyId },
                { shortlistedCompany: companyId }
              ]
            },
            // Only update students who don't already have a different supervisor assigned
            {
              $or: [
                { academicSupervisor: { $exists: false } },
                { academicSupervisor: null },
                { academicSupervisor: previousSupervisorId }
              ]
            }
          ]
        },
        { academicSupervisor: supervisorId }
      );
    } else {
      // Unassigning: Remove academicSupervisor from students who had this supervisor
      await Student.updateMany(
        { 
          $or: [
            { allocatedCompany: companyId },
            { shortlistedCompany: companyId }
          ],
          academicSupervisor: previousSupervisorId 
        },
        { academicSupervisor: null }
      );
    }

    // Emit socket events for real-time updates
    const io = req.app.get('io');
    if (io) {
      // Notify the newly assigned supervisor
      if (supervisorId) {
        io.to(String(supervisorId)).emit('supervisor:update', { type: 'students' });
      }

      // Notify the previously assigned supervisor (if different from new one)
      if (previousSupervisorId && String(previousSupervisorId) !== String(supervisorId)) {
        io.to(String(previousSupervisorId)).emit('supervisor:update', { type: 'students' });
      }

      // Also emit a company-level update for broader awareness
      io.emit('company:assignment', {
        companyId: companyId,
        supervisorId: supervisorId || null,
        type: supervisorId ? 'assigned' : 'unassigned'
      });
    }

    res.json(normalizeCompany(company));
  } catch (err) {
    console.error('Error assigning supervisor:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// @route   PUT /api/companies/:id/unassign-supervisor
// @desc    Unassign academic supervisor from company
router.put('/:id/unassign-supervisor', auth, async (req, res) => {
  try {
    if (!['university_focal', 'admin', 'manager_placements'].includes(req.user.role)) {
      return res.status(403).json({ msg: 'Access denied. Only university focal persons can unassign supervisors.' });
    }

    const companyId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ msg: 'Invalid company ID format' });
    }

    const currentCompany = await Company.findById(companyId);
    if (!currentCompany) {
      return res.status(404).json({ msg: 'Company not found' });
    }

    const previousSupervisorId = currentCompany.assignedSupervisor;

    const company = await Company.findByIdAndUpdate(
      companyId,
      { assignedSupervisor: null },
      { new: true }
    ).populate('assignedSupervisor', 'name email department');

    const Student = require('../models/Student');
    await Student.updateMany(
      {
        $or: [
          { allocatedCompany: companyId },
          { shortlistedCompany: companyId }
        ],
        academicSupervisor: previousSupervisorId
      },
      { academicSupervisor: null }
    );

    const io = req.app.get('io');
    if (io) {
      if (previousSupervisorId) {
        io.to(String(previousSupervisorId)).emit('supervisor:update', { type: 'students' });
      }
      io.emit('company:assignment', {
        companyId,
        supervisorId: null,
        type: 'unassigned'
      });
    }

    res.json(normalizeCompany(company));
  } catch (err) {
    console.error('Error unassigning supervisor:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;