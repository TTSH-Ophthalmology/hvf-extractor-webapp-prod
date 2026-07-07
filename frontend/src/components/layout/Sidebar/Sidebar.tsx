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
  isTemplateOpen: boolean
  onToggleCollapsed: () => void
  onToggleTemplate: () => void
}

export const Sidebar = ({
  isCollapsed,
  isTemplateOpen,
  onToggleCollapsed,
  onToggleTemplate,
}: SidebarProps) => {
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
          className="hospital-logo hospital-logo-full"
          src={NHGEILogo}
          alt={'NHG Eye Institute'}
        />
        <img
          className="hospital-logo hospital-logo-collapsed"
          src={NHGLogo}
          alt={'NHG'}
        />
      </button>

      <SidebarNav isCollapsed={isCollapsed} />
      <SidebarFooter
        isCollapsed={isCollapsed}
        isTemplateOpen={isTemplateOpen}
        onToggleTemplate={onToggleTemplate}
      />
    </aside>
  )
}
