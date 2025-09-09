// Service Worker for Hydration Reminder App
// Handles push notifications and offline functionality

const CACHE_NAME = 'hydration-app-v1'
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/sounds/alert.mp3'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .catch(error => {
        console.error('[SW] Failed to cache static assets:', error)
      })
  )
  
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event')
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  
  // Claim all clients immediately
  self.clients.claim()
})

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip API requests and chrome-extension requests
  if (event.request.url.includes('/api/') || 
      event.request.url.startsWith('chrome-extension://')) {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
      .catch(() => {
        // If both cache and network fail, return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Offline - Hydration Reminder</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 50px; }
                .icon { font-size: 4rem; margin-bottom: 1rem; }
                h1 { color: #374151; margin-bottom: 1rem; }
                p { color: #6b7280; margin-bottom: 2rem; }
                button { 
                  background: #0ea5e9; color: white; border: none; padding: 12px 24px; 
                  border-radius: 8px; font-size: 1rem; cursor: pointer;
                }
                button:hover { background: #0284c7; }
              </style>
            </head>
            <body>
              <div class="icon">💧</div>
              <h1>You're Offline</h1>
              <p>Please check your internet connection and try again.</p>
              <button onclick="window.location.reload()">Retry</button>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          })
        }
      })
  )
})

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received!')
  console.log('[SW] Push event data:', event.data ? 'Present' : 'None')
  
  let notificationData = {
    title: 'Drink Water! 💧',
    body: 'Stay Hydrated. Time to drink some water!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
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
  }

  // Parse notification data if provided
  let isTestNotification = false;
  if (event.data) {
    try {
      const pushData = event.data.json()
      notificationData = { ...notificationData, ...pushData }
      
      // Check if this is a test notification
      isTestNotification = pushData.isTest || (pushData.tag && pushData.tag.includes('test')) || 
                          (pushData.data && pushData.data.isTest) || 
                          (pushData.title && pushData.title.includes('Test'));
                          
      if (isTestNotification) {
        console.log('[SW] 🧪 TEST NOTIFICATION DETECTED IN PUSH EVENT!')
        console.log('[SW] Test notification data:', pushData)
      }
    } catch (error) {
      console.warn('[SW] Failed to parse push data:', error)
    }
  }

  // Log notification details before showing
  console.log('[SW] Showing notification with title:', notificationData.title)
  console.log('[SW] Notification tag:', notificationData.tag)
  console.log('[SW] Notification actions:', notificationData.actions)
  
  const notificationPromise = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      data: notificationData.data,
      actions: notificationData.actions
    }
  ).then(() => {
    console.log('[SW] Notification displayed successfully')
    if (isTestNotification) {
      console.log('[SW] 🧪 Test notification displayed! Click it to trigger the water alert sound.')
    }
    // Optional: Play sound immediately when notification appears
    // Uncomment the next line if you want sound on notification appearance
    // return playNotificationSound()
  })

  event.waitUntil(notificationPromise)
})

// Notification click event - handle user interaction with notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] ✅ NOTIFICATION CLICKED! Action:', event.action || 'default')
  console.log('[SW] Notification data:', event.notification.data)
  console.log('[SW] Notification title:', event.notification.title)
  console.log('[SW] Full notification object:', {
    title: event.notification.title,
    body: event.notification.body,
    tag: event.notification.tag,
    data: event.notification.data,
    actions: event.notification.actions
  })
  
  event.notification.close()

  const action = event.action
  const notificationData = event.notification.data || {}
  const isTestNotification = notificationData.isTest || event.notification.tag.includes('test')

  // Log test notification details
  if (isTestNotification) {
    console.log('[SW] 🧪 TEST NOTIFICATION DETECTED!')
    console.log('[SW] Test notification tag:', event.notification.tag)
    console.log('[SW] Test notification action:', action || 'default click')
  }

  // ALWAYS play water alert sound first for any notification click
  event.waitUntil(
    playNotificationSound().then(() => {
      // Show test notification feedback if it's a test
      if (isTestNotification) {
        console.log('[SW] 🎉 Test notification click handling completed!')
        return self.registration.showNotification('Test Successful! ✅', {
          body: 'Water alert sound triggered! Audio system working properly.',
          icon: '/icons/icon-192x192.png',
          tag: 'test-success',
          requireInteraction: false,
          silent: true,
          data: { isTestResult: true }
        }).then(() => openAppAndFocusTab('/?test=notification-success'))
      }
      
      // Then handle specific actions for regular notifications
      if (action === 'log-water') {
        // Log water automatically and show success
        return logWaterAutomatically().then(() => {
          return openAppAndFocusTab('/?action=water-logged')
        })
      } else if (action === 'snooze') {
        // Snooze for 30 minutes (show another notification)
        return scheduleSnoozeNotification()
      } else {
        // Default action - open app
        return openAppAndFocusTab('/?notification=clicked')
      }
    })
  )
})

