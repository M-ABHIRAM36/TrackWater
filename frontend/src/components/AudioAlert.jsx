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
    const { type, sound } = event.data
    
    if (type === 'PLAY_SOUND' && sound) {
      playAlertSound(sound)
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
              // Auto-play may be blocked or other error
              console.warn('Failed to play alert sound:', error)
            })
        }
      }
    } catch (error) {
      console.error('Error playing alert sound:', error)
    }
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
