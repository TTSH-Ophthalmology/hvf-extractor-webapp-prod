/**
 * components/layout/Sidebar/Sidebar.tsx — Main sidebar with branding.
 *
 * VIEW: renders the TTSH logo, brand text, and navigation.
 * Collapse/expand is controlled by the parent AppShell.
 */

import ttshLogo from '../../../assets/images/TTSH-logo.png'
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
        <img className="hospital-logo" src={ttshLogo} alt="Tan Tock Seng Hospital" />
        <div className="brand-text">
          <strong>NHGEI HVF Extractor</strong>
          <span>OPHTHALMOLOGY DEPT</span>
        </div>
      </button>

      <SidebarNav isCollapsed={isCollapsed} />
      <SidebarFooter isCollapsed={isCollapsed} />
    </aside>
  )
}
