/**
 * components/layout/Sidebar/SidebarFooter.tsx — Templates button + utility nav.
 *
 * VIEW: renders the Templates link and Help/Settings utility links at the bottom.
 */

import { CircleHelp, Settings } from 'lucide-react'
import { RiEdit2Fill } from 'react-icons/ri'
import { NavLink } from 'react-router-dom'
import './SidebarFooter.css'

type SidebarFooterProps = {
  isCollapsed: boolean
}

export const SidebarFooter = ({ isCollapsed }: SidebarFooterProps) => {
  return (
    <div className="sidebar-footer">
      <div className="template-section">
        <NavLink
          to="/templates"
          className="template-link"
          aria-label="Templates"
          title={isCollapsed ? 'Templates' : undefined}
        >
          <RiEdit2Fill size={18} />
          <span className="nav-label">Templates</span>
        </NavLink>
      </div>

      <nav className="utility-nav" aria-label="Utility navigation">
        <button
          type="button"
          className="utility-link"
          aria-label="Help"
          title={isCollapsed ? 'Help' : undefined}
        >
          <CircleHelp size={18} strokeWidth={2} />
          <span className="nav-label">Help</span>
        </button>
        <button
          type="button"
          className="utility-link"
          aria-label="Settings"
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings size={18} strokeWidth={2} />
          <span className="nav-label">Settings</span>
        </button>
      </nav>
    </div>
  )
}
