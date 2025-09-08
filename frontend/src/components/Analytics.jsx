import React, { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import apiMethods from '../api/api'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const Analytics = () => {
  const [activeTab, setActiveTab] = useState('daily')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    daily: null,
    weekly: null,
    monthly: null,
    hourly: null
  })
  const [timeRange, setTimeRange] = useState({
    daily: 30,
    weekly: 8,
    monthly: 6
  })

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      const [dailyRes, weeklyRes, monthlyRes, hourlyRes] = await Promise.all([
        apiMethods.get(`/water/analytics/daily?days=${timeRange.daily}`),
        apiMethods.get(`/water/analytics/weekly?weeks=${timeRange.weekly}`),
        apiMethods.get(`/water/analytics/monthly?months=${timeRange.monthly}`),
        apiMethods.get('/water/analytics/hourly')
      ])

      setData({
        daily: dailyRes.data,
        weekly: weeklyRes.data,
        monthly: monthlyRes.data,
        hourly: hourlyRes.data
      })
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'daily', name: 'Daily', icon: '📅' },
    { id: 'weekly', name: 'Weekly', icon: '📊' },
    { id: 'monthly', name: 'Monthly', icon: '🗓️' },
    { id: 'hourly', name: 'Hourly', icon: '⏰' }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="card animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="card">
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-water-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Time Range Controls */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {tabs.find(t => t.id === activeTab)?.name} Analytics
          </h2>
          
          {activeTab !== 'hourly' && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Show last:</label>
              <select
                value={timeRange[activeTab]}
                onChange={(e) => setTimeRange(prev => ({
                  ...prev,
                  [activeTab]: parseInt(e.target.value)
                }))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-water-500"
              >
                {activeTab === 'daily' && (
                  <>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                  </>
                )}
                {activeTab === 'weekly' && (
                  <>
                    <option value={4}>4 weeks</option>
                    <option value={8}>8 weeks</option>
                    <option value={12}>12 weeks</option>
                  </>
                )}
                {activeTab === 'monthly' && (
                  <>
                    <option value={3}>3 months</option>
                    <option value={6}>6 months</option>
                    <option value={12}>12 months</option>
                  </>
                )}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Chart Content */}
      {activeTab === 'daily' && <DailyChart data={data.daily} />}
      {activeTab === 'weekly' && <WeeklyChart data={data.weekly} />}
      {activeTab === 'monthly' && <MonthlyChart data={data.monthly} />}
      {activeTab === 'hourly' && <HourlyChart data={data.hourly} />}

      {/* Summary Stats */}
      <SummaryStats data={data} activeTab={activeTab} />
    </div>
  )
}

// Daily Chart Component
const DailyChart = ({ data }) => {
  if (!data?.dailySummary?.length) {
    return <EmptyChart message="No daily data available" />
  }

  const chartData = {
    labels: data.dailySummary.map(item => 
      format(new Date(item.date), 'MMM dd')
    ).reverse(),
    datasets: [
      {
        label: 'Water Intake (ml)',
        data: data.dailySummary.map(item => item.totalAmount).reverse(),
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Daily Water Intake'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Milliliters (ml)'
        }
      }
    }
  }

  return (
    <div className="card">
      <Line data={chartData} options={options} />
    </div>
  )
}

// Weekly Chart Component
const WeeklyChart = ({ data }) => {
  if (!data?.weeklySummary?.length) {
    return <EmptyChart message="No weekly data available" />
  }

  const chartData = {
    labels: data.weeklySummary.map(item => 
      `Week ${item.week}, ${item.year}`
    ).reverse(),
    datasets: [
      {
        label: 'Water Intake (ml)',
        data: data.weeklySummary.map(item => item.totalAmount).reverse(),
        backgroundColor: 'rgba(14, 165, 233, 0.8)',
        borderColor: 'rgb(14, 165, 233)',
        borderWidth: 1
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Weekly Water Intake'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Milliliters (ml)'
        }
      }
    }
  }

  return (
    <div className="card">
      <Bar data={chartData} options={options} />
    </div>
  )
}

// Monthly Chart Component
const MonthlyChart = ({ data }) => {
  if (!data?.monthlySummary?.length) {
    return <EmptyChart message="No monthly data available" />
  }

  const chartData = {
    labels: data.monthlySummary.map(item => 
      `${item.monthName} ${item.year}`
    ).reverse(),
    datasets: [
      {
        label: 'Water Intake (ml)',
        data: data.monthlySummary.map(item => item.totalAmount).reverse(),
        backgroundColor: [
          'rgba(14, 165, 233, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(37, 99, 235, 0.8)',
          'rgba(29, 78, 216, 0.8)',
          'rgba(30, 64, 175, 0.8)',
          'rgba(30, 58, 138, 0.8)'
        ],
        borderColor: 'rgb(14, 165, 233)',
        borderWidth: 1
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Monthly Water Intake'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Milliliters (ml)'
        }
      }
    }
  }

  return (
    <div className="card">
      <Bar data={chartData} options={options} />
    </div>
  )
}

// Hourly Chart Component
const HourlyChart = ({ data }) => {
  if (!data?.hourlyBreakdown?.length) {
    return <EmptyChart message="No hourly data available" />
  }

  const chartData = {
    labels: data.hourlyBreakdown.map(item => item.hourLabel),
    datasets: [
      {
        label: 'Water Intake (ml)',
        data: data.hourlyBreakdown.map(item => item.totalAmount),
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Water Intake by Hour of Day'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Milliliters (ml)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time of Day'
        }
      }
    }
  }

  return (
    <div className="card">
      <Line data={chartData} options={options} />
      {data.summary?.peakHour !== undefined && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Peak Hour:</strong> {data.summary.peakHour.toString().padStart(2, '0')}:00 
            with {data.summary.peakAmount}ml consumed
          </p>
        </div>
      )}
    </div>
  )
}

// Empty Chart Component
const EmptyChart = ({ message }) => (
  <div className="card">
    <div className="text-center py-16">
      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
      </svg>
      <p className="text-gray-500">{message}</p>
      <p className="text-sm text-gray-400 mt-2">Start logging water intake to see your analytics</p>
    </div>
  </div>
)

// Summary Stats Component
const SummaryStats = ({ data, activeTab }) => {
  const currentData = data[activeTab]
  
  if (!currentData?.summary) return null

  const stats = [
    {
      label: 'Total Amount',
      value: `${currentData.summary.totalAmount || 0}ml`,
      icon: '💧',
      color: 'water'
    },
    {
      label: `Average ${activeTab === 'daily' ? 'Daily' : activeTab === 'weekly' ? 'Weekly' : 'Monthly'}`,
      value: `${currentData.summary[`average${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`] || 0}ml`,
      icon: '📊',
      color: 'blue'
    },
    {
      label: activeTab === 'daily' ? 'Days' : activeTab === 'weekly' ? 'Weeks' : 'Months',
      value: currentData.summary[`total${activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -2) + (activeTab === 'daily' ? 'Days' : activeTab === 'weekly' ? 'Weeks' : 'Months')}`] || 0,
      icon: '📅',
      color: 'green'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="card">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${
              stat.color === 'water' ? 'bg-water-100' :
              stat.color === 'blue' ? 'bg-blue-100' :
              'bg-green-100'
            }`}>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default Analytics
