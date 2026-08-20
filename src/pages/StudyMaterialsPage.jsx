import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  Link,
  useSearchParams,
} from 'react-router-dom'

import {
  supabase,
} from '../lib/supabase'

import {
  useAuth,
} from '../context/AuthContext'

import '../styles/mobile.css'


const BUCKET_NAME =
  'STUDY-MATERIALS'

const ALLOWED_EXTENSIONS = [
  'pdf',
  'docx',
  'pptx',
  'txt',
]

const MAX_FILE_SIZE =
  25 * 1024 * 1024


function getExtension(
  fileName,
) {
  return (
    fileName
      ?.split('.')
      .pop()
      ?.toLowerCase() || ''
  )
}


function formatFileSize(
  bytes,
) {
  if (!bytes) {
    return '0 MB'
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(2)} MB`
}


function normalizeStoragePath(
  rawPath,
) {
  if (!rawPath) {
    return ''
  }

  let path =
    decodeURIComponent(
      String(rawPath),
    ).trim()

  path =
    path.replace(/^\/+/, '')

  const signMarker =
    `/object/sign/${BUCKET_NAME}/`

  const publicMarker =
    `/object/public/${BUCKET_NAME}/`

  const renderMarker =
    `/object/${BUCKET_NAME}/`

  if (path.includes(signMarker)) {
    path =
      path.split(signMarker)[1]
  }

  if (path.includes(publicMarker)) {
    path =
      path.split(publicMarker)[1]
  }

  if (path.includes(renderMarker)) {
    path =
      path.split(renderMarker)[1]
  }

  if (
    path.startsWith(
      `${BUCKET_NAME}/`,
    )
  ) {
    path =
      path.slice(
        BUCKET_NAME.length + 1,
      )
  }

  return path.split('?')[0]
}


export default function StudyMaterialsPage() {
  const {
    user,
  } = useAuth()

  const [
    searchParams,
  ] = useSearchParams()

  const fileInputRef =
    useRef(null)

  const [
    subjects,
    setSubjects,
  ] = useState([])

  const [
    materials,
    setMaterials,
  ] = useState([])

  const [
    selectedSubject,
    setSelectedSubject,
  ] = useState(
    searchParams.get('subject') ||
      '',
  )

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    uploading,
    setUploading,
  ] = useState(false)

  const [
    dragging,
    setDragging,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const subjectFromUrl =
      searchParams.get('subject') || ''

    setSelectedSubject(
      subjectFromUrl,
    )
  }, [searchParams])

  async function loadData() {
    setLoading(true)
    setError('')

    await Promise.all([
      loadSubjects(),
      loadMaterials(),
    ])

    setLoading(false)
  }

  async function loadSubjects() {
    const {
      data,
      error: subjectError,
    } = await supabase
      .from('subjects')
      .select('id, name')
      .order('name')

    if (subjectError) {
      setError(
        subjectError.message,
      )
      return
    }

    setSubjects(data ?? [])
  }

  async function loadMaterials() {
    const {
      data,
      error: materialError,
    } = await supabase
      .from('study_materials')
      .select(`
        id,
        subject_id,
        file_name,
        file_path,
        file_type,
        file_size,
        processing_status,
        created_at,
        subjects (
          id,
          name
        )
      `)
      .order('created_at', {
        ascending: false,
      })

    if (materialError) {
      setError(
        materialError.message,
      )
      return
    }

    setMaterials(data ?? [])
  }

  function selectFile(
    file,
  ) {
    if (!file) {
      return
    }

    const extension =
      getExtension(file.name)

    if (
      !ALLOWED_EXTENSIONS.includes(
        extension,
      )
    ) {
      setError(
        'Only PDF, DOCX, PPTX, and TXT files are allowed.',
      )
      return
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setError(
        'File size must be 25 MB or smaller.',
      )
      return
    }

    setSelectedFile(file)
    setError('')
    setSuccess('')
  }

  function openFilePicker() {
    if (uploading) {
      return
    }

    fileInputRef.current?.click()
  }

  function handleDragOver(
    event,
  ) {
    event.preventDefault()

    if (!uploading) {
      setDragging(true)
    }
  }

  function handleDragLeave(
    event,
  ) {
    event.preventDefault()
    setDragging(false)
  }

  function handleDrop(
    event,
  ) {
    event.preventDefault()
    setDragging(false)

    if (uploading) {
      return
    }

    selectFile(
      event.dataTransfer.files?.[0],
    )
  }

  async function uploadMaterial(
    event,
  ) {
    event.preventDefault()

    if (!selectedSubject) {
      setError(
        'Select a subject.',
      )
      return
    }

    if (!selectedFile) {
      setError(
        'Choose a file.',
      )
      return
    }

    if (!user?.id) {
      setError(
        'Your session expired. Please sign in again.',
      )
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    const cleanName =
      selectedFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        '-',
      )

    const filePath =
      `${user.id}/${selectedSubject}/${crypto.randomUUID()}-${cleanName}`

    try {
      const {
        error: uploadError,
      } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(
          filePath,
          selectedFile,
          {
            upsert: false,
            contentType:
              selectedFile.type ||
              undefined,
          },
        )

      if (uploadError) {
        throw uploadError
      }

      const {
        data,
        error: databaseError,
      } = await supabase
        .from('study_materials')
        .insert({
          user_id: user.id,
          subject_id:
            selectedSubject,
          file_name:
            selectedFile.name,
          file_path: filePath,
          file_type:
            getExtension(
              selectedFile.name,
            ),
          file_size:
            selectedFile.size,
          processing_status:
            'uploaded',
        })
        .select(`
          id,
          subject_id,
          file_name,
          file_path,
          file_type,
          file_size,
          processing_status,
          created_at,
          subjects (
            id,
            name
          )
        `)
        .single()

      if (databaseError) {
        await supabase
          .storage
          .from(BUCKET_NAME)
          .remove([filePath])

        throw databaseError
      }

      setMaterials((current) => [
        data,
        ...current,
      ])

      setSelectedFile(null)

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          ''
      }

      setSuccess(
        'Material uploaded successfully.',
      )
    } catch (uploadRequestError) {
      setError(
        uploadRequestError?.message ||
          'Could not upload the material.',
      )
    } finally {
      setUploading(false)
    }
  }

  async function openMaterial(
    material,
  ) {
    setError('')

    const normalizedPath =
      normalizeStoragePath(
        material.file_path,
      )

    if (!normalizedPath) {
      setError(
        'This material has an invalid file path. Delete it and upload it again.',
      )
      return
    }

    const {
      data,
      error: signedUrlError,
    } = await supabase
      .storage
      .from(BUCKET_NAME)
      .createSignedUrl(
        normalizedPath,
        300,
      )

    if (signedUrlError) {
      const message =
        signedUrlError.message ||
        'Could not open the file.'

      if (
        message
          .toLowerCase()
          .includes(
            'object not found',
          )
      ) {
        setError(
          'This file is missing in Storage. Delete this item, then upload the file again.',
        )
      } else {
        setError(message)
      }

      return
    }

    window.open(
      data.signedUrl,
      '_blank',
      'noopener,noreferrer',
    )
  }

  async function deleteMaterial(
    material,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${material.file_name}"?`,
      )

    if (!confirmed) {
      return
    }

    setError('')

    const normalizedPath =
      normalizeStoragePath(
        material.file_path,
      )

    if (normalizedPath) {
      await supabase
        .storage
        .from(BUCKET_NAME)
        .remove([
          normalizedPath,
        ])
    }

    const {
      error: databaseError,
    } = await supabase
      .from('study_materials')
      .delete()
      .eq('id', material.id)

    if (databaseError) {
      setError(
        databaseError.message,
      )
      return
    }

    setMaterials((current) =>
      current.filter(
        (item) =>
          item.id !== material.id,
      ),
    )
  }

  const shownMaterials =
    selectedSubject
      ? materials.filter(
          (material) =>
            material.subject_id ===
            selectedSubject,
        )
      : materials

  const activeSubject =
    useMemo(
      () =>
        subjects.find(
          (subject) =>
            subject.id ===
            selectedSubject,
        ) || null,
      [subjects, selectedSubject],
    )

  return (
    <div className="page-stack materials-page">

      <section className="materials-header">
        <div>
          <p className="eyebrow">
            MATERIAL LIBRARY
          </p>

          <h2>
            Study Materials
          </h2>

          <p>
            Upload PDF, DOCX, PPTX, and TXT files for your subjects.
          </p>
        </div>

        <div className="materials-summary-chips">
          <span className="summary-chip">
            {shownMaterials.length}{' '}
            {shownMaterials.length === 1
              ? 'file'
              : 'files'}
          </span>

          {activeSubject && (
            <span className="summary-chip muted-chip">
              {activeSubject.name}
            </span>
          )}
        </div>
      </section>

      <div className="materials-layout">

        <form
          className="panel upload-panel"
          onSubmit={uploadMaterial}
        >
          <div>
            <p className="eyebrow">
              UPLOAD
            </p>

            <h3>
              Add study material
            </h3>
          </div>

          <label className="field">
            <span>
              Subject
            </span>

            <select
              className="study-select"
              value={selectedSubject}
              onChange={(
                event,
              ) =>
                setSelectedSubject(
                  event.target.value,
                )
              }
            >
              <option value="">
                Select subject
              </option>

              {subjects.map(
                (subject) => (
                  <option
                    key={subject.id}
                    value={subject.id}
                  >
                    {subject.name}
                  </option>
                ),
              )}
            </select>
          </label>

          <button
            type="button"
            className={
              dragging
                ? 'upload-dropzone is-dragging'
                : 'upload-dropzone'
            }
            onClick={openFilePicker}
            onDragOver={
              handleDragOver
            }
            onDragLeave={
              handleDragLeave
            }
            onDrop={handleDrop}
            disabled={uploading}
          >
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".pdf,.docx,.pptx,.txt"
              onChange={(
                event,
              ) =>
                selectFile(
                  event.target.files?.[0],
                )
              }
            />

            <div className="upload-icon">
              ↑
            </div>

            {selectedFile ? (
              <>
                <strong>
                  {selectedFile.name}
                </strong>

                <span>
                  {formatFileSize(
                    selectedFile.size,
                  )}
                </span>
              </>
            ) : (
              <>
                <strong>
                  Choose study material
                </strong>

                <span>
                  Click or drag a file here
                </span>

                <span>
                  PDF • DOCX • PPTX • TXT
                </span>
              </>
            )}
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={uploading}
          >
            {uploading
              ? 'Uploading...'
              : 'Upload material'}
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

        <section className="panel material-library">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                LIBRARY
              </p>

              <h3>
                Materials
              </h3>
            </div>

            <span className="muted">
              {shownMaterials.length}{' '}
              {shownMaterials.length === 1
                ? 'file'
                : 'files'}
            </span>
          </div>

          {loading ? (
            <p>
              Loading...
            </p>
          ) : shownMaterials.length ===
            0 ? (
            <div className="empty-state">
              <strong>
                No materials yet.
              </strong>
              <p>
                Upload your first file.
              </p>
            </div>
          ) : (
            <div className="materials-list">
              {shownMaterials.map(
                (material) => (
                  <article
                    className="material-item"
                    key={material.id}
                  >
                    <div className="file-type-box">
                      {material.file_type?.toUpperCase() ||
                        'FILE'}
                    </div>

                    <div className="material-info">
                      <strong>
                        {material.file_name}
                      </strong>

                      <div className="material-meta">
                        <span>
                          {material.subjects
                            ?.name ||
                            'No subject'}
                        </span>

                        <span>
                          {formatFileSize(
                            material.file_size,
                          )}
                        </span>

                        <span>
                          {material.processing_status ||
                            'uploaded'}
                        </span>
                      </div>
                    </div>

                    <div className="material-actions">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() =>
                          openMaterial(
                            material,
                          )
                        }
                      >
                        Open
                      </button>

                      <Link
                        className="material-ai-button"
                        to={`/ai-study?material=${material.id}`}
                      >
                        <span>
                          ✦
                        </span>
                        Study with AI
                      </Link>

                      <button
                        type="button"
                        className="material-delete-button"
                        aria-label={`Delete ${material.file_name}`}
                        onClick={() =>
                          deleteMaterial(
                            material,
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}