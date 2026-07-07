/**
 * components/layout/Sidebar/SidebarFooter.tsx — Templates button + utility nav.
 *
 * VIEW: renders the Templates button and Help/Settings utility links at the bottom.
 */

import { CircleHelp, Settings } from 'lucide-react'
import { RiEdit2Fill } from 'react-icons/ri'
import './SidebarFooter.css'

type SidebarFooterProps = {
  isCollapsed: boolean
  isTemplateOpen: boolean
  onToggleTemplate: () => void
}

export const SidebarFooter = ({
  isCollapsed,
  isTemplateOpen,
  onToggleTemplate,
}: SidebarFooterProps) => {
  return (
    <div className="sidebar-footer">
      <div className="template-section">
        <button
          type="button"
          className={`template-link${isTemplateOpen ? ' template-link-active' : ''}`}
          aria-label="Templates"
          aria-pressed={isTemplateOpen}
          title={isCollapsed ? 'Templates' : undefined}
          onClick={onToggleTemplate}
        >
          <RiEdit2Fill size={18} />
          <span className="nav-label">Templates</span>
        </button>
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
