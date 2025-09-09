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
  notificationStartHour: {
    type: Number,
    default: 5, // 5 AM
    min: [0, 'Start hour must be between 0-23'],
    max: [23, 'Start hour must be between 0-23']
  },
  notificationEndHour: {
    type: Number,
    default: 0, // 12 AM (midnight)
    min: [0, 'End hour must be between 0-23'],
    max: [23, 'End hour must be between 0-23']
  },
  notificationFrequency: {
    type: String,
    enum: ['1min', '30min', '1hr', '2hr'], // Added 1min for testing
    default: '1hr'
  },
  dailyGoal: {
    type: Number,
    default: 2000, // Default daily goal in ml (2 liters)
    min: [500, 'Daily goal must be at least 500ml'],
    max: [5000, 'Daily goal cannot exceed 5000ml']
  },
  defaultWaterAmount: {
    type: Number,
    default: 250, // Default amount to log per notification click (250ml)
    min: [50, 'Default amount must be at least 50ml'],
    max: [1000, 'Default amount cannot exceed 1000ml']
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
 * Method to check if user should receive notifications at a specific hour
 * @param {number} currentHour - Current hour (0-23)
 * @param {number} currentMinute - Current minute (0-59) - optional for testing
 * @param {boolean} isTestMode - Whether running in test mode (1-minute cron)
 * @returns {boolean} - Whether user should receive notification
 */
userSchema.methods.shouldReceiveNotificationAtHour = function(currentHour, currentMinute = 0, isTestMode = false) {
  if (!this.notificationsEnabled) {
    return false;
  }
  
  const startHour = this.notificationStartHour;
  const endHour = this.notificationEndHour;
  const frequency = this.notificationFrequency || '1hr';
  
  // First check if we're within the notification time window
  let withinTimeWindow = false;
  
  // Handle cases where end hour is next day (e.g., 22 to 2 means 10 PM to 2 AM)
  if (endHour === 0) {
    // Special case: end at midnight (0 = 24)
    withinTimeWindow = currentHour >= startHour || currentHour === 0;
  } else if (startHour <= endHour) {
    // Same day range (e.g., 9 AM to 5 PM)
    withinTimeWindow = currentHour >= startHour && currentHour <= endHour;
  } else {
    // Cross-day range (e.g., 10 PM to 2 AM next day)
    withinTimeWindow = currentHour >= startHour || currentHour <= endHour;
  }
  
  if (!withinTimeWindow) {
    return false;
  }
  
  // Apply frequency rules based on test mode and frequency
  if (isTestMode) {
    // In test mode (1-minute cron), only send to users with 1min frequency
    switch (frequency) {
      case '1min':
        return true; // Send every minute
      case '30min':
        return currentMinute % 30 === 0; // Every 30 minutes
      case '2hr':
        return currentMinute % 120 === 0; // Every 2 hours
      case '1hr':
      default:
        return currentMinute % 60 === 0; // Every hour
    }
  } else {
    // In production mode (1-hour cron), apply normal frequency rules
    switch (frequency) {
      case '1min':
        return currentMinute === 0; // Only at top of hour in production
      case '30min':
        return currentMinute === 0 || currentMinute === 30;
      case '2hr':
        return currentHour % 2 === 0 && currentMinute === 0;
      case '1hr':
      default:
        return currentMinute === 0;
    }
  }
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
