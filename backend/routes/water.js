const express = require('express');
const WaterLog = require('../models/WaterLog');
const User = require('../models/User');
const { authenticateToken, getUserIdFromRequest } = require('../utils/jwt');
const { Types } = require('mongoose');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/water/log
 * @desc    Log water intake
 * @access  Private
 */
router.post('/log', async (req, res) => {
  try {
    const { amountMl, type, notes, timestamp } = req.body;
    const userId = getUserIdFromRequest(req);

    // Validate required fields
    if (!amountMl || amountMl <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Amount must be greater than 0'
      });
    }

    if (amountMl > 2000) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Single intake cannot exceed 2000ml'
      });
    }

    // Create new water log entry
    const waterLog = new WaterLog({
      userId: userId,
      amountMl: amountMl,
      type: type || 'custom',
      notes: notes,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    await waterLog.save();

    res.status(201).json({
      message: 'Water intake logged successfully',
      waterLog: {
        id: waterLog._id,
        amountMl: waterLog.amountMl,
        type: waterLog.type,
        notes: waterLog.notes,
        timestamp: waterLog.timestamp
      }
    });

    console.log(`💧 Water logged: ${amountMl}ml for user ${userId}`);

  } catch (error) {
    console.error('Water logging error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to log water intake'
    });
  }
});

/**
 * @route   POST /api/water/log/quick
 * @desc    Quick log water intake using user's default amount (for notifications)
 * @access  Private
 */
router.post('/log/quick', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { customAmount, notes } = req.body;

    // Get user's default water amount
    const user = await User.findById(userId).select('defaultWaterAmount');
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Use custom amount if provided, otherwise use default
    const amountMl = customAmount || user.defaultWaterAmount;

    // Validate amount
    if (!amountMl || amountMl <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Amount must be greater than 0'
      });
    }

    if (amountMl > 2000) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Single intake cannot exceed 2000ml'
      });
    }

    // Create new water log entry
    const waterLog = new WaterLog({
      userId: userId,
      amountMl: amountMl,
      type: customAmount ? 'custom' : 'notification',
      notes: notes || 'Quick log from notification',
      timestamp: new Date()
    });

    await waterLog.save();

    res.status(201).json({
      message: 'Water intake logged quickly',
      waterLog: {
        id: waterLog._id,
        amountMl: waterLog.amountMl,
        type: waterLog.type,
        notes: waterLog.notes,
        timestamp: waterLog.timestamp
      },
      wasDefault: !customAmount
    });

    console.log(`💧 Quick water logged: ${amountMl}ml for user ${userId} ${customAmount ? '(custom)' : '(default)'}`);

  } catch (error) {
    console.error('Quick water logging error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to log water intake quickly'
    });
  }
});

/**
 * @route   GET /api/water/logs
 * @desc    Get water logs with optional filtering
 * @access  Private
 */
router.get('/logs', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { limit = 50, skip = 0, startDate, endDate } = req.query;

    // Build query
    const query = { userId: userId };
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get logs with pagination
    const logs = await WaterLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('amountMl type notes timestamp');

    // Get total count for pagination
    const total = await WaterLog.countDocuments(query);

    res.status(200).json({
      logs: logs,
      pagination: {
        total: total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > (parseInt(skip) + logs.length)
      }
    });

  } catch (error) {
    console.error('Get logs error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch water logs'
    });
  }
});

/**
 * @route   GET /api/water/analytics/daily
 * @desc    Get daily analytics for specified period
 * @access  Private
 */
router.get('/analytics/daily', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { days = 30 } = req.query;

    const dailySummary = await WaterLog.getDailySummary(userId, parseInt(days));

    // Calculate average daily intake
    const totalAmount = dailySummary.reduce((sum, day) => sum + day.totalAmount, 0);
    const averageDaily = dailySummary.length > 0 ? totalAmount / dailySummary.length : 0;

    res.status(200).json({
      dailySummary: dailySummary,
      summary: {
        totalDays: dailySummary.length,
        totalAmount: totalAmount,
        averageDaily: Math.round(averageDaily),
        period: `${days} days`
      }
    });

  } catch (error) {
    console.error('Daily analytics error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch daily analytics'
    });
  }
});

/**
 * @route   GET /api/water/analytics/weekly
 * @desc    Get weekly analytics
 * @access  Private
 */