// Helper function to open app and focus tab
async function openAppAndFocusTab(url = '/') {
  try {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })

    // Check if app is already open
    for (const client of clientList) {
      if (client.url.includes(self.location.origin)) {
        // Focus existing tab and navigate if needed
        await client.focus()
        if (url !== '/') {
          client.postMessage({
            type: 'NAVIGATE',
            url: url
          })
        }
        return client
      }
    }

    // Open new window/tab if app is not open
    return self.clients.openWindow(url)
  } catch (error) {
    console.error('[SW] Failed to open/focus app:', error)
  }
}

// Helper function to play 10-second water alert sound
async function playNotificationSound() {
  try {
    console.log('[SW] Playing notification sound - looking for clients...')
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    
    console.log(`[SW] Found ${clients.length} clients`)
    
    if (clients.length > 0) {
      // Send message to all active clients to play 10-second water alert
      const message = {
        type: 'PLAY_WATER_ALERT',
        soundUrl: '/sounds/alert.mp3',
        duration: 6000, // 6 seconds (actual audio length)
        volume: 1.0 // Full volume for notification clicks
      }
      
      clients.forEach((client, index) => {
        console.log(`[SW] Sending water alert message to client ${index + 1}`)
        client.postMessage(message)
      })
      
      console.log('[SW] ✅ Water alert sound message sent to all clients')
      
      // Wait a moment to ensure message is processed
      await new Promise(resolve => setTimeout(resolve, 100))
    } else {
      console.warn('[SW] ⚠️ No active clients found to play sound')
    }
  } catch (error) {
    console.error('[SW] ❌ Failed to play water alert sound:', error)
  }
}

// Helper function to schedule snooze notification
async function scheduleSnoozeNotification() {
  try {
    // Note: Service Workers can't set long-running timers
    // This is a placeholder - in a real app, you'd need to handle this server-side
    console.log('[SW] Snooze requested - would reschedule notification')
    
    // Show immediate feedback
    self.registration.showNotification('Reminder Snoozed ⏰', {
      body: 'We\'ll remind you again in 30 minutes',
      icon: '/icons/icon-192x192.png',
      tag: 'snooze-confirmation',
      requireInteraction: false,
      silent: true,
      data: { isSnoozeConfirmation: true }
    })
  } catch (error) {
    console.error('[SW] Failed to schedule snooze:', error)
  }
}

// Background sync event (for future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'sync-water-logs') {
    event.waitUntil(syncWaterLogs())
  }
})

// Helper function to sync offline water logs (future enhancement)
async function syncWaterLogs() {
  try {
    // This would sync any offline water logs when connection is restored
    console.log('[SW] Syncing offline water logs...')
    
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_WATER_LOGS'
      })
    })
  } catch (error) {
    console.error('[SW] Failed to sync water logs:', error)
  }
}

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {}
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'GET_VERSION':
      event.ports[0].postMessage({
        type: 'VERSION',
        version: CACHE_NAME
      })
      break
      
    case 'CACHE_WATER_LOG':
      // Cache water log for offline sync (future enhancement)
      cacheWaterLogOffline(data)
      break
      
    default:
      console.log('[SW] Unknown message type:', type)
  }
})

// Helper function to cache water logs offline (future enhancement)
async function cacheWaterLogOffline(logData) {
  try {
    const cache = await caches.open('water-logs-offline')
    const timestamp = Date.now()
    await cache.put(
      `/offline-log-${timestamp}`,
      new Response(JSON.stringify(logData))
    )
    console.log('[SW] Cached water log offline:', timestamp)
  } catch (error) {
    console.error('[SW] Failed to cache water log offline:', error)
  }
}

