const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema for storing user account information
 * Includes email, password (hashed), and account metadata
 */
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  name: {
    type: String,
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  dailyGoal: {
    type: Number,
    default: 2000, // Default daily goal in ml (2 liters)
    min: [500, 'Daily goal must be at least 500ml'],
    max: [5000, 'Daily goal cannot exceed 5000ml']
  },
  timezone: {
    type: String,
    default: 'UTC'
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: {
    transform: function(doc, ret) {
      // Remove password from JSON output
      delete ret.password;
      return ret;
    }
  }
});

// Index for faster email lookups
userSchema.index({ email: 1 });

/**
 * Pre-save hook to hash password before saving
 */
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Hash password with cost of 12
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Method to compare provided password with hashed password
 * @param {string} candidatePassword - Password to compare
 * @returns {boolean} - Whether passwords match
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Method to get user's safe data (without sensitive info)
 * @returns {object} - Safe user data
 */
userSchema.methods.getSafeData = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

/**
 * Static method to find user by email
 * @param {string} email - User's email
 * @returns {object|null} - User document or null
 */
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

module.exports = mongoose.model('User', userSchema);
