const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const User = require('../models/User');
const Company = require('../models/Company');
const Application = require('../models/Application');
const Evaluation = require('../models/Evaluation');
const auth = require('../middleware/auth');

const router = express.Router();
const TOTAL_MONTHS = 4;
const TOTAL_WEIGHTAGE = 50;
const MONTH_WEIGHTAGE = TOTAL_WEIGHTAGE / TOTAL_MONTHS;

function normalizeCompanyStudent(doc) {
  const s = doc.toObject ? doc.toObject() : doc;
  const u = s.user;
  const allocatedCompanyId =
    s.allocatedCompany && s.allocatedCompany._id ? String(s.allocatedCompany._id) : s.allocatedCompany ? String(s.allocatedCompany) : undefined;
  const shortlistedCompanyId =
    s.shortlistedCompany && s.shortlistedCompany._id ? String(s.shortlistedCompany._id) : s.shortlistedCompany ? String(s.shortlistedCompany) : undefined;
  // Return populated company object if available (with name), otherwise the ID string
  const allocatedCompany = s.allocatedCompany && s.allocatedCompany._id
    ? { id: allocatedCompanyId, name: s.allocatedCompany.name || '' }
    : allocatedCompanyId;
  const shortlistedCompany = s.shortlistedCompany && s.shortlistedCompany._id
    ? { id: shortlistedCompanyId, name: s.shortlistedCompany.name || '' }
    : shortlistedCompanyId;
  return {
    id: u && u._id ? String(u._id) : String(s.user),
    name: u?.name || '',
    email: u?.email || '',
    role: 'student',
    department: u?.department,
    studentId: s.studentId,
    cgpa: s.cgpa,
    specialization: s.specialization,
    applicationCount: s.applicationCount,
    maxApplications: s.maxApplications,
    currentStatus: s.currentStatus,
    allocatedCompany,
    allocatedCompanyId,
    shortlistedCompany,
    shortlistedCompanyId,
    industrialSupervisorId: s.industrialSupervisor?._id ? String(s.industrialSupervisor._id) : s.industrialSupervisor ? String(s.industrialSupervisor) : undefined,
    industrialSupervisorName: s.industrialSupervisor?.name,
    academicSupervisorId: s.academicSupervisor?._id ? String(s.academicSupervisor._id) : s.academicSupervisor ? String(s.academicSupervisor) : undefined,
    academicSupervisorName: s.academicSupervisor?.name,
    progress: 0,
    monthsCompleted: 0,
    totalMonths: TOTAL_MONTHS,
    progressOutOf50: 0,
    totalWeightage: TOTAL_WEIGHTAGE,
  };
}

