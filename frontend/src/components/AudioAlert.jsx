import React, { useEffect, useRef } from 'react'
import { initAudio, playWaterDrops, isAudioSupported } from '../utils/audioGenerator'
import apiMethods from '../api/api'

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
    
    // Add click listener to enable audio on user interaction
    const enableAudioOnClick = () => {
      if (audioRef.current) {
        // Try to play a silent sound to enable audio context
        audioRef.current.volume = 0
        audioRef.current.play().then(() => {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
          audioRef.current.volume = 0.7 // Reset volume
          console.log('[AudioAlert] Audio context enabled by user interaction')
        }).catch(() => {
          console.log('[AudioAlert] Audio context still blocked')
        })
      }
    }
    
    // Enable audio on any user click
    document.addEventListener('click', enableAudioOnClick, { once: true })
    
    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      }
      document.removeEventListener('click', enableAudioOnClick)
    }
  }, [])

  const handleServiceWorkerMessage = (event) => {
    console.log('[AudioAlert] Received message from service worker:', event.data)
    
    const { type, sound, soundUrl, duration, volume, timestamp } = event.data
    
    if (type === 'PLAY_SOUND' && sound) {
      console.log('[AudioAlert] Playing legacy sound:', sound)
      playAlertSound(sound)
    } else if (type === 'PLAY_WATER_ALERT') {
      console.log('[AudioAlert] ✅ Playing water alert:', { soundUrl, duration, volume })
      playWaterAlert(soundUrl, duration, volume)
    } else if (type === 'LOG_WATER_AUTOMATICALLY') {
      console.log('[AudioAlert] 💧 Auto-logging water from notification...')
      handleAutoLogWater(timestamp)
    } else {
      console.log('[AudioAlert] Unknown message type:', type)
    }
  }

  // Handle automatic water logging from service worker
  const handleAutoLogWater = async (timestamp) => {
    try {
      console.log('[AudioAlert] 💧 Attempting to auto-log water...')
      
      const response = await apiMethods.post('/water/log/quick', {
        notes: 'Auto-logged from notification'
      })
      
      if (response.data) {
        const { waterLog, wasDefault } = response.data
        console.log(`[AudioAlert] ✅ Water logged successfully: ${waterLog.amountMl}ml ${wasDefault ? '(default)' : '(custom)'}`)
        
        // Show a brief success visual feedback
        showWaterLoggedSuccess(waterLog.amountMl)
        
        // Refresh the UI by dispatching a custom event
        window.dispatchEvent(new CustomEvent('waterLogged', {
          detail: { amount: waterLog.amountMl, timestamp: waterLog.timestamp }
        }))
      }
    } catch (error) {
      console.error('[AudioAlert] ❌ Failed to auto-log water:', error)
      
      // Show error feedback
      showWaterLoggedError()
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
  
  const playWaterAlert = (soundUrl = '/sounds/alert.mp3', duration = 6000, volume = 0.7) => {
    try {
      console.log(`[AudioAlert] Playing 6-second water alert sound from: ${soundUrl}`)
      
      if (audioRef.current) {
        // Reset audio element
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current.src = soundUrl
        audioRef.current.volume = volume
        audioRef.current.loop = false
        
        // Wait for the audio to load before playing
        const tryToPlay = () => {
          // Log audio element state for debugging
          console.log('[AudioAlert] Audio element state:', {
            src: audioRef.current.src,
            readyState: audioRef.current.readyState,
            volume: audioRef.current.volume,
            duration: audioRef.current.duration,
            paused: audioRef.current.paused,
            muted: audioRef.current.muted
          })
          
          const playPromise = audioRef.current.play()
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log(`[AudioAlert] ✅ Water alert sound started successfully - will play for ${duration}ms`)
                console.log('[AudioAlert] Audio playing state:', {
                  currentTime: audioRef.current.currentTime,
                  duration: audioRef.current.duration,
                  volume: audioRef.current.volume,
                  muted: audioRef.current.muted
                })
                
                // Stop after the specified duration
                setTimeout(() => {
                  if (audioRef.current && !audioRef.current.paused) {
                    audioRef.current.pause()
                    audioRef.current.currentTime = 0
                    console.log('[AudioAlert] ⏹️ Water alert sound stopped after timeout')
                  }
                }, duration)
              })
            .catch(async (error) => {
              console.warn('[AudioAlert] ❌ Failed to play MP3 water alert sound:', error.name, error.message)
              // Try Web Audio API fallback
              console.log('[AudioAlert] Attempting Web Audio API fallback...')
              
              if (isAudioSupported()) {
                try {
                  await initAudio()
                  await playWaterDrops(volume)
                  console.log('[AudioAlert] ✅ Web Audio API fallback successful')
                  return // Success, no need to show visual alert
                } catch (webAudioError) {
                  console.warn('[AudioAlert] ❌ Web Audio API fallback also failed:', webAudioError.message)
                }
              }
              
              // Both audio methods failed, show visual alert with appropriate message
              if (error.name === 'NotAllowedError') {
                console.warn('[AudioAlert] Audio blocked by browser autoplay policy')
                showVisualWaterAlert('Audio blocked - click anywhere to enable')
              } else if (error.name === 'NotSupportedError') {
                console.warn('[AudioAlert] Audio format not supported')
                showVisualWaterAlert('Audio format not supported')
              } else if (error.name === 'AbortError') {
                console.warn('[AudioAlert] Audio playback aborted')
                showVisualWaterAlert('Audio playback interrupted')
              } else {
                console.warn('[AudioAlert] All audio methods failed')
                showVisualWaterAlert('Audio unavailable - visual alert only')
              }
            })
          }
        }
        
        // If audio is ready, play immediately, otherwise wait for it to load
        if (audioRef.current.readyState >= 2) { // HAVE_CURRENT_DATA or better
          tryToPlay()
        } else {
          console.log('[AudioAlert] Audio not ready, waiting for load event...')
          const onCanPlay = () => {
            console.log('[AudioAlert] Audio ready, attempting to play')
            tryToPlay()
          }
          const onError = () => {
            console.error('[AudioAlert] Audio loading error, trying Web Audio API fallback')
            initAudio().then(() => playWaterDrops(volume)).catch(() => 
              showVisualWaterAlert('Audio file error - using visual alert')
            )
          }
          
          audioRef.current.addEventListener('canplay', onCanPlay, { once: true })
          audioRef.current.addEventListener('error', onError, { once: true })
          
          // Only load if not already loading/loaded
          if (audioRef.current.readyState === 0) { // HAVE_NOTHING
            console.log('[AudioAlert] Loading audio file...')
            audioRef.current.load()
          }
        }
      } else {
        console.error('[AudioAlert] Audio element not available')
        showVisualWaterAlert('Audio not available')
      }
    } catch (error) {
      console.error('[AudioAlert] Error in playWaterAlert:', error)
      showVisualWaterAlert('Audio system error')
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
  
  const showVisualWaterAlert = (errorMessage = null) => {
    // Enhanced visual notification for water alert with 10-second animation
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-water-400 to-blue-500 text-white px-8 py-6 rounded-xl shadow-2xl z-50 transform transition-all duration-500'
    
    const subtitle = errorMessage 
      ? `<p class="text-sm opacity-90">🔇 ${errorMessage}</p>`
      : '<p class="text-sm opacity-90">10-second hydration reminder</p>'
    
    notification.innerHTML = `
      <div class="flex items-center">
        <div class="animate-bounce mr-3">
          <span class="text-4xl filter drop-shadow-lg">💧</span>
        </div>
        <div>
          <p class="font-bold text-lg">Time to Drink Water!</p>
          ${subtitle}
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
  
  const showWaterLoggedSuccess = (amount) => {
    // Show success notification for auto-logged water
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-green-400 to-green-600 text-white px-8 py-4 rounded-xl shadow-2xl z-50 transform transition-all duration-500'
    notification.innerHTML = `
      <div class="flex items-center">
        <div class="mr-3">
          <span class="text-2xl filter drop-shadow-lg">🎆</span>
        </div>
        <div>
          <p class="font-bold text-lg">Water Logged!</p>
          <p class="text-sm opacity-90">Added ${amount}ml automatically</p>
        </div>
      </div>
    `
    
    document.body.appendChild(notification)
    
    // Remove after 4 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)'
      setTimeout(() => notification.remove(), 500)
    }, 4000)
  }
  
  const showWaterLoggedError = () => {
    // Show error notification for failed auto-log
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-red-400 to-red-600 text-white px-8 py-4 rounded-xl shadow-2xl z-50 transform transition-all duration-500'
    notification.innerHTML = `
      <div class="flex items-center">
        <div class="mr-3">
          <span class="text-2xl filter drop-shadow-lg">❌</span>
        </div>
        <div>
          <p class="font-bold text-lg">Auto-log Failed</p>
          <p class="text-sm opacity-90">Please log manually in the app</p>
        </div>
      </div>
    `
    
    document.body.appendChild(notification)
    
    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)'
      setTimeout(() => notification.remove(), 500)
    }, 5000)
  }

  // Test sound function for debugging
  const testSound = async (useWebAudio = false) => {
    console.log('[AudioAlert] Testing water alert sound...')
    
    if (useWebAudio) {
      console.log('[AudioAlert] Testing Web Audio API directly')
      try {
        await initAudio()
        await playWaterDrops(0.5)
        console.log('[AudioAlert] Web Audio API test completed')
      } catch (error) {
        console.error('[AudioAlert] Web Audio API test failed:', error)
      }
    } else {
      playWaterAlert('/sounds/alert.mp3', 6000, 0.7) // 6 seconds at 70% volume for testing
    }
  }
  
  // Preload sound when component mounts
  const preloadSound = () => {
    if (audioRef.current) {
      audioRef.current.load()
    }
  }
  
  // Volume test function
  const testVolume = async (testVolume = 1.0) => {
    if (!audioRef.current) {
      console.error('[AudioAlert] No audio element available')
      return
    }
    
    console.log(`[AudioAlert] Testing volume at ${testVolume * 100}%`)
    
    // Reset and prepare audio
    audioRef.current.pause()
    audioRef.current.currentTime = 0
    audioRef.current.volume = testVolume
    audioRef.current.muted = false
    
    console.log('[AudioAlert] Audio element state before test:', {
      volume: audioRef.current.volume,
      muted: audioRef.current.muted,
      readyState: audioRef.current.readyState,
      src: audioRef.current.src
    })
    
    try {
      await audioRef.current.play()
      console.log('✅ Audio playback started successfully')
      
      // Stop after 2 seconds
      setTimeout(() => {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
          console.log('⏹️ Volume test completed')
        }
      }, 2000)
    } catch (error) {
      console.error('❌ Volume test failed:', error.name, error.message)
      
      if (error.name === 'NotAllowedError') {
        console.warn('⚠️ Audio blocked by browser autoplay policy - try clicking on the page first')
      }
    }
  }
  
  // Audio diagnostics function
  const audioDiagnostics = () => {
    if (audioRef.current) {
      console.log('[AudioAlert] Audio Diagnostics:', {
        src: audioRef.current.src,
        volume: audioRef.current.volume,
        muted: audioRef.current.muted,
        readyState: audioRef.current.readyState,
        duration: audioRef.current.duration,
        paused: audioRef.current.paused,
        currentTime: audioRef.current.currentTime,
        autoplay: audioRef.current.autoplay,
        controls: audioRef.current.controls,
        networkState: audioRef.current.networkState
      })
    } else {
      console.log('[AudioAlert] Audio element not available')
    }
    
    console.log('[AudioAlert] System Audio Info:', {
      userAgent: navigator.userAgent,
      audioSupported: isAudioSupported(),
      currentURL: window.location.href,
      hasUserInteracted: document.hasStoredUserActivation || 'unknown'
    })
    
    // Check if page has been interacted with
    console.log('ℹ️ To test volume: window.testVolume(0.8) // 80% volume')
    console.log('ℹ️ To test max volume: window.testVolume(1.0) // 100% volume')
  }
  
  // Manual trigger function for notification sound
  const triggerNotificationSound = () => {
    console.log('[AudioAlert] Manually triggering notification sound...')
    // Simulate the service worker message
    handleServiceWorkerMessage({
      data: {
        type: 'PLAY_WATER_ALERT',
        soundUrl: '/sounds/alert.mp3',
        duration: 6000, // 6 seconds
        volume: 1.0
      }
    })
  }
  
  // Test auto water logging
  const testAutoLogWater = () => {
    console.log('[AudioAlert] Testing auto water logging...')
    handleServiceWorkerMessage({
      data: {
        type: 'LOG_WATER_AUTOMATICALLY',
        timestamp: Date.now()
      }
    })
  }
  
  // Expose test functions globally for debugging
  useEffect(() => {
    window.testWaterAlert = testSound
    window.audioDebug = audioDiagnostics
    window.testVolume = testVolume
    window.triggerNotificationSound = triggerNotificationSound
    window.testAutoLogWater = testAutoLogWater
    return () => {
      delete window.testWaterAlert
      delete window.audioDebug
      delete window.testVolume
      delete window.triggerNotificationSound
      delete window.testAutoLogWater
    }
  }, [])

  return (
    <audio 
      ref={audioRef}
      src="/sounds/alert.mp3"
      preload="metadata"
      className="hidden"
      onCanPlayThrough={() => console.log('[AudioAlert] Audio ready to play')}
      onError={(e) => console.error('[AudioAlert] Audio element error:', e.target.error?.message || 'Unknown error')}
      volume={0.7}
    />
  )
}

export default AudioAlert
