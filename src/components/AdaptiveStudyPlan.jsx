import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import {
  FunctionsHttpError,
} from '@supabase/supabase-js'

import {
  supabase,
} from '../lib/supabase'


/* =========================================================
   HELPERS
========================================================= */

function normalizeProgress(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return {}
  }

  return value
}


function countCompletedTasks(
  studyPlan,
  progress,
) {
  return studyPlan.reduce(
    (
      total,
      _task,
      index,
    ) => {
      const taskState =
        progress?.[
          String(index)
        ]

      return taskState?.completed
        ? total + 1
        : total
    },
    0,
  )
}


/* =========================================================
   COMPONENT
========================================================= */

export default function AdaptiveStudyPlan({
  userId,
}) {
  /* =======================================================
     STATE
  ======================================================= */

  const [
    insightRow,
    setInsightRow,
  ] =
    useState(null)


  const [
    studyPlan,
    setStudyPlan,
  ] =
    useState([])


  const [
    progress,
    setProgress,
  ] =
    useState({})


  const [
    loading,
    setLoading,
  ] =
    useState(true)


  const [
    generating,
    setGenerating,
  ] =
    useState(false)


  const [
    savingTask,
    setSavingTask,
  ] =
    useState(null)


  const [
    error,
    setError,
  ] =
    useState('')


  const [
    filter,
    setFilter,
  ] =
    useState('all')


  /* =======================================================
     ANALYTICS UPDATE EVENT
  ======================================================= */

  function notifyAnalytics(
    type,
  ) {
    window.dispatchEvent(
      new CustomEvent(
        'studyflow:study-plan-progress',
        {
          detail: {
            userId,
            type,
          },
        },
      ),
    )
  }


  /* =======================================================
     LOAD STUDY PLAN

     Database is the source of truth.
  ======================================================= */

  const loadStudyPlan =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (!userId) {
          setInsightRow(null)
          setStudyPlan([])
          setProgress({})

          if (!silent) {
            setLoading(false)
          }

          return
        }


        if (!silent) {
          setLoading(true)
        }


        setError('')


        try {
          const {
            data,
            error:
              queryError,
          } =
            await supabase
              .from(
                'study_insights',
              )
              .select(`
                id,
                user_id,
                study_plan,
                study_plan_source_attempt_count,
                study_plan_generated_at,
                study_plan_progress,
                study_plan_completed_count,
                study_plan_total_count,
                study_plan_progress_updated_at
              `)
              .eq(
                'user_id',
                userId,
              )
              .maybeSingle()


          if (queryError) {
            throw queryError
          }


          /* ===============================================
             NO STUDY INSIGHT ROW
          =============================================== */

          if (!data) {
            setInsightRow(null)
            setStudyPlan([])
            setProgress({})

            return
          }


          /* ===============================================
             NORMALIZE DATA
          =============================================== */

          const incomingPlan =
            Array.isArray(
              data.study_plan,
            )
              ? data.study_plan
              : []


          const incomingProgress =
            normalizeProgress(
              data.study_plan_progress,
            )


          const actualCompletedCount =
            countCompletedTasks(
              incomingPlan,
              incomingProgress,
            )


          const actualTotalCount =
            incomingPlan.length


          /* ===============================================
             RESTORE UI
          =============================================== */

          setInsightRow(
            data,
          )


          setStudyPlan(
            incomingPlan,
          )


          setProgress(
            incomingProgress,
          )


          /* ===============================================
             REPAIR COUNTS IF DATABASE COUNTS ARE STALE
          =============================================== */

          const storedCompletedCount =
            Number(
              data
                .study_plan_completed_count ||
                0,
            )


          const storedTotalCount =
            Number(
              data
                .study_plan_total_count ||
                0,
            )


          if (
            storedCompletedCount !==
              actualCompletedCount ||
            storedTotalCount !==
              actualTotalCount
          ) {
            const {
              error:
                repairError,
            } =
              await supabase
                .from(
                  'study_insights',
                )
                .update({
                  study_plan_completed_count:
                    actualCompletedCount,

                  study_plan_total_count:
                    actualTotalCount,
                })
                .eq(
                  'id',
                  data.id,
                )
                .eq(
                  'user_id',
                  userId,
                )


            if (
              repairError
            ) {
              console.warn(
                'Study plan count repair warning:',
                repairError,
              )
            }
          }
        }


        catch (
          requestError
        ) {
          console.error(
            'Adaptive study plan load error:',
            requestError,
          )


          setError(
            requestError?.message ||
              'Could not load your adaptive study plan.',
          )
        }


        finally {
          if (!silent) {
            setLoading(false)
          }
        }
      },

      [
        userId,
      ],
    )


  /* =======================================================
     INITIAL LOAD

     Runs after:
     - login
     - refresh
     - user changes
  ======================================================= */

  useEffect(
    () => {
      if (!userId) {
        setInsightRow(null)
        setStudyPlan([])
        setProgress({})
        setLoading(false)

        return
      }


      loadStudyPlan()
    },

    [
      userId,
      loadStudyPlan,
    ],
  )


  /* =======================================================
     SYNC WHEN RETURNING TO APP
  ======================================================= */

  useEffect(
    () => {
      if (!userId) {
        return undefined
      }


      function handleWindowFocus() {
        loadStudyPlan({
          silent:
            true,
        })
      }


      function handleVisibilityChange() {
        if (
          document.visibilityState ===
          'visible'
        ) {
          loadStudyPlan({
            silent:
              true,
          })
        }
      }


      window.addEventListener(
        'focus',
        handleWindowFocus,
      )


      document.addEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )


      return () => {
        window.removeEventListener(
          'focus',
          handleWindowFocus,
        )


        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        )
      }
    },

    [
      userId,
      loadStudyPlan,
    ],
  )


  /* =======================================================
     GENERATE / REFRESH PLAN

     NEW PLAN = NEW PROGRESS
  ======================================================= */

  async function generateStudyPlan() {
    if (
      !userId ||
      generating ||
      savingTask !== null
    ) {
      return
    }


    setGenerating(
      true,
    )


    setError(
      '',
    )


    try {
      /* ===============================================
         SESSION
      =============================================== */

      const {
        data: {
          session,
        },

        error:
          sessionError,
      } =
        await supabase
          .auth
          .getSession()


      if (sessionError) {
        throw sessionError
      }


      if (!session) {
        throw new Error(
          'Your session expired. Please sign in again.',
        )
      }


      /* ===============================================
         GENERATE NEW AI PLAN
      =============================================== */

      const {
        data:
          functionData,

        error:
          functionError,
      } =
        await supabase
          .functions
          .invoke(
            'study-ai-v2',
            {
              headers: {
                Authorization:
                  `Bearer ${session.access_token}`,
              },

              body: {
                mode:
                  'generate-study-plan',

                force:
                  true,
              },
            },
          )


      /* ===============================================
         EDGE FUNCTION ERROR
      =============================================== */

      if (functionError) {
        console.error(
          'Generate study plan function error:',
          functionError,
        )


        if (
          functionError instanceof
          FunctionsHttpError
        ) {
          let errorBody =
            null


          try {
            errorBody =
              await functionError
                .context
                .json()
          }

          catch {
            // Ignore non-JSON response.
          }


          throw new Error(
            errorBody?.error ||
              errorBody?.message ||
              `StudyFlow AI returned HTTP ${
                functionError
                  ?.context
                  ?.status ||
                'error'
              }.`,
          )
        }


        throw functionError
      }


      if (
        functionData?.error
      ) {
        throw new Error(
          functionData.error,
        )
      }


      /* ===============================================
         GET NEW PLAN FROM DATABASE

         Do not depend only on Edge Function response.
      =============================================== */

      const {
        data:
          generatedInsight,

        error:
          generatedInsightError,
      } =
        await supabase
          .from(
            'study_insights',
          )
          .select(`
            id,
            user_id,
            study_plan,
            study_plan_generated_at
          `)
          .eq(
            'user_id',
            userId,
          )
          .maybeSingle()


      if (
        generatedInsightError
      ) {
        throw generatedInsightError
      }


      if (
        !generatedInsight
      ) {
        throw new Error(
          'The new study plan was generated, but StudyFlow could not find the saved plan.',
        )
      }


      const newStudyPlan =
        Array.isArray(
          generatedInsight.study_plan,
        )
          ? generatedInsight.study_plan
          : []


      /* ===============================================
         RESET OLD COMPLETION DATA
      =============================================== */

      const resetTime =
        new Date()
          .toISOString()


      const {
        data:
          resetRows,

        error:
          resetError,
      } =
        await supabase
          .from(
            'study_insights',
          )
          .update({
            study_plan_progress:
              {},

            study_plan_completed_count:
              0,

            study_plan_total_count:
              newStudyPlan.length,

            study_plan_progress_updated_at:
              resetTime,
          })
          .eq(
            'id',
            generatedInsight.id,
          )
          .eq(
            'user_id',
            userId,
          )
          .select(`
            id,
            user_id,
            study_plan,
            study_plan_source_attempt_count,
            study_plan_generated_at,
            study_plan_progress,
            study_plan_completed_count,
            study_plan_total_count,
            study_plan_progress_updated_at
          `)


      if (resetError) {
        throw resetError
      }


      if (
        !Array.isArray(
          resetRows,
        ) ||
        resetRows.length ===
          0
      ) {
        throw new Error(
          'The new study plan was created, but progress could not be reset. Check the study_insights RLS UPDATE policy.',
        )
      }


      const resetRow =
        resetRows[0]


      /* ===============================================
         UPDATE LOCAL UI
      =============================================== */

      setProgress(
        {},
      )


      setStudyPlan(
        newStudyPlan,
      )


      setInsightRow(
        resetRow,
      )


      setFilter(
        'all',
      )


      /* ===============================================
         NOTIFY ANALYTICS
      =============================================== */

      notifyAnalytics(
        'plan-reset',
      )


      /* ===============================================
         FINAL DATABASE SYNC
      =============================================== */

      await loadStudyPlan({
        silent:
          true,
      })
    }


    catch (
      requestError
    ) {
      console.error(
        'Generate adaptive plan error:',
        requestError,
      )


      setError(
        requestError?.message ||
          'Could not generate your new study plan.',
      )


      /*
       * Restore real database state
       * if generation/reset fails.
       */

      await loadStudyPlan({
        silent:
          true,
      })
    }


    finally {
      setGenerating(
        false,
      )
    }
  }


  /* =======================================================
     GET TASK PROGRESS
  ======================================================= */

  function getTaskProgress(
    index,
  ) {
    const item =
      progress?.[
        String(index)
      ]


    return {
      completed:
        Boolean(
          item?.completed,
        ),

      completedAt:
        item?.completed_at ||
        null,
    }
  }


  /* =======================================================
     COUNTS
  ======================================================= */

  const totalCount =
    studyPlan.length


  const completedCount =
    useMemo(
      () =>
        countCompletedTasks(
          studyPlan,
          progress,
        ),

      [
        studyPlan,
        progress,
      ],
    )


  const pendingCount =
    Math.max(
      totalCount -
        completedCount,
      0,
    )


  const progressPercent =
    totalCount > 0
      ? Math.round(
          (
            completedCount /
            totalCount
          ) *
            100,
        )
      : 0


  /* =======================================================
     FILTERED TASKS
  ======================================================= */

  const filteredTasks =
    useMemo(
      () =>
        studyPlan
          .map(
            (
              task,
              index,
            ) => ({
              task,

              index,

              completed:
                Boolean(
                  progress?.[
                    String(index)
                  ]?.completed,
                ),
            }),
          )
          .filter(
            (
              item,
            ) => {
              if (
                filter ===
                'completed'
              ) {
                return item.completed
              }


              if (
                filter ===
                'pending'
              ) {
                return !item.completed
              }


              return true
            },
          ),

      [
        studyPlan,
        progress,
        filter,
      ],
    )


  /* =======================================================
     TOGGLE TASK COMPLETION
  ======================================================= */

  async function toggleTaskCompletion(
    index,
  ) {
    if (
      !insightRow?.id ||
      !userId ||
      savingTask !== null
    ) {
      return
    }


    const progressKey =
      String(index)


    const currentTaskState =
      progress?.[
        progressKey
      ] || {}


    const nextCompleted =
      !Boolean(
        currentTaskState.completed,
      )


    const nextProgress = {
      ...progress,

      [progressKey]: {
        completed:
          nextCompleted,

        completed_at:
          nextCompleted
            ? new Date()
                .toISOString()
            : null,
      },
    }


    const nextCompletedCount =
      countCompletedTasks(
        studyPlan,
        nextProgress,
      )


    setSavingTask(
      index,
    )


    setError(
      '',
    )


    try {
      const now =
        new Date()
          .toISOString()


      /* ===============================================
         SAVE TO SUPABASE
      =============================================== */

      const {
        data:
          updatedRows,

        error:
          updateError,
      } =
        await supabase
          .from(
            'study_insights',
          )
          .update({
            study_plan_progress:
              nextProgress,

            study_plan_completed_count:
              nextCompletedCount,

            study_plan_total_count:
              studyPlan.length,

            study_plan_progress_updated_at:
              now,
          })
          .eq(
            'id',
            insightRow.id,
          )
          .eq(
            'user_id',
            userId,
          )
          .select(`
            id,
            user_id,
            study_plan,
            study_plan_source_attempt_count,
            study_plan_generated_at,
            study_plan_progress,
            study_plan_completed_count,
            study_plan_total_count,
            study_plan_progress_updated_at
          `)


      if (updateError) {
        throw updateError
      }


      if (
        !Array.isArray(
          updatedRows,
        ) ||
        updatedRows.length ===
          0
      ) {
        throw new Error(
          'Study plan progress was not saved. Check the study_insights RLS policies.',
        )
      }


      const updatedRow =
        updatedRows[0]


      const savedProgress =
        normalizeProgress(
          updatedRow
            .study_plan_progress,
        )


      /* ===============================================
         UPDATE LOCAL STATE USING DATABASE RESULT
      =============================================== */

      setProgress(
        savedProgress,
      )


      setInsightRow(
        (
          current,
        ) => ({
          ...current,

          ...updatedRow,
        }),
      )


      /* ===============================================
         NOTIFY ANALYTICS COMPONENT
      =============================================== */

      notifyAnalytics(
        nextCompleted
          ? 'task-completed'
          : 'task-reopened',
      )
    }


    catch (
      requestError
    ) {
      console.error(
        'Study plan completion update error:',
        requestError,
      )


      setError(
        requestError?.message ||
          'Could not save your study plan progress.',
      )


      /*
       * Restore database state if save fails.
       */

      await loadStudyPlan({
        silent:
          true,
      })
    }


    finally {
      setSavingTask(
        null,
      )
    }
  }


  /* =======================================================
     PRIORITY HELPERS
  ======================================================= */

  function getPriorityClass(
    priority,
  ) {
    const value =
      String(
        priority ||
          'medium',
      )
        .trim()
        .toLowerCase()


    if (
      value ===
      'high'
    ) {
      return 'high'
    }


    if (
      value ===
      'low'
    ) {
      return 'low'
    }


    return 'medium'
  }


  function getPriorityLabel(
    priority,
  ) {
    const value =
      getPriorityClass(
        priority,
      )


    if (
      value ===
      'high'
    ) {
      return 'High priority'
    }


    if (
      value ===
      'low'
    ) {
      return 'Low priority'
    }


    return 'Medium priority'
  }


  /* =======================================================
     TASK FIELD HELPERS
  ======================================================= */

  function getTaskTitle(
    task,
    index,
  ) {
    return (
      task?.title ||
      task?.task ||
      task?.action ||
      `Study task ${index + 1}`
    )
  }


  function getTaskDuration(
    task,
  ) {
    return (
      task?.duration ||
      task?.durationMinutes ||
      task?.duration_min ||
      task?.minutes ||
      null
    )
  }


  function formatDuration(
    duration,
  ) {
    if (!duration) {
      return null
    }


    const value =
      String(duration)


    if (
      /min|hour|hr/i.test(
        value,
      )
    ) {
      return value
    }


    return `${value} min`
  }


  function getTaskSubject(
    task,
  ) {
    return (
      task?.subject ||
      task?.subjectName ||
      null
    )
  }


  function getTaskTopic(
    task,
  ) {
    return (
      task?.topic ||
      task?.weakTopic ||
      task?.focus ||
      null
    )
  }


  function getTaskReason(
    task,
  ) {
    return (
      task?.reason ||
      task?.description ||
      task?.why ||
      null
    )
  }


  function getMaterialName(
    task,
  ) {
    return (
      task?.materialName ||
      task?.material_name ||
      null
    )
  }


  function getMaterialId(
    task,
  ) {
    return (
      task?.materialId ||
      task?.material_id ||
      null
    )
  }


  /* =======================================================
     FORMAT COMPLETION DATE
  ======================================================= */

  function formatCompletedDate(
    value,
  ) {
    if (!value) {
      return ''
    }


    const date =
      new Date(value)


    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return ''
    }


    return new Intl
      .DateTimeFormat(
        'en-PH',
        {
          month:
            'short',

          day:
            'numeric',

          hour:
            'numeric',

          minute:
            '2-digit',
        },
      )
      .format(date)
  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <section className="adaptive-plan-section">

        <div className="adaptive-plan-loading">

          <div className="ai-thinking">
            <span />
            <span />
            <span />
          </div>


          <strong>
            Loading your study plan...
          </strong>


          <p>
            Restoring your saved StudyFlow
            progress.
          </p>

        </div>

      </section>
    )
  }


  /* =======================================================
     UI
  ======================================================= */

  return (
    <section className="adaptive-plan-section">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="adaptive-plan-heading">

        <div>

          <span className="adaptive-plan-label">
            STUDYFLOW AI
          </span>


          <h3>
            Adaptive Study Plan
          </h3>

        </div>


        <button
          type="button"

          className="adaptive-plan-refresh"

          disabled={
            generating ||
            savingTask !== null
          }

          onClick={
            generateStudyPlan
          }
        >
          {
            generating
              ? 'Generating...'

              : studyPlan.length > 0
                ? 'Refresh plan'
                : 'Generate plan'
          }
        </button>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {
        error && (

          <div className="adaptive-plan-error">

            <strong>
              Something went wrong
            </strong>


            <p>
              {error}
            </p>


            <button
              type="button"

              onClick={() =>
                loadStudyPlan()
              }
            >
              Try again
            </button>

          </div>

        )
      }


      {/* =================================================
          EMPTY PLAN
      ================================================= */}

      {
        !error &&
        studyPlan.length ===
          0 && (

          <div className="adaptive-plan-empty">

            <div className="adaptive-plan-empty-icon">
              ✦
            </div>


            <strong>
              No adaptive study plan yet
            </strong>


            <p>
              Complete an interactive quiz.
              StudyFlow will use your weak
              topics to prepare your plan.
            </p>


            <Link to="/ai-study">
              Start studying
            </Link>

          </div>

        )
      }


      {/* =================================================
          ACTIVE PLAN
      ================================================= */}

      {
        studyPlan.length >
          0 && (

          <>

            {/* =============================================
                PROGRESS
            ============================================= */}

            <div className="study-plan-progress">

              <div className="study-plan-progress-top">

                <div>

                  <span className="study-plan-progress-label">
                    PLAN PROGRESS
                  </span>


                  <strong className="study-plan-progress-count">
                    {completedCount} of{' '}
                    {totalCount} completed
                  </strong>

                </div>


                <div className="study-plan-progress-value">
                  {progressPercent}%
                </div>

              </div>


              <div
                className="study-plan-progress-track"

                role="progressbar"

                aria-label="Study plan completion"

                aria-valuemin="0"

                aria-valuemax="100"

                aria-valuenow={
                  progressPercent
                }
              >

                <div
                  className="study-plan-progress-fill"

                  style={{
                    width:
                      `${progressPercent}%`,
                  }}
                />

              </div>


              <div className="study-plan-progress-bottom">

                <span>
                  {
                    progressPercent ===
                    100
                      ? 'Plan completed'

                      : `${pendingCount} ${
                          pendingCount ===
                          1
                            ? 'task'
                            : 'tasks'
                        } remaining`
                  }
                </span>


                {
                  progressPercent ===
                    100 && (

                    <span className="study-plan-finished">
                      ✓ Nice work
                    </span>

                  )
                }

              </div>

            </div>


            {/* =============================================
                FILTERS
            ============================================= */}

            <div
              className="study-plan-filters"

              role="group"

              aria-label="Filter study plan tasks"
            >

              <button
                type="button"

                className={
                  filter ===
                  'all'
                    ? 'active'
                    : ''
                }

                onClick={() =>
                  setFilter(
                    'all',
                  )
                }
              >

                <span>
                  All
                </span>

                <strong>
                  {totalCount}
                </strong>

              </button>


              <button
                type="button"

                className={
                  filter ===
                  'pending'
                    ? 'active'
                    : ''
                }

                onClick={() =>
                  setFilter(
                    'pending',
                  )
                }
              >

                <span>
                  Pending
                </span>

                <strong>
                  {pendingCount}
                </strong>

              </button>


              <button
                type="button"

                className={
                  filter ===
                  'completed'
                    ? 'active'
                    : ''
                }

                onClick={() =>
                  setFilter(
                    'completed',
                  )
                }
              >

                <span>
                  Completed
                </span>

                <strong>
                  {completedCount}
                </strong>

              </button>

            </div>


            {/* =============================================
                EMPTY FILTER
            ============================================= */}

            {
              filteredTasks.length ===
                0 && (

                <div className="study-plan-filter-empty">

                  <span>
                    {
                      filter ===
                      'completed'
                        ? '✓'
                        : '○'
                    }
                  </span>


                  <strong>
                    {
                      filter ===
                      'completed'
                        ? 'No completed tasks yet'
                        : 'No pending tasks'
                    }
                  </strong>


                  <p>
                    {
                      filter ===
                      'completed'
                        ? 'Complete a study task and it will appear here.'
                        : 'You have completed every task in this study plan.'
                    }
                  </p>

                </div>

              )
            }


            {/* =============================================
                TASK LIST
            ============================================= */}

            {
              filteredTasks.length >
                0 && (

                <div className="adaptive-plan-list">

                  {
                    filteredTasks.map(
                      ({
                        task,
                        index,
                      }) => {
                        const taskProgress =
                          getTaskProgress(
                            index,
                          )


                        const completed =
                          taskProgress
                            .completed


                        const duration =
                          formatDuration(
                            getTaskDuration(
                              task,
                            ),
                          )


                        const subject =
                          getTaskSubject(
                            task,
                          )


                        const topic =
                          getTaskTopic(
                            task,
                          )


                        const reason =
                          getTaskReason(
                            task,
                          )


                        const materialName =
                          getMaterialName(
                            task,
                          )


                        const materialId =
                          getMaterialId(
                            task,
                          )


                        const taskSaving =
                          savingTask ===
                          index


                        return (
                          <article
                            key={
                              `${
                                getTaskTitle(
                                  task,
                                  index,
                                )
                              }-${index}`
                            }

                            className={
                              `adaptive-plan-task study-plan-task ${
                                completed
                                  ? 'completed'
                                  : 'pending'
                              }`
                            }
                          >

                            {/* =================================
                                CHECK BUTTON
                            ================================= */}

                            <button
                              type="button"

                              className={
                                `study-plan-check ${
                                  completed
                                    ? 'completed'
                                    : ''
                                }`
                              }

                              disabled={
                                savingTask !==
                                null
                              }

                              aria-label={
                                completed
                                  ? 'Mark task as pending'
                                  : 'Mark task as completed'
                              }

                              onClick={() =>
                                toggleTaskCompletion(
                                  index,
                                )
                              }
                            >
                              {
                                taskSaving
                                  ? '…'

                                  : completed
                                    ? '✓'
                                    : index +
                                      1
                              }
                            </button>


                            {/* =================================
                                TASK BODY
                            ================================= */}

                            <div className="study-plan-task-body">

                              {/* TOP */}

                              <div className="study-plan-task-header">

                                <div className="study-plan-task-badges">

                                  <span
                                    className={
                                      `adaptive-plan-priority ${
                                        getPriorityClass(
                                          task
                                            ?.priority,
                                        )
                                      }`
                                    }
                                  >
                                    {
                                      getPriorityLabel(
                                        task
                                          ?.priority,
                                      )
                                    }
                                  </span>


                                  <span
                                    className={
                                      `study-plan-status ${
                                        completed
                                          ? 'completed'
                                          : 'pending'
                                      }`
                                    }
                                  >
                                    {
                                      completed
                                        ? 'Completed'
                                        : 'Pending'
                                    }
                                  </span>

                                </div>


                                {
                                  duration && (

                                    <span className="adaptive-plan-duration">
                                      {
                                        duration
                                      }
                                    </span>

                                  )
                                }

                              </div>


                              {/* TITLE */}

                              <strong className="adaptive-plan-task-title">
                                {
                                  getTaskTitle(
                                    task,
                                    index,
                                  )
                                }
                              </strong>


                              {/* SUBJECT / TOPIC */}

                              {
                                (
                                  subject ||
                                  topic
                                ) && (

                                  <div className="adaptive-plan-meta">

                                    {
                                      subject && (

                                        <span>
                                          {
                                            subject
                                          }
                                        </span>

                                      )
                                    }


                                    {
                                      topic && (

                                        <span>
                                          {
                                            topic
                                          }
                                        </span>

                                      )
                                    }

                                  </div>

                                )
                              }


                              {/* REASON */}

                              {
                                reason && (

                                  <p className="adaptive-plan-reason">
                                    {
                                      reason
                                    }
                                  </p>

                                )
                              }


                              {/* STUDY MATERIAL */}

                              {
                                materialName && (

                                  <div className="adaptive-plan-material">

                                    <span>
                                      STUDY MATERIAL
                                    </span>


                                    <strong>
                                      {
                                        materialName
                                      }
                                    </strong>

                                  </div>

                                )
                              }


                              {/* ACTIONS */}

                              <div className="adaptive-plan-actions">

                                <button
                                  type="button"

                                  className={
                                    `adaptive-plan-complete-action ${
                                      completed
                                        ? 'completed'
                                        : ''
                                    }`
                                  }

                                  disabled={
                                    savingTask !==
                                    null
                                  }

                                  onClick={() =>
                                    toggleTaskCompletion(
                                      index,
                                    )
                                  }
                                >
                                  {
                                    taskSaving
                                      ? 'Saving...'

                                      : completed
                                        ? 'Undo completion'
                                        : 'Mark complete'
                                  }
                                </button>


                                <Link
                                  className="adaptive-plan-primary-action"

                                  to={
                                    materialId
                                      ? `/ai-study?material=${materialId}`
                                      : '/ai-study'
                                  }
                                >
                                  Study with AI
                                </Link>

                              </div>


                              {/* COMPLETION DATE */}

                              {
                                completed &&
                                taskProgress
                                  .completedAt && (

                                  <small className="adaptive-plan-completed-time">

                                    ✓ Completed{' '}

                                    {
                                      formatCompletedDate(
                                        taskProgress
                                          .completedAt,
                                      )
                                    }

                                  </small>

                                )
                              }

                            </div>

                          </article>
                        )
                      },
                    )
                  }

                </div>

              )
            }


            {/* =============================================
                INFO
            ============================================= */}

            <div className="adaptive-plan-preview-note">

              <span>
                i
              </span>


              <p>
                Your progress is saved
                automatically and restored
                when you return. Generating
                a new plan starts a new
                progress cycle.
              </p>

            </div>

          </>

        )
      }

    </section>
  )
}