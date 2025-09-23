import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import LoadingSpinner from '../common/LoadingSpinner'

const ProtectedRoute = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState(true)
  const { 
    isAuthenticated, 
    initializeAuth, 
    _hasHydrated,
    token 
  } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    const initialize = async () => {
      // Wait for store to hydrate from localStorage
      if (!_hasHydrated) {
        return
      }

      // If we have a token after hydration, verify it
      if (token) {
        await initializeAuth()
      }
      
      setIsInitializing(false)
    }
    
    initialize()
  }, [_hasHydrated, token, initializeAuth])

  // Show loading while initializing or hydrating
  if (isInitializing || !_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" text="Loading..." />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    )
  }

  return children
}

export default ProtectedRoute