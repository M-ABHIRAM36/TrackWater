/**
 * Setup Script for Abhi's Test Account
 * This script configures abhi.storage36@gmail.com for 1-minute testing
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hydration-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  setupAbhiAccount();
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

async function setupAbhiAccount() {
  try {
    console.log('🔧 Setting up Abhi\'s test account...\n');
    
    const abhiEmail = 'abhi.storage36@gmail.com';
    
    // Find or update Abhi's account
    let abhiUser = await User.findOne({ email: abhiEmail });
    
    if (!abhiUser) {
      console.log('❌ User not found. Please register first with email:', abhiEmail);
      process.exit(1);
    }
    
    console.log('👤 Found user:', abhiUser.name || abhiUser.email);
    console.log('📧 Email:', abhiUser.email);
    console.log('🔔 Current notification frequency:', abhiUser.notificationFrequency || '1hr');
    console.log('⏰ Current notification window:', `${abhiUser.notificationStartHour || 5}:00 - ${abhiUser.notificationEndHour || 0}:00`);
    console.log('🔔 Notifications enabled:', abhiUser.notificationsEnabled);
    
    // Update for optimal 1-minute testing
    const currentHour = new Date().getHours();
    const nextHour = (currentHour + 1) % 24;
    
    abhiUser.notificationFrequency = '1min'; // 1-minute notifications
    abhiUser.notificationStartHour = currentHour; // Start from current hour
    abhiUser.notificationEndHour = nextHour; // End at next hour
    abhiUser.notificationsEnabled = true; // Ensure notifications are enabled
    abhiUser.dailyGoal = 2000; // Reasonable goal
    abhiUser.defaultWaterAmount = 250; // Standard amount
    
    await abhiUser.save();
    
    console.log('\n✅ Account configured for 1-minute testing:');
    console.log('⚡ Notification frequency: 1min (every minute)');
    console.log(`⏰ Notification window: ${currentHour}:00 - ${nextHour}:00 (current hour)`);
    console.log('🔔 Notifications: ENABLED');
    console.log('💧 Default water amount: 250ml');
    console.log('🎯 Daily goal: 2000ml');
    
    console.log('\n📱 Next steps:');
    console.log('1. ✅ Open the web app and log in');
    console.log('2. ✅ Go to Settings Panel - you should see "⚡ 1 minute" option');
    console.log('3. ✅ Enable push notifications if not already enabled');
    console.log('4. ✅ You should start receiving notifications every minute!');
    console.log('5. ✅ Click notifications to test the water alert sound');
    
    console.log('\n🎯 To test right now:');
    console.log(`   Run: node quick-test.js`);
    console.log(`   Or just wait 1 minute for automatic notifications!`);
    
  } catch (error) {
    console.error('❌ Error setting up account:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error.message);
  process.exit(1);
});
