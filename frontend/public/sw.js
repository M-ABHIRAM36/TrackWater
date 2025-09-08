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
  console.log('[SW] Push event received')
  
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
  if (event.data) {
    try {
      const pushData = event.data.json()
      notificationData = { ...notificationData, ...pushData }
    } catch (error) {
      console.warn('[SW] Failed to parse push data:', error)
    }
  }

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
  
  event.notification.close()

  const action = event.action
  const notificationData = event.notification.data || {}

  // ALWAYS play water alert sound first for any notification click
  event.waitUntil(
    playNotificationSound().then(() => {
      // Then handle specific actions
      if (action === 'log-water') {
        // Open app and focus on water logging
        return openAppAndFocusTab('/?action=log-water')
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

// Create a test notification that we can click
const createTestNotification = async () => {
  try {
    console.log('[SW] Creating test notification...')
    
    await self.registration.showNotification('Test Water Alert! 💧', {
      body: 'Click me to test the water alert sound!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'test-water-alert',
      requireInteraction: true, // Forces user to interact
      silent: false,
      data: {
        url: '/',
        action: 'test-water-alert',
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'test-sound',
          title: '🔊 Test Sound',
          icon: '/icons/icon-192x192.png'
        }
      ]
    })
    
    console.log('[SW] ✅ Test notification created! Click it to test sound.')
  } catch (error) {
    console.error('[SW] Failed to create test notification:', error)
  }
}

// Expose test functions for debugging
self.testNotificationClick = testNotificationClick
self.createTestNotification = createTestNotification

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
console.log('[SW] 🔔 Create test notification: self.createTestNotification()')
