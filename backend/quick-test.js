/**
 * Quick 1-minute notification test
 * This script connects to MongoDB and sends test notifications every minute
 */

const mongoose = require('mongoose');
const cron = require('node-cron');
require('dotenv').config();

// Import models and notification system
const User = require('./models/User'); // Import User model first
const Subscription = require('./models/Subscription');
const { 
  sendBulkNotifications, 
  createHydrationNotification 
} = require('./utils/webPush');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hydration-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  startTestNotifications();
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

let testCron;

const sendTestNotifications = async () => {
  try {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    console.log(`⏰ [TEST - ${currentTime}] Checking for subscriptions...`);

    // Get all active subscriptions
    const subscriptions = await Subscription.getAllActiveSubscriptions();
    
    if (subscriptions.length === 0) {
      console.log('📭 No active subscriptions found');
      console.log('💡 Make sure notifications are enabled in your browser!');
      return;
    }

    // Filter for users with notifications enabled
    const enabledSubscriptions = subscriptions.filter(sub => {
      return sub.userId && sub.userId.notificationsEnabled;
    });

    if (enabledSubscriptions.length === 0) {
      console.log('🔕 No users with notifications enabled');
      return;
    }

    console.log(`💧 Sending test notifications to ${enabledSubscriptions.length} subscriptions...`);

    // Create test notification
    const notification = createHydrationNotification({
      title: '🧪 Test Water Reminder! 💧',
      body: `Test notification at ${currentTime} - Stay Hydrated!`,
      tag: 'test-hydration-reminder',
      data: {
        url: '/',
        action: 'hydration-reminder',
        timestamp: Date.now(),
        isTest: true,
        time: currentTime
      }
    });

    // Prepare subscriptions for bulk sending
    const subscriptionsToSend = enabledSubscriptions.map(sub => sub.getWebPushFormat());

    // Send bulk notifications
    const results = await sendBulkNotifications(subscriptionsToSend, notification, {
      urgency: 'normal',
      TTL: 60 * 60 // 1 hour TTL
    });

    // Count results
    const successCount = results.filter(r => r.result.success).length;
    const failedCount = results.length - successCount;

    console.log(`✅ Test notifications sent: ${successCount} successful, ${failedCount} failed`);
    
    if (successCount > 0) {
      console.log('📱 Check your browser for the test notification!');
      console.log('🔊 Click the notification to test the water alert sound');
    }

  } catch (error) {
    console.error('❌ Error sending test notifications:', error.message);
  }
};

const startTestNotifications = () => {
  console.log('');
  console.log('🧪 Starting 1-minute test notification system');
  console.log('📍 Notifications will be sent every minute');
  console.log('⚠️  Make sure you have notifications enabled in the app');
  console.log('🛑 Press Ctrl+C to stop');
  console.log('');

  // Schedule test notifications every minute
  testCron = cron.schedule('* * * * *', sendTestNotifications, {
    scheduled: true,
    timezone: 'UTC'
  });

  // Send first notification immediately
  setTimeout(sendTestNotifications, 2000); // Wait 2 seconds

  console.log('✅ Test cron job started - sending notifications every minute!');
  console.log('');
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down test notification system...');
  
  if (testCron) {
    try {
      testCron.destroy();
      console.log('⏰ Test cron job stopped');
    } catch (error) {
      console.log('⚠️ Error stopping cron job:', error.message);
    }
  }
  
  try {
    await mongoose.connection.close();
    console.log('📊 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
  }
  
  console.log('👋 Test system stopped');
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error.message);
  process.exit(1);
});
