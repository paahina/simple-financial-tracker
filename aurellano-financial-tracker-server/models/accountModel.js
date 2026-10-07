const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, required: true, enum: ['CASH', 'E_WALLET', 'BANK'] },
    initialBalance: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, required: true, default: 'PHP', uppercase: true, trim: true },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

accountSchema.index({ userId: 1 });

module.exports = mongoose.model('Account', accountSchema);
