import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import {
  supabase,
} from '../lib/supabase'

import {
  useAuth,
} from '../context/AuthContext'

import '../styles/mobile.css'


function buildMaterialCountMap(rows) {
  return (rows ?? []).reduce(
    (map, row) => {
      const subjectId =
        row?.subject_id

      if (!subjectId) {
        return map
      }

      map[subjectId] =
        (map[subjectId] || 0) + 1

      return map
    },
    {},
  )
}


export default function MySubjectsPage() {
  const {
    user,
  } = useAuth()

  const [
    subjects,
    setSubjects,
  ] = useState([])

  const [
    materialCountMap,
    setMaterialCountMap,
  ] = useState({})

  const [
    subjectName,
    setSubjectName,
  ] = useState('')

  const [
    description,
    setDescription,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    creating,
    setCreating,
  ] = useState(false)

  const [
    deletingId,
    setDeletingId,
  ] = useState(null)

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')


  useEffect(
    () => {
      loadData()
    },
    [],
  )


  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [
        subjectsResponse,
        materialsResponse,
      ] = await Promise.all([
        supabase
          .from('subjects')
          .select(`
            id,
            name,
            description,
            created_at
          `)
          .order(
            'created_at',
            {
              ascending: false,
            },
          ),

        supabase
          .from(
            'study_materials',
          )
          .select(
            'subject_id',
          ),
      ])

      if (
        subjectsResponse.error
      ) {
        throw subjectsResponse.error
      }

      if (
        materialsResponse.error
      ) {
        throw materialsResponse.error
      }

      setSubjects(
        subjectsResponse.data ??
          [],
      )

      setMaterialCountMap(
        buildMaterialCountMap(
          materialsResponse.data,
        ),
      )
    } catch (
      loadError
    ) {
      setError(
        loadError?.message ||
          'Could not load subjects.',
      )
    } finally {
      setLoading(false)
    }
  }


  async function createSubject(
    event,
  ) {
    event.preventDefault()

    const trimmedName =
      subjectName.trim()

    const trimmedDescription =
      description.trim()

    if (!trimmedName) {
      setError(
        'Enter a subject name.',
      )
      return
    }

    if (!user?.id) {
      setError(
        'Your session expired. Please sign in again.',
      )
      return
    }

    setCreating(true)
    setError('')
    setSuccess('')

    try {
      const {
        data,
        error:
          insertError,
      } = await supabase
        .from('subjects')
        .insert({
          user_id:
            user.id,

          name:
            trimmedName,

          description:
            trimmedDescription ||
            null,
        })
        .select(`
          id,
          name,
          description,
          created_at
        `)
        .single()

      if (insertError) {
        throw insertError
      }

      setSubjects(
        (current) => [
          data,
          ...current,
        ],
      )

      setMaterialCountMap(
        (current) => ({
          ...current,
          [data.id]: 0,
        }),
      )

      setSubjectName('')
      setDescription('')

      setSuccess(
        'Subject created successfully.',
      )
    } catch (
      createError
    ) {
      setError(
        createError?.message ||
          'Could not create the subject.',
      )
    } finally {
      setCreating(false)
    }
  }


  async function deleteSubject(
    subject,
  ) {
    const materialCount =
      materialCountMap[
        subject.id
      ] || 0

    if (materialCount > 0) {
      setError(
        'Delete the subject materials first before removing this subject.',
      )
      return
    }

    const confirmed =
      window.confirm(
        `Delete "${subject.name}"?`,
      )

    if (!confirmed) {
      return
    }

    setDeletingId(
      subject.id,
    )

    setError('')
    setSuccess('')

    try {
      const {
        error:
          deleteError,
      } = await supabase
        .from('subjects')
        .delete()
        .eq(
          'id',
          subject.id,
        )

      if (deleteError) {
        throw deleteError
      }

      setSubjects(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              subject.id,
          ),
      )

      setMaterialCountMap(
        (current) => {
          const next = {
            ...current,
          }

          delete next[
            subject.id
          ]

          return next
        },
      )

      setSuccess(
        'Subject deleted successfully.',
      )
    } catch (
      deleteError
    ) {
      setError(
        deleteError?.message ||
          'Could not delete the subject.',
      )
    } finally {
      setDeletingId(null)
    }
  }


  const subjectCount =
    subjects.length

  const totalMaterials =
    useMemo(
      () =>
        Object.values(
          materialCountMap,
        ).reduce(
          (
            total,
            count,
          ) =>
            total + count,
          0,
        ),
      [
        materialCountMap,
      ],
    )


  return (
    <div className="page-stack sf-subjects-page">

      <section className="sf-subjects-hero">

        <div className="sf-subjects-hero-copy">

          <p className="eyebrow">
            STUDY LIBRARY
          </p>

          <h2>
            My Subjects
          </h2>

          <p>
            Organize your study materials by subject.
          </p>

        </div>


        <div className="sf-subjects-stats">

          <article>
            <strong>
              {subjectCount}
            </strong>

            <span>
              {subjectCount === 1
                ? 'Subject'
                : 'Subjects'}
            </span>
          </article>


          <article>
            <strong>
              {totalMaterials}
            </strong>

            <span>
              {totalMaterials === 1
                ? 'Material'
                : 'Materials'}
            </span>
          </article>

        </div>

      </section>


      <div className="sf-subjects-layout">

        <form
          className="sf-subject-create"
          onSubmit={
            createSubject
          }
        >

          <div className="sf-subject-create-heading">

            <div className="sf-subject-create-icon">
              +
            </div>

            <div>
              <span>
                NEW SUBJECT
              </span>

              <h3>
                Add subject
              </h3>
            </div>

          </div>


          <label className="sf-subject-field">

            <span>
              Subject name
            </span>

            <input
              type="text"
              value={
                subjectName
              }
              onChange={(
                event,
              ) =>
                setSubjectName(
                  event
                    .target
                    .value,
                )
              }
              placeholder="Example: Programming"
            />

          </label>


          <label className="sf-subject-field">

            <span>
              Description
            </span>

            <textarea
              value={
                description
              }
              onChange={(
                event,
              ) =>
                setDescription(
                  event
                    .target
                    .value,
                )
              }
              rows={3}
              placeholder="Example: Java, Python, and programming fundamentals"
            />

          </label>


          <button
            type="submit"
            className="sf-subject-create-button"
            disabled={
              creating
            }
          >
            {creating
              ? 'Creating...'
              : 'Create subject'}
          </button>


          {error && (
            <div className="notice error">
              {error}
            </div>
          )}


          {success && (
            <div className="notice success">
              {success}
            </div>
          )}

        </form>


        <section className="sf-subject-library">

          <div className="sf-subject-library-heading">

            <div>
              <span>
                YOUR SUBJECTS
              </span>

              <h3>
                {subjectCount === 0
                  ? 'No subjects yet'
                  : `${subjectCount} ${
                      subjectCount === 1
                        ? 'Subject'
                        : 'Subjects'
                    }`}
              </h3>
            </div>

          </div>


          {loading ? (

            <div className="sf-subject-loading">
              Loading subjects...
            </div>

          ) : subjects.length ===
            0 ? (

            <div className="sf-subject-empty">

              <div>
                S
              </div>

              <strong>
                Add your first subject
              </strong>

              <p>
                Subjects help keep your uploaded files organized.
              </p>

            </div>

          ) : (

            <div className="sf-subject-list">

              {subjects.map(
                (
                  subject,
                ) => {
                  const materialCount =
                    materialCountMap[
                      subject.id
                    ] || 0

                  return (
                    <article
                      className="sf-subject-item"
                      key={
                        subject.id
                      }
                    >

                      <div className="sf-subject-item-icon">
                        {subject.name
                          ?.charAt(0)
                          ?.toUpperCase() ||
                          'S'}
                      </div>


                      <div className="sf-subject-item-content">

                        <strong>
                          {
                            subject.name
                          }
                        </strong>

                        {subject.description?.trim() && (
                          <p>
                            {
                              subject.description
                            }
                          </p>
                        )}

                        <span>
                          {materialCount}{' '}
                          {materialCount ===
                          1
                            ? 'material'
                            : 'materials'}
                        </span>

                      </div>


                      <div className="sf-subject-item-actions">

                        <Link
                          to={`/materials?subject=${subject.id}`}
                          className="sf-subject-open"
                        >
                          Open
                          <span>
                            →
                          </span>
                        </Link>


                        <button
                          type="button"
                          className="sf-subject-delete"
                          aria-label={`Delete ${subject.name}`}
                          disabled={
                            deletingId ===
                            subject.id
                          }
                          onClick={() =>
                            deleteSubject(
                              subject,
                            )
                          }
                        >
                          {deletingId ===
                          subject.id
                            ? '...'
                            : '×'}
                        </button>

                      </div>

                    </article>
                  )
                },
              )}

            </div>

          )}

        </section>

      </div>

    </div>
  )
}