/**
 * Web Audio API Sound Generator
 * Creates water drop sounds and alert tones when audio files are not available
 */

class AudioGenerator {
  constructor() {
    this.audioContext = null;
    this.initialized = false;
  }

  /**
   * Initialize audio context (requires user interaction)
   */
  async init() {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
      console.log('[AudioGenerator] Audio context initialized');
    } catch (error) {
      console.error('[AudioGenerator] Failed to initialize audio context:', error);
      throw error;
    }
  }

  /**
   * Create water drop sound effect
   * @param {number} frequency - Base frequency (default: 800Hz)
   * @param {number} duration - Duration in milliseconds (default: 200ms)
   * @param {number} volume - Volume level (0-1, default: 0.3)
   */
  createWaterDrop(frequency = 800, duration = 200, volume = 0.3) {
    if (!this.initialized || !this.audioContext) {
      console.warn('[AudioGenerator] Audio context not initialized');
      return Promise.reject(new Error('Audio context not initialized'));
    }

    return new Promise((resolve) => {
      // Create oscillator for the water drop sound
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      // Connect audio nodes
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Set up water drop sound characteristics
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      
      // Create dropping effect by reducing frequency
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 0.3, 
        this.audioContext.currentTime + duration / 1000
      );
      
      // Create volume envelope (quick attack, slow decay)
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration / 1000);
      
      // Start and stop the sound
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
      
      oscillator.onended = () => {
        resolve();
      };
    });
  }

  /**
   * Create gentle bell sound
   * @param {number} frequency - Base frequency (default: 523.25Hz - C5)
   * @param {number} duration - Duration in milliseconds (default: 1000ms)
   * @param {number} volume - Volume level (0-1, default: 0.2)
   */
  createBell(frequency = 523.25, duration = 1000, volume = 0.2) {
    if (!this.initialized || !this.audioContext) {
      console.warn('[AudioGenerator] Audio context not initialized');
      return Promise.reject(new Error('Audio context not initialized'));
    }

    return new Promise((resolve) => {
      // Create multiple oscillators for bell harmonics
      const fundamentalOsc = this.audioContext.createOscillator();
      const harmonic2 = this.audioContext.createOscillator();
      const harmonic3 = this.audioContext.createOscillator();
      
      const gainNode = this.audioContext.createGain();
      const harmonic2Gain = this.audioContext.createGain();
      const harmonic3Gain = this.audioContext.createGain();
      
      // Connect oscillators
      fundamentalOsc.connect(gainNode);
      harmonic2.connect(harmonic2Gain);
      harmonic3.connect(harmonic3Gain);
      
      gainNode.connect(this.audioContext.destination);
      harmonic2Gain.connect(this.audioContext.destination);
      harmonic3Gain.connect(this.audioContext.destination);
      
      // Set frequencies (bell harmonics)
      fundamentalOsc.frequency.value = frequency;
      harmonic2.frequency.value = frequency * 2.76;
      harmonic3.frequency.value = frequency * 5.4;
      
      // Set oscillator types
      fundamentalOsc.type = 'sine';
      harmonic2.type = 'sine';
      harmonic3.type = 'sine';
      
      // Set volumes for harmonics
      harmonic2Gain.gain.value = volume * 0.3;
      harmonic3Gain.gain.value = volume * 0.1;
      
      // Create bell envelope (quick attack, long decay)
      const durationSec = duration / 1000;
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + durationSec);
      
      // Start all oscillators
      const startTime = this.audioContext.currentTime;
      fundamentalOsc.start(startTime);
      harmonic2.start(startTime);
      harmonic3.start(startTime);
      
      // Stop all oscillators
      fundamentalOsc.stop(startTime + durationSec);
      harmonic2.stop(startTime + durationSec);
      harmonic3.stop(startTime + durationSec);
      
      fundamentalOsc.onended = () => {
        resolve();
      };
    });
  }

  /**
   * Play 10-second water alert sequence
   * @param {number} volume - Volume level (0-1, default: 0.3)
   */
  async playWaterAlertSequence(volume = 0.3) {
    if (!this.initialized) {
      await this.init();
    }

    console.log('[AudioGenerator] Playing 10-second water alert sequence');

    try {
      // Play gentle bell to start
      await this.createBell(523.25, 1000, volume);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Play water drops pattern for remaining time
      const dropPattern = [
        { freq: 800, delay: 0 },
        { freq: 600, delay: 300 },
        { freq: 900, delay: 600 },
        { freq: 700, delay: 900 },
        { freq: 850, delay: 1200 },
        { freq: 650, delay: 1500 },
        { freq: 750, delay: 1800 },
        { freq: 950, delay: 2100 },
        { freq: 600, delay: 2400 },
        { freq: 800, delay: 2700 }
      ];

      const dropPromises = dropPattern.map(({ freq, delay }) => 
        new Promise(resolve => 
          setTimeout(() => {
            this.createWaterDrop(freq, 200, volume * 0.8).then(resolve);
          }, delay)
        )
      );

      await Promise.all(dropPromises);
      
      // Final bell at the end
      await new Promise(resolve => setTimeout(resolve, 3000));
      await this.createBell(659.25, 1500, volume); // E5 note
      
      console.log('[AudioGenerator] Water alert sequence completed');
    } catch (error) {
      console.error('[AudioGenerator] Error playing water alert sequence:', error);
      throw error;
    }
  }

  /**
   * Test if audio context is available
   */
  static isSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }
}

// Create global instance
const audioGenerator = new AudioGenerator();

// Export functions for use
export const initAudio = () => audioGenerator.init();
export const playWaterDrops = (volume = 0.3) => audioGenerator.playWaterAlertSequence(volume);
export const playBell = (freq = 523.25, duration = 1000, volume = 0.2) => audioGenerator.createBell(freq, duration, volume);
export const isAudioSupported = AudioGenerator.isSupported;

// Expose globally for debugging
if (typeof window !== 'undefined') {
  window.audioGenerator = {
    init: initAudio,
    playWaterAlert: playWaterDrops,
    playBell,
    isSupported: isAudioSupported
  };
}

export default audioGenerator;
