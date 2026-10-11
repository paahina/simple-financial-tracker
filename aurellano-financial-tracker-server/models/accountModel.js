const mongoose = require('mongoose');

const subBalanceSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 100 },
    amount: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: (value) => Number.isInteger(value) && value >= 0,
        message: 'Sub-balance cannot be negative',
      },
    },
  },
  { _id: true },
);

const accountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, required: true, enum: ['CASH', 'E_WALLET', 'BANK'] },
    initialBalance: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: 'PHP', uppercase: true, trim: true },
    description: { type: String, trim: true, default: '' },
    remainingBalance: {
      type: Number,
      default: null,
      validate: {
        validator: (value) => value == null || (Number.isInteger(value) && value >= 0),
        message: 'Remaining balance cannot be negative',
      },
    },
    subBalances: { type: [subBalanceSchema], default: [] },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

accountSchema.index({ userId: 1 });

module.exports = mongoose.model('Account', accountSchema);
