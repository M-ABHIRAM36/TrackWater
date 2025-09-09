const mongoose = require('mongoose');

/**
 * Subscription Schema for storing web push notification subscriptions
 * Contains subscription endpoint and keys for sending notifications
 */
const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  endpoint: {
    type: String,
    required: [true, 'Subscription endpoint is required'],
    unique: true
  },
  keys: {
    p256dh: {
      type: String,
      required: [true, 'p256dh key is required']
    },
    auth: {
      type: String,
      required: [true, 'Auth key is required']
    }
  },
  // Browser/device information for better management
  userAgent: {
    type: String,
    trim: true
  },
  // Track if this subscription is active
  isActive: {
    type: Boolean,
    default: true
  },
  // Last successful notification sent
  lastNotificationSent: {
    type: Date,
    default: null
  },
  // Track failed notification attempts
  failedAttempts: {
    type: Number,
    default: 0,
    max: 10
  },
  // Last error message if notification failed
  lastError: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for user queries
subscriptionSchema.index({ userId: 1, isActive: 1 });

/**
 * Static method to get all active subscriptions for a user
 * @param {ObjectId} userId - User's ID
 * @returns {Array} - Array of active subscriptions
 */
subscriptionSchema.statics.getActiveSubscriptionsForUser = function(userId) {
  return this.find({ 
    userId: userId, 
    isActive: true,
    failedAttempts: { $lt: 5 } // Don't include subscriptions that have failed too many times
  }).select('endpoint keys userAgent');
};

/**
 * Static method to get all active subscriptions (for broadcast notifications)
 * @returns {Array} - Array of all active subscriptions
 */
subscriptionSchema.statics.getAllActiveSubscriptions = function() {
  return this.find({ 
    isActive: true,
    failedAttempts: { $lt: 5 }
  }).populate('userId', 'notificationsEnabled notificationFrequency notificationStartHour notificationEndHour')
    .select('endpoint keys userId');
};

/**
 * Method to mark subscription as failed
 * @param {string} errorMessage - Error message to store
 */
subscriptionSchema.methods.markAsFailed = async function(errorMessage) {
  // Ensure failedAttempts is a number, default to 0 if NaN
  this.failedAttempts = isNaN(this.failedAttempts) ? 0 : this.failedAttempts;
  this.failedAttempts += 1;
  this.lastError = errorMessage;
  
  // Deactivate if too many failures
  if (this.failedAttempts >= 5) {
    this.isActive = false;
  }
  
  await this.save();
};

/**
 * Method to mark successful notification
 */
subscriptionSchema.methods.markAsSuccessful = async function() {
  this.lastNotificationSent = new Date();
  this.failedAttempts = 0;
  this.lastError = null;
  this.isActive = true;
  
  await this.save();
};

/**
 * Static method to cleanup old/inactive subscriptions
 * Removes subscriptions that have been inactive for more than 30 days
 */
subscriptionSchema.statics.cleanupInactiveSubscriptions = async function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  try {
    const result = await this.deleteMany({
      $or: [
        { isActive: false, updatedAt: { $lt: thirtyDaysAgo } },
        { failedAttempts: { $gte: 10 } }
      ]
    });
    
    console.log(`🧹 Cleaned up ${result.deletedCount} inactive subscriptions`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning up subscriptions:', error);
    throw error;
  }
};

/**
 * Static method to find subscription by endpoint
 * @param {string} endpoint - Subscription endpoint
 * @returns {object|null} - Subscription document or null
 */
subscriptionSchema.statics.findByEndpoint = function(endpoint) {
  return this.findOne({ endpoint: endpoint });
};

/**
 * Method to get subscription data for web-push library
 * @returns {object} - Subscription data formatted for web-push
 */
subscriptionSchema.methods.getWebPushFormat = function() {
  return {
    endpoint: this.endpoint,
    keys: {
      p256dh: this.keys.p256dh,
      auth: this.keys.auth
    }
  };
};

/**
 * Pre-save hook to validate subscription format
 */
subscriptionSchema.pre('save', function(next) {
  // Validate endpoint URL format
  try {
    new URL(this.endpoint);
  } catch (error) {
    return next(new Error('Invalid subscription endpoint URL'));
  }
  
  // Validate required keys
  if (!this.keys.p256dh || !this.keys.auth) {
    return next(new Error('Missing required subscription keys'));
  }
  
  next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
