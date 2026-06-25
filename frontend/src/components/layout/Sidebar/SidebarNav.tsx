/**
 * components/layout/Sidebar/SidebarNav.tsx — Primary navigation links.
 *
 * VIEW: renders the main nav items (Single Extraction, Batch Extraction).
 */

import { MdOutlineFileOpen } from 'react-icons/md'
import { PiStack } from 'react-icons/pi'
import { NavLink } from 'react-router-dom'
import './SidebarNav.css'

type SidebarNavProps = {
  isCollapsed: boolean
}

const navigationItems = [
  { label: 'Single Extraction', path: '/',             icon: MdOutlineFileOpen },
  { label: 'Batch Extraction',  path: '/visual-fields', icon: PiStack },
]

export const SidebarNav = ({ isCollapsed }: SidebarNavProps) => {
  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
      {navigationItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          aria-label={item.label}
          title={isCollapsed ? item.label : undefined}
          className={({ isActive }) =>
            isActive ? 'nav-link nav-link-active' : 'nav-link'
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
