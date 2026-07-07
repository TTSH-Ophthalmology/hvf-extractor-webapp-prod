/**
 * components/layout/Sidebar/SidebarNav.tsx — Primary navigation links.
 *
 * VIEW: renders the main nav items.
 */

import { MdOutlineFileOpen } from 'react-icons/md'
import { NavLink, useLocation } from 'react-router-dom'
import './SidebarNav.css'

type SidebarNavProps = {
  isCollapsed: boolean
}

const navigationItems = [
  { label: 'Extraction', path: '/', icon: MdOutlineFileOpen },
]

export const SidebarNav = ({ isCollapsed }: SidebarNavProps) => {
  const { pathname } = useLocation()

  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
      {navigationItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          aria-label={item.label}
          title={isCollapsed ? item.label : undefined}
          className={({ isActive }) =>
            isActive || (item.path === '/' && pathname === '/result')
              ? 'nav-link nav-link-active'
              : 'nav-link'
          }
          end={item.path === '/'}
        >
          <item.icon size={22} />
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
