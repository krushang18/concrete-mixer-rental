import React from 'react'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary', 
  text,
  className 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const colorClasses = {
    primary: 'text-primary-500',
    white: 'text-white',
    gray: 'text-gray-500'
  }

  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 
          className={clsx(
            'animate-spin',
            sizeClasses[size],
            colorClasses[color]
          )}
        />
        {text && (
          <p className={clsx(
            'text-sm font-medium',
            colorClasses[color]
          )}>
            {text}
          </p>
        )}
      </div>
    </div>
  )
}

export default LoadingSpinner
