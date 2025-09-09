# 🔔 Notification System Features Guide

## 🆕 New Features Added

### 1. **Notification Frequency Control** 
Users can now choose how often they want to receive hydration reminders:

- **30 minutes**: More frequent reminders (every 30 minutes at :00 and :30)
- **1 hour**: Standard reminders (every hour at :00) - Default
- **2 hours**: Less frequent reminders (every 2 hours at even hours)

### 2. **Test Mode (1-Minute Intervals)**
Developers can test notifications with 1-minute intervals instead of waiting for hourly notifications.

### 3. **Enhanced Service Worker**
Improved notification click handling with better debugging and test notification support.

## 📋 User Features

### Notification Frequency Settings
Users can configure their notification preferences in the **Settings Panel**:

1. **Access Settings**: Go to Dashboard → Settings Panel
2. **Set Time Window**: Choose start and end hours (e.g., 5 AM to 12 AM)  
3. **Choose Frequency**: Select 30min, 1hr, or 2hr intervals
4. **Save Settings**: Click "Save Settings" to apply changes

#### Frequency Behavior:
- **30min**: Notifications at 9:00, 9:30, 10:00, 10:30, etc.
- **1hr**: Notifications at 9:00, 10:00, 11:00, 12:00, etc.  
- **2hr**: Notifications at 8:00, 10:00, 12:00, 2:00, etc. (even hours only)

## 🧪 Developer Testing

### Method 1: Test Script (Recommended)

Use the built-in test script for easy notification testing:

```bash
# Navigate to backend directory
cd backend

# Start 1-minute test notifications
node test-notifications.js test-start

# Stop test mode (return to production)  
node test-notifications.js test-stop

# Send one test notification immediately
node test-notifications.js trigger

# Check cron job status
node test-notifications.js status

# Show help
node test-notifications.js help
```

### Method 2: Environment Variable

Set the environment variable for persistent test mode:

```bash
# In .env file or environment
NOTIFICATION_TEST_MODE=true

# Start the server (will use test mode automatically)
npm start
```

### Method 3: Service Worker Tests

Test notification clicks directly in the browser console:

```javascript
// Create test notification (service worker)
self.createTestNotification()

// Test notification click handler
self.testNotificationClick()

// Test audio alert
window.testWaterAlert()

// Test volume levels
window.testVolume(0.8)  // 80% volume
```

## 🛠️ How It Works

### Backend Changes

1. **User Model** (`models/User.js`):
   - Added `notificationFrequency` field with enum values: `['30min', '1hr', '2hr']`
   - Updated `shouldReceiveNotificationAtHour()` method to handle different frequencies

2. **Notification Cron** (`cron/notifications.js`):
   - Added test mode support (1-minute intervals)
   - Enhanced filtering logic for different notification frequencies
   - Added test/production mode switching functions

3. **Profile Update** (`routes/auth.js`):
   - Added `notificationFrequency` field validation and saving

### Frontend Changes

1. **Settings Panel** (`components/SettingsPanel.jsx`):
   - Added frequency selection UI with visual cards
   - Updated timing description to show frequency info
   - Added form validation for frequency field

2. **Service Worker** (`public/sw.js`):
   - Enhanced test notification detection and handling
   - Improved click event logging and debugging
   - Better audio alert integration

## 🎯 Testing Workflow

### Complete Test Scenario:

1. **Setup Test Environment**:
   ```bash
   cd backend
   node test-notifications.js test-start
   ```

2. **Configure User Settings**:
   - Open the web app
   - Go to Settings Panel  
   - Set notification window (e.g., current hour to next hour)
   - Choose frequency (try 30min for faster testing)
   - Enable push notifications

3. **Monitor Test Notifications**:
   - Test notifications appear every minute
   - Click notifications to test audio alerts
   - Check browser console for debug logs

4. **Test Different Frequencies**:
   - Change frequency in settings
   - Save settings
   - Observe different notification patterns

5. **Return to Production**:
   ```bash
   node test-notifications.js test-stop
   ```

## 📊 Environment Modes

### Development Mode
- Detailed console logging
- Test mode available
- Manual triggers enabled  
- Enhanced debugging

### Production Mode
- Minimal logging
- Test mode disabled
- Hourly notifications only
- Error logging only

## 🚀 Deployment

### For Testing Deployment:
```bash
# Set environment variable
NOTIFICATION_TEST_MODE=true

# Deploy backend with test mode enabled
# (Remember to disable for production!)
```

### For Production Deployment:
```bash
# Remove or set to false
NOTIFICATION_TEST_MODE=false

# Or remove the environment variable entirely
```

## 🔧 Troubleshooting

### Test Notifications Not Working
1. **Check Permissions**: Ensure browser notifications are enabled
2. **Verify Settings**: User must have notifications enabled and correct time window
3. **Check Console**: Look for service worker and cron job logs
4. **Test Mode Active**: Verify test mode is running with `node test-notifications.js status`

### Audio Not Playing
1. **User Interaction**: Click on the page first (autoplay policy)
2. **Audio File**: Check if `/sounds/alert.mp3` exists
3. **Volume Test**: Run `window.testVolume(1.0)` in console
4. **Service Worker**: Verify service worker is registered and active

### Frequency Not Working  
1. **Settings Saved**: Verify settings were saved successfully
2. **Backend Update**: Check if backend includes frequency field updates
3. **Time Window**: Ensure current time is within user's notification window

## 📝 Console Log Examples

### Successful Test Mode:
```
⏰ [TEST] Starting hydration reminder for time 14:23 UTC...
🧪 User 507f1f77bcf86cd799439011: frequency=30min, window=5-0, time=14:23, shouldReceive=true
💧 Sending hydration reminders to 1 subscriptions...
✅ Hydration reminders sent: 1 successful, 0 failed
```

### Service Worker Click Event:
```
[SW] ✅ NOTIFICATION CLICKED! Action: default
[SW] 🧪 TEST NOTIFICATION DETECTED!
[SW] 🎉 Test notification click handling completed!
[AudioAlert] ✅ Playing water alert: {soundUrl: "/sounds/alert.mp3", duration: 6000, volume: 1}
```

## 🔄 Migration Notes

Existing users will automatically get:
- Default `notificationFrequency` set to `'1hr'` (maintains current behavior)  
- All existing notification settings preserved
- No action required from users (but they can optimize their frequency if desired)

## 💡 Best Practices

1. **For Development**: Always use test mode for notification testing
2. **For Testing**: Set notification window to include current time
3. **For Production**: Use 1hr frequency for most users (balanced approach)
4. **For Debugging**: Check both backend logs and browser console
5. **For Deployment**: Always disable test mode in production

This system provides comprehensive notification testing capabilities while maintaining a user-friendly frequency control system!
