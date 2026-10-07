const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    type: { type: String, required: true, enum: ['INCOME', 'EXPENSE'] },
    amount: { type: Number, required: true, min: 1 },
    label: { type: String, required: true, trim: true, maxlength: 100 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    description: { type: String, trim: true, default: '' },
    transactionDate: { type: Date, required: true },
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, transactionDate: -1 });
transactionSchema.index({ accountId: 1, transactionDate: -1 });
transactionSchema.index({ categoryId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
