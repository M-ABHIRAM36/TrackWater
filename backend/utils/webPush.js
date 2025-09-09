const webpush = require('web-push');

/**
 * Web Push utility functions for sending push notifications
 * Handles VAPID configuration and notification sending
 */

// VAPID configuration function (lazy-loaded to ensure env vars are available)
let vapidConfigured = false;

const configureVapid = () => {
  if (vapidConfigured) return;
  
  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
  const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:your-email@example.com';

  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      VAPID_EMAIL,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
    console.log('✅ VAPID keys configured for web push');
  } else {
    console.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
    console.warn('Run "npm run generate-vapid" to generate VAPID keys');
  }
};

// Get VAPID keys (lazy-loaded)
const getVapidKeys = () => {
  configureVapid();
  return {
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_EMAIL: process.env.VAPID_EMAIL || 'mailto:your-email@example.com'
  };
};

/**
 * Send push notification to a single subscription
 * @param {object} subscription - Push subscription object
 * @param {object} payload - Notification payload
 * @param {object} options - Additional options
 * @returns {Promise} - Promise resolving to send result
 */
const sendNotification = async (subscription, payload, options = {}) => {
  try {
    configureVapid();
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = getVapidKeys();
    
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured');
    }

    const defaultOptions = {
      TTL: 24 * 60 * 60, // 24 hours
      urgency: 'normal',
      topic: 'hydration-reminder'
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Convert payload to JSON if it's an object
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    const result = await webpush.sendNotification(subscription, payloadString, finalOptions);
    
    return {
      success: true,
      statusCode: result.statusCode,
      headers: result.headers
    };

  } catch (error) {
    console.error('Push notification error:', error);
    
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
      endpoint: subscription.endpoint
    };
  }
};

/**
 * Send notifications to multiple subscriptions
 * @param {Array} subscriptions - Array of subscription objects
 * @param {object} payload - Notification payload
 * @param {object} options - Additional options
 * @returns {Promise<Array>} - Array of results
 */
const sendBulkNotifications = async (subscriptions, payload, options = {}) => {
  try {
    const promises = subscriptions.map(subscription => 
      sendNotification(subscription, payload, options)
    );

    const results = await Promise.allSettled(promises);
    
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failedCount = results.length - successCount;

    console.log(`📤 Bulk notifications sent: ${successCount} successful, ${failedCount} failed`);

    return results.map((result, index) => ({
      subscription: subscriptions[index],
      result: result.status === 'fulfilled' ? result.value : { 
        success: false, 
        error: result.reason?.message || 'Unknown error' 
      }
    }));

  } catch (error) {
    console.error('Bulk notification error:', error);
    throw error;
  }
};

/**
 * Create standard hydration reminder notification payload
 * @param {object} options - Notification options
 * @returns {object} - Formatted notification payload
 */
const createHydrationNotification = (options = {}) => {
  const defaultNotification = {
    title: 'Drink Water! 💧',
    body: 'Stay Hydrated. Time to drink some water!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'hydration-reminder',
    requireInteraction: false,
    silent: false,
    data: {
      url: '/',
      action: 'hydration-reminder',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'log-water',
        title: '✅ Drink Water',
        icon: '/icon-check.png'
      },
      {
        action: 'snooze',
        title: '⏰ Remind Later',
        icon: '/icon-snooze.png'
      }
    ]
  };

  return {
    ...defaultNotification,
    ...options
  };
};

/**
 * Create test notification for testing purposes
 * @returns {object} - Test notification payload
 */
const createTestNotification = () => {
  return createHydrationNotification({
    title: 'Test Water Reminder 🧪💧',
    body: 'Click me to test the water alert sound and auto-logging!',
    tag: 'test-hydration-reminder',
    requireInteraction: true, // Force user interaction
    silent: false,
    data: {
      url: '/',
      action: 'hydration-reminder', // Use same action as regular notifications
      timestamp: Date.now(),
      isTest: true // Flag to identify test notifications
    }
    // Keep the same actions as regular hydration notifications for consistency
  });
};

/**
 * Validate subscription object
 * @param {object} subscription - Subscription to validate
 * @returns {boolean} - Whether subscription is valid
 */
const validateSubscription = (subscription) => {
  if (!subscription) {
    return false;
  }

  // Check required fields
  if (!subscription.endpoint) {
    return false;
  }

  if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
    return false;
  }

  // Validate endpoint URL
  try {
    new URL(subscription.endpoint);
  } catch (error) {
    return false;
  }

  return true;
};

/**
 * Get VAPID public key (for frontend)
 * @returns {string} - VAPID public key
 */
const getVapidPublicKey = () => {
  configureVapid();
  const { VAPID_PUBLIC_KEY } = getVapidKeys();
  
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VAPID public key not configured');
  }
  return VAPID_PUBLIC_KEY;
};

/**
 * Check if web push is properly configured
 * @returns {boolean} - Whether web push is configured
 */
const isWebPushConfigured = () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = getVapidKeys();
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
};

/**
 * Handle failed notification (for updating subscription status)
 * @param {object} subscription - Failed subscription
 * @param {string} error - Error message
 * @returns {object} - Processing recommendation
 */
const handleFailedNotification = (subscription, error) => {
  // Determine if subscription should be removed based on error
  const permanentFailures = [
    'Gone', // HTTP 410
    'Not Found', // HTTP 404
    'Bad Request', // HTTP 400 - malformed subscription
  ];

  const temporaryFailures = [
    'Too Many Requests', // HTTP 429
    'Internal Server Error', // HTTP 500
    'Service Unavailable', // HTTP 503
  ];

  const shouldRemove = permanentFailures.some(failure => 
    error.includes(failure)
  );

  return {
    shouldRemove,
    shouldRetry: temporaryFailures.some(failure => 
      error.includes(failure)
    ),
    error
  };
};

module.exports = {
  sendNotification,
  sendBulkNotifications,
  createHydrationNotification,
  createTestNotification,
  validateSubscription,
  getVapidPublicKey,
  isWebPushConfigured,
  handleFailedNotification
};
