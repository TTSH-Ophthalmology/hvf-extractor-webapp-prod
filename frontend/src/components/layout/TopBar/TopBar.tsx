/**
 * components/layout/TopBar/TopBar.tsx — Header with page title and debug toggle.
 *
 * VIEW: displays the current page title, debug mode button, and workflow tabs.
 */

import { Bell } from 'lucide-react'
import { WorkflowTabs } from './WorkflowTabs'
import './TopBar.css'

type TopBarProps = {
  pageTitle: string
  isDebugMode: boolean
  onToggleDebugMode: () => void
}

export const TopBar = ({ pageTitle, isDebugMode, onToggleDebugMode }: TopBarProps) => {
  return (
    <header className="topbar">
      <div className="topbar-main">
        <h1>{pageTitle}</h1>
        <div className="topbar-actions">
          <button
            className={`debug-button${isDebugMode ? ' debug-button-active' : ''}`}
            type="button"
            role="switch"
            aria-checked={isDebugMode}
            onClick={onToggleDebugMode}
          >
            {/* <CgDebug size={17} /> */}
            <span>Debug Mode</span>
            <span className="debug-status-dot" aria-hidden="true" />
          </button>

          <button className="notification-button" type="button" aria-label="Notifications">
            <Bell size={19} strokeWidth={2.2} />
            <span aria-hidden="true" />
          </button>

          <span className="topbar-divider" aria-hidden="true" />

          <button className="profile-button" type="button" aria-label="Profile">
            <span>DR</span>
          </button>
        </div>
      </div>
      <WorkflowTabs />
    </header>
  )
}
