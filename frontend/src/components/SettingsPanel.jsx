import React, { useState, useEffect } from 'react'
import { useAuth } from '../App'
import NotificationToggle from './NotificationToggle'
import apiMethods from '../api/api'

/**
 * Settings Panel Component
 * 
 * Allows users to configure:
 * - Notification timing (start/end hours)
 * - Daily water goal
 * - Push notification preferences
 * - Account settings
 */
const SettingsPanel = ({ user }) => {
  const { updateUser } = useAuth()
  const [settings, setSettings] = useState({
    dailyGoal: user?.dailyGoal || 2000,
    defaultWaterAmount: user?.defaultWaterAmount || 250,
    notificationStartHour: user?.notificationStartHour || 5,
    notificationEndHour: user?.notificationEndHour || 0,
    notificationFrequency: user?.notificationFrequency || '1hr',
    notificationsEnabled: user?.notificationsEnabled || true,
    name: user?.name || '',
    email: user?.email || ''
  })
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})

  // Update local settings when user prop changes
  useEffect(() => {
    if (user) {
      setSettings({
        dailyGoal: user.dailyGoal || 2000,
        defaultWaterAmount: user.defaultWaterAmount || 250,
        notificationStartHour: user.notificationStartHour || 5,
        notificationEndHour: user.notificationEndHour || 0,
        notificationFrequency: user.notificationFrequency || '1hr',
        notificationsEnabled: user.notificationsEnabled || true,
        name: user.name || '',
        email: user.email || ''
      })
    }
  }, [user])

  // Format hour for display (12-hour format with AM/PM)
  const formatHour = (hour) => {
    if (hour === 0) return '12:00 AM (Midnight)'
    if (hour < 12) return `${hour}:00 AM`
    if (hour === 12) return '12:00 PM (Noon)'
    return `${hour - 12}:00 PM`
  }

  // Validate settings
  const validateSettings = () => {
    const errors = {}
    
    if (settings.dailyGoal < 500) {
      errors.dailyGoal = 'Daily goal must be at least 500ml'
    }
    if (settings.dailyGoal > 5000) {
      errors.dailyGoal = 'Daily goal cannot exceed 5000ml'
    }
    if (settings.defaultWaterAmount < 50) {
      errors.defaultWaterAmount = 'Default amount must be at least 50ml'
    }
    if (settings.defaultWaterAmount > 1000) {
      errors.defaultWaterAmount = 'Default amount cannot exceed 1000ml'
    }
    if (settings.name.length > 50) {
      errors.name = 'Name cannot exceed 50 characters'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle input changes
  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
    setSaveStatus(null)
  }

  // Save settings
  const handleSave = async () => {
    if (!validateSettings()) {
      setSaveStatus({ type: 'error', message: 'Please fix validation errors' })
      return
    }

    setLoading(true)
    setSaveStatus(null)
    
    try {
      const result = await updateUser({
        name: settings.name,
        dailyGoal: settings.dailyGoal,
        defaultWaterAmount: settings.defaultWaterAmount,
        notificationStartHour: settings.notificationStartHour,
        notificationEndHour: settings.notificationEndHour,
        notificationFrequency: settings.notificationFrequency,
        notificationsEnabled: settings.notificationsEnabled
      })

      if (result.success) {
        setSaveStatus({ type: 'success', message: 'Settings saved successfully!' })
        setTimeout(() => setSaveStatus(null), 3000)
      } else {
        setSaveStatus({ type: 'error', message: result.error || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus({ type: 'error', message: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // Get notification timing description
  const getTimingDescription = () => {
    const start = settings.notificationStartHour
    const end = settings.notificationEndHour
    const frequency = settings.notificationFrequency
    
    let frequencyText
    switch (frequency) {
      case '1min':
        frequencyText = 'reminders every minute (testing mode)'
        break
      case '30min':
        frequencyText = 'reminders every 30 minutes'
        break
      case '2hr':
        frequencyText = 'reminders every 2 hours'
        break
      case '1hr':
      default:
        frequencyText = 'hourly reminders'
    }
    
    if (end === 0) {
      return `You'll receive ${frequencyText} from ${formatHour(start)} until midnight`
    } else if (start <= end) {
      return `You'll receive ${frequencyText} from ${formatHour(start)} to ${formatHour(end)}`
    } else {
      return `You'll receive ${frequencyText} from ${formatHour(start)} to ${formatHour(end)} (next day)`
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Notification Settings */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">🔔 Notification Settings</h3>
            <p className="text-sm text-gray-600">Configure when you want to receive hydration reminders</p>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Push Notification Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Push Notifications
            </label>
            <NotificationToggle />
          </div>

          {/* Notification Timing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Start Hour */}
            <div>
              <label htmlFor="startHour" className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <select
                id="startHour"
                value={settings.notificationStartHour}
                onChange={(e) => handleInputChange('notificationStartHour', parseInt(e.target.value))}
                className="input-field"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {formatHour(i)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">When to start sending reminders</p>
            </div>

            {/* End Hour */}
            <div>
              <label htmlFor="endHour" className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <select
                id="endHour"
                value={settings.notificationEndHour}
                onChange={(e) => handleInputChange('notificationEndHour', parseInt(e.target.value))}
                className="input-field"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {formatHour(i)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">When to stop sending reminders</p>
            </div>
          </div>

          {/* Notification Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Notification Frequency
            </label>
            <div className={`grid grid-cols-1 gap-3 ${settings.email === 'abhi.storage36@gmail.com' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
              {[
                // Special 1min option for testing (only for specific email)
                ...(settings.email === 'abhi.storage36@gmail.com' ? [
                  { value: '1min', label: '1 minute', desc: '🧪 Testing mode', icon: '⚡' }
                ] : []),
                { value: '30min', label: '30 minutes', desc: 'More frequent reminders', icon: '⏱️' },
                { value: '1hr', label: '1 hour', desc: 'Standard reminders', icon: '⏰' },
                { value: '2hr', label: '2 hours', desc: 'Less frequent reminders', icon: '📅' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleInputChange('notificationFrequency', option.value)}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    settings.notificationFrequency === option.value
                      ? 'border-water-300 bg-water-50 ring-2 ring-water-200'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.desc}</div>
                    </div>
                    {settings.notificationFrequency === option.value && (
                      <svg className="w-5 h-5 text-water-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Choose how often you want to receive hydration reminders within your selected time window
            </p>
          </div>

          {/* Timing Description */}
          <div className="p-4 bg-water-50 border border-water-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-water-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <p className="text-sm text-water-800">{getTimingDescription()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hydration Goals */}
      <div className="card">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">🎯 Hydration Goals</h3>
          <p className="text-sm text-gray-600">Set your daily water intake target</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="dailyGoal" className="block text-sm font-medium text-gray-700 mb-2">
              Daily Water Goal (ml)
            </label>
            <input
              id="dailyGoal"
              type="number"
              min="500"
              max="5000"
              step="50"
              value={settings.dailyGoal}
              onChange={(e) => handleInputChange('dailyGoal', parseInt(e.target.value) || 2000)}
              className={`input-field ${validationErrors.dailyGoal ? 'border-red-300 focus:border-red-500' : ''}`}
            />
            {validationErrors.dailyGoal && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.dailyGoal}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Recommended: 2000ml (2 liters) per day for adults
            </p>
          </div>

          {/* Goal Presets */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Quick presets:</span>
            {[1500, 2000, 2500, 3000].map(goal => (
              <button
                key={goal}
                type="button"
                onClick={() => handleInputChange('dailyGoal', goal)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  settings.dailyGoal === goal
                    ? 'bg-water-100 border-water-300 text-water-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {goal}ml
              </button>
            ))}
          </div>

          {/* Default Water Amount */}
          <div className="pt-4 border-t border-gray-200">
            <div>
              <label htmlFor="defaultWaterAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Default Notification Amount (ml)
              </label>
              <input
                id="defaultWaterAmount"
                type="number"
                min="50"
                max="1000"
                step="25"
                value={settings.defaultWaterAmount}
                onChange={(e) => handleInputChange('defaultWaterAmount', parseInt(e.target.value) || 250)}
                className={`input-field ${validationErrors.defaultWaterAmount ? 'border-red-300 focus:border-red-500' : ''}`}
              />
              {validationErrors.defaultWaterAmount && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.defaultWaterAmount}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                💧 Amount logged when you click "Drink Water" on notifications (saves time!)
              </p>
            </div>

            {/* Default Amount Presets */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-sm text-gray-600">Quick amounts:</span>
              {[150, 200, 250, 300, 350, 500].map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleInputChange('defaultWaterAmount', amount)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    settings.defaultWaterAmount === amount
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {amount}ml
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="card">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">👤 Account Information</h3>
          <p className="text-sm text-gray-600">Update your personal information</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              id="name"
              type="text"
              value={settings.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`input-field ${validationErrors.name ? 'border-red-300 focus:border-red-500' : ''}`}
              placeholder="Enter your name"
            />
            {validationErrors.name && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={settings.email}
              readOnly
              className="input-field bg-gray-50 cursor-not-allowed"
              title="Email cannot be changed"
            />
            <p className="text-xs text-gray-500 mt-1">Email address cannot be modified</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {saveStatus && (
            <div className={`flex items-center space-x-2 text-sm ${
              saveStatus.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                {saveStatus.type === 'success' ? (
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                ) : (
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                )}
              </svg>
              <span>{saveStatus.message}</span>
            </div>
          )}
        </div>
        
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default SettingsPanel
