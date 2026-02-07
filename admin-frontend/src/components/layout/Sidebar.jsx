import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  MessageSquare, 
  Settings, 
  Users, 
  FileText,
  Truck,
  X,
  FileBarChart,
  FileTerminal,
  DatabaseBackup
} from 'lucide-react'
import { clsx } from 'clsx'

const navigation = [

  { name: 'Queries', href: '/queries', icon: MessageSquare },
  { name: 'Machines', href: '/machines', icon: Truck },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Documents', href: '/documents', icon: FileBarChart },
  { name: 'Terms & Condition', href: '/terms-and-conditions', icon: FileTerminal },
  { name: 'Service', href: '/services', icon: DatabaseBackup },

  { name: 'Settings', href: '/settings', icon: Settings },

]

const Sidebar = ({ isOpen, onClose, isMobile }) => {
  const handleNavClick = () => {
    // Always close sidebar on mobile when nav item is clicked
    if (isMobile) {
      onClose()
    }
  }

  return (
    <div className={clsx(
      // Base positioning and sizing
      'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200',
      // Transform based on state - ENSURE this works on mobile
      'transform transition-transform duration-300 ease-in-out',
      // Show/hide logic
      isMobile 
        ? (isOpen ? 'translate-x-0' : '-translate-x-full')
        : 'translate-x-0'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-white">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">CM</span>
          </div>
          <div className="ml-3">
            <span className="text-xl font-bold text-gray-900">CM Rental</span>
            <p className="text-xs text-gray-500">Admin Portal</p>
          </div>
        </div>
        
        {/* Close button - ENHANCED for mobile */}
        {isMobile && (
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200 touch-manipulation"
            aria-label="Close menu"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center px-4 py-3 text-base font-medium rounded-lg transition-all duration-200 group touch-manipulation',
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-r-4 border-primary-500 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                  )
                }
              >
                <item.icon className="w-6 h-6 mr-4 flex-shrink-0 transition-colors duration-200" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Quick Actions - Desktop only */}
        {/* {!isMobile && (
          <div className="mt-8">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quick Actions
            </h3>
            <ul className="mt-3 space-y-1">
              <li>
                <button className="w-full flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                  <FileText className="w-4 h-4 mr-3" />
                  New Quotation
                </button>
              </li>
              <li>
                <button className="w-full flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                  <Users className="w-4 h-4 mr-3" />
                  Add Customer
                </button>
              </li>
            </ul>
          </div>
        )} */}
      </nav>

      {/* Footer */}
      {/* <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="text-center">
          <div className="text-sm text-gray-600 font-medium">Concrete Mixer Rental</div>
          <div className="text-xs text-gray-500">Admin Portal v2.0</div>
        </div>
      </div> */}
    </div>
  )
}

export default Sidebar
