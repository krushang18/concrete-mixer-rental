import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import BottomNavigation from './BottomNavigation'

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Handle responsive breakpoints
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      
      // Auto-close sidebar on mobile when resizing to desktop
      if (!mobile && sidebarOpen) {
        setSidebarOpen(false)
      }
    }

    handleResize() // Initial check
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarOpen])

  // Close sidebar when clicking outside on mobile
  const handleBackdropClick = () => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Backdrop - FIXED */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity duration-300"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />

      {/* Main Content Container */}
      <div 
        className="transition-all duration-300"
        style={{
          marginLeft: isMobile ? '0' : '16rem'
        }}
      >
        {/* Header */}
        <Header 
          onMenuClick={() => setSidebarOpen(true)} 
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
        />
        
        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)] py-6 px-4 sm:px-6 lg:px-8 pb-20 lg:pb-6">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <BottomNavigation />}
    </div>
  )
}

export default AppLayout
