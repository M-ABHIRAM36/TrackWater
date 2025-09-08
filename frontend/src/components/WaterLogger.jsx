import React, { useState, useEffect } from 'react'
import apiMethods from '../api/api'

const WaterLogger = ({ onWaterLogged, todayTotal = 0, dailyGoal = 2000 }) => {
  const [isLogging, setIsLogging] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [recentLogs, setRecentLogs] = useState([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  
  // Pre-defined water amounts
  const presetAmounts = [
    { amount: 100, label: 'Half Glass', icon: '🥛', type: 'half-glass' },
    { amount: 200, label: 'Full Glass', icon: '🥤', type: 'full-glass' },
    { amount: 500, label: 'Bottle', icon: '🍼', type: 'half-liter' },
    { amount: 1000, label: 'Large Bottle', icon: '🚰', type: 'liter' }
  ]

  useEffect(() => {
    loadRecentLogs()
  }, [])

  const loadRecentLogs = async () => {
    try {
      const response = await apiMethods.get('/water/logs', { 
        params: { limit: 5 } 
      })
      setRecentLogs(response.data.logs || [])
    } catch (error) {
      console.error('Failed to load recent logs:', error)
    } finally {
      setLoadingRecent(false)
    }
  }

  const logWater = async (amount, type = 'custom') => {
    if (isLogging || !amount || amount <= 0) return

    setIsLogging(true)
    
    try {
      const response = await apiMethods.post('/water/log', {
        amountMl: parseInt(amount),
        type: type,
        timestamp: new Date().toISOString()
      })

      // Update recent logs
      await loadRecentLogs()
      
      // Notify parent component
      if (onWaterLogged) {
        onWaterLogged(parseInt(amount))
      }

      // Reset custom amount
      if (showCustom) {
        setCustomAmount('')
        setShowCustom(false)
      }

      // Show success feedback
      showSuccessToast(amount)

    } catch (error) {
      console.error('Failed to log water:', error)
      showErrorToast()
    } finally {
      setIsLogging(false)
    }
  }

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    const amount = parseInt(customAmount)
    
    if (amount && amount > 0 && amount <= 2000) {
      logWater(amount, 'custom')
    }
  }

  const showSuccessToast = (amount) => {
    // Simple toast notification
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up'
    toast.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
        Logged ${amount}ml of water! 💧
      </div>
    `
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 3000)
  }

  const showErrorToast = () => {
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up'
    toast.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        Failed to log water. Please try again.
      </div>
    `
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 3000)
  }

  const deleteLog = async (logId) => {
    try {
      await apiMethods.delete(`/water/logs/${logId}`)
      await loadRecentLogs()
      if (onWaterLogged) {
        onWaterLogged(-1) // Trigger refresh
      }
    } catch (error) {
      console.error('Failed to delete log:', error)
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const progressPercentage = Math.min((todayTotal / dailyGoal) * 100, 100)

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Progress</h3>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{todayTotal}ml</span>
            <span>{dailyGoal}ml goal</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              className="h-4 bg-gradient-to-r from-water-400 to-water-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          <div className="mt-2 text-center">
            <span className={`text-sm font-medium ${
              progressPercentage >= 100 ? 'text-green-600' : 'text-water-600'
            }`}>
              {Math.round(progressPercentage)}% complete
            </span>
            {progressPercentage >= 100 && (
              <span className="ml-2 text-lg">🎉</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Log Buttons */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Add</h3>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          {presetAmounts.map((preset) => (
            <button
              key={preset.amount}
              onClick={() => logWater(preset.amount, preset.type)}
              disabled={isLogging}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-water-300 hover:bg-water-50 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-center">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">
                  {preset.icon}
                </div>
                <div className="font-medium text-gray-900">{preset.amount}ml</div>
                <div className="text-sm text-gray-500">{preset.label}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="border-t pt-4">
          {!showCustom ? (
            <button
              onClick={() => setShowCustom(true)}
              className="w-full btn-outline flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              Custom Amount
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3">
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Amount in ml"
                  min="1"
                  max="2000"
                  className="flex-1 input"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isLogging || !customAmount}
                  className="btn-primary"
                >
                  Add
                </button>
              </div>
              
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustom(false)
                    setCustomAmount('')
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <span className="text-xs text-gray-500">Max: 2000ml</span>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Recent Logs */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Entries</h3>
        
        {loadingRecent ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : recentLogs.length > 0 ? (
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div key={log._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-water-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-water-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.1L5.1 8.9C3.2 10.8 3.2 13.9 5.1 15.8C7 17.7 10.1 17.7 12 15.8C13.9 17.7 17 17.7 18.9 15.8C20.8 13.9 20.8 10.8 18.9 8.9L12 2.1Z"/>
                    </svg>
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-900">{log.amountMl}ml</div>
                    <div className="text-sm text-gray-500">{formatTime(log.timestamp)}</div>
                  </div>
                </div>
                
                <button
                  onClick={() => deleteLog(log._id)}
                  className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                  title="Delete entry"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.1L5.1 8.9C3.2 10.8 3.2 13.9 5.1 15.8C7 17.7 10.1 17.7 12 15.8C13.9 17.7 17 17.7 18.9 15.8C20.8 13.9 20.8 10.8 18.9 8.9L12 2.1Z"/>
            </svg>
            <p>No water logged today yet.</p>
            <p className="text-sm">Start by adding your first entry above!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default WaterLogger