// @route   GET /api/students/company/me
// @desc    Students shortlisted or allocated to this company (via applications to its internships)
router.get('/company/me', auth, async (req, res) => {
  try {
    const actor = await User.findById(req.user.id);
    if (!actor || !['company_focal', 'industrial_supervisor'].includes(actor.role)) {
      return res.status(403).json({ msg: 'Not allowed' });
    }
    if (!actor.companyId) {
      return res.json([]);
    }

    const company = await Company.findById(actor.companyId).select('name').lean();
    const companyId = String(actor.companyId);
    const isIndustrialSupervisor = actor.role === 'industrial_supervisor';

    // Source of truth for accepted students in this company.
    // If an industrial supervisor is logged in, only include students assigned to that supervisor.
    const appQuery = {
      company: actor.companyId,
      status: { $in: ['shortlisted', 'allocated'] },
      ...(isIndustrialSupervisor ? { industrialSupervisor: actor._id } : {}),
    };

    const appsByCompany = await Application.find(appQuery)
      .select('studentUser status industrialSupervisor')
      .populate('industrialSupervisor', 'name email')
      .lean();

    const statusByUserId = new Map();
    const industrialByUserId = new Map();
    for (const app of appsByCompany) {
      const uid = String(app.studentUser || '');
      if (!uid) continue;

      if (app.industrialSupervisor) {
        const isPopulated = typeof app.industrialSupervisor === 'object' && app.industrialSupervisor !== null;
        const sid = isPopulated
          ? String(app.industrialSupervisor._id || '')
          : String(app.industrialSupervisor || '');
        if (sid && !industrialByUserId.has(uid)) {
          industrialByUserId.set(uid, {
            id: sid,
            name: isPopulated ? app.industrialSupervisor.name : undefined,
          });
        }
      }

      const prev = statusByUserId.get(uid);
      if (prev === 'allocated') continue;
      statusByUserId.set(uid, app.status === 'allocated' ? 'allocated' : 'shortlisted');
    }

    const appStudentIds = [...statusByUserId.keys()];

    if (isIndustrialSupervisor && appStudentIds.length === 0) {
      return res.json([]);
    }

    const validAppObjectIds = appStudentIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const studentQuery = isIndustrialSupervisor
      ? { user: { $in: validAppObjectIds } }
      : {
          $or: [
            { user: { $in: validAppObjectIds } },
            { allocatedCompany: actor.companyId },
            { shortlistedCompany: actor.companyId },
          ],
        };

    const studentDocs = await Student.find(studentQuery)
      .populate('user')
      .populate('allocatedCompany', 'name')
      .populate('shortlistedCompany', 'name')
      .populate('academicSupervisor', 'name email');

    const rowsByUserId = new Map();
    for (const studentDoc of studentDocs) {
      const row = normalizeCompanyStudent(studentDoc);
      rowsByUserId.set(String(row.id), row);
    }

    const missingUserIds = appStudentIds.filter((id) => !rowsByUserId.has(id));
    if (missingUserIds.length > 0) {
      const users = await User.find({
        _id: {
          $in: missingUserIds
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id)),
        },
        role: 'student',
      }).select('name email department studentId cgpa');

      for (const u of users) {
        const uid = String(u._id);
        const appStatus = statusByUserId.get(uid) || 'shortlisted';
        rowsByUserId.set(uid, {
          id: uid,
          name: u.name || '',
          email: u.email || '',
          role: 'student',
          department: u.department,
          studentId: u.studentId || '',
          cgpa: typeof u.cgpa === 'number' ? u.cgpa : 0,
          specialization: '',
          applicationCount: 0,
          maxApplications: 2,
          currentStatus: appStatus,
          allocatedCompany:
            appStatus === 'allocated'
              ? { id: companyId, name: company?.name || '' }
              : undefined,
          allocatedCompanyId: appStatus === 'allocated' ? companyId : undefined,
          shortlistedCompany:
            appStatus === 'shortlisted'
              ? { id: companyId, name: company?.name || '' }
              : undefined,
          shortlistedCompanyId: appStatus === 'shortlisted' ? companyId : undefined,
        });
      }
    }

    // Keep statuses aligned with applications in this company.
    for (const uid of appStudentIds) {
      const row = rowsByUserId.get(uid);
      if (!row) continue;

      const appStatus = statusByUserId.get(uid);
      if (appStatus === 'allocated') {
        row.currentStatus = 'allocated';
        if (!row.allocatedCompanyId) {
          row.allocatedCompanyId = companyId;
          row.allocatedCompany = { id: companyId, name: company?.name || '' };
        }
      } else if (appStatus === 'shortlisted') {
        if (!row.shortlistedCompanyId) {
          row.shortlistedCompanyId = companyId;
          row.shortlistedCompany = { id: companyId, name: company?.name || '' };
        }
        if (!['shortlisted', 'allocated', 'completed'].includes(row.currentStatus)) {
          row.currentStatus = 'shortlisted';
        }
      }

      const industrial = industrialByUserId.get(uid);
      if (industrial) {
        row.industrialSupervisorId = industrial.id;
        row.industrialSupervisorName = industrial.name;
      }
    }

    const result = [...rowsByUserId.values()].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''))
    );

    // Progress is based on 4 monthly evaluations (total 50 weightage).
    const resultUserIds = result
      .map((r) => String(r.id || ''))
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (resultUserIds.length > 0) {
      let evaluatorIds = [];
      if (isIndustrialSupervisor) {
        evaluatorIds = [actor._id];
      } else {
        const industrialSupervisors = await User.find({
          role: 'industrial_supervisor',
          companyId: actor.companyId,
        }).select('_id').lean();
        evaluatorIds = industrialSupervisors.map((u) => u._id);
      }

      if (evaluatorIds.length > 0) {
        const monthlyProgress = await Evaluation.aggregate([
          {
            $match: {
              studentUser: { $in: resultUserIds },
              evaluatorUser: { $in: evaluatorIds },
              type: 'monthly',
            },
          },
          {
            $sort: { date: -1, updatedAt: -1, createdAt: -1 },
          },
          {
            $addFields: {
              monthKey: {
                $ifNull: [
                  '$month',
                  {
                    $dateToString: {
                      format: '%Y-%m',
                      date: { $ifNull: ['$date', '$createdAt'] },
                    },
                  },
                ],
              },
            },
          },
          {
            $group: {
              _id: {
                studentUser: '$studentUser',
                monthKey: '$monthKey',
              },
              score: { $first: '$score' },
              maxScore: { $first: '$maxScore' },
            },
          },
          {
            $group: {
              _id: '$_id.studentUser',
              monthsCompleted: { $sum: 1 },
              obtainedWeightage: {
                $sum: {
                  $multiply: [
                    {
                      $cond: [
                        { $gt: ['$maxScore', 0] },
                        { $divide: ['$score', '$maxScore'] },
                        0,
                      ],
                    },
                    MONTH_WEIGHTAGE,
                  ],
                },
              },
            },
          },
        ]);

        const progressByUserId = new Map(monthlyProgress.map((c) => {
          const monthsCompleted = Math.max(0, Math.min(TOTAL_MONTHS, Number(c.monthsCompleted || 0)));
          const obtainedWeightage = Math.max(0, Math.min(TOTAL_WEIGHTAGE, Number(c.obtainedWeightage || 0)));
          const progress = Math.max(0, Math.min(100, (obtainedWeightage / TOTAL_WEIGHTAGE) * 100));
          return [String(c._id), { progress, monthsCompleted, obtainedWeightage }];
        }));

        for (const row of result) {
          const stats = progressByUserId.get(String(row.id));
          row.progress = stats ? Number(stats.progress.toFixed(2)) : 0;
          row.monthsCompleted = stats ? stats.monthsCompleted : 0;
          row.totalMonths = TOTAL_MONTHS;
          row.progressOutOf50 = stats ? Number(stats.obtainedWeightage.toFixed(2)) : 0;
          row.totalWeightage = TOTAL_WEIGHTAGE;
        }
      }
    }

    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/students/company/assign-industrial
