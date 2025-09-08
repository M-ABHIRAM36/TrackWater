import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuth()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await login(formData.email, formData.password)
      
      if (!result.success) {
        setError(result.error)
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-water-400 to-water-600 flex items-center justify-center shadow-lg animate-float">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.1L5.1 8.9C3.2 10.8 3.2 13.9 5.1 15.8C7 17.7 10.1 17.7 12 15.8C13.9 17.7 17 17.7 18.9 15.8C20.8 13.9 20.8 10.8 18.9 8.9L12 2.1M12 4.5L16.9 9.5C18.3 10.8 18.3 12.9 16.9 14.3C15.5 15.7 13.4 15.7 12 14.3C10.6 15.7 8.5 15.7 7.1 14.3C5.7 12.9 5.7 10.8 7.1 9.5L12 4.5Z"/>
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Stay hydrated with smart reminders</p>
        </div>

        {/* Login Form */}
        <div className="card animate-slide-up">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input"
                placeholder="Enter your password"
                required
                disabled={loading}
                minLength="6"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center py-3"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link 
                to="/signup" 
                className="text-water-600 font-medium hover:text-water-700 transition-colors duration-200"
              >
                Create one here
              </Link>
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4">
            <div className="w-12 h-12 mx-auto bg-water-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-water-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Smart Reminders</h3>
            <p className="text-sm text-gray-600">Get hourly notifications to stay hydrated</p>
          </div>
          
          <div className="p-4">
            <div className="w-12 h-12 mx-auto bg-water-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-water-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Track Progress</h3>
            <p className="text-sm text-gray-600">Monitor your daily water intake</p>
          </div>
          
          <div className="p-4">
            <div className="w-12 h-12 mx-auto bg-water-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-water-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 11H7v9a2 2 0 002 2h8a2 2 0 002-2V9h-2v11H9v-9zm3-7c-1.1 0-2 .9-2 2v4h4V6c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Stay Healthy</h3>
            <p className="text-sm text-gray-600">Build better hydration habits</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
