const mongoose = require('mongoose');

const toBuySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0, default: 0 },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

toBuySchema.index({ userId: 1, createdAt: -1 });

toBuySchema.virtual('estimatedAmount').get(function estimatedAmount() {
  return Number(this.quantity || 0) * Number(this.unitPrice || 0);
});

toBuySchema.set('toJSON', { virtuals: true });
toBuySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ToBuy', toBuySchema);