// @desc    Assign selected students to an industrial supervisor (company focal only)
router.put('/company/assign-industrial', auth, async (req, res) => {
  try {
    const actor = await User.findById(req.user.id);
    if (!actor || actor.role !== 'company_focal') {
      return res.status(403).json({ msg: 'Only company focal can assign students' });
    }
    if (!actor.companyId) {
      return res.status(400).json({ msg: 'Your account is not linked to a company' });
    }

    const { supervisorId, studentUserIds } = req.body || {};
    if (!supervisorId || !mongoose.Types.ObjectId.isValid(supervisorId)) {
      return res.status(400).json({ msg: 'Valid supervisorId is required' });
    }
    const incomingIds = Array.isArray(studentUserIds) ? studentUserIds : [];
    const uniqueStudentIds = [...new Set(incomingIds.map(String).filter(Boolean))]
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (uniqueStudentIds.length === 0) {
      return res.status(400).json({ msg: 'At least one valid student id is required' });
    }

    const supervisor = await User.findOne({
      _id: supervisorId,
      role: 'industrial_supervisor',
      companyId: actor.companyId,
    }).select('name');
    if (!supervisor) {
      return res.status(400).json({ msg: 'Industrial supervisor not found in your company' });
    }

    const selectedObjectIds = uniqueStudentIds.map((id) => new mongoose.Types.ObjectId(id));

    const activeAppsForSelected = await Application.find({
      company: actor.companyId,
      studentUser: { $in: selectedObjectIds },
      status: { $in: ['shortlisted', 'allocated'] },
    }).select('studentUser industrialSupervisor');

    const selectedStudentSet = new Set(activeAppsForSelected.map((a) => String(a.studentUser)));
    if (selectedStudentSet.size === 0) {
      return res.status(400).json({ msg: 'Selected students are not accepted in your company yet' });
    }

    const alreadyAssignedStudents = new Set(
      activeAppsForSelected
        .filter((a) => Boolean(a.industrialSupervisor))
        .map((a) => String(a.studentUser))
    );
    if (alreadyAssignedStudents.size > 0) {
      return res.status(400).json({
        msg: `Already assigned students selected (${alreadyAssignedStudents.size}). Unassign them first.`,
      });
    }

    const assignedToSupervisorIds = await Application.distinct('studentUser', {
      company: actor.companyId,
      status: { $in: ['shortlisted', 'allocated'] },
      industrialSupervisor: supervisor._id,
    });
    const assignedToSupervisorSet = new Set(assignedToSupervisorIds.map((id) => String(id)));

    const additionalNeeded = selectedStudentSet.size;

    if (assignedToSupervisorSet.size + additionalNeeded > 5) {
      return res.status(400).json({
        msg: `Supervisor capacity exceeded. Current: ${assignedToSupervisorSet.size}/5`,
      });
    }

    await Application.updateMany(
      {
        company: actor.companyId,
        studentUser: { $in: [...selectedStudentSet].map((id) => new mongoose.Types.ObjectId(id)) },
        status: { $in: ['shortlisted', 'allocated'] },
      },
      { $set: { industrialSupervisor: supervisor._id } }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`company:${actor.companyId}`).emit('company:update', { type: 'assignments' });
      io.to(String(supervisor._id)).emit('company:update', { type: 'assignments' });
    }

    return res.json({
      msg: 'Students assigned successfully',
      supervisorId: String(supervisor._id),
      assignedStudents: [...selectedStudentSet],
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server error');
  }
});

// @route   PUT /api/students/company/reassign-industrial
// @desc    Reassign selected students from one industrial supervisor to another (company focal only)
router.put('/company/reassign-industrial', auth, async (req, res) => {
  try {
    const actor = await User.findById(req.user.id);
    if (!actor || actor.role !== 'company_focal') {
      return res.status(403).json({ msg: 'Only company focal can reassign students' });
    }
    if (!actor.companyId) {
      return res.status(400).json({ msg: 'Your account is not linked to a company' });
    }

    const { oldSupervisorId, newSupervisorId, studentUserIds } = req.body || {};
    if (!oldSupervisorId || !mongoose.Types.ObjectId.isValid(oldSupervisorId)) {
      return res.status(400).json({ msg: 'Valid oldSupervisorId is required' });
    }
    if (!newSupervisorId || !mongoose.Types.ObjectId.isValid(newSupervisorId)) {
      return res.status(400).json({ msg: 'Valid newSupervisorId is required' });
    }
    if (String(oldSupervisorId) === String(newSupervisorId)) {
      return res.status(400).json({ msg: 'Old and new supervisor must be different' });
    }

    const incomingIds = Array.isArray(studentUserIds) ? studentUserIds : [];
    const uniqueStudentIds = [...new Set(incomingIds.map(String).filter(Boolean))]
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (uniqueStudentIds.length === 0) {
      return res.status(400).json({ msg: 'At least one valid student id is required' });
    }

    // Verify both supervisors exist and belong to this company
    const oldSupervisor = await User.findOne({
      _id: oldSupervisorId,
      role: 'industrial_supervisor',
      companyId: actor.companyId,
    }).select('name');
    if (!oldSupervisor) {
      return res.status(400).json({ msg: 'Old industrial supervisor not found in your company' });
    }

    const newSupervisor = await User.findOne({
      _id: newSupervisorId,
      role: 'industrial_supervisor',
      companyId: actor.companyId,
    }).select('name');
    if (!newSupervisor) {
      return res.status(400).json({ msg: 'New industrial supervisor not found in your company' });
    }

    const selectedObjectIds = uniqueStudentIds.map((id) => new mongoose.Types.ObjectId(id));

    // Verify all selected students are currently assigned to the old supervisor
    const activeAppsForSelected = await Application.find({
      company: actor.companyId,
      studentUser: { $in: selectedObjectIds },
      status: { $in: ['shortlisted', 'allocated'] },
    }).select('studentUser industrialSupervisor');

    const selectedStudentSet = new Set(activeAppsForSelected.map((a) => String(a.studentUser)));
    if (selectedStudentSet.size === 0) {
      return res.status(400).json({ msg: 'Selected students are not accepted in your company yet' });
    }

    // Check that all selected students are assigned to the old supervisor
    const notAssignedToOld = activeAppsForSelected.filter(
      (a) => !a.industrialSupervisor || String(a.industrialSupervisor) !== String(oldSupervisorId)
    );
    if (notAssignedToOld.length > 0) {
      return res.status(400).json({
        msg: `${notAssignedToOld.length} student(s) not assigned to the old supervisor.`,
      });
    }

    // Check new supervisor capacity (excluding the students being reassigned)
    const assignedToNewSupervisorIds = await Application.distinct('studentUser', {
      company: actor.companyId,
      status: { $in: ['shortlisted', 'allocated'] },
      industrialSupervisor: newSupervisor._id,
      studentUser: { $nin: selectedObjectIds },
    });
    const assignedToNewSupervisorSet = new Set(assignedToNewSupervisorIds.map((id) => String(id)));

    const additionalNeeded = selectedStudentSet.size;
    if (assignedToNewSupervisorSet.size + additionalNeeded > 5) {
      return res.status(400).json({
        msg: `New supervisor capacity exceeded. Current: ${assignedToNewSupervisorSet.size}/5, Capacity: 5/5`,
      });
    }

    // Perform the reassignment: set new supervisor
    await Application.updateMany(
      {
        company: actor.companyId,
        studentUser: { $in: [...selectedStudentSet].map((id) => new mongoose.Types.ObjectId(id)) },
        status: { $in: ['shortlisted', 'allocated'] },
      },
      { $set: { industrialSupervisor: newSupervisor._id } }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`company:${actor.companyId}`).emit('company:update', { type: 'assignments' });
      io.to(String(oldSupervisor._id)).emit('company:update', { type: 'assignments' });
      io.to(String(newSupervisor._id)).emit('company:update', { type: 'assignments' });
    }

    return res.json({
      msg: 'Students reassigned successfully',
      oldSupervisorId: String(oldSupervisor._id),
      newSupervisorId: String(newSupervisor._id),
      reassignedStudents: [...selectedStudentSet],
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server error');
  }
});

// @route   GET /api/students
// @desc    Get all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find().populate('user');
    res.json(students);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/students/:id
// @desc    Get student by ID
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('user');
    if (!student) {
      return res.status(404).json({ msg: 'Student not found' });
    }
    res.json(student);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/students
// @desc    Create a student
router.post('/', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.json(student);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/students/:id
// @desc    Update student
router.put('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('user');
    if (!student) {
      return res.status(404).json({ msg: 'Student not found' });
    }
    res.json(student);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/students/:id
// @desc    Delete student
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ msg: 'Student not found' });
    }
    res.json({ msg: 'Student deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;