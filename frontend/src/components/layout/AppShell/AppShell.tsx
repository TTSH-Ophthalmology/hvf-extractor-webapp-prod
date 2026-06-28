/**
 * components/layout/AppShell/AppShell.tsx — Main layout container.
 *
 * VIEW: renders the sidebar + workspace (topbar + page content) grid.
 * Manages sidebar collapse state and debug mode toggle.
 */

import { type ReactNode, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from '../Sidebar/Sidebar'
import { TopBar } from '../TopBar/TopBar'
import './AppShell.css'

type AppShellProps = {
  children: ReactNode
}

const pageTitles: Record<string, string> = {
  '/': 'Single Extraction',
  '/result': 'Single Extraction',
  '/visual-fields': 'Batch Extraction',
  '/reports': 'Templates',
  '/patients': 'Help',
  '/settings': 'Settings',
}

export const AppShell = ({ children }: AppShellProps) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isDebugMode, setIsDebugMode] = useState(false)
  const { pathname } = useLocation()
  const pageTitle = pageTitles[pathname] ?? 'Single Extraction'

  return (
    <div className={`app-shell${isSidebarCollapsed ? ' app-shell-collapsed' : ''}`}>
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((c) => !c)}
      />

      <div className="workspace">
        <TopBar
          pageTitle={pageTitle}
          isDebugMode={isDebugMode}
          onToggleDebugMode={() => setIsDebugMode((c) => !c)}
        />
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}