router.get('/analytics/weekly', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { weeks = 4 } = req.query;

    // Calculate start date (beginning of weeks ago)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));
    startDate.setHours(0, 0, 0, 0);

    const result = await WaterLog.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            week: { $week: '$timestamp' }
          },
          totalAmount: { $sum: '$amountMl' },
          entryCount: { $sum: 1 },
          startOfWeek: { $min: '$timestamp' }
        }
      },
      {
        $project: {
          _id: 0,
          week: '$_id.week',
          year: '$_id.year',
          totalAmount: 1,
          entryCount: 1,
          startOfWeek: 1
        }
      },
      {
        $sort: { year: -1, week: -1 }
      }
    ]);

    const totalAmount = result.reduce((sum, week) => sum + week.totalAmount, 0);
    const averageWeekly = result.length > 0 ? totalAmount / result.length : 0;

    res.status(200).json({
      weeklySummary: result,
      summary: {
        totalWeeks: result.length,
        totalAmount: totalAmount,
        averageWeekly: Math.round(averageWeekly),
        period: `${weeks} weeks`
      }
    });

  } catch (error) {
    console.error('Weekly analytics error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch weekly analytics'
    });
  }
});

/**
 * @route   GET /api/water/analytics/monthly
 * @desc    Get monthly analytics
 * @access  Private
 */
router.get('/analytics/monthly', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { months = 6 } = req.query;

    // Calculate start date (beginning of months ago)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const result = await WaterLog.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' }
          },
          totalAmount: { $sum: '$amountMl' },
          entryCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          month: '$_id.month',
          year: '$_id.year',
          totalAmount: 1,
          entryCount: 1,
          monthName: {
            $arrayElemAt: [
              ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
              '$_id.month'
            ]
          }
        }
      },
      {
        $sort: { year: -1, month: -1 }
      }
    ]);

    const totalAmount = result.reduce((sum, month) => sum + month.totalAmount, 0);
    const averageMonthly = result.length > 0 ? totalAmount / result.length : 0;

    res.status(200).json({
      monthlySummary: result,
      summary: {
        totalMonths: result.length,
        totalAmount: totalAmount,
        averageMonthly: Math.round(averageMonthly),
        period: `${months} months`
      }
    });

  } catch (error) {
    console.error('Monthly analytics error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch monthly analytics'
    });
  }
});

/**
 * @route   GET /api/water/analytics/hourly
 * @desc    Get hourly breakdown for time-of-day analysis
 * @access  Private
 */
router.get('/analytics/hourly', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { startDate, endDate } = req.query;

    let start, end;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to last 30 days
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - 30);
    }

    const hourlyData = await WaterLog.getHourlyBreakdown(userId, start, end);

    // Create 24-hour array with data
    const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => {
      const data = hourlyData.find(item => item.hour === hour);
      return {
        hour: hour,
        hourLabel: `${hour.toString().padStart(2, '0')}:00`,
        totalAmount: data ? data.totalAmount : 0,
        entryCount: data ? data.entryCount : 0
      };
    });

    // Calculate peak hours
    const peakHour = hourlyBreakdown.reduce((max, current) => 
      current.totalAmount > max.totalAmount ? current : max
    );

    res.status(200).json({
      hourlyBreakdown: hourlyBreakdown,
      summary: {
        peakHour: peakHour.hour,
        peakAmount: peakHour.totalAmount,
        period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`
      }
    });

  } catch (error) {
    console.error('Hourly analytics error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch hourly analytics'
    });
  }
});

/**
 * @route   GET /api/water/analytics/today
 * @desc    Get today's water intake summary
 * @access  Private
 */
router.get('/analytics/today', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const todayData = await WaterLog.getTotalIntakeByDateRange(userId, startOfDay, endOfDay);

    // Get recent entries for today
    const recentEntries = await WaterLog.find({
      userId: userId,
      timestamp: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    })
    .sort({ timestamp: -1 })
    .limit(10)
    .select('amountMl type timestamp');

    res.status(200).json({
      today: {
        date: startOfDay.toISOString().split('T')[0],
        totalAmount: todayData.totalAmount,
        entryCount: todayData.entryCount,
        recentEntries: recentEntries
      }
    });

  } catch (error) {
    console.error('Today analytics error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch today\'s analytics'
    });
  }
});

/**
 * @route   DELETE /api/water/logs/:id
 * @desc    Delete a water log entry
 * @access  Private
 */
router.delete('/logs/:id', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const logId = req.params.id;

    const waterLog = await WaterLog.findOne({ _id: logId, userId: userId });
    
    if (!waterLog) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Water log entry not found'
      });
    }

    await WaterLog.findByIdAndDelete(logId);

    res.status(200).json({
      message: 'Water log entry deleted successfully'
    });

  } catch (error) {
    console.error('Delete log error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete water log entry'
    });
  }
});

module.exports = router;
