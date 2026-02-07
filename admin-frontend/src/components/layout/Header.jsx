import React, { useState } from 'react'
import { Menu, Bell, User, LogOut, ChevronDown } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { clsx } from 'clsx'

const Header = ({ onMenuClick, isMobile, sidebarOpen }) => {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout()
    }
    setShowUserMenu(false)
  }

  // Enhanced menu click handler
  const handleMenuClick = () => {
    console.log('Menu button clicked, isMobile:', isMobile, 'sidebarOpen:', sidebarOpen)
    onMenuClick()
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left Section */}
        <div className="flex items-center min-w-0 flex-1">
          {/* Mobile Menu Button - ENHANCED */}
          {isMobile && (
            <button
              onClick={handleMenuClick}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg mr-3 transition-colors duration-200 touch-manipulation"
              aria-label="Open menu"
              type="button"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
          
          {/* Title */}
          <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
            {isMobile ? 'CM Admin' : 'Admin Dashboard'}
          </h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Notifications
          // <button 
          //   className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg relative transition-colors duration-200"
          //   aria-label="Notifications"
          // >
          //   <Bell className="w-5 h-5" />
          //   <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
          // </button> */}

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 md:space-x-3 p-1 md:p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              {/* User Avatar */}
              <div className="w-8 h-8 md:w-9 md:h-9 bg-primary-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              
              {/* User Info - Hidden on small mobile */}
              <div className="hidden sm:block text-left">
                <p className="text-sm md:text-base font-medium text-gray-900 leading-tight">
                  {user?.username}
                </p>
                <p className="text-xs md:text-sm text-gray-500 leading-tight">
                  Administrator
                </p>
              </div>

              {/* Dropdown Arrow */}
              <ChevronDown className={clsx(
                "hidden sm:block w-4 h-4 text-gray-400 transition-transform duration-200",
                showUserMenu && "transform rotate-180"
              )} />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                    <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                    <p className="text-xs text-gray-500">Administrator</p>
                  </div>
                  
                  {/* <button
                    onClick={() => {
                      setShowUserMenu(false)
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <User className="w-4 h-4 mr-3" />
                    Profile Settings
                  </button> */}
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Logout
                  </button>
                </div>
                
                {/* Backdrop for dropdown */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserMenu(false)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
