import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const emptyForm = {
  title: '',
  subject: '',
  due_date: '',
  duration_min: 25,
}

export default function PlannerPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    setLoading(true)
    setError('')

    const { data, error: requestError } = await supabase
      .from('study_tasks')
      .select('*')
      .order('completed', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (requestError) {
      setError(requestError.message)
    } else {
      setTasks(data ?? [])
    }

    setLoading(false)
  }

  async function addTask(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      subject: form.subject.trim() || 'General',
      due_date: form.due_date || null,
      duration_min: Number(form.duration_min) || 25,
    }

    const { data, error: requestError } = await supabase
      .from('study_tasks')
      .insert(payload)
      .select()
      .single()

    if (requestError) {
      setError(requestError.message)
    } else {
      setTasks((current) => [data, ...current])
      setForm(emptyForm)
    }

    setSaving(false)
  }

  async function toggleTask(task) {
    const { data, error: requestError } = await supabase
      .from('study_tasks')
      .update({ completed: !task.completed })
      .eq('id', task.id)
      .select()
      .single()

    if (requestError) {
      setError(requestError.message)
      return
    }

    setTasks((current) =>
      current.map((item) => (item.id === task.id ? data : item)),
    )
  }

  async function deleteTask(id) {
    const { error: requestError } = await supabase
      .from('study_tasks')
      .delete()
      .eq('id', id)

    if (requestError) {
      setError(requestError.message)
      return
    }

    setTasks((current) => current.filter((item) => item.id !== id))
  }

  const completedCount = useMemo(
    () => tasks.filter((task) => task.completed).length,
    [tasks],
  )

  return (
    <div className="page-stack">
      <section className="planner-grid">
        <form className="panel task-form" onSubmit={addTask}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">NEW TASK</p>
              <h3>Add a study task</h3>
            </div>
          </div>

          <label className="field">
            <span>Task</span>
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Example: Review Chapter 3"
              maxLength={180}
              required
            />
          </label>

          <label className="field">
            <span>Subject</span>
            <input
              value={form.subject}
              onChange={(event) =>
                setForm((current) => ({ ...current, subject: event.target.value }))
              }
              placeholder="Example: Programming"
              maxLength={80}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Due date</span>
              <input
                type="date"
                value={form.due_date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, due_date: event.target.value }))
                }
              />
            </label>

            <label className="field">
              <span>Minutes</span>
              <input
                type="number"
                min="5"
                max="600"
                value={form.duration_min}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    duration_min: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <button className="primary-button" disabled={saving}>
            {saving ? 'Saving...' : 'Add task'}
          </button>

          {error && <div className="notice error">{error}</div>}
        </form>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">YOUR PLAN</p>
              <h3>Study tasks</h3>
            </div>
            <span className="muted">
              {completedCount}/{tasks.length} done
            </span>
          </div>

          {loading ? (
            <p className="muted">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <strong>Your planner is empty.</strong>
              <p>Add your first study task using the form.</p>
            </div>
          ) : (
            <div className="task-list">
              {tasks.map((task) => (
                <article
                  className={`task-item ${task.completed ? 'completed' : ''}`}
                  key={task.id}
                >
                  <button
                    className="check-button"
                    onClick={() => toggleTask(task)}
                    aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {task.completed ? '✓' : ''}
                  </button>

                  <div className="task-copy">
                    <strong>{task.title}</strong>
                    <div className="task-meta">
                      <span>{task.subject}</span>
                      <span>{task.duration_min} min</span>
                      {task.due_date && (
                        <span>
                          {new Date(`${task.due_date}T00:00:00`).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    className="delete-button"
                    onClick={() => deleteTask(task.id)}
                    aria-label="Delete task"
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  )
}
