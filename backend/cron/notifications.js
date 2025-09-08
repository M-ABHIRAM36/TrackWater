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

/**
 * Send hydration reminders to all active subscriptions
 */
const sendHydrationReminders = async () => {
  try {
    console.log('⏰ Starting hourly hydration reminder...');

    // Get current hour
    const currentHour = new Date().getHours();
    
    // Only send notifications between 1 AM and 12 PM (1-12 o'clock)
    if (currentHour < 1 || currentHour > 12) {
      console.log(`⏰ Skipping notifications for hour ${currentHour} (outside 1-12 range)`);
      return;
    }

    // Get all active subscriptions with users who have notifications enabled
    const subscriptions = await Subscription.getAllActiveSubscriptions();
    
    if (subscriptions.length === 0) {
      console.log('📭 No active subscriptions found');
      return;
    }

    // Filter subscriptions for users with notifications enabled
    const enabledSubscriptions = subscriptions.filter(sub => 
      sub.userId && sub.userId.notificationsEnabled
    );

    if (enabledSubscriptions.length === 0) {
      console.log('🔕 No users with notifications enabled');
      return;
    }

    console.log(`💧 Sending hydration reminders to ${enabledSubscriptions.length} subscriptions...`);

    // Create notification payload
    const notification = createHydrationNotification({
      title: 'Drink Water! 💧',
      body: 'Stay Hydrated. Time to drink some water!',
      data: {
        url: '/',
        action: 'hydration-reminder',
        timestamp: Date.now(),
        hour: currentHour
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
 */
const start = () => {
  if (cronJob) {
    console.log('⏰ Cron job already running');
    return;
  }

  // Schedule hydration reminders every hour from 1 AM to 12 PM
  // Cron pattern: "0 1-12 * * *" = At minute 0 of every hour from 1 through 12
  cronJob = cron.schedule('0 1-12 * * *', sendHydrationReminders, {
    scheduled: true,
    timezone: 'UTC' // Use UTC, users can set their timezone in profile
  });

  // Schedule daily cleanup at 3 AM UTC
  const cleanupJob = cron.schedule('0 3 * * *', cleanupSubscriptions, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('⏰ Hydration reminder cron jobs started');
  console.log('📅 Schedule: Every hour from 1 AM to 12 PM UTC');
  console.log('🧹 Cleanup: Daily at 3 AM UTC');
};

/**
 * Stop the cron job scheduler
 */
const stop = () => {
  if (cronJob) {
    cronJob.destroy();
    cronJob = null;
    console.log('⏰ Cron job stopped');
  }
};

/**
 * Get cron job status
 */
const getStatus = () => {
  return {
    isRunning: cronJob ? cronJob.getStatus() === 'scheduled' : false,
    nextRun: cronJob ? cronJob.nextDate() : null,
    timezone: 'UTC'
  };
};

/**
 * Manual trigger for testing (development only)
 */
const triggerManual = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Manual trigger disabled in production');
    return;
  }
  
  console.log('🔧 Manual trigger activated...');
  await sendHydrationReminders();
};

module.exports = {
  start,
  stop,
  getStatus,
  triggerManual,
  sendTestNotification,
  cleanupSubscriptions
};
