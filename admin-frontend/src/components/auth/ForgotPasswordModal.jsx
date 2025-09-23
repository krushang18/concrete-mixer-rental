import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { X, Mail, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../services/authApi'

// Email validation schema
const emailSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required')
})

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: yupResolver(emailSchema)
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const response = await authApi.forgotPassword(data.email)
      
      if (response.success) {
        setEmailSent(true)
        toast.success(response.message || 'Password reset email sent successfully!')
        
        // Log development info if available
        if (response.dev_info) {
          console.log('Development Info:', response.dev_info)
        }
      } else {
        toast.error(response.message || 'Failed to send password reset email')
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      toast.error(
        error.response?.data?.message || 
        error.message || 
        'Failed to send password reset email. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmailSent(false)
    setIsLoading(false)
    reset()
    onClose()
  }

  // Don't render if not open
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Forgot Password
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {!emailSent ? (
            <div className="space-y-4 sm:space-y-5">
              <div>
                <p className="text-sm sm:text-base text-gray-600 mb-4">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                
                {/* Email Input */}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="Enter your email address"
                    autoComplete="email"
                    disabled={isLoading}
                    className={`
                      w-full pl-10 pr-4 py-3 border rounded-lg text-base
                      focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                      disabled:bg-gray-50 disabled:cursor-not-allowed
                      transition-all duration-200
                      ${errors.email ? 'border-danger-500 focus:ring-danger-500' : 'border-gray-300'}
                    `}
                  />
                </div>
                
                {/* Error Message */}
                {errors.email && (
                  <p className="text-danger-600 text-sm mt-2 flex items-center animate-slide-down">
                    <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Send Reset Link Button */}
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
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Reset Link
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Success State */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Check Your Email
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  We've sent password reset instructions to your email address. 
                  Please check your inbox and follow the link to reset your password.
                </p>
                <p className="text-xs text-gray-500">
                  Don't see the email? Check your spam folder.
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors font-medium"
              >
                Got it
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordModal