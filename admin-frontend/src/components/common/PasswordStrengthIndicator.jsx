import React from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

const PasswordStrengthIndicator = ({ password }) => {
  // Password requirements
  const requirements = [
    {
      label: 'At least 6 characters',
      test: (pwd) => pwd.length >= 6,
      id: 'length'
    },
    {
      label: 'One lowercase letter',
      test: (pwd) => /[a-z]/.test(pwd),
      id: 'lowercase'
    },
    {
      label: 'One uppercase letter',
      test: (pwd) => /[A-Z]/.test(pwd),
      id: 'uppercase'
    },
    {
      label: 'One number',
      test: (pwd) => /\d/.test(pwd),
      id: 'number'
    }
  ]

  // Calculate strength
  const metRequirements = requirements.filter(req => req.test(password || ''))
  const strength = metRequirements.length
  const hasPassword = password && password.length > 0

  // Strength colors and labels
  const getStrengthColor = () => {
    if (strength === 0) return 'text-gray-400'
    if (strength === 1) return 'text-danger-500'
    if (strength === 2) return 'text-warning-500'
    if (strength === 3) return 'text-blue-500'
    return 'text-success-500'
  }

  const getStrengthLabel = () => {
    if (strength === 0) return 'No password'
    if (strength === 1) return 'Very weak'
    if (strength === 2) return 'Weak'
    if (strength === 3) return 'Good'
    return 'Strong'
  }

  const getStrengthBarColor = (level) => {
    if (level > strength) return 'bg-gray-200'
    if (level === 1) return 'bg-danger-500'
    if (level === 2) return 'bg-warning-500'
    if (level === 3) return 'bg-blue-500'
    return 'bg-success-500'
  }

  // Don't show anything if no password
  if (!hasPassword) return null

  return (
    <div className="space-y-3">
      {/* Strength Indicator */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Password strength:
        </span>
        <span className={`text-sm font-medium ${getStrengthColor()}`}>
          {getStrengthLabel()}
        </span>
      </div>
      
      {/* Strength Bars */}
      <div className="flex space-x-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-2 flex-1 rounded-full transition-colors duration-200 ${getStrengthBarColor(level)}`}
          />
        ))}
      </div>
      
      {/* Requirements Checklist */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Password must contain:
        </p>
        <div className="space-y-1">
          {requirements.map((req) => {
            const isMet = req.test(password || '')
            return (
              <div key={req.id} className="flex items-center text-sm">
                <div className="flex-shrink-0 mr-2">
                  {isMet ? (
                    <CheckCircle2 className="w-4 h-4 text-success-500" />
                  ) : (
                    <div className="w-4 h-4 border border-gray-300 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                    </div>
                  )}
                </div>
                <span className={`${
                  isMet 
                    ? 'text-success-700 font-medium' 
                    : 'text-gray-600'
                }`}>
                  {req.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Overall Status */}
      {strength === 4 && (
        <div className="flex items-center text-sm text-success-700 bg-success-50 rounded-lg p-3">
          <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="font-medium">
            Great! Your password meets all security requirements.
          </span>
        </div>
      )}

      {strength > 0 && strength < 4 && (
        <div className="flex items-center text-sm text-warning-700 bg-warning-50 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>
            Please meet all requirements for a secure password.
          </span>
        </div>
      )}
    </div>
  )
}

export default PasswordStrengthIndicator