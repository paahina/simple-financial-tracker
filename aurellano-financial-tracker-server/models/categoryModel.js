const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, required: true, enum: ['INCOME', 'EXPENSE'] },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

categorySchema.index({ userId: 1, type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
