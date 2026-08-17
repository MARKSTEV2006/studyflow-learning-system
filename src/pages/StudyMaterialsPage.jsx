import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'



 const BUCKET_NAME = 'study-materials'


const ALLOWED_EXTENSIONS = [
  'pdf',
  'docx',
  'pptx',
  'txt',
]


const MAX_FILE_SIZE =
  25 * 1024 * 1024


export default function StudyMaterialsPage() {
  const { user } = useAuth()

  const navigate =
    useNavigate()

  const [searchParams] =
    useSearchParams()

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
    searchParams.get('subject') || '',
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


  /*
   * Load subjects and materials.
   */
  async function loadData() {
    setLoading(true)
    setError('')

    await Promise.all([
      loadSubjects(),
      loadMaterials(),
    ])

    setLoading(false)
  }


  /*
   * Load user subjects.
   */
  async function loadSubjects() {
    const {
      data,
      error: subjectError,
    } =
      await supabase
        .from('subjects')
        .select(
          `
          id,
          name
          `,
        )
        .order('name')


    if (subjectError) {
      setError(
        subjectError.message,
      )

      return
    }


    setSubjects(
      data ?? [],
    )
  }


  /*
   * Load uploaded study materials.
   */
  async function loadMaterials() {
    const {
      data,
      error: materialError,
    } =
      await supabase
        .from('study_materials')
        .select(
          `
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
          `,
        )
        .order(
          'created_at',
          {
            ascending: false,
          },
        )


    if (materialError) {
      setError(
        materialError.message,
      )

      return
    }


    setMaterials(
      data ?? [],
    )
  }


  /*
   * File extension helper.
   */
  function getExtension(
    fileName,
  ) {
    return (
      fileName
        .split('.')
        .pop()
        ?.toLowerCase() ||
      ''
    )
  }


  /*
   * Human readable file size.
   */
  function formatFileSize(
    size,
  ) {
    if (!size) {
      return '0 MB'
    }

    return `${(
      size /
      1024 /
      1024
    ).toFixed(2)} MB`
  }


  /*
   * Select local study file.
   */
  function selectFile(
    file,
  ) {
    if (!file) {
      return
    }


    const extension =
      getExtension(
        file.name,
      )


    if (
      !ALLOWED_EXTENSIONS
        .includes(
          extension,
        )
    ) {
      setError(
        'Only PDF, DOCX, PPTX and TXT files are allowed.',
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


    setSelectedFile(
      file,
    )

    setError('')
    setSuccess('')
  }


  /*
   * Upload material.
   */
  async function uploadMaterial(
    event,
  ) {
    event.preventDefault()


    if (!user?.id) {
      setError(
        'Your session expired. Please sign in again.',
      )

      return
    }


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


    /*
     * Upload file to Supabase Storage.
     */
    const {
      error: uploadError,
    } =
      await supabase
        .storage
        .from(
          BUCKET_NAME,
        )
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
      setError(
        uploadError.message,
      )

      setUploading(false)

      return
    }


    /*
     * Save material metadata.
     */
    const {
      data,
      error: databaseError,
    } =
      await supabase
        .from(
          'study_materials',
        )
        .insert({
          user_id:
            user.id,

          subject_id:
            selectedSubject,

          file_name:
            selectedFile.name,

          file_path:
            filePath,

          file_type:
            getExtension(
              selectedFile.name,
            ),

          file_size:
            selectedFile.size,

          processing_status:
            'uploaded',
        })
        .select(
          `
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
          `,
        )
        .single()


    /*
     * Roll back Storage upload
     * if database insert failed.
     */
    if (databaseError) {
      await supabase
        .storage
        .from(
          BUCKET_NAME,
        )
        .remove([
          filePath,
        ])


      setError(
        databaseError.message,
      )

      setUploading(false)

      return
    }


    setMaterials(
      (current) => [
        data,
        ...current,
      ],
    )


    setSelectedFile(
      null,
    )


    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        ''
    }


    setSuccess(
      'Material uploaded successfully.',
    )

    setUploading(false)
  }


  /*
   * Open original uploaded file.
   */
  async function openMaterial(
    material,
  ) {
    setError('')


    const {
      data,
      error: signedUrlError,
    } =
      await supabase
        .storage
        .from(
          BUCKET_NAME,
        )
        .createSignedUrl(
          material.file_path,
          60,
        )


    if (signedUrlError) {
      setError(
        signedUrlError.message,
      )

      return
    }


    window.open(
      data.signedUrl,
      '_blank',
      'noopener,noreferrer',
    )
  }


  /*
   * PHASE 2C
   *
   * Open selected material
   * inside StudyFlow AI.
   */
  function studyWithAI(
    material,
  ) {
    setError('')


    if (!material?.id) {
      setError(
        'Could not identify this study material.',
      )

      return
    }


    const params =
      new URLSearchParams({
        material:
          material.id,
      })


    navigate(
      `/ai-study?${params.toString()}`,
    )
  }


  /*
   * Delete uploaded material.
   */
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
    setSuccess('')


    /*
     * Delete file from Storage.
     */
    const {
      error: storageError,
    } =
      await supabase
        .storage
        .from(
          BUCKET_NAME,
        )
        .remove([
          material.file_path,
        ])


    if (storageError) {
      setError(
        storageError.message,
      )

      return
    }


    /*
     * Delete database row.
     */
    const {
      error: databaseError,
    } =
      await supabase
        .from(
          'study_materials',
        )
        .delete()
        .eq(
          'id',
          material.id,
        )


    if (databaseError) {
      setError(
        databaseError.message,
      )

      return
    }


    setMaterials(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            material.id,
        ),
    )


    setSuccess(
      'Material deleted.',
    )
  }


  /*
   * Filter materials
   * by selected subject.
   */
  const shownMaterials =
    selectedSubject
      ? materials.filter(
          (material) =>
            material.subject_id ===
            selectedSubject,
        )
      : materials


  return (
    <div className="page-stack">

      {/* =====================================
          PAGE HEADER
      ===================================== */}

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

      </section>


      <div className="materials-layout">

        {/* =====================================
            UPLOAD PANEL
        ===================================== */}

        <form
          className="panel upload-panel"
          onSubmit={
            uploadMaterial
          }
        >

          <div>

            <p className="eyebrow">
              UPLOAD
            </p>

            <h3>
              Add study material
            </h3>

          </div>


          {/* SUBJECT */}

          <label className="field">

            <span>
              Subject
            </span>

            <select
              className="study-select"

              value={
                selectedSubject
              }

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
                    key={
                      subject.id
                    }

                    value={
                      subject.id
                    }
                  >
                    {subject.name}
                  </option>
                ),
              )}

            </select>

          </label>


          {/* FILE PICKER */}

          <div
            className="upload-dropzone"

            role="button"

            tabIndex={0}

            onClick={() =>
              fileInputRef
                .current
                ?.click()
            }

            onKeyDown={(
              event,
            ) => {
              if (
                event.key ===
                  'Enter' ||
                event.key ===
                  ' '
              ) {
                fileInputRef
                  .current
                  ?.click()
              }
            }}
          >

            <input
              ref={
                fileInputRef
              }

              type="file"

              hidden

              accept=".pdf,.docx,.pptx,.txt"

              onChange={(
                event,
              ) =>
                selectFile(
                  event.target
                    .files?.[0],
                )
              }
            />


            <div className="upload-icon">
              ↑
            </div>


            {selectedFile ? (
              <>

                <strong>
                  {
                    selectedFile.name
                  }
                </strong>

                <span>
                  {
                    formatFileSize(
                      selectedFile.size,
                    )
                  }
                </span>

              </>
            ) : (
              <>

                <strong>
                  Choose study material
                </strong>

                <span>
                  PDF • DOCX • PPTX • TXT
                </span>

              </>
            )}

          </div>


          {/* UPLOAD BUTTON */}

          <button
            type="submit"

            className="primary-button"

            disabled={
              uploading
            }
          >

            {
              uploading
                ? 'Uploading...'
                : 'Upload material'
            }

          </button>


          {/* ERROR */}

          {error && (
            <div className="notice error">
              {error}
            </div>
          )}


          {/* SUCCESS */}

          {success && (
            <div className="notice success">
              {success}
            </div>
          )}

        </form>


        {/* =====================================
            MATERIAL LIBRARY
        ===================================== */}

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
              {
                shownMaterials.length
              }{' '}
              {
                shownMaterials.length ===
                1
                  ? 'file'
                  : 'files'
              }
            </span>

          </div>


          {/* LOADING */}

          {loading ? (

            <p>
              Loading...
            </p>

          ) : shownMaterials.length ===
            0 ? (

            /* EMPTY */

            <div className="empty-state">

              <strong>
                No materials yet.
              </strong>

              <p>
                Upload your first file.
              </p>

            </div>

          ) : (

            /* MATERIAL LIST */

            <div className="materials-list">

              {shownMaterials.map(
                (material) => (

                  <article
                    className="material-item"

                    key={
                      material.id
                    }
                  >

                    {/* FILE TYPE */}

                    <div className="file-type-box">
                      {
                        material
                          .file_type
                          ?.toUpperCase()
                      }
                    </div>


                    {/* FILE INFO */}

                    <div className="material-info">

                      <strong>
                        {
                          material
                            .file_name
                        }
                      </strong>


                      <div className="material-meta">

                        <span>
                          {
                            material
                              .subjects
                              ?.name ||
                            'No subject'
                          }
                        </span>


                        <span>
                          {
                            formatFileSize(
                              material
                                .file_size,
                            )
                          }
                        </span>


                        <span>
                          {
                            material
                              .processing_status ||
                            'uploaded'
                          }
                        </span>

                      </div>

                    </div>


                    {/* ACTIONS */}

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


                      <button
                        type="button"

                        className="material-ai-button"

                        onClick={() =>
                          studyWithAI(
                            material,
                          )
                        }
                      >
                        <span>
                          ✦
                        </span>

                        Study with AI
                      </button>


                      <button
                        type="button"

                        className="material-delete-button"

                        aria-label={
                          `Delete ${material.file_name}`
                        }

                        title="Delete material"

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