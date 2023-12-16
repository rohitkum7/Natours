const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

//name, email, photo, password, passwordConfirm

const userTourSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please fill your name'], //Its a  Builin Validator
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    required: [true, 'Email address is required'],
    validate: [validator.isEmail, 'Please fill a valid email address'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please prove a Password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only work on CREATE & SAVE !!
      validator: function (el) {
        return el === this.password; // abc === abc
      },
      message: 'Password are not Same',
    },
  },
  passwordChangedAt: { type: Date },
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userTourSchema.pre('save', async function (next) {
  // Only run the function when password is modified.
  if (!this.isModified('password')) return next();

  // Hash the password with the cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete the Password Confirm feild.
  this.passwordConfirm = undefined;
  next();
});

userTourSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userTourSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

// Instance Methods

userTourSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userTourSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    // console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp; // 100 < 200 (True means change)
  }
  // False means not changed
  return false;
};

userTourSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex'); // Plain Reset Token (send to the user)

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex'); // crypted reset Token saved in the schema
  console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', userTourSchema); // Creating model

module.exports = User;
