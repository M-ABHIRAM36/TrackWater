const mongoose = require('mongoose');

/**
 * WaterLog Schema for storing water intake records
 * Tracks amount consumed, timestamp, and user reference
 */
const waterLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true // Index for faster user-based queries
  },
  amountMl: {
    type: Number,
    required: [true, 'Water amount is required'],
    min: [1, 'Water amount must be at least 1ml'],
    max: [2000, 'Water amount cannot exceed 2000ml per entry']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true // Index for time-based queries
  },
  // Optional: Track what type of intake this was
  type: {
    type: String,
    enum: ['half-glass', 'full-glass', 'half-liter', 'liter', 'custom', 'notification'],
    default: 'custom'
  },
  // Optional: Add notes about the intake
  notes: {
    type: String,
    maxlength: [200, 'Notes cannot exceed 200 characters'],
    trim: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Compound index for efficient user + time range queries
waterLogSchema.index({ userId: 1, timestamp: -1 });
waterLogSchema.index({ userId: 1, createdAt: -1 });

/**
 * Static method to get total intake for a user within a date range
 * @param {ObjectId} userId - User's ID
 * @param {Date} startDate - Start date for the range
 * @param {Date} endDate - End date for the range
 * @returns {number} - Total water intake in ml
 */
waterLogSchema.statics.getTotalIntakeByDateRange = async function(userId, startDate, endDate) {
  try {
    const result = await this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amountMl' },
          entryCount: { $sum: 1 }
        }
      }
    ]);

    return result.length > 0 ? result[0] : { totalAmount: 0, entryCount: 0 };
  } catch (error) {
    throw new Error('Failed to calculate total intake: ' + error.message);
  }
};

/**
 * Static method to get daily intake summary for a user
 * @param {ObjectId} userId - User's ID
 * @param {number} days - Number of days to include (default: 30)
 * @returns {Array} - Array of daily summaries
 */
waterLogSchema.statics.getDailySummary = async function(userId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const result = await this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          totalAmount: { $sum: '$amountMl' },
          entryCount: { $sum: 1 },
          date: { $first: '$timestamp' }
        }
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          totalAmount: 1,
          entryCount: 1
        }
      },
      {
        $sort: { date: -1 }
      }
    ]);

    return result;
  } catch (error) {
    throw new Error('Failed to get daily summary: ' + error.message);
  }
};

/**
 * Static method to get hourly breakdown for analytics
 * @param {ObjectId} userId - User's ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} - Array of hourly summaries
 */
waterLogSchema.statics.getHourlyBreakdown = async function(userId, startDate, endDate) {
  try {
    const result = await this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          totalAmount: { $sum: '$amountMl' },
          entryCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          hour: '$_id',
          totalAmount: 1,
          entryCount: 1
        }
      },
      {
        $sort: { hour: 1 }
      }
    ]);

    return result;
  } catch (error) {
    throw new Error('Failed to get hourly breakdown: ' + error.message);
  }
};

/**
 * Method to get user's recent entries
 * @param {ObjectId} userId - User's ID
 * @param {number} limit - Number of entries to return
 * @returns {Array} - Array of recent water log entries
 */
waterLogSchema.statics.getRecentEntries = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('amountMl timestamp type notes');
};

module.exports = mongoose.model('WaterLog', waterLogSchema);
