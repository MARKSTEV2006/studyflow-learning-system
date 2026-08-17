import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function MySubjectsPage() {
  const { user } = useAuth()

  const [subjects, setSubjects] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSubjects()
  }, [])

  async function loadSubjects() {
    setLoading(true)
    setError('')

    const { data, error: requestError } = await supabase
      .from('subjects')
      .select(`
        id,
        user_id,
        name,
        description,
        created_at,
        study_materials(count)
      `)
      .order('created_at', { ascending: false })

    if (requestError) {
      console.error(requestError)
      setError(requestError.message)
    } else {
      setSubjects(data ?? [])
    }

    setLoading(false)
  }

  async function addSubject(event) {
    event.preventDefault()

    if (!name.trim()) return

    setSaving(true)
    setError('')

    const { data, error: requestError } = await supabase
      .from('subjects')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
      })
      .select()
      .single()

    if (requestError) {
      setError(requestError.message)
      setSaving(false)
      return
    }

    setSubjects((current) => [
      {
        ...data,
        study_materials: [{ count: 0 }],
      },
      ...current,
    ])

    setName('')
    setDescription('')
    setSaving(false)
  }

  function getMaterialCount(subject) {
    return subject?.study_materials?.[0]?.count ?? 0
  }

  async function deleteSubject(subject) {
    const materialCount = getMaterialCount(subject)

    if (materialCount > 0) {
      alert(
        `This subject still has ${materialCount} material(s). Delete the materials first.`,
      )
      return
    }

    const confirmed = window.confirm(`Delete "${subject.name}"?`)

    if (!confirmed) return

    const { error: requestError } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subject.id)

    if (requestError) {
      setError(requestError.message)
      return
    }

    setSubjects((current) =>
      current.filter((item) => item.id !== subject.id),
    )
  }

  return (
    <div className="page-stack">
      <section className="intro-panel">
        <p className="eyebrow">LEARNING</p>

        <h2>Organize your subjects.</h2>

        <p>
          Create subjects for your materials, quizzes, flashcards,
          exercises, and AI study sessions.
        </p>
      </section>

      <div className="subject-layout">
        <form className="panel subject-form" onSubmit={addSubject}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">NEW SUBJECT</p>
              <h3>Add subject</h3>
            </div>
          </div>

          <label className="field">
            <span>Subject name</span>

            <input
              type="text"
              value={name}
              placeholder="Example: Programming"
              maxLength={100}
              required
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Description</span>

            <textarea
              className="study-textarea"
              value={description}
              placeholder="Example: Java, Python and programming fundamentals"
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <button className="primary-button" disabled={saving}>
            {saving ? 'Creating...' : 'Create subject'}
          </button>

          {error && (
            <div className="notice error">
              {error}
            </div>
          )}
        </form>

        <section className="subjects-section">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">YOUR SUBJECTS</p>

              <h2>
                {subjects.length}{' '}
                {subjects.length === 1 ? 'Subject' : 'Subjects'}
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="panel">
              <p className="muted">
                Loading subjects...
              </p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="panel empty-state">
              <strong>No subjects yet.</strong>

              <p>
                Create your first subject using the form.
              </p>
            </div>
          ) : (
            <div className="subjects-grid">
              {subjects.map((subject) => {
                const materialCount = getMaterialCount(subject)

                return (
                  <article className="subject-card" key={subject.id}>
                    <div className="subject-card-top">
                      <div className="subject-icon">
                        {subject.name.charAt(0).toUpperCase()}
                      </div>

                      <button
                        className="subject-delete"
                        onClick={() => deleteSubject(subject)}
                        type="button"
                      >
                        ×
                      </button>
                    </div>

                    <div className="subject-card-content">
                      <h3>{subject.name}</h3>

                      <p>
                        {subject.description || 'No description added.'}
                      </p>
                    </div>

                    <div className="subject-card-footer">
                      <span>
                        {materialCount}{' '}
                        {materialCount === 1
                          ? 'material'
                          : 'materials'}
                      </span>

                      <Link
                        to={`/materials?subject=${subject.id}`}
                      >
                        Open →
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}