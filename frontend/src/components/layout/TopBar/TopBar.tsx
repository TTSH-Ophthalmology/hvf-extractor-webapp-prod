/**
 * components/layout/TopBar/TopBar.tsx — Header with page title and debug toggle.
 *
 * VIEW: displays the current page title, debug mode button, and workflow tabs.
 */

import { CgDebug } from 'react-icons/cg'
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
        <button
          className={`debug-button${isDebugMode ? ' debug-button-active' : ''}`}
          type="button"
          role="switch"
          aria-checked={isDebugMode}
          onClick={onToggleDebugMode}
        >
          <CgDebug size={20} />
          Debug mode
        </button>
      </div>
      <WorkflowTabs />
    </header>
  )
}
