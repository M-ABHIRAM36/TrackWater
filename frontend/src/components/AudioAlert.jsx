import React, { useEffect, useRef } from 'react'

/**
 * AudioAlert Component
 * 
 * Handles playing alert sounds when notifications are clicked.
 * Listens for service worker messages to play sounds.
 */
const AudioAlert = () => {
  const audioRef = useRef(null)
  
  useEffect(() => {
    // Listen for URL query params to detect notification clicks
    const params = new URLSearchParams(window.location.search)
    const notificationClicked = params.get('notification') === 'clicked'
    
    if (notificationClicked) {
      playAlertSound()
    }
    
    // Listen for messages from service worker
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
    }
    
    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      }
    }
  }, [])

  const handleServiceWorkerMessage = (event) => {
    const { type, sound, soundUrl, duration, volume } = event.data
    
    if (type === 'PLAY_SOUND' && sound) {
      playAlertSound(sound)
    } else if (type === 'PLAY_WATER_ALERT') {
      playWaterAlert(soundUrl, duration, volume)
    }
  }

  const playAlertSound = (soundUrl = '/sounds/alert.mp3') => {
    try {
      if (audioRef.current) {
        audioRef.current.src = soundUrl
        audioRef.current.volume = 0.5 // 50% volume
        
        // Set timeout to stop the sound after 10 seconds
        const playPromise = audioRef.current.play()
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Playing alert sound')
              setTimeout(() => {
                if (audioRef.current) {
                  audioRef.current.pause()
                  audioRef.current.currentTime = 0
                }
              }, 10000) // Stop after 10 seconds
            })
            .catch(error => {
              // Auto-play may be blocked or file not found - show visual alert instead
              console.warn('Failed to play alert sound (this is normal if audio file is missing):', error)
              showVisualAlert()
            })
        }
      }
    } catch (error) {
      console.error('Error playing alert sound:', error)
      showVisualAlert()
    }
  }
  
  const playWaterAlert = (soundUrl = '/sounds/alert.mp3', duration = 10000, volume = 0.7) => {
    try {
      console.log(`[AudioAlert] Playing 10-second water alert sound from: ${soundUrl}`)
      
      if (audioRef.current) {
        audioRef.current.src = soundUrl
        audioRef.current.volume = volume
        audioRef.current.loop = false
        
        const playPromise = audioRef.current.play()
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log(`[AudioAlert] Water alert sound started - will play for ${duration}ms`)
              
              // Stop after the specified duration
              setTimeout(() => {
                if (audioRef.current) {
                  audioRef.current.pause()
                  audioRef.current.currentTime = 0
                  console.log('[AudioAlert] Water alert sound stopped')
                }
              }, duration)
            })
            .catch(error => {
              console.warn('[AudioAlert] Failed to play water alert sound:', error)
              showVisualWaterAlert()
            })
        }
      }
    } catch (error) {
      console.error('[AudioAlert] Error playing water alert sound:', error)
      showVisualWaterAlert()
    }
  }
  
  const showVisualAlert = () => {
    // Show visual notification if audio fails
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-water-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-bounce'
    notification.innerHTML = `
      <div class="flex items-center">
        <span class="text-2xl mr-2">💧</span>
        <div>
          <p class="font-semibold">Drink Water!</p>
          <p class="text-sm">Stay hydrated and healthy</p>
        </div>
      </div>
    `
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 5000)
  }
  
  const showVisualWaterAlert = () => {
    // Enhanced visual notification for water alert with 10-second animation
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-water-400 to-blue-500 text-white px-8 py-6 rounded-xl shadow-2xl z-50 transform transition-all duration-500'
    notification.innerHTML = `
      <div class="flex items-center">
        <div class="animate-bounce mr-3">
          <span class="text-4xl filter drop-shadow-lg">💧</span>
        </div>
        <div>
          <p class="font-bold text-lg">Time to Drink Water!</p>
          <p class="text-sm opacity-90">10-second hydration reminder</p>
          <div class="w-full bg-white bg-opacity-30 rounded-full h-1 mt-2">
            <div class="bg-white h-1 rounded-full animate-pulse" id="water-progress"></div>
          </div>
        </div>
      </div>
    `
    
    document.body.appendChild(notification)
    
    // Animate progress bar over 10 seconds
    const progressBar = notification.querySelector('#water-progress')
    if (progressBar) {
      progressBar.style.width = '0%'
      progressBar.style.transition = 'width 10s linear'
      setTimeout(() => progressBar.style.width = '100%', 100)
    }
    
    // Remove after 10 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)'
      setTimeout(() => notification.remove(), 500)
    }, 10000)
  }

  // Preload sound when component mounts
  const preloadSound = () => {
    if (audioRef.current) {
      audioRef.current.load()
    }
  }

  return (
    <audio 
      ref={audioRef}
      src="/sounds/alert.mp3"
      preload="auto"
      className="hidden"
      onCanPlayThrough={preloadSound}
    />
  )
}

export default AudioAlert
