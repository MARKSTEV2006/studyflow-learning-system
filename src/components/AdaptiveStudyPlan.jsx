import {
  useEffect,
  useMemo,
  useRef,
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


export default function AdaptiveStudyPlan({
  userId,
}) {
  const [
    plan,
    setPlan,
  ] =
    useState([])


  const [
    loading,
    setLoading,
  ] =
    useState(false)


  const [
    error,
    setError,
  ] =
    useState('')


  const [
    generatedAt,
    setGeneratedAt,
  ] =
    useState(null)


  const [
    cached,
    setCached,
  ] =
    useState(false)


  const [
    sourceAttemptCount,
    setSourceAttemptCount,
  ] =
    useState(0)


  const [
    summary,
    setSummary,
  ] =
    useState('')


  const requestRef =
    useRef(false)


  /* =========================================
     LOAD ON MOUNT
  ========================================= */

  useEffect(
    () => {
      if (
        !userId
      ) {
        return
      }


      loadAdaptivePlan()
    },

    [
      userId,
    ],
  )


  /* =========================================
     FUNCTION ERROR PARSER
  ========================================= */

  async function getFunctionErrorMessage(
    functionError,
  ) {
    if (
      functionError instanceof
      FunctionsHttpError
    ) {
      try {
        const errorBody =
          await functionError
            .context
            .json()


        return (
          errorBody?.error ||
          errorBody?.message ||
          `StudyFlow returned HTTP ${functionError.context.status}.`
        )
      } catch {
        return (
          `StudyFlow returned HTTP ${functionError.context.status}.`
        )
      }
    }


    return (
      functionError?.message ||
      'Could not generate the adaptive study plan.'
    )
  }


  /* =========================================
     LOAD / GENERATE PLAN
  ========================================= */

  async function loadAdaptivePlan(
    force = false,
  ) {
    if (
      !userId ||
      requestRef.current
    ) {
      return
    }


    requestRef.current =
      true


    setLoading(
      true,
    )


    setError(
      '',
    )


    try {
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


      if (
        sessionError
      ) {
        throw sessionError
      }


      if (
        !session
      ) {
        throw new Error(
          'Your session expired. Please sign in again.',
        )
      }


      const {
        data,

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

                force,
              },
            },
          )


      if (
        functionError
      ) {
        const message =
          await getFunctionErrorMessage(
            functionError,
          )


        throw new Error(
          message,
        )
      }


      if (
        data?.error
      ) {
        throw new Error(
          data.error,
        )
      }


      const incomingTasks =
        Array.isArray(
          data
            ?.plan
            ?.tasks,
        )
          ? data.plan.tasks
          : []


      setPlan(
        incomingTasks,
      )


      setGeneratedAt(
        data
          ?.plan
          ?.generatedAt ||
        null,
      )


      setSummary(
        data
          ?.plan
          ?.summary ||
        '',
      )


      setCached(
        Boolean(
          data?.cached,
        ),
      )


      setSourceAttemptCount(
        Number(
          data
            ?.sourceAttemptCount ||
          0,
        ),
      )
    } catch (
      requestError
    ) {
      console.error(
        'Adaptive study plan error:',
        requestError,
      )


      setError(
        requestError?.message ||
        'Could not load your adaptive study plan.',
      )
    } finally {
      setLoading(
        false,
      )


      requestRef.current =
        false
    }
  }


  /* =========================================
     PLAN BASE DATE
  ========================================= */

  const planBaseDate =
    useMemo(
      () => {
        if (
          generatedAt
        ) {
          const generatedDate =
            new Date(
              generatedAt,
            )


          if (
            !Number.isNaN(
              generatedDate.getTime(),
            )
          ) {
            return generatedDate
          }
        }


        return new Date()
      },

      [
        generatedAt,
      ],
    )


  /* =========================================
     DATE HELPERS
  ========================================= */

  function startOfDay(
    date,
  ) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    )
  }


  function getTaskDate(
    dueOffsetDays,
  ) {
    const date =
      startOfDay(
        planBaseDate,
      )


    date.setDate(
      date.getDate() +
      Number(
        dueOffsetDays ||
        0,
      ),
    )


    return date
  }


  function getDateLabel(
    dueOffsetDays,
  ) {
    const taskDate =
      getTaskDate(
        dueOffsetDays,
      )


    const today =
      startOfDay(
        new Date(),
      )


    const tomorrow =
      startOfDay(
        new Date(),
      )


    tomorrow.setDate(
      tomorrow.getDate() +
      1,
    )


    if (
      taskDate.getTime() ===
      today.getTime()
    ) {
      return 'Today'
    }


    if (
      taskDate.getTime() ===
      tomorrow.getTime()
    ) {
      return 'Tomorrow'
    }


    return new Intl
      .DateTimeFormat(
        'en-PH',
        {
          month:
            'short',

          day:
            'numeric',
        },
      )
      .format(
        taskDate,
      )
  }


  function getFullDate(
    dueOffsetDays,
  ) {
    return new Intl
      .DateTimeFormat(
        'en-PH',
        {
          weekday:
            'short',

          month:
            'short',

          day:
            'numeric',
        },
      )
      .format(
        getTaskDate(
          dueOffsetDays,
        ),
      )
  }


  function formatGeneratedAt() {
    if (
      !generatedAt
    ) {
      return ''
    }


    const date =
      new Date(
        generatedAt,
      )


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
      .format(
        date,
      )
  }


  /* =========================================
     PRIORITY
  ========================================= */

  function priorityClass(
    priority,
  ) {
    if (
      priority ===
      'high'
    ) {
      return 'high'
    }


    if (
      priority ===
      'low'
    ) {
      return 'low'
    }


    return 'medium'
  }


  function priorityLabel(
    priority,
  ) {
    if (
      priority ===
      'high'
    ) {
      return 'High priority'
    }


    if (
      priority ===
      'low'
    ) {
      return 'Low priority'
    }


    return 'Medium priority'
  }


  /* =========================================
     ACTION TYPE
  ========================================= */

  function actionLabel(
    actionType,
  ) {
    switch (
      actionType
    ) {
      case 'practice':
        return 'Practice'

      case 'recall':
        return 'Recall'

      case 'retake':
        return 'Retake quiz'

      default:
        return 'Review'
    }
  }


  /* =========================================
     TOTAL MINUTES
  ========================================= */

  const totalMinutes =
    useMemo(
      () =>
        plan.reduce(
          (
            total,
            task,
          ) =>
            total +
            Number(
              task
                ?.durationMin ||
              0,
            ),

          0,
        ),

      [
        plan,
      ],
    )


  return (
    <section className="adaptive-plan-section">

      {/* =====================================
          HEADER
      ===================================== */}

      <div className="adaptive-plan-heading">

        <div>

          <span className="adaptive-plan-label">
            STUDYFLOW AI
          </span>


          <h3>
            Adaptive study plan
          </h3>

        </div>


        <button
          type="button"
          className="adaptive-plan-refresh"
          disabled={
            loading
          }
          onClick={() =>
            loadAdaptivePlan(
              true,
            )
          }
        >
          {
            loading
              ? 'Generating...'
              : 'Regenerate'
          }
        </button>

      </div>


      {/* =====================================
          LOADING
      ===================================== */}

      {
        loading &&
        plan.length ===
          0 && (

          <div className="adaptive-plan-loading">

            <div className="ai-thinking">
              <span />
              <span />
              <span />
            </div>


            <strong>
              Building your study plan...
            </strong>


            <p>
              StudyFlow is using your weak topics
              and quiz history.
            </p>

          </div>

        )
      }


      {/* =====================================
          ERROR
      ===================================== */}

      {
        error && (

          <div className="adaptive-plan-error">

            <strong>
              Could not load your study plan.
            </strong>


            <p>
              {
                error
              }
            </p>


            <button
              type="button"
              onClick={() =>
                loadAdaptivePlan(
                  true,
                )
              }
            >
              Try again
            </button>

          </div>

        )
      }


      {/* =====================================
          PLAN
      ===================================== */}

      {
        !error &&
        plan.length >
          0 && (

          <>

            {/* =================================
                SUMMARY
            ================================= */}

            <div className="adaptive-plan-summary">

              <div>

                <span>
                  YOUR PLAN
                </span>


                <p>
                  {
                    summary ||
                    `You have ${plan.length} recommended study sessions.`
                  }
                </p>

              </div>


              <div className="adaptive-plan-summary-stats">

                <div>

                  <strong>
                    {
                      plan.length
                    }
                  </strong>

                  <span>
                    Tasks
                  </span>

                </div>


                <div>

                  <strong>
                    {
                      totalMinutes
                    }
                  </strong>

                  <span>
                    Minutes
                  </span>

                </div>


                <div>

                  <strong>
                    {
                      sourceAttemptCount
                    }
                  </strong>

                  <span>
                    Quizzes
                  </span>

                </div>

              </div>


              {
                generatedAt && (

                  <small>
                    {
                      cached
                        ? 'Saved plan'
                        : 'New plan'
                    }
                    {' · '}
                    {
                      formatGeneratedAt()
                    }
                  </small>

                )
              }

            </div>


            {/* =================================
                TASKS
            ================================= */}

            <div className="adaptive-plan-list">

              {
                plan.map(
                  (
                    task,
                    index,
                  ) => (

                    <article
                      className="adaptive-plan-task"
                      key={
                        `${task.title}-${index}`
                      }
                    >

                      {/* =========================
                          DATE
                      ========================= */}

                      <div className="adaptive-plan-date">

                        <strong>
                          {
                            getDateLabel(
                              task.dueOffsetDays,
                            )
                          }
                        </strong>


                        <span>
                          {
                            getFullDate(
                              task.dueOffsetDays,
                            )
                          }
                        </span>

                      </div>


                      {/* =========================
                          CONTENT
                      ========================= */}

                      <div className="adaptive-plan-task-content">

                        <div className="adaptive-plan-task-top">

                          <span
                            className={
                              `adaptive-plan-priority ${priorityClass(
                                task.priority,
                              )}`
                            }
                          >
                            {
                              priorityLabel(
                                task.priority,
                              )
                            }
                          </span>


                          <span className="adaptive-plan-duration">
                            {
                              task.durationMin
                            } min
                          </span>

                        </div>


                        <strong className="adaptive-plan-task-title">
                          {
                            task.title
                          }
                        </strong>


                        <div className="adaptive-plan-meta">

                          <span>
                            {
                              task.subject ||
                              'General'
                            }
                          </span>


                          <span>
                            {
                              actionLabel(
                                task.actionType,
                              )
                            }
                          </span>

                        </div>


                        {
                          task.topic && (

                            <p className="adaptive-plan-topic">
                              Focus: {
                                task.topic
                              }
                            </p>

                          )
                        }


                        {
                          task.reason && (

                            <p className="adaptive-plan-reason">
                              {
                                task.reason
                              }
                            </p>

                          )
                        }


                        {
                          task.materialName && (

                            <div className="adaptive-plan-material">

                              <span>
                                MATERIAL
                              </span>


                              <strong>
                                {
                                  task.materialName
                                }
                              </strong>

                            </div>

                          )
                        }


                        <div className="adaptive-plan-actions">

                          {
                            task.materialId ? (

                              <Link
                                to={
                                  `/ai-study?material=${task.materialId}`
                                }
                                className="adaptive-plan-primary-action"
                              >
                                ✦ Review with AI
                              </Link>

                            ) : (

                              <Link
                                to="/ai-study"
                                className="adaptive-plan-primary-action"
                              >
                                ✦ Ask StudyFlow AI
                              </Link>

                            )
                          }

                        </div>

                      </div>


                      <div className="adaptive-plan-task-number">
                        {
                          index +
                          1
                        }
                      </div>

                    </article>

                  ),
                )
              }

            </div>


            {/* =================================
                PREVIEW NOTE
            ================================= */}

            <div className="adaptive-plan-preview-note">

              <span>
                i
              </span>


              <p>
                This is an AI-generated plan preview.
                Your Planner tasks are not changed yet.
              </p>

            </div>

          </>

        )
      }


      {/* =====================================
          EMPTY
      ===================================== */}

      {
        !loading &&
        !error &&
        plan.length ===
          0 && (

          <div className="adaptive-plan-empty">

            <div>
              ✦
            </div>


            <strong>
              No adaptive study plan yet.
            </strong>


            <p>
              Complete quizzes so StudyFlow can
              identify what you should review next.
            </p>


            <Link to="/materials">
              Go to study materials
            </Link>

          </div>

        )
      }

    </section>
  )
}