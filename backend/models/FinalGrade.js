const mongoose = require('mongoose');

const finalGradeSchema = new mongoose.Schema({
  studentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentName: { type: String, required: true },
  supervisorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supervisorName: { type: String, required: true },
  
  // External Evaluation (from industrial supervisor)
  externalTotal: { type: Number, required: true, min: 0, max: 50 },

  // Each panel member / academic supervisor submits out of 50; stored separately, averaged for internalTotal
  internalEvaluations: [
    {
      evaluatorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      evaluatorName: { type: String, required: true },
      evaluatorRole: {
        type: String,
        enum: ['evaluation_panel', 'academic_supervisor'],
        required: true,
      },
      content: { type: Number, required: true, min: 0, max: 10 },
      visuals: { type: Number, required: true, min: 0, max: 10 },
      presentationSkills: { type: Number, required: true, min: 0, max: 10 },
      organization: { type: Number, required: true, min: 0, max: 10 },
      handlingOfQuestions: { type: Number, required: true, min: 0, max: 30 },
      modernToolUsage: { type: Number, min: 0, max: 5, default: 0 },
      ethics: { type: Number, min: 0, max: 5, default: 0 },
      reportScore: { type: Number, required: true, min: 0, max: 10 },
      presentationAvg: { type: Number, required: true },
      internalTotal: { type: Number, required: true },
      remarks: { type: String },
      submittedAt: { type: Date, default: Date.now },
    },
  ],
  
  // Internal Evaluation - Presentation Rubrics (averages / legacy single-evaluator row)
  content: { type: Number, required: true, min: 0, max: 10 },
  visuals: { type: Number, required: true, min: 0, max: 10 },
  presentationSkills: { type: Number, required: true, min: 0, max: 10 },
  organization: { type: Number, required: true, min: 0, max: 10 },
  handlingOfQuestions: { type: Number, required: true, min: 0, max: 30 },
  modernToolUsage: { type: Number, min: 0, max: 5, default: 0 },
  ethics: { type: Number, min: 0, max: 5, default: 0 },

  // Report Score
  reportScore: { type: Number, required: true, min: 0, max: 10 },
  
  // Calculated totals
  presentationAvg: { type: Number, required: true },
  internalTotal: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  grade: { type: String, required: true },
  
  remarks: { type: String },
  
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('FinalGrade', finalGradeSchema);
