const express = require('express');
const Setting = require('../models/Setting');
const auth = require('../middleware/auth');

const router = express.Router();

const KEY_APPLICATION_DEADLINE = 'globalApplicationDeadline';

function normalizeDateValue(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function requireManagerPlacements(req, res) {
  if (!req.user?.id) {
    res.status(401).json({ msg: 'Unauthorized' });
    return false;
  }
  if (req.user.role !== 'manager_placements') {
    res.status(403).json({ msg: 'Access denied' });
    return false;
  }
  return true;
}

// @route   GET /api/settings/application-deadline
// @desc    Get global application deadline (all authenticated users)
router.get('/application-deadline', auth, async (req, res) => {
  try {
    const doc = await Setting.findOne({ key: KEY_APPLICATION_DEADLINE }).lean();
    const value = normalizeDateValue(doc?.value);
    res.json({ key: KEY_APPLICATION_DEADLINE, value });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/settings/application-deadline
// @desc    Set global application deadline (manager placements only)
router.put('/application-deadline', auth, async (req, res) => {
  try {
    const ok = await requireManagerPlacements(req, res);
    if (!ok) return;

    const { value } = req.body || {};
    const normalized = normalizeDateValue(value);
    if (!normalized) {
      return res.status(400).json({ msg: 'Invalid date. Use YYYY-MM-DD' });
    }

    const updated = await Setting.findOneAndUpdate(
      { key: KEY_APPLICATION_DEADLINE },
      { $set: { value: normalized } },
      { upsert: true, new: true }
    ).lean();

    res.json({ key: KEY_APPLICATION_DEADLINE, value: normalizeDateValue(updated?.value) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