// Helper function to automatically log water using quick endpoint
const logWaterAutomatically = async () => {
  try {
    console.log('[SW] 💧 Auto-logging water from notification click...')
    
    // Get stored JWT token from localStorage (we can't access it directly from SW)
    // So we'll send a message to the client to handle the API call
    const clients = await self.clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    })
    
    console.log(`[SW] Found ${clients.length} clients to send water log message`)
    
    if (clients.length > 0) {
      // Send message to all clients (in case multiple tabs are open)
      clients.forEach((client, index) => {
        console.log(`[SW] Sending LOG_WATER_AUTOMATICALLY to client ${index + 1}`)
        client.postMessage({
          type: 'LOG_WATER_AUTOMATICALLY',
          timestamp: Date.now()
        })
      })
      console.log('[SW] ✅ Sent auto-log water message to all clients')
    } else {
      console.warn('[SW] ⚠️ No active clients to handle water logging')
      
      // Show error notification if no clients available
      await self.registration.showNotification('Cannot Log Water ❌', {
        body: 'Please open the app and try again',
        icon: '/icons/icon-192x192.png',
        tag: 'water-log-no-client-error',
        requireInteraction: true,
        data: { action: 'no-client-error' }
      })
    }
    
    // Don't show success notification here - let the frontend handle it after API call completes
    
  } catch (error) {
    console.error('[SW] Error auto-logging water:', error)
    
    // Show error notification
    await self.registration.showNotification('Water Log Failed ❌', {
      body: 'Please open the app to log manually',
      icon: '/icons/icon-192x192.png',
      tag: 'water-log-error',
      requireInteraction: true,
      data: { action: 'error' }
    })
  }
}

// Helper function to test notification click behavior
const testNotificationClick = async () => {
  try {
    console.log('[SW] Testing notification click behavior...')
    await playNotificationSound()
    console.log('[SW] Notification click test completed')
  } catch (error) {
    console.error('[SW] Test notification click failed:', error)
  }
}

// Create a comprehensive test notification that matches real notification structure
const createTestNotification = async () => {
  try {
    console.log('[SW] Creating comprehensive test notification...')
    
    // Use exact same structure as real hydration notifications
    const testNotification = {
      title: 'Test Water Reminder! 🧪💧',
      body: 'Click me to test the water alert sound and notification system!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'test-hydration-reminder',
      requireInteraction: true, // Forces user to interact
      silent: false,
      data: {
        url: '/',
        action: 'hydration-reminder', // Same as real notifications
        timestamp: Date.now(),
        isTest: true // Flag to identify this as a test
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
    }
    
    await self.registration.showNotification(testNotification.title, {
      body: testNotification.body,
      icon: testNotification.icon,
      badge: testNotification.badge,
      tag: testNotification.tag,
      requireInteraction: testNotification.requireInteraction,
      silent: testNotification.silent,
      data: testNotification.data,
      actions: testNotification.actions
    })
    
    console.log('[SW] ✅ Comprehensive test notification created!')
    console.log('[SW] 👆 Click the notification to test the water alert system!')
    console.log('[SW] Expected behavior: sound plays + success notification shows')
  } catch (error) {
    console.error('[SW] Failed to create test notification:', error)
  }
}

// Create a simple test notification for quick testing
const createSimpleTestNotification = async () => {
  try {
    console.log('[SW] Creating simple test notification...')
    
    await self.registration.showNotification('Simple Test 🔔', {
      body: 'Click to test notification click handler',
      icon: '/icons/icon-192x192.png',
      tag: 'simple-test',
      requireInteraction: true,
      data: {
        action: 'test-click',
        timestamp: Date.now(),
        isTest: true
      }
    })
    
    console.log('[SW] ✅ Simple test notification created!')
  } catch (error) {
    console.error('[SW] Failed to create simple test notification:', error)
  }
}

// Expose test functions for debugging
self.testNotificationClick = testNotificationClick
self.createTestNotification = createTestNotification
self.createSimpleTest = createSimpleTestNotification

// Error event
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error)
})

// Unhandled rejection event
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason)
  event.preventDefault()
})

console.log('[SW] Service worker loaded successfully')
console.log('[SW] 🧪 Test notification click: self.testNotificationClick()')
console.log('[SW] 🔔 Create comprehensive test: self.createTestNotification()')
console.log('[SW] 📦 Create simple test: self.createSimpleTest()')
