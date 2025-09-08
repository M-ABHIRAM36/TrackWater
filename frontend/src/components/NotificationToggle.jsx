import React, { useState, useEffect } from 'react'
import apiMethods from '../api/api'

const NotificationToggle = () => {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [vapidKey, setVapidKey] = useState(null)

  useEffect(() => {
    checkNotificationSupport()
    loadVapidKey()
  }, [])

  const checkNotificationSupport = () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
      checkExistingSubscription()
    } else {
      setIsSupported(false)
      setLoading(false)
    }
  }

  const loadVapidKey = async () => {
    try {
      const response = await apiMethods.get('/notifications/vapid-public-key')
      setVapidKey(response.data.publicKey)
    } catch (error) {
      console.error('Failed to load VAPID key:', error)
      setError('Push notifications not configured on server')
    }
  }

  const checkExistingSubscription = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        
        if (subscription) {
          // Verify subscription exists on server
          const response = await apiMethods.get('/notifications/subscriptions')
          const serverSubscriptions = response.data.subscriptions || []
          const subscriptionExists = serverSubscriptions.some(
            sub => sub.endpoint === subscription.endpoint
          )
          
          setIsSubscribed(subscriptionExists)
        } else {
          setIsSubscribed(false)
        }
      }
    } catch (error) {
      console.error('Failed to check subscription:', error)
      setIsSubscribed(false)
    } finally {
      setLoading(false)
    }
  }

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const subscribeToNotifications = async () => {
    if (!vapidKey) {
      setError('VAPID key not available')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Request permission if not granted
      if (permission !== 'granted') {
        const newPermission = await Notification.requestPermission()
        setPermission(newPermission)
        
        if (newPermission !== 'granted') {
          throw new Error('Notification permission denied')
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready
      
      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      })

      // Send subscription to server
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth'))
        },
        userAgent: navigator.userAgent
      }

      await apiMethods.post('/notifications/subscribe', subscriptionData)
      
      // Update user notification preference
      await apiMethods.post('/notifications/toggle', { enabled: true })

      setIsSubscribed(true)
      showSuccessMessage('Notifications enabled successfully!')

    } catch (error) {
      console.error('Failed to subscribe:', error)
      setError(error.message || 'Failed to enable notifications')
    } finally {
      setLoading(false)
    }
  }

  const unsubscribeFromNotifications = async () => {
    setLoading(true)
    setError('')

    try {
      // Get current subscription
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe()
        
        // Remove from server
        await apiMethods.post('/notifications/unsubscribe', {
          endpoint: subscription.endpoint
        })
      }

      // Update user notification preference
      await apiMethods.post('/notifications/toggle', { enabled: false })

      setIsSubscribed(false)
      showSuccessMessage('Notifications disabled successfully!')

    } catch (error) {
      console.error('Failed to unsubscribe:', error)
      setError(error.message || 'Failed to disable notifications')
    } finally {
      setLoading(false)
    }
  }

  const sendTestNotification = async () => {
    if (!isSubscribed) return

    setLoading(true)
    try {
      await apiMethods.post('/notifications/test')
      showSuccessMessage('Test notification sent!')
    } catch (error) {
      console.error('Failed to send test:', error)
      setError('Failed to send test notification')
    } finally {
      setLoading(false)
    }
  }

  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    bytes.forEach(byte => binary += String.fromCharCode(byte))
    return window.btoa(binary)
  }

  const showSuccessMessage = (message) => {
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up'
    toast.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
        ${message}
      </div>
    `
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 3000)
  }

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="text-yellow-800 font-medium">Browser not supported</p>
            <p className="text-yellow-700 text-sm">Your browser doesn't support push notifications</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Push Notifications</h3>
          <p className="text-sm text-gray-600">
            Get hourly reminders to stay hydrated (1 AM - 12 PM)
          </p>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isSubscribed 
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {isSubscribed ? 'Enabled' : 'Disabled'}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Permission Status */}
      {permission !== 'granted' && permission !== 'default' && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <div>
              <p className="text-yellow-800 font-medium">Permission Required</p>
              <p className="text-yellow-700 text-sm">Please allow notifications in your browser settings</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex space-x-3">
        {!isSubscribed ? (
          <button
            onClick={subscribeToNotifications}
            disabled={loading || !vapidKey}
            className="btn-primary flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Enabling...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 1 1 15 0z"/>
                </svg>
                Enable Notifications
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={unsubscribeFromNotifications}
              disabled={loading}
              className="btn-secondary flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Disabling...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"/>
                  </svg>
                  Disable Notifications
                </>
              )}
            </button>

            <button
              onClick={sendTestNotification}
              disabled={loading}
              className="btn-outline flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 4v10a2 2 0 002 2h6a2 2 0 002-2V8M7 8h10M10 12h4"/>
              </svg>
              Test Notification
            </button>
          </>
        )}
      </div>

      {/* Information */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Notifications work even when the website is closed</p>
        <p>• You'll receive reminders every hour from 1 AM to 12 PM</p>
        <p>• Click notifications to quickly log water intake</p>
        <p>• You can disable notifications at any time</p>
      </div>
    </div>
  )
}

export default NotificationToggle
