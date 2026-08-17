import MobileBottomNav from './MobileBottomNav'
import {
  NavLink,
  Outlet,
  useLocation,
} from 'react-router-dom'

import { useState } from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const navigation = [
  {
    title: '',
    items: [
      {
        to: '/dashboard',
        label: 'Overview',
        icon: '⌂',
      },
    ],
  },

  {
    title: 'LEARNING',
    items: [
      {
        to: '/subjects',
        label: 'My Subjects',
        icon: '◫',
      },
      {
        to: '/materials',
        label: 'Study Materials',
        icon: '▤',
      },
      {
  to: '/ai-study',
  label: 'AI Study',
  icon: '✦',
},
    ],
  },

  {
    title: 'PRODUCTIVITY',
    items: [
      {
        to: '/planner',
        label: 'Study Planner',
        icon: '✓',
      },
      {
        to: '/focus',
        label: 'Focus Timer',
        icon: '◷',
      },
    ],
  },

  {
    title: 'SYSTEM',
    items: [
      {
        to: '/study-guide',
        label: 'Study Guide',
        icon: '≡',
      },
      {
        to: '/about',
        label: 'About System',
        icon: 'i',
      },
    ],
  },
]

const titles = {
  '/dashboard': 'Overview',
  '/subjects': 'My Subjects',
  '/materials': 'Study Materials',
  '/ai-study': 'AI Study',
  '/planner': 'Study Planner',
  '/focus': 'Focus Timer',
  '/study-guide': 'Study Guide',
  '/about': 'About the System',
  
}

export default function AppLayout() {
  const { user } = useAuth()
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] =
    useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="app-shell">

      <aside
        className={`sidebar ${
          sidebarOpen
            ? 'sidebar-open'
            : ''
        }`}
      >

        <div className="brand-row">

          <div className="brand-mark">
            S
          </div>

          <div>
            <strong>
              StudyFlow
            </strong>

            <span>
              Learning System
            </span>
          </div>

        </div>

        <nav
          className="side-nav"
          aria-label="Primary navigation"
        >

          {navigation.map(
            (section, index) => (
              <div
                className="nav-section"
                key={index}
              >

                {section.title && (
                  <div className="nav-section-label">
                    {section.title}
                  </div>
                )}

                {section.items.map(
                  (item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() =>
                        setSidebarOpen(false)
                      }
                      className={({
                        isActive,
                      }) =>
                        isActive
                          ? 'nav-link active'
                          : 'nav-link'
                      }
                    >

                      <span className="nav-icon">
                        {item.icon}
                      </span>

                      {item.label}

                    </NavLink>
                  ),
                )}

              </div>
            ),
          )}

        </nav>

        <div className="sidebar-bottom">

          <div className="user-chip">

            <div className="avatar">
              {(
                user?.email?.[0] ||
                'S'
              ).toUpperCase()}
            </div>

            <div className="user-meta">

              <strong>
                Student
              </strong>

              <span title={user?.email}>
                {user?.email}
              </span>

            </div>

          </div>

          <button
            className="ghost-button full-width"
            onClick={handleLogout}
          >
            Sign out
          </button>

        </div>

      </aside>

      {sidebarOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Close menu"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      <main className="main-area">

        <header className="topbar">

          <button
            className="menu-button"
            onClick={() =>
              setSidebarOpen(true)
            }
            aria-label="Open menu"
          >
            ☰
          </button>

          <div>

            <p className="eyebrow">
              STUDYFLOW
            </p>

            <h1>
              {
                titles[
                  location.pathname
                ] || 'StudyFlow'
              }
            </h1>

          </div>

          <div className="topbar-date">
            {new Intl.DateTimeFormat(
              'en-PH',
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              },
            ).format(new Date())}
          </div>

        </header>

        <div className="content-wrap">
          <Outlet />
        </div>

      </main>

<MobileBottomNav />

</div>
  )
}