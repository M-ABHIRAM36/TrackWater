import React, { useState, useEffect } from 'react'
import { useAuth } from '../App'
import WaterLogger from '../components/WaterLogger'
import Analytics from '../components/Analytics'
import NotificationToggle from '../components/NotificationToggle'
import SettingsPanel from '../components/SettingsPanel'
import apiMethods from '../api/api'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('log')
  const [todayData, setTodayData] = useState({
    totalAmount: 0,
    entryCount: 0,
    recentEntries: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTodayData()
    
    // Listen for water logged events from notifications
    const handleWaterLoggedEvent = (event) => {
      console.log('[Dashboard] Water logged from notification, refreshing data')
      loadTodayData()
    }
    
    window.addEventListener('waterLogged', handleWaterLoggedEvent)
    
    return () => {
      window.removeEventListener('waterLogged', handleWaterLoggedEvent)
    }
  }, [])

  const loadTodayData = async () => {
    try {
      const response = await apiMethods.get('/water/analytics/today')
      setTodayData(response.data.today)
    } catch (error) {
      console.error('Failed to load today\'s data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleWaterLogged = (amount) => {
    // Refresh today's data when water is logged
    loadTodayData()
  }

  const formatGreeting = () => {
    const hour = new Date().getHours()
    let greeting = 'Good Morning'
    
    if (hour >= 12 && hour < 17) greeting = 'Good Afternoon'
    else if (hour >= 17) greeting = 'Good Evening'
    
    return greeting
  }

  const tabs = [
    { id: 'log', name: 'Log Water', icon: '💧' },
    { id: 'analytics', name: 'Analytics', icon: '📊' },
    { id: 'settings', name: 'Settings', icon: '⚙️' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-water-500 animate-spin mb-4">
            <div className="w-12 h-12 bg-white rounded-full m-2"></div>
          </div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-water-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-water-400 to-water-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.1L5.1 8.9C3.2 10.8 3.2 13.9 5.1 15.8C7 17.7 10.1 17.7 12 15.8C13.9 17.7 17 17.7 18.9 15.8C20.8 13.9 20.8 10.8 18.9 8.9L12 2.1Z"/>
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Hydration Reminder</h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {formatGreeting()}, {user?.name || 'User'}!
                </p>
                <p className="text-xs text-gray-500">Stay hydrated today</p>
              </div>
              
              <div className="relative">
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  title="Logout"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  <span className="hidden sm:block">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-water-500 text-water-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-water-100">
                <svg className="w-6 h-6 text-water-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.1L5.1 8.9C3.2 10.8 3.2 13.9 5.1 15.8C7 17.7 10.1 17.7 12 15.8C13.9 17.7 17 17.7 18.9 15.8C20.8 13.9 20.8 10.8 18.9 8.9L12 2.1Z"/>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Today's Intake</p>
                <p className="text-2xl font-bold text-gray-900">{todayData.totalAmount}ml</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 11H7v9a2 2 0 002 2h8a2 2 0 002-2V9h-2v11H9v-9zm3-7c-1.1 0-2 .9-2 2v4h4V6c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Daily Goal</p>
                <p className="text-2xl font-bold text-gray-900">{user?.dailyGoal || 2000}ml</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Entries Today</p>
                <p className="text-2xl font-bold text-gray-900">{todayData.entryCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'log' && (
            <div className="max-w-2xl mx-auto">
              <WaterLogger
                onWaterLogged={handleWaterLogged}
                todayTotal={todayData.totalAmount}
                dailyGoal={user?.dailyGoal || 2000}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <Analytics />
          )}

          {activeTab === 'settings' && (
            <SettingsPanel user={user} />
          )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard

