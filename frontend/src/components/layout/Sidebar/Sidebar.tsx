/**
 * components/layout/Sidebar/Sidebar.tsx — Main sidebar with branding.
 *
 * VIEW: renders the sidebar brand logo and navigation.
 * Collapse/expand is controlled by the parent AppShell.
 */

import NHGLogo from '../../../assets/images/NHG-logo.png'
import NHGEILogo from '../../../assets/images/NHGEI-logo.jpg'
import { SidebarFooter } from './SidebarFooter'
import { SidebarNav } from './SidebarNav'
import './Sidebar.css'

type SidebarProps = {
  isCollapsed: boolean
  onToggleCollapsed: () => void
}

export const Sidebar = ({ isCollapsed, onToggleCollapsed }: SidebarProps) => {
  return (
    <aside className={`sidebar${isCollapsed ? ' sidebar-collapsed' : ''}`}>
      <button
        className="sidebar-brand"
        type="button"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!isCollapsed}
        onClick={onToggleCollapsed}
      >
        <img
          className="hospital-logo"
          src={isCollapsed ? NHGLogo : NHGEILogo}
          alt={isCollapsed ? 'NHG' : 'NHG Eye Institute'}
        />
      </button>

      <SidebarNav isCollapsed={isCollapsed} />
      <SidebarFooter isCollapsed={isCollapsed} />
    </aside>
  )
}
