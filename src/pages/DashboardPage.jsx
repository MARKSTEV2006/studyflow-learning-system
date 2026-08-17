import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { Link } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

import StatCard from '../components/StatCard'

export default function DashboardPage() {
  const { user } = useAuth()

  const [tasks, setTasks] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)

    const [
      taskResponse,
      subjectResponse,
    ] = await Promise.all([
      supabase
        .from('study_tasks')
        .select('*')
        .order('created_at', {
          ascending: false,
        })
        .limit(20),

      supabase
        .from('subjects')
        .select(`
          id,
          name,
          description,
          study_materials(count)
        `)
        .order('created_at', {
          ascending: false,
        })
        .limit(5),
    ])

    if (!taskResponse.error) {
      setTasks(
        taskResponse.data ?? [],
      )
    }

    if (!subjectResponse.error) {
      setSubjects(
        subjectResponse.data ?? [],
      )
    }

    setLoading(false)
  }

  const stats = useMemo(() => {
    const total = tasks.length

    const completed =
      tasks.filter(
        (task) => task.completed,
      ).length

    const pending =
      total - completed

    const progress =
      total > 0
        ? Math.round(
            (completed / total) * 100,
          )
        : 0

    return {
      total,
      completed,
      pending,
      progress,
    }
  }, [tasks])

  const today =
    new Date()
      .toISOString()
      .slice(0, 10)

  const todayTasks =
    tasks.filter(
      (task) =>
        !task.completed &&
        (
          task.due_date === today ||
          !task.due_date
        ),
    )

  function getMaterialCount(subject) {
    return (
      subject
        ?.study_materials
        ?.[0]
        ?.count ?? 0
    )
  }

  function getGreeting() {
    const hour =
      new Date().getHours()

    if (hour < 12) {
      return 'Good morning'
    }

    if (hour < 18) {
      return 'Good afternoon'
    }

    return 'Good evening'
  }

  const emailName =
    user?.email
      ?.split('@')[0]
      ?.split(/[._-]/)[0] || 'Student'

  const displayName =
    emailName
      .charAt(0)
      .toUpperCase() +
    emailName.slice(1)

  return (
    <div className="page-stack dashboard-page">

      {/* ANDROID HOME HERO */}

      <section className="mobile-home-hero">

        <div className="mobile-home-top">

          <div>
            <p>
              {getGreeting()},
            </p>

            <h2>
              {displayName}
            </h2>
          </div>

          <div className="mobile-profile-avatar">
            {(
              user?.email?.[0] ||
              'S'
            ).toUpperCase()}
          </div>

        </div>

        <div className="mobile-study-question">
          <p>
            What will you study today?
          </p>

          <Link
            to="/ai-study"
            className="mobile-ai-pill"
          >
            <span>
              ✦
            </span>

            Ask StudyFlow AI
          </Link>
        </div>

      </section>


      {/* DESKTOP HERO */}

      <section className="welcome-panel desktop-dashboard-hero">

        <div>
          <p className="eyebrow">
            YOUR STUDY SPACE
          </p>

          <h2>
            {getGreeting()}.
          </h2>

          <p>
            Pick one task, study with focus,
            then review what you learned.
          </p>
        </div>

        <Link
          className="primary-button compact"
          to="/planner"
        >
          Add study task
        </Link>

      </section>


      {/* MOBILE QUICK ACTIONS */}

      <section className="mobile-dashboard-section">

        <div className="mobile-section-header">
          <h3>
            Quick actions
          </h3>
        </div>

        <div className="mobile-quick-actions">

          <Link
            to="/materials"
            className="mobile-quick-action"
          >
            <div>↑</div>
            <span>Upload</span>
          </Link>

          <Link
            to="/ai-study"
            className="mobile-quick-action"
          >
            <div>✦</div>
            <span>AI Study</span>
          </Link>

          <Link
            to="/focus"
            className="mobile-quick-action"
          >
            <div>◷</div>
            <span>Focus</span>
          </Link>

          <Link
            to="/planner"
            className="mobile-quick-action"
          >
            <div>✓</div>
            <span>Planner</span>
          </Link>

        </div>

      </section>


      {/* MOBILE SUBJECTS */}

      <section className="mobile-dashboard-section">

        <div className="mobile-section-header">
          <h3>
            My subjects
          </h3>

          <Link to="/subjects">
            See all
          </Link>
        </div>

        {subjects.length === 0 ? (
          <Link
            to="/subjects"
            className="mobile-empty-card"
          >
            <strong>
              Create your first subject
            </strong>

            <span>
              Add Programming, Math,
              Database, or any subject.
            </span>
          </Link>
        ) : (
          <div className="mobile-subject-list">

            {subjects
              .slice(0, 4)
              .map((subject) => (
                <Link
                  key={subject.id}
                  to={`/materials?subject=${subject.id}`}
                  className="mobile-subject-row"
                >

                  <div className="mobile-subject-icon">
                    {subject.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="mobile-subject-info">

                    <strong>
                      {subject.name}
                    </strong>

                    <span>
                      {getMaterialCount(
                        subject,
                      )}{' '}
                      materials
                    </span>

                  </div>

                  <span className="mobile-row-arrow">
                    ›
                  </span>

                </Link>
              ))}

          </div>
        )}

      </section>


      {/* MOBILE TODAY */}

      <section className="mobile-dashboard-section">

        <div className="mobile-section-header">
          <h3>
            Today's study
          </h3>

          <Link to="/planner">
            Planner
          </Link>
        </div>

        <div className="mobile-today-card">

          {loading ? (
            <p className="muted">
              Loading...
            </p>
          ) : todayTasks.length === 0 ? (
            <div className="mobile-empty-today">
              <strong>
                You're clear for today.
              </strong>

              <span>
                Add a study task when
                you're ready.
              </span>
            </div>
          ) : (
            todayTasks
              .slice(0, 3)
              .map((task) => (
                <div
                  className="mobile-task-row"
                  key={task.id}
                >

                  <div className="mobile-task-dot" />

                  <div>
                    <strong>
                      {task.title}
                    </strong>

                    <span>
                      {task.subject}
                      {' · '}
                      {task.duration_min}
                      {' min'}
                    </span>
                  </div>

                </div>
              ))
          )}

        </div>

      </section>


      {/* DESKTOP CONTENT */}

      <section className="stats-grid desktop-dashboard-content">

        <StatCard
          label="Tasks"
          value={
            loading
              ? '—'
              : stats.total
          }
          hint="Recent study tasks"
        />

        <StatCard
          label="Completed"
          value={
            loading
              ? '—'
              : stats.completed
          }
          hint="Finished tasks"
        />

        <StatCard
          label="Pending"
          value={
            loading
              ? '—'
              : stats.pending
          }
          hint="Tasks to work on"
        />

        <StatCard
          label="Progress"
          value={
            loading
              ? '—'
              : `${stats.progress}%`
          }
          hint="Completion rate"
        />

      </section>

      <section className="dashboard-grid desktop-dashboard-content">

        <article className="panel">

          <div className="panel-heading">

            <div>
              <p className="eyebrow">
                TODAY
              </p>

              <h3>
                Focus list
              </h3>
            </div>

            <Link to="/planner">
              Open planner
            </Link>

          </div>

          {todayTasks.length ? (
            <div className="simple-list">

              {todayTasks
                .slice(0, 4)
                .map((task) => (
                  <div
                    className="simple-list-item"
                    key={task.id}
                  >

                    <div>
                      <strong>
                        {task.title}
                      </strong>

                      <span>
                        {task.subject}
                      </span>
                    </div>

                    <span className="pill">
                      {task.duration_min}
                      {' min'}
                    </span>

                  </div>
                ))}

            </div>
          ) : (
            <div className="empty-state small">

              <strong>
                No unfinished task due today.
              </strong>

              <p>
                Add a task or start
                a focus session.
              </p>

            </div>
          )}

        </article>

        <article className="panel guide-card">

          <p className="eyebrow">
            STUDYFLOW AI
          </p>

          <h3>
            Need help studying?
          </h3>

          <p className="muted">
            Ask questions, create reviewers,
            or prepare quizzes from your
            study materials.
          </p>

          <Link
            className="primary-button compact"
            to="/ai-study"
          >
            ✦ Ask AI
          </Link>

        </article>

      </section>

    </div>
  )
}