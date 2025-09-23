import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import ForgotPasswordModal from './ForgotPasswordModal'

// Validation schema
const loginSchema = yup.object({
  username: yup
    .string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
})

const LoginForm = ({ onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const { login, isLoading, error } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm({
    resolver: yupResolver(loginSchema)
  })

  const onSubmit = async (data) => {
    try {
      const result = await login(data)
      
      if (result.success) {
        onSuccess?.()
      } else {
        setError('username', { 
          type: 'manual', 
          message: result.error || 'Login failed' 
        })
      }
    } catch (error) {
      setError('username', { 
        type: 'manual', 
        message: 'Login failed. Please try again.' 
      })
    }
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto">
      {/* Header - Enhanced Responsive */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 lg:w-18 lg:h-18 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
          <LogIn className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 text-white" />
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Admin Login
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-xs sm:max-w-sm mx-auto">
          Sign in to access the admin dashboard
        </p>
      </div>

      {/* Error Alert - Enhanced */}
      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-danger-50 border-l-4 border-danger-500 rounded-r-lg animate-slide-down">
          <div className="flex items-center">
            <div className="text-danger-600 text-sm font-medium">
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Login Form - Enhanced Responsive */}
      <div className="space-y-5 sm:space-y-6">
        {/* Username Field */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
            Username
          </label>
          <input
            {...register('username')}
            type="text"
            id="username"
            autoComplete="username"
            disabled={isLoading}
            className={`
              w-full px-3 py-3 sm:px-4 sm:py-3 border rounded-lg text-base
              focus:ring-2 focus:ring-primary-500 focus:border-primary-500
              disabled:bg-gray-50 disabled:cursor-not-allowed
              transition-all duration-200
              ${errors.username ? 'border-danger-500 focus:ring-danger-500' : 'border-gray-300'}
            `}
            placeholder="Enter your username"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-danger-600 animate-slide-down">
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              disabled={isLoading}
              className={`
                w-full px-3 py-3 sm:px-4 sm:py-3 pr-11 sm:pr-12 border rounded-lg text-base
                focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                disabled:bg-gray-50 disabled:cursor-not-allowed
                transition-all duration-200
                ${errors.password ? 'border-danger-500 focus:ring-danger-500' : 'border-gray-300'}
              `}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 min-w-[44px] justify-center"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-danger-600 animate-slide-down">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Button - Enhanced */}
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
          className={`
            w-full flex items-center justify-center px-4 py-3 sm:py-4
            text-base font-medium text-white rounded-lg
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
            transition-all duration-200 min-h-[48px] sm:min-h-[52px]
            ${isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 hover:shadow-lg active:scale-[0.98]'
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5 mr-2" />
              Sign In
            </>
          )}
        </button>
      </div>

      {/* Forgot Password Link - Updated */}
      <div className="mt-6 sm:mt-8 text-center">
        <button 
          type="button"
          onClick={() => setShowForgotPasswordModal(true)}
          disabled={isLoading}
          className="text-sm sm:text-base text-primary-500 hover:text-primary-600 font-medium transition-colors duration-200 min-h-[44px] flex items-center justify-center mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Forgot your password?
        </button>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
    </div>
  )
}

export default LoginForm