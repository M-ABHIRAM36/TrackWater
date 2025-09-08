import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import AudioAlert from './components/AudioAlert'
import apiMethods, { api } from './api/api'

// Auth Context
const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token')
      if (storedToken) {
        try {
          // Verify token and get user data
          apiMethods.setToken(storedToken)
          const response = await apiMethods.get('/auth/me')
          setUser(response.data.user)
          setToken(storedToken)
        } catch (error) {
          console.error('Token verification failed:', error)
        localStorage.removeItem('token')
        apiMethods.setToken(null)
          setToken(null)
        }
      }
      setLoading(false)
    }

    initializeAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await apiMethods.post('/auth/login', { email, password })
      const { user: userData, token: userToken } = response.data
      
      setUser(userData)
      setToken(userToken)
      localStorage.setItem('token', userToken)
      apiMethods.setToken(userToken)
      
      return { success: true, user: userData }
    } catch (error) {
      console.error('Login failed:', error)
      const errorMessage = error.response?.data?.message || 'Login failed'
      return { success: false, error: errorMessage }
    }
  }

  const signup = async (email, password, name) => {
    try {
      const response = await apiMethods.post('/auth/signup', { email, password, name })
      const { user: userData, token: userToken } = response.data
      
      setUser(userData)
      setToken(userToken)
      localStorage.setItem('token', userToken)
      apiMethods.setToken(userToken)
      
      return { success: true, user: userData }
    } catch (error) {
      console.error('Signup failed:', error)
      const errorMessage = error.response?.data?.message || 'Signup failed'
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    apiMethods.setToken(null)
  }

  const updateUser = async (updates) => {
    try {
      const response = await apiMethods.put('/auth/profile', updates)
      setUser(response.data.user)
      return { success: true, user: response.data.user }
    } catch (error) {
      console.error('Profile update failed:', error)
      const errorMessage = error.response?.data?.message || 'Profile update failed'
      return { success: false, error: errorMessage }
    }
  }

  const value = {
    user,
    token,
    login,
    signup,
    logout,
    updateUser,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

// Loading Component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-water-50 to-blue-50">
    <div className="text-center">
      <div className="mb-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-water-500 flex items-center justify-center animate-pulse-slow">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2c-4.97 0-9 4.03-9 9 0 4.97 4.03 9 9 9s9-4.03 9-9c0-4.97-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z"/>
            <path d="M12 6c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z"/>
          </svg>
        </div>
      </div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Hydration Reminder</h2>
      <p className="text-gray-500">Loading your hydration journey...</p>
    </div>
  </div>
)

// Main App Component
const App = () => {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-water-50 to-blue-50">
          <AudioAlert />
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              } 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Default Route */}
            <Route 
              path="/" 
              element={<Navigate to="/dashboard" replace />} 
            />
            
            {/* 404 Route */}
            <Route 
              path="*" 
              element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-700 mb-4">404</h1>
                    <p className="text-gray-500 mb-8">Page not found</p>
                    <button 
                      onClick={() => window.location.href = '/'}
                      className="btn-primary"
                    >
                      Go Home
                    </button>
                  </div>
                </div>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

export default App
