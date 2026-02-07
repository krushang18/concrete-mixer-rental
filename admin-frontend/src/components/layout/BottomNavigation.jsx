import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  MessageSquare, 
  Truck, 
  FileText,
  Menu
} from 'lucide-react'
import { clsx } from 'clsx'

const bottomNavigation = [ // Dashboard removed as per user request
  { name: 'Queries', href: '/queries', icon: MessageSquare },
  { name: 'Machines', href: '/machines', icon: Truck },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'More', href: '/settings', icon: Menu },
]

const BottomNavigation = () => {
  const location = useLocation()

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
      <nav className="flex">
        {bottomNavigation.map((item) => {
          const isActive = location.pathname === item.href
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs font-medium transition-colors duration-200',
                isActive
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <item.icon className={clsx(
                'w-6 h-6 mb-1',
                isActive ? 'text-primary-600' : 'text-gray-500'
              )} />
              <span className={clsx(
                'text-xs',
                isActive ? 'text-primary-600 font-medium' : 'text-gray-500'
              )}>
                {item.name}
              </span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}

export default BottomNavigation