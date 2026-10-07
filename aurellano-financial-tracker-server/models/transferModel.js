const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    senderName: { type: String, trim: true, default: '' },
    toAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    recipientName: { type: String, trim: true, default: '' },
    amount: { type: Number, required: true, min: 1 },
    description: { type: String, trim: true, default: '' },
    transactionDate: { type: Date, required: true },
  },
  { timestamps: true },
);

transferSchema.index({ userId: 1, transactionDate: -1 });

module.exports = mongoose.model('Transfer', transferSchema);
