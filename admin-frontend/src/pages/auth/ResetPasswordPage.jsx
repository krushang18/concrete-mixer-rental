import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useParams, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../services/authApi'
import PasswordStrengthIndicator from '../../components/common/PasswordStrengthIndicator'

// Password validation schema
const passwordSchema = yup.object({
  newPassword: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .matches(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')  
    .matches(/^(?=.*\d)/, 'Password must contain at least one number')
    .required('Password is required'),
  confirmNewPassword: yup  // Changed from 'confirmPassword' to 'confirmNewPassword'
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required('Password confirmation is required')
})
const ResetPasswordPage = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [tokenError, setTokenError] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    resolver: yupResolver(passwordSchema)
  })

  const watchedPassword = watch('newPassword', '')

  // Check if token exists on mount
  useEffect(() => {
    if (!token) {
      setTokenError(true)
      toast.error('Invalid reset link. Please request a new password reset.')
    }
  }, [token])

const onSubmit = async (data) => {
  if (!token) {
    toast.error('Invalid reset token')
    return
  }

  setIsLoading(true)
  try {
    // Send data with correct field names that backend expects
    const response = await authApi.resetPassword({
      token: token,
      newPassword: data.newPassword,
      confirmNewPassword: data.confirmNewPassword  // Add this field
    })
    
    if (response.success) {
      setResetSuccess(true)
      toast.success(response.message || 'Password reset successfully!')
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 3000)
    } else {
      toast.error(response.message || 'Failed to reset password')
    }
  } catch (error) {
    console.error('Reset password error:', error)
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Failed to reset password. Please try again.'
    
    toast.error(errorMessage)
    
    // If token is invalid/expired, show token error
    if (errorMessage.toLowerCase().includes('token') || 
        errorMessage.toLowerCase().includes('expired')) {
      setTokenError(true)
    }
  } finally {
    setIsLoading(false)
  }
}


  // Token error state
  if (tokenError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-danger-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Invalid Reset Link</h2>
          <p className="text-gray-600">
            This password reset link is invalid or has expired. Please request a new password reset.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  // Success state
  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-success-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Password Reset Successfully
          </h2>
          <p className="text-gray-600">
            Your password has been reset successfully. You will be redirected to the login page shortly.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              Go to Login Now
            </button>
            <p className="text-sm text-gray-500">
              Redirecting automatically in 3 seconds...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Main reset password form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-4 sm:p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Reset Your Password
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Enter your new password below
          </p>
        </div>

        {/* Reset Form */}
        <div className="space-y-4 sm:space-y-5">
          {/* New Password Field */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                {...register('newPassword')}
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                autoComplete="new-password"
                disabled={isLoading}
                placeholder="Enter new password"
                className={`
                  w-full pl-10 pr-12 py-3 border rounded-lg text-base
                  focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  disabled:bg-gray-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  ${errors.newPassword ? 'border-danger-500 focus:ring-danger-500' : 'border-gray-300'}
                `}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors min-w-[44px] justify-center"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-danger-600 text-sm mt-2 flex items-center animate-slide-down">
                <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                {errors.newPassword.message}
              </p>
            )}
          </div>

          {/* Password Strength Indicator */}
          {watchedPassword && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <PasswordStrengthIndicator password={watchedPassword} />
            </div>
          )}

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
<input
  {...register('confirmNewPassword')}  // Changed from 'confirmPassword'
  type={showConfirmPassword ? 'text' : 'password'}
  id="confirmNewPassword"  // Changed ID
  autoComplete="new-password"
  disabled={isLoading}
  placeholder="Confirm new password"
  className={`
    w-full pl-10 pr-12 py-3 border rounded-lg text-base
    focus:ring-2 focus:ring-primary-500 focus:border-primary-500
    disabled:bg-gray-50 disabled:cursor-not-allowed
    transition-all duration-200
    ${errors.confirmNewPassword ? 'border-danger-500 focus:ring-danger-500' : 'border-gray-300'}
  `}
/>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors min-w-[44px] justify-center"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
{errors.confirmNewPassword && (
  <p className="text-danger-600 text-sm mt-2 flex items-center animate-slide-down">
    <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
    {errors.confirmNewPassword.message}
  </p>
)}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading}
            className={`
              w-full flex items-center justify-center px-4 py-3
              text-base font-medium text-white rounded-lg
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
              transition-all duration-200 min-h-[48px]
              ${isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 hover:shadow-lg'
              }
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
                Resetting Password...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Reset Password
              </>
            )}
          </button>

          {/* Back to Login Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              disabled={isLoading}
              className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage