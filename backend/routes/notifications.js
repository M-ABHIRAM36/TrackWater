const express = require('express');
const Subscription = require('../models/Subscription');
const { authenticateToken, getUserIdFromRequest } = require('../utils/jwt');
const { 
  sendNotification, 
  createTestNotification, 
  validateSubscription, 
  getVapidPublicKey,
  isWebPushConfigured,
  handleFailedNotification
} = require('../utils/webPush');

const router = express.Router();

/**
 * @route   GET /api/notifications/vapid-public-key
 * @desc    Get VAPID public key for frontend
 * @access  Public
 */
router.get('/vapid-public-key', (req, res) => {
  try {
    if (!isWebPushConfigured()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Push notifications are not configured on this server'
      });
    }

    const publicKey = getVapidPublicKey();
    
    res.status(200).json({
      publicKey: publicKey
    });

  } catch (error) {
    console.error('VAPID key error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get VAPID public key'
    });
  }
});

/**
 * @route   POST /api/notifications/subscribe
 * @desc    Subscribe user to push notifications
 * @access  Private
 */
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { endpoint, keys, userAgent } = req.body;

    // Validate subscription data
    const subscriptionData = { endpoint, keys };
    if (!validateSubscription(subscriptionData)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid subscription data'
      });
    }

    // Check if subscription already exists for this user
    const existingUserSubscription = await Subscription.findOne({
      userId: userId,
      endpoint: endpoint
    });
    
    if (existingUserSubscription) {
      // Update existing subscription for same user
      existingUserSubscription.keys = keys;
      existingUserSubscription.userAgent = userAgent;
      existingUserSubscription.isActive = true;
      existingUserSubscription.failedAttempts = 0;
      await existingUserSubscription.save();

      return res.status(200).json({
        message: 'Subscription updated successfully'
      });
    }
    
    // Check if endpoint exists for different user (less common case)
    const existingEndpoint = await Subscription.findByEndpoint(endpoint);
    if (existingEndpoint && existingEndpoint.userId.toString() !== userId) {
      // Remove old subscription and create new one (browser switched users)
      console.log(`🔄 Replacing subscription for endpoint: ${endpoint}`);
      await Subscription.findByIdAndDelete(existingEndpoint._id);
    }

    // Create new subscription
    const newSubscription = new Subscription({
      userId: userId,
      endpoint: endpoint,
      keys: keys,
      userAgent: userAgent || req.headers['user-agent']
    });

    await newSubscription.save();

    res.status(201).json({
      message: 'Successfully subscribed to push notifications'
    });

    console.log(`🔔 New push subscription created for user: ${userId}`);

  } catch (error) {
    console.error('Subscription error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create subscription'
    });
  }
});

/**
 * @route   POST /api/notifications/unsubscribe
 * @desc    Unsubscribe user from push notifications
 * @access  Private
 */
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Endpoint is required'
      });
    }

    // Find and remove subscription
    const result = await Subscription.findOneAndDelete({
      endpoint: endpoint,
      userId: userId
    });

    if (!result) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Subscription not found'
      });
    }

    res.status(200).json({
      message: 'Successfully unsubscribed from push notifications'
    });

    console.log(`🔕 Push subscription removed for user: ${userId}`);

  } catch (error) {
    console.error('Unsubscribe error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to unsubscribe'
    });
  }
});

/**
 * @route   GET /api/notifications/subscriptions
 * @desc    Get user's active subscriptions
 * @access  Private
 */
router.get('/subscriptions', authenticateToken, async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    const subscriptions = await Subscription.getActiveSubscriptionsForUser(userId);

    res.status(200).json({
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        endpoint: sub.endpoint,
        userAgent: sub.userAgent,
        createdAt: sub.createdAt,
        lastNotificationSent: sub.lastNotificationSent
      }))
    });

  } catch (error) {
    console.error('Get subscriptions error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch subscriptions'
    });
  }
});

/**
 * @route   POST /api/notifications/test
 * @desc    Send a test notification to user
 * @access  Private
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!isWebPushConfigured()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Push notifications are not configured'
      });
    }

    // Get user's active subscriptions
    const subscriptions = await Subscription.getActiveSubscriptionsForUser(userId);

    if (subscriptions.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No active subscriptions found. Please enable notifications first.'
      });
    }

    // Create test notification
    const notification = createTestNotification();
    
    // Send to all user's subscriptions
    const results = [];
    for (const subscription of subscriptions) {
      try {
        const result = await sendNotification(
          subscription.getWebPushFormat(),
          notification
        );

        if (result.success) {
          await subscription.markAsSuccessful();
          results.push({ success: true, endpoint: subscription.endpoint });
        } else {
          const failureInfo = handleFailedNotification(subscription, result.error);
          await subscription.markAsFailed(result.error);
          results.push({ 
            success: false, 
            endpoint: subscription.endpoint, 
            error: result.error 
          });
        }
      } catch (error) {
        await subscription.markAsFailed(error.message);
        results.push({ 
          success: false, 
          endpoint: subscription.endpoint, 
          error: error.message 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.status(200).json({
      message: `Test notification sent to ${successCount} of ${results.length} subscriptions`,
      results: results
    });

    console.log(`🧪 Test notification sent to user ${userId}: ${successCount}/${results.length} successful`);

  } catch (error) {
    console.error('Test notification error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send test notification'
    });
  }
});

/**
 * @route   DELETE /api/notifications/subscriptions/:id
 * @desc    Delete a specific subscription
 * @access  Private
 */
router.delete('/subscriptions/:id', authenticateToken, async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const subscriptionId = req.params.id;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId: userId
    });

    if (!subscription) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Subscription not found'
      });
    }

    await Subscription.findByIdAndDelete(subscriptionId);

    res.status(200).json({
      message: 'Subscription deleted successfully'
    });

  } catch (error) {
    console.error('Delete subscription error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete subscription'
    });
  }
});

/**
 * @route   POST /api/notifications/toggle
 * @desc    Toggle notification settings for user
 * @access  Private
 */
router.post('/toggle', authenticateToken, async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { enabled } = req.body;

    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    user.notificationsEnabled = enabled;
    await user.save();

    res.status(200).json({
      message: `Notifications ${enabled ? 'enabled' : 'disabled'}`,
      notificationsEnabled: user.notificationsEnabled
    });

    console.log(`🔔 Notifications ${enabled ? 'enabled' : 'disabled'} for user: ${userId}`);

  } catch (error) {
    console.error('Toggle notifications error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to toggle notifications'
    });
  }
});

module.exports = router;
