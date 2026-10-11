const mongoose = require('mongoose');

const debtPaymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    debtId: { type: mongoose.Schema.Types.ObjectId, ref: 'Debt', required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    subBalanceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    amount: { type: Number, required: true, min: 1 },
    paymentDate: { type: Date, required: true },
    notes: { type: String, trim: true, default: '' },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  },
  { timestamps: true },
);

debtPaymentSchema.index({ debtId: 1, paymentDate: -1 });
debtPaymentSchema.index({ accountId: 1, paymentDate: -1 });

module.exports = mongoose.model('DebtPayment', debtPaymentSchema);
