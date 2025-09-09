const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const { 
  sendBulkNotifications, 
  createHydrationNotification,
  handleFailedNotification 
} = require('../utils/webPush');

/**
 * Cron job scheduler for hydration reminder notifications
 * Sends notifications every hour from 1 to 12 o'clock
 */

let cronJob;
let testCronJob;

/**
 * Send hydration reminders to all active subscriptions
 * @param {boolean} isTestMode - Whether this is a test run (1-minute intervals)
 */
const sendHydrationReminders = async (isTestMode = false) => {
  try {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    const modeText = isTestMode ? 'TEST' : 'PRODUCTION';
    const timeText = isTestMode ? `${currentHour}:${currentMinute.toString().padStart(2, '0')}` : `${currentHour}:00`;
    console.log(`⏰ [${modeText}] Starting hydration reminder for time ${timeText} UTC...`);

    // Get all active subscriptions with users who have notifications enabled
    const subscriptions = await Subscription.getAllActiveSubscriptions();
    
    if (subscriptions.length === 0) {
      console.log('📝 No active subscriptions found');
      return;
    }

    // Filter subscriptions for users who should receive notifications at this time
    const enabledSubscriptions = subscriptions.filter(sub => {
      if (!sub.userId) {
        console.log('⚠️ Subscription without userId found');
        return false;
      }
      
      // For test mode, pass current minute; for production, pass 0 (top of hour)
      const checkMinute = isTestMode ? currentMinute : 0;
      const shouldReceive = sub.userId.shouldReceiveNotificationAtHour(currentHour, checkMinute, isTestMode);
      
      // Enhanced logging for test mode
      if (isTestMode && process.env.NODE_ENV === 'development') {
        console.log(`🧪 User ${sub.userId._id}: frequency=${sub.userId.notificationFrequency}, window=${sub.userId.notificationStartHour}-${sub.userId.notificationEndHour}, time=${currentHour}:${checkMinute}, shouldReceive=${shouldReceive}`);
      } else if (!shouldReceive && process.env.NODE_ENV === 'development') {
        console.log(`🔍 User ${sub.userId._id}: outside notification window (${sub.userId.notificationStartHour}-${sub.userId.notificationEndHour}), current hour: ${currentHour}`);
      }
      
      return shouldReceive;
    });

    if (enabledSubscriptions.length === 0) {
      console.log('🔕 No users with notifications enabled');
      return;
    }

    console.log(`💧 Sending hydration reminders to ${enabledSubscriptions.length} subscriptions...`);

    // Create notification payload
    const notificationTitle = isTestMode ? 'Test Water Reminder! 🧪💧' : 'Drink Water! 💧';
    const notificationBody = isTestMode ? 'Test notification - Stay Hydrated!' : 'Stay Hydrated. Time to drink some water!';
    
    const notification = createHydrationNotification({
      title: notificationTitle,
      body: notificationBody,
      tag: isTestMode ? 'test-hydration-reminder' : 'hydration-reminder',
      data: {
        url: '/',
        action: 'hydration-reminder',
        timestamp: Date.now(),
        hour: currentHour,
        minute: currentMinute,
        isTest: isTestMode
      }
    });

    // Prepare subscriptions for bulk sending
    const subscriptionsToSend = enabledSubscriptions.map(sub => sub.getWebPushFormat());

    // Send bulk notifications
    const results = await sendBulkNotifications(subscriptionsToSend, notification, {
      urgency: 'normal',
      TTL: 60 * 60 // 1 hour TTL
    });

    // Process results and update subscription statuses
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < results.length; i++) {
      const { result } = results[i];
      const subscription = enabledSubscriptions[i];

      try {
        if (result.success) {
          await subscription.markAsSuccessful();
          successCount++;
        } else {
          const failureInfo = handleFailedNotification(subscription, result.error);
          await subscription.markAsFailed(result.error);
          
          if (failureInfo.shouldRemove) {
            console.log(`🗑️ Removing invalid subscription: ${subscription.endpoint}`);
          }
          
          failedCount++;
        }
      } catch (error) {
        console.error('Error updating subscription status:', error);
        failedCount++;
      }
    }

    console.log(`✅ Hydration reminders sent: ${successCount} successful, ${failedCount} failed`);
    
    // Log hourly summary
    logHourlySummary(currentHour, successCount, failedCount);

  } catch (error) {
    console.error('❌ Error sending hydration reminders:', error);
  }
};

/**
 * Log hourly notification summary
 */
const logHourlySummary = (hour, successCount, failedCount) => {
  const time = `${hour.toString().padStart(2, '0')}:00`;
  const total = successCount + failedCount;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
  
  console.log(`📊 Hour ${time} Summary: ${successCount}/${total} (${successRate}%) successful`);
};

/**
 * Cleanup old/inactive subscriptions daily
 */
