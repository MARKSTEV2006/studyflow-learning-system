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
  supabase,
} from '../lib/supabase'


/* =========================================================
   HELPERS
========================================================= */

function normalizePlan(value) {
  return Array.isArray(value)
    ? value
    : []
}


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


function calculateCompleted(
  plan,
  progress,
) {
  return plan.reduce(
    (
      count,
      _task,
      index,
    ) => {
      const state =
        progress?.[
          String(index)
        ]

      return state?.completed
        ? count + 1
        : count
    },

    0,
  )
}


function formatProgressDate(value) {
  if (!value) {
    return 'No activity yet'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return 'No activity yet'
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


export default function StudyPlanProgressAnalytics({
  userId,
  compact = false,
}) {
  /* =======================================================
     STATE
  ======================================================= */

  const [
    insight,
    setInsight,
  ] =
    useState(null)


  const [
    loading,
    setLoading,
  ] =
    useState(true)


  const [
    error,
    setError,
  ] =
    useState('')


  /* =======================================================
     LOAD ANALYTICS
  ======================================================= */

  const loadAnalytics =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (!userId) {
          setInsight(null)

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
                study_plan_progress,
                study_plan_completed_count,
                study_plan_total_count,
                study_plan_progress_updated_at,
                study_plan_generated_at
              `)
              .eq(
                'user_id',
                userId,
              )
              .maybeSingle()


          if (queryError) {
            throw queryError
          }


          setInsight(
            data ||
            null,
          )
        } catch (
          requestError
        ) {
          console.error(
            'Study plan analytics load error:',
            requestError,
          )


          setError(
            requestError?.message ||
              'Could not load study plan analytics.',
          )
        } finally {
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
  ======================================================= */

  useEffect(
    () => {
      loadAnalytics()
    },

    [
      loadAnalytics,
    ],
  )


  /* =======================================================
     LISTEN FOR STUDY PLAN UPDATES

     AdaptiveStudyPlan will dispatch this
     custom browser event after a successful
     save or plan refresh.
  ======================================================= */

  useEffect(
    () => {
      if (!userId) {
        return undefined
      }


      function handleProgressUpdate(
        event,
      ) {
        const detail =
          event?.detail


        if (
          detail?.userId &&
          detail.userId !==
            userId
        ) {
          return
        }


        loadAnalytics({
          silent:
            true,
        })
      }


      window.addEventListener(
        'studyflow:study-plan-progress',
        handleProgressUpdate,
      )


      return () => {
        window.removeEventListener(
          'studyflow:study-plan-progress',
          handleProgressUpdate,
        )
      }
    },

    [
      userId,
      loadAnalytics,
    ],
  )


  /* =======================================================
     RELOAD WHEN RETURNING TO TAB
  ======================================================= */

  useEffect(
    () => {
      if (!userId) {
        return undefined
      }


      function handleFocus() {
        loadAnalytics({
          silent:
            true,
        })
      }


      window.addEventListener(
        'focus',
        handleFocus,
      )


      return () => {
        window.removeEventListener(
          'focus',
          handleFocus,
        )
      }
    },

    [
      userId,
      loadAnalytics,
    ],
  )


  /* =======================================================
     CALCULATED DATA
  ======================================================= */

  const analytics =
    useMemo(
      () => {
        const plan =
          normalizePlan(
            insight
              ?.study_plan,
          )


        const progress =
          normalizeProgress(
            insight
              ?.study_plan_progress,
          )


        const total =
          plan.length


        const completed =
          calculateCompleted(
            plan,
            progress,
          )


        const pending =
          Math.max(
            total -
              completed,
            0,
          )


        const percentage =
          total > 0
            ? Math.round(
                (
                  completed /
                  total
                ) *
                  100,
              )
            : 0


        let status =
          'Not started'


        if (
          total > 0 &&
          completed === 0
        ) {
          status =
            'Ready'
        }


        if (
          completed > 0 &&
          completed < total
        ) {
          status =
            'In progress'
        }


        if (
          total > 0 &&
          completed === total
        ) {
          status =
            'Completed'
        }


        return {
          total,
          completed,
          pending,
          percentage,
          status,

          lastUpdated:
            insight
              ?.study_plan_progress_updated_at ||
            null,

          generatedAt:
            insight
              ?.study_plan_generated_at ||
            null,
        }
      },

      [
        insight,
      ],
    )


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <section
        className={
          `study-plan-analytics ${
            compact
              ? 'compact'
              : ''
          }`
        }
      >

        <div className="study-plan-analytics-loading">

          <span />

          <div>
            <strong>
              Loading plan analytics...
            </strong>

            <small>
              Restoring your progress.
            </small>
          </div>

        </div>

      </section>
    )
  }


  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <section
        className={
          `study-plan-analytics ${
            compact
              ? 'compact'
              : ''
          }`
        }
      >

        <div className="study-plan-analytics-error">

          <strong>
            Analytics unavailable
          </strong>

          <p>
            {error}
          </p>

          <button
            type="button"

            onClick={() =>
              loadAnalytics()
            }
          >
            Try again
          </button>

        </div>

      </section>
    )
  }


  /* =======================================================
     EMPTY
  ======================================================= */

  if (
    analytics.total ===
    0
  ) {
    return (
      <section
        className={
          `study-plan-analytics ${
            compact
              ? 'compact'
              : ''
          }`
        }
      >

        <div className="study-plan-analytics-empty">

          <div className="study-plan-analytics-empty-icon">
            ◷
          </div>

          <div>

            <strong>
              No plan analytics yet
            </strong>

            <p>
              Generate an adaptive study plan
              to start tracking completion.
            </p>

          </div>


          <Link to="/ai-study">
            Study with AI
          </Link>

        </div>

      </section>
    )
  }


  /* =======================================================
     UI
  ======================================================= */

  return (
    <section
      className={
        `study-plan-analytics ${
          compact
            ? 'compact'
            : ''
        }`
      }
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="study-plan-analytics-header">

        <div>

          <span>
            STUDY PLAN ANALYTICS
          </span>

          <h3>
            Your plan progress
          </h3>

        </div>


        <Link to="/ai-study">
          Study
          <span>
            →
          </span>
        </Link>

      </div>


      {/* =================================================
          MAIN PROGRESS
      ================================================= */}

      <div className="study-plan-analytics-overview">

        <div className="study-plan-analytics-percent">

          <strong>
            {
              analytics
                .percentage
            }%
          </strong>

          <span>
            completed
          </span>

        </div>


        <div className="study-plan-analytics-progress">

          <div>

            <strong>
              {
                analytics
                  .completed
              } of {
                analytics
                  .total
              } tasks
            </strong>

            <span>
              {
                analytics
                  .pending
              } remaining
            </span>

          </div>


          <div className="study-plan-analytics-track">

            <div
              style={{
                width:
                  `${analytics.percentage}%`,
              }}
            />

          </div>

        </div>

      </div>


      {/* =================================================
          STAT GRID
      ================================================= */}

      <div className="study-plan-analytics-grid">

        <article>

          <span className="study-plan-stat-icon completed">
            ✓
          </span>

          <div>

            <strong>
              {
                analytics
                  .completed
              }
            </strong>

            <span>
              Completed
            </span>

          </div>

        </article>


        <article>

          <span className="study-plan-stat-icon pending">
            ○
          </span>

          <div>

            <strong>
              {
                analytics
                  .pending
              }
            </strong>

            <span>
              Pending
            </span>

          </div>

        </article>


        <article>

          <span className="study-plan-stat-icon total">
            #
          </span>

          <div>

            <strong>
              {
                analytics
                  .total
              }
            </strong>

            <span>
              Total tasks
            </span>

          </div>

        </article>

      </div>


      {/* =================================================
          STATUS
      ================================================= */}

      <div className="study-plan-analytics-status">

        <div>

          <span>
            PLAN STATUS
          </span>

          <strong
            className={
              analytics
                .status
                .toLowerCase()
                .replace(
                  ' ',
                  '-',
                )
            }
          >
            {
              analytics
                .status
            }
          </strong>

        </div>


        <div>

          <span>
            LAST PROGRESS
          </span>

          <strong>
            {
              formatProgressDate(
                analytics
                  .lastUpdated,
              )
            }
          </strong>

        </div>

      </div>

    </section>
  )
}