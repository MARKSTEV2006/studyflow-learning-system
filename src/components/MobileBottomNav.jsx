import { useState } from 'react'
import {
  NavLink,
  Link,
} from 'react-router-dom'

import { supabase } from '../lib/supabase'

export default function MobileBottomNav() {
  const [moreOpen, setMoreOpen] =
    useState(false)

  async function signOut() {
    setMoreOpen(false)
    await supabase.auth.signOut()
  }

  return (
    <>

      <nav className="android-bottom-nav">

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive
              ? 'android-nav-item active'
              : 'android-nav-item'
          }
        >
          <span>⌂</span>
          <small>Home</small>
        </NavLink>

        <NavLink
          to="/subjects"
          className={({ isActive }) =>
            isActive
              ? 'android-nav-item active'
              : 'android-nav-item'
          }
        >
          <span>▦</span>
          <small>Subjects</small>
        </NavLink>

        <NavLink
          to="/ai-study"
          className={({ isActive }) =>
            isActive
              ? 'android-nav-item active'
              : 'android-nav-item'
          }
        >
          <span>✦</span>
          <small>AI</small>
        </NavLink>

        <button
          type="button"
          className="android-nav-item"
          onClick={() =>
            setMoreOpen(true)
          }
        >
          <span>☰</span>
          <small>More</small>
        </button>

      </nav>

      {moreOpen && (
        <>

          <button
            className="android-sheet-backdrop"
            onClick={() =>
              setMoreOpen(false)
            }
            aria-label="Close menu"
          />

          <section className="android-more-sheet">

            <div className="android-sheet-handle" />

            <div className="android-sheet-title">

              <h2>
                More
              </h2>

              <button
                type="button"
                onClick={() =>
                  setMoreOpen(false)
                }
              >
                ×
              </button>

            </div>

            <div className="android-more-list">

              <Link to="/materials">
                <span>▤</span>

                <div>
                  <strong>
                    Study Materials
                  </strong>

                  <small>
                    Uploaded files
                  </small>
                </div>

                <b>›</b>
              </Link>

              <Link to="/planner">
                <span>✓</span>

                <div>
                  <strong>
                    Study Planner
                  </strong>

                  <small>
                    Tasks and schedules
                  </small>
                </div>

                <b>›</b>
              </Link>

              <Link to="/focus">
                <span>◷</span>

                <div>
                  <strong>
                    Focus Timer
                  </strong>

                  <small>
                    Study sessions
                  </small>
                </div>

                <b>›</b>
              </Link>

              <Link to="/study-guide">
                <span>≡</span>

                <div>
                  <strong>
                    Study Guide
                  </strong>

                  <small>
                    Study methods
                  </small>
                </div>

                <b>›</b>
              </Link>

              <Link to="/about">
                <span>i</span>

                <div>
                  <strong>
                    About StudyFlow
                  </strong>

                  <small>
                    System information
                  </small>
                </div>

                <b>›</b>
              </Link>

            </div>

            <button
              type="button"
              className="android-signout"
              onClick={signOut}
            >
              Sign out
            </button>

          </section>

        </>
      )}

    </>
  )
}