const cleanupSubscriptions = async () => {
  try {
    console.log('🧹 Starting daily subscription cleanup...');
    
    const cleanedCount = await Subscription.cleanupInactiveSubscriptions();
    
    console.log(`✅ Subscription cleanup complete: ${cleanedCount} subscriptions removed`);
  } catch (error) {
    console.error('❌ Error during subscription cleanup:', error);
  }
};

/**
 * Send test notification (for development/testing)
 */
const sendTestNotification = async () => {
  try {
    console.log('🧪 Sending test notification...');
    
    const subscriptions = await Subscription.getAllActiveSubscriptions();
    const enabledSubscriptions = subscriptions.filter(sub => 
      sub.userId && sub.userId.notificationsEnabled
    ).slice(0, 5); // Limit to 5 for testing

    if (enabledSubscriptions.length === 0) {
      console.log('📭 No test subscriptions available');
      return;
    }

    const notification = createHydrationNotification({
      title: 'Test Notification 🧪',
      body: 'This is a test hydration reminder!',
      tag: 'test-hydration',
      data: {
        url: '/',
        action: 'test-reminder',
        timestamp: Date.now()
      }
    });

    const subscriptionsToSend = enabledSubscriptions.map(sub => sub.getWebPushFormat());
    const results = await sendBulkNotifications(subscriptionsToSend, notification);

    const successCount = results.filter(r => r.result.success).length;
    console.log(`🧪 Test notifications sent: ${successCount}/${results.length} successful`);

  } catch (error) {
    console.error('❌ Error sending test notification:', error);
  }
};

/**
 * Start the cron job scheduler
 * @param {boolean} testMode - Whether to run in test mode (1-minute intervals)
 */
const start = (testMode = false) => {
  const isTestMode = testMode || process.env.NOTIFICATION_TEST_MODE === 'true';
  
  if (cronJob || testCronJob) {
    console.log('⏰ Cron job already running');
    return;
  }

  if (isTestMode) {
    // TEST MODE: Run every minute for testing
    console.log('🧪 Starting in TEST MODE - notifications every minute');
    testCronJob = cron.schedule('* * * * *', () => sendHydrationReminders(true), {
      scheduled: true,
      timezone: 'UTC'
    });
    console.log('🧪 Test cron job started: Every minute');
  } else {
    // PRODUCTION MODE: Run every hour
    console.log('🎆 Starting in PRODUCTION MODE - notifications every hour');
    cronJob = cron.schedule('0 * * * *', () => sendHydrationReminders(false), {
      scheduled: true,
      timezone: 'UTC' // Use UTC, users can set their timezone in profile
    });
    console.log('⏰ Production cron job started: Every hour');
  }

  // Schedule daily cleanup at 3 AM UTC (both modes)
  const cleanupJob = cron.schedule('0 3 * * *', cleanupSubscriptions, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('📅 Schedule: ' + (isTestMode ? 'Every minute (TEST)' : 'Every hour (filtered by user preferences)'));
  console.log('🧹 Cleanup: Daily at 3 AM UTC');
};

/**
 * Stop the cron job scheduler
 */
const stop = () => {
  if (cronJob) {
    try {
      cronJob.destroy();
      cronJob = null;
      console.log('⏰ Production cron job stopped');
    } catch (error) {
      console.log('⚠️ Error stopping production cron job:', error.message);
    }
  }
  
  if (testCronJob) {
    try {
      testCronJob.destroy();
      testCronJob = null;
      console.log('🧪 Test cron job stopped');
    } catch (error) {
      console.log('⚠️ Error stopping test cron job:', error.message);
    }
  }
};

/**
 * Get cron job status
 */
const getStatus = () => {
  return {
    production: {
      isRunning: cronJob ? cronJob.getStatus() === 'scheduled' : false,
      nextRun: cronJob ? cronJob.nextDate() : null
    },
    test: {
      isRunning: testCronJob ? testCronJob.getStatus() === 'scheduled' : false,
      nextRun: testCronJob ? testCronJob.nextDate() : null
    },
    timezone: 'UTC'
  };
};

/**
 * Manual trigger for testing (development only)
 */
const triggerManual = async (testMode = false) => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Manual trigger disabled in production');
    return;
  }
  
  console.log('🔧 Manual trigger activated...');
  await sendHydrationReminders(testMode);
};

/**
 * Start test mode (1-minute intervals) for development/testing
 */
const startTestMode = () => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Test mode disabled in production');
    return;
  }
  
  stop(); // Stop any existing jobs
  start(true); // Start in test mode
  console.log('🧪 Test mode activated - notifications every minute!');
};

/**
 * Start production mode (hourly intervals)
 */
const startProductionMode = () => {
  stop(); // Stop any existing jobs
  start(false); // Start in production mode
  console.log('🎆 Production mode activated - notifications every hour!');
};

module.exports = {
  start,
  stop,
  getStatus,
  triggerManual,
  sendTestNotification,
  cleanupSubscriptions,
  startTestMode,
  startProductionMode
};
