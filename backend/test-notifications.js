#!/usr/bin/env node

/**
 * Test Notification Script
 * 
 * This script helps developers test the notification system by:
 * 1. Starting test mode (1-minute intervals)
 * 2. Manually triggering notifications
 * 3. Switching back to production mode
 * 
 * Usage:
 * node test-notifications.js [command]
 * 
 * Commands:
 * test-start    - Start test mode (1-minute intervals)
 * test-stop     - Stop test mode, return to production
 * trigger       - Manually trigger notification (test mode)
 * trigger-prod  - Manually trigger notification (production mode)  
 * status        - Show cron job status
 */

const notificationCron = require('./cron/notifications')

// Get command line argument
const command = process.argv[2] || 'help'

async function main() {
  console.log('🧪 Hydration Reminder - Notification Tester\n')
  
  switch (command) {
    case 'test-start':
      console.log('🚀 Starting TEST MODE...')
      console.log('📍 Notifications will be sent every minute!')
      console.log('⚠️  Make sure you have notifications enabled in the app')
      console.log('')
      
      notificationCron.startTestMode()
      
      console.log('✅ Test mode active!')
      console.log('📱 You should start receiving test notifications every minute')
      console.log('🛑 Run "node test-notifications.js test-stop" to stop test mode')
      console.log('')
      
      // Keep process running
      setInterval(() => {
        const now = new Date()
        console.log(`⏰ Test mode running... ${now.toLocaleTimeString()}`)
      }, 30000) // Log every 30 seconds
      break
      
    case 'test-stop':
      console.log('🛑 Stopping TEST MODE...')
      notificationCron.stop()
      
      console.log('🎆 Switching to PRODUCTION MODE...')
      notificationCron.startProductionMode()
      
      console.log('✅ Production mode active!')
      console.log('⏰ Notifications will now be sent every hour as configured')
      process.exit(0)
      break
      
    case 'trigger':
      console.log('🔧 Manually triggering TEST notification...')
      await notificationCron.triggerManual(true) // true = test mode
      console.log('✅ Test notification triggered!')
      process.exit(0)
      break
      
    case 'trigger-prod':
      console.log('🔧 Manually triggering PRODUCTION notification...')
      await notificationCron.triggerManual(false) // false = production mode  
      console.log('✅ Production notification triggered!')
      process.exit(0)
      break
      
    case 'status':
      console.log('📊 Notification Cron Job Status:')
      const status = notificationCron.getStatus()
      
      console.log(`Production Mode: ${status.production.isRunning ? '✅ Running' : '❌ Stopped'}`)
      if (status.production.nextRun) {
        console.log(`Next Production Run: ${status.production.nextRun.toLocaleString()}`)
      }
      
      console.log(`Test Mode: ${status.test.isRunning ? '🧪 Running' : '❌ Stopped'}`)
      if (status.test.nextRun) {
        console.log(`Next Test Run: ${status.test.nextRun.toLocaleString()}`)
      }
      
      console.log(`Timezone: ${status.timezone}`)
      process.exit(0)
      break
      
    case 'help':
    default:
      console.log('Available commands:')
      console.log('')
      console.log('🧪 test-start     - Start 1-minute test notifications')
      console.log('🛑 test-stop      - Stop test mode, return to production')
      console.log('🔧 trigger        - Send one test notification now')
      console.log('🔧 trigger-prod   - Send one production notification now')
      console.log('📊 status         - Show current cron job status')
      console.log('')
      console.log('Examples:')
      console.log('node test-notifications.js test-start')
      console.log('node test-notifications.js trigger')
      console.log('node test-notifications.js status')
      console.log('')
      console.log('⚠️  Note: Test mode sends notifications every MINUTE')
      console.log('💡 Make sure notifications are enabled in your browser!')
      process.exit(0)
  }
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Unexpected error:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error.message)
  process.exit(1)
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down notification tester...')
  try {
    notificationCron.stop()
  } catch (error) {
    console.log('⚠️ Error stopping cron job:', error.message)
  }
  process.exit(0)
})

// Run the script
main().catch((error) => {
  console.error('❌ Script error:', error.message)
  process.exit(1)
})
