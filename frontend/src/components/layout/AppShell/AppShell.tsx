/**
 * components/layout/AppShell/AppShell.tsx — Main layout container.
 *
 * VIEW: renders the sidebar + workspace (topbar + page content) grid.
 * Manages sidebar collapse state and debug mode toggle.
 */

import { type ReactNode, useEffect, useState } from 'react'
import { TemplatePage } from '../../../pages/Template/TemplatePage'
import { Sidebar } from '../Sidebar/Sidebar'
import { TopBar } from '../TopBar/TopBar'
import './AppShell.css'

type AppShellProps = {
  children: ReactNode
}

export const AppShell = ({ children }: AppShellProps) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isTemplateOpen, setIsTemplateOpen] = useState(false)

  useEffect(() => {
    const smallViewportQuery = window.matchMedia('(max-width: 860px)')

    const collapseForSmallViewport = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) {
        setIsSidebarCollapsed(true)
      }
    }

    collapseForSmallViewport(smallViewportQuery)
    smallViewportQuery.addEventListener('change', collapseForSmallViewport)

    return () => {
      smallViewportQuery.removeEventListener('change', collapseForSmallViewport)
    }
  }, [])

  return (
    <div className={`app-shell${isSidebarCollapsed ? ' app-shell-collapsed' : ''}`}>
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isTemplateOpen={isTemplateOpen}
        onToggleCollapsed={() => setIsSidebarCollapsed((c) => !c)}
        onToggleTemplate={() => setIsTemplateOpen((isOpen) => !isOpen)}
      />

      <div className="workspace">
        <TopBar />
        <main className="page-content">{children}</main>
        {isTemplateOpen && <TemplatePage onClose={() => setIsTemplateOpen(false)} />}
      </div>
    </div>
  )
}
