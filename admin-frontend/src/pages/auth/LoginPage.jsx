import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import LoginForm from '../../components/auth/LoginForm'
import useAuthStore from '../../store/authStore'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const handleLoginSuccess = () => {
    const from = location.state?.from?.pathname || '/dashboard'
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Background Card */}
        <div className="bg-white rounded-2xl shadow-mobile-lg p-6 sm:p-8">
          <LoginForm onSuccess={handleLoginSuccess} />
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Concrete Mixer Rental Admin Portal
          </p>
          <p className="text-xs text-gray-400 mt-1">
            © 2024 All rights reserved
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
