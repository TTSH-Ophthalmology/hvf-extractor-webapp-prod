/**
 * components/layout/TopBar/TopBar.tsx — Header with page title and debug toggle.
 *
 * VIEW: displays the product title, debug mode button, and workflow tabs.
 */

import { useEffect, useRef, useState } from 'react'
import { LogOut, Settings, UserPen } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import api from '../../../services/api'
import { WorkflowTabs } from './WorkflowTabs'
import './TopBar.css'

type CurrentUser = {
  username: string
  role: string
}

const formatDisplayName = (username?: string) => {
  if (!username?.trim()) return 'User'

  return username
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const getInitials = (displayName: string) => {
  const parts = displayName.split(/\s+/).filter(Boolean)
  const initials = parts.map((part) => part.charAt(0)).join('').slice(0, 2)

  return initials || 'U'
}

export const TopBar = () => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const displayName = formatDisplayName(currentUser?.username)
  const userInitials = getInitials(displayName)

  useEffect(() => {
    let isMounted = true

    api
      .get<CurrentUser>('/api/me')
      .then((response) => {
        if (isMounted) {
          setCurrentUser(response.data)
        }
      })
      .catch(() => {
        if (isMounted) {
          setCurrentUser(null)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isProfileMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isProfileMenuOpen])

  const closeProfileMenu = () => setIsProfileMenuOpen(false)

  return (
    <header className="topbar">
      <div className="topbar-main">
        <h1>HVF Extractor</h1>
        <div className="topbar-actions">
          <div className="topbar-user-summary" aria-label={`Signed in as ${displayName}`}>
            <span>{displayName}</span>
          </div>

          <div className="profile-menu-root" ref={profileMenuRef}>
            <button
              className="profile-button"
              type="button"
              aria-label="Profile menu"
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
            >
              <span>{userInitials}</span>
            </button>

            {isProfileMenuOpen && (
              <div className="profile-menu" role="menu" aria-label="Profile menu">
                <div className="profile-menu-header">
                  <span className="profile-menu-avatar" aria-hidden="true">{userInitials}</span>
                  <div>
                    <strong>{displayName}</strong>
                    <span>Clinical account</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={closeProfileMenu}
                >
                  <UserPen size={16} strokeWidth={2} />
                  <span>Edit profile</span>
                </button>
                <button
                  type="button"
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={closeProfileMenu}
                >
                  <Settings size={16} strokeWidth={2} />
                  <span>Account settings</span>
                </button>

                <div className="profile-menu-divider" />

                <NavLink
                  to="/logout"
                  className="profile-menu-item profile-menu-logout"
                  role="menuitem"
                  onClick={closeProfileMenu}
                >
                  <LogOut size={16} strokeWidth={2} />
                  <span>Logout</span>
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
      <WorkflowTabs />
    </header>
  )
}
