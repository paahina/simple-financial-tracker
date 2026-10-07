const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { SALT } = require('../config/config');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      required: true,
      enum: ['USER', 'SYSTEM_ADMIN'],
      default: 'USER',
    },
  },
  { timestamps: true },
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
