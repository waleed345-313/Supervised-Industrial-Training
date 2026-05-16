const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  studentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentName: { type: String, required: true }, // cached
  evaluatorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  evaluatorName: { type: String, required: true }, // cached
  month: { type: String },
  scores: { type: mongoose.Schema.Types.Mixed, default: {} },
  type: {
    type: String,
    enum: ['monthly', 'final'],
    required: true
  },
  score: { type: Number, required: true },
  maxScore: { type: Number, default: 100 },
  remarks: { type: String, default: '' },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Evaluation', evaluationSchema);