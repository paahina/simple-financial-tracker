const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    personName: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, default: '' },
    originalAmount: { type: Number, required: true, min: 1 },
    additions: [
      {
        label: { type: String, required: true, trim: true, maxlength: 100 },
        amount: { type: Number, required: true, min: 1 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    dueDate: { type: Date, default: null },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'],
      default: 'PENDING',
    },
  },
  { timestamps: true },
);

debtSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Debt', debtSchema);
