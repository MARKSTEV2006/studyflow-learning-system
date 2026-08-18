import AdaptiveStudyPlan from '../components/AdaptiveStudyPlan'
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

import {
  useAuth,
} from '../context/AuthContext'

import StatCard from '../components/StatCard'


export default function DashboardPage() {
  const {
    user,
  } = useAuth()


  /* =========================================
     BASIC DASHBOARD DATA
  ========================================= */

  const [
    tasks,
    setTasks,
  ] = useState([])

  const [
    subjects,
    setSubjects,
  ] = useState([])

  const [
    quizAttempts,
    setQuizAttempts,
  ] = useState([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    analyticsError,
    setAnalyticsError,
  ] = useState('')


  /* =========================================
     AI STUDY INSIGHTS
  ========================================= */

  const [
    studyInsight,
    setStudyInsight,
  ] = useState(null)

  const [
    insightLoading,
    setInsightLoading,
  ] = useState(false)

  const [
    insightError,
    setInsightError,
  ] = useState('')

  const [
    insightCached,
    setInsightCached,
  ] = useState(false)

  const [
    insightGeneratedAt,
    setInsightGeneratedAt,
  ] = useState(null)

  const insightRequestRef =
    useRef(false)


  /* =========================================
     LOAD DASHBOARD
  ========================================= */

  useEffect(() => {
    if (!user?.id) {
      return
    }

    loadDashboard()

    loadSmartInsights()
  }, [
    user?.id,
  ])


  async function loadDashboard() {
    setLoading(true)

    setAnalyticsError('')

    const [
      taskResponse,
      subjectResponse,
      quizResponse,
    ] = await Promise.all([
      supabase
        .from('study_tasks')
        .select('*')
        .order(
          'created_at',
          {
            ascending: false,
          },
        )
        .limit(20),

      supabase
        .from('subjects')
        .select(`
          id,
          name,
          description,
          study_materials(count)
        `)
        .order(
          'created_at',
          {
            ascending: false,
          },
        )
        .limit(5),

      supabase
        .from('quiz_attempts')
        .select(`
          id,
          user_id,
          material_id,
          subject_id,
          quiz_title,
          material_name,
          subject_name,
          score,
          total_questions,
          percentage,
          answers,
          created_at
        `)
        .eq(
          'user_id',
          user.id,
        )
        .order(
          'created_at',
          {
            ascending: false,
          },
        )
        .limit(100),
    ])


    if (!taskResponse.error) {
      setTasks(
        taskResponse.data ??
        [],
      )
    }


    if (!subjectResponse.error) {
      setSubjects(
        subjectResponse.data ??
        [],
      )
    }


    if (!quizResponse.error) {
      setQuizAttempts(
        quizResponse.data ??
        [],
      )
    } else {
      console.error(
        'Dashboard quiz analytics error:',
        quizResponse.error,
      )

      setAnalyticsError(
        quizResponse.error.message,
      )
    }


    setLoading(false)
  }


  /* =========================================
     LOAD AI SMART INSIGHTS
  ========================================= */

  async function loadSmartInsights(
    force = false,
  ) {
    if (
      !user?.id ||
      insightRequestRef.current
    ) {
      return
    }


    insightRequestRef.current =
      true

    setInsightLoading(true)

    setInsightError('')


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


      if (sessionError) {
        throw sessionError
      }


      if (!session) {
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
                  'analyze-progress',

                force,
              },
            },
          )


      if (functionError) {
        console.error(
          'Study insight function error:',
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
          } catch {
            // Response was not JSON.
          }


          console.error(
            'STUDY INSIGHT ERROR BODY:',
            errorBody,
          )


          throw new Error(
            errorBody?.error ||
            errorBody?.message ||
            `StudyFlow AI returned HTTP ${functionError.context.status}.`,
          )
        }


        throw functionError
      }


      if (data?.error) {
        throw new Error(
          data.error,
        )
      }


      const incomingInsight =
        data?.insight ||
        null


      if (!incomingInsight) {
        throw new Error(
          'StudyFlow AI did not return study insights.',
        )
      }


      setStudyInsight({
        summary:
          incomingInsight.summary ||
          '',

        weakTopics:
          Array.isArray(
            incomingInsight.weakTopics,
          )
            ? incomingInsight.weakTopics
            : [],

        recommendations:
          Array.isArray(
            incomingInsight.recommendations,
          )
            ? incomingInsight.recommendations
            : [],

        model:
          incomingInsight.model ||
          null,
      })


      setInsightCached(
        Boolean(
          data?.cached,
        ),
      )


      setInsightGeneratedAt(
        incomingInsight.generatedAt ||
        null,
      )
    } catch (requestError) {
      console.error(
        'StudyFlow insight error:',
        requestError,
      )


      setInsightError(
        requestError?.message ||
        'Could not generate your study insights.',
      )
    } finally {
      setInsightLoading(false)

      insightRequestRef.current =
        false
    }
  }


  /* =========================================
     TASK STATS
  ========================================= */

  const stats =
    useMemo(() => {
      const total =
        tasks.length

      const completed =
        tasks.filter(
          (task) =>
            task.completed,
        ).length

      const pending =
        total -
        completed

      const progress =
        total > 0
          ? Math.round(
              (
                completed /
                total
              ) *
              100,
            )
          : 0


      return {
        total,
        completed,
        pending,
        progress,
      }
    }, [
      tasks,
    ])


  /* =========================================
     QUIZ ANALYTICS
  ========================================= */

  const quizAnalytics =
    useMemo(() => {
      if (
        quizAttempts.length ===
        0
      ) {
        return {
          attempts: 0,

          average: 0,

          best: 0,

          recent: 0,

          correct: 0,

          questions: 0,

          strongestSubject:
            null,

          weakestSubject:
            null,

          subjectPerformance:
            [],

          weakAreas:
            [],

          recentTrend:
            [],

          trendDifference:
            0,
        }
      }


      /* =====================================
         BASIC TOTALS
      ===================================== */

      const totalPercentage =
        quizAttempts.reduce(
          (
            total,
            attempt,
          ) =>
            total +
            Number(
              attempt.percentage ||
              0,
            ),
          0,
        )


      const correct =
        quizAttempts.reduce(
          (
            total,
            attempt,
          ) =>
            total +
            Number(
              attempt.score ||
              0,
            ),
          0,
        )


      const questions =
        quizAttempts.reduce(
          (
            total,
            attempt,
          ) =>
            total +
            Number(
              attempt.total_questions ||
              0,
            ),
          0,
        )


      const percentages =
        quizAttempts.map(
          (attempt) =>
            Number(
              attempt.percentage ||
              0,
            ),
        )


      const average =
        Math.round(
          totalPercentage /
          quizAttempts.length,
        )


      const best =
        Math.round(
          Math.max(
            ...percentages,
          ),
        )


      const recent =
        Math.round(
          Number(
            quizAttempts[0]
              ?.percentage ||
            0,
          ),
        )


      /* =====================================
         SUBJECT PERFORMANCE
      ===================================== */

      const subjectMap =
        new Map()


      quizAttempts.forEach(
        (attempt) => {
          const subjectName =
            attempt.subject_name ||
            'General'


          if (
            !subjectMap.has(
              subjectName,
            )
          ) {
            subjectMap.set(
              subjectName,
              {
                name:
                  subjectName,

                total:
                  0,

                count:
                  0,

                correct:
                  0,

                questions:
                  0,
              },
            )
          }


          const subject =
            subjectMap.get(
              subjectName,
            )


          subject.total +=
            Number(
              attempt.percentage ||
              0,
            )


          subject.count +=
            1


          subject.correct +=
            Number(
              attempt.score ||
              0,
            )


          subject.questions +=
            Number(
              attempt.total_questions ||
              0,
            )
        },
      )


      const subjectPerformance =
        Array.from(
          subjectMap.values(),
        )
          .map(
            (subject) => ({
              ...subject,

              average:
                Math.round(
                  subject.total /
                  subject.count,
                ),
            }),
          )
          .sort(
            (
              first,
              second,
            ) =>
              second.average -
              first.average,
          )


      const strongestSubject =
        subjectPerformance[0] ||
        null


      const weakestSubject =
        subjectPerformance.length >
        1
          ? subjectPerformance[
              subjectPerformance.length -
              1
            ]
          : subjectPerformance[0] ||
            null


      /* =====================================
         QUESTION-LEVEL WEAK AREAS
      ===================================== */

      const weakAreaMap =
        new Map()


      quizAttempts.forEach(
        (attempt) => {
          const answers =
            Array.isArray(
              attempt.answers,
            )
              ? attempt.answers
              : []


          answers
            .filter(
              (answer) =>
                !answer.correct,
            )
            .forEach(
              (answer) => {
                const question =
                  String(
                    answer.question ||
                    '',
                  ).trim()


                if (!question) {
                  return
                }


                const key =
                  question
                    .toLowerCase()
                    .replace(
                      /\s+/g,
                      ' ',
                    )


                const existing =
                  weakAreaMap.get(
                    key,
                  )


                if (existing) {
                  existing.misses +=
                    1

                  return
                }


                weakAreaMap.set(
                  key,
                  {
                    question,

                    misses:
                      1,

                    subject:
                      attempt.subject_name ||
                      'General',

                    material:
                      attempt.material_name ||
                      null,

                    materialId:
                      attempt.material_id ||
                      null,

                    correctAnswer:
                      answer.correctAnswer ||
                      '',

                    explanation:
                      answer.explanation ||
                      '',
                  },
                )
              },
            )
        },
      )


      const weakAreas =
        Array.from(
          weakAreaMap.values(),
        )
          .sort(
            (
              first,
              second,
            ) =>
              second.misses -
              first.misses,
          )
          .slice(
            0,
            5,
          )


      /* =====================================
         RECENT TREND
      ===================================== */

      const recentTrend =
        quizAttempts
          .slice(
            0,
            5,
          )
          .reverse()
          .map(
            (attempt) => ({
              id:
                attempt.id,

              percentage:
                Math.round(
                  Number(
                    attempt.percentage ||
                    0,
                  ),
                ),

              subject:
                attempt.subject_name ||
                'General',

              date:
                attempt.created_at,
            }),
          )


      const trendDifference =
        recentTrend.length >=
        2
          ? recentTrend[
              recentTrend.length -
              1
            ].percentage -
            recentTrend[0]
              .percentage
          : 0


      return {
        attempts:
          quizAttempts.length,

        average,

        best,

        recent,

        correct,

        questions,

        strongestSubject,

        weakestSubject,

        subjectPerformance,

        weakAreas,

        recentTrend,

        trendDifference,
      }
    }, [
      quizAttempts,
    ])


  /* =========================================
     SMART INSIGHT ARRAYS
  ========================================= */

  const smartWeakTopics =
    Array.isArray(
      studyInsight?.weakTopics,
    )
      ? studyInsight.weakTopics
      : []


  const smartRecommendations =
    Array.isArray(
      studyInsight?.recommendations,
    )
      ? studyInsight.recommendations
      : []


  /* =========================================
     TODAY
  ========================================= */

  const today =
    new Date()
      .toISOString()
      .slice(
        0,
        10,
      )


  const todayTasks =
    tasks.filter(
      (task) =>
        !task.completed &&
        (
          task.due_date ===
            today ||
          !task.due_date
        ),
    )


  /* =========================================
     MATERIAL COUNT
  ========================================= */

  function getMaterialCount(
    subject,
  ) {
    return (
      subject
        ?.study_materials
        ?.[0]
        ?.count ??
      0
    )
  }


  /* =========================================
     GREETING
  ========================================= */

  function getGreeting() {
    const hour =
      new Date()
        .getHours()


    if (
      hour <
      12
    ) {
      return 'Good morning'
    }


    if (
      hour <
      18
    ) {
      return 'Good afternoon'
    }


    return 'Good evening'
  }


  /* =========================================
     USER DISPLAY NAME
  ========================================= */

  const emailName =
    user
      ?.email
      ?.split(
        '@',
      )[0]
      ?.split(
        /[._-]/,
      )[0] ||
    'Student'


  const displayName =
    emailName
      .charAt(
        0,
      )
      .toUpperCase() +
    emailName.slice(
      1,
    )


  /* =========================================
     TREND LABEL
  ========================================= */

  function getTrendLabel() {
    if (
      quizAnalytics
        .recentTrend
        .length <
      2
    ) {
      return 'Take more quizzes'
    }


    if (
      quizAnalytics
        .trendDifference >
      0
    ) {
      return `+${quizAnalytics.trendDifference}% improvement`
    }


    if (
      quizAnalytics
        .trendDifference <
      0
    ) {
      return `${quizAnalytics.trendDifference}% from first recent quiz`
    }


    return 'No score change'
  }


  /* =========================================
     PRIORITY
  ========================================= */

  function getPriorityLabel(
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


  function getPriorityClass(
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


  /* =========================================
     INSIGHT DATE
  ========================================= */

  function formatInsightDate(
    value,
  ) {
    if (!value) {
      return ''
    }


    const date =
      new Date(
        value,
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


  return (
    <div className="page-stack dashboard-page">

      {/* =====================================
          MOBILE HOME HERO
      ===================================== */}

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
            {
              (
                user
                  ?.email
                  ?.[0] ||
                'S'
              )
                .toUpperCase()
            }
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


      {/* =====================================
          DESKTOP HERO
      ===================================== */}

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


      {/* =====================================
          MOBILE QUICK ACTIONS
      ===================================== */}

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
            <div>
              ↑
            </div>

            <span>
              Upload
            </span>
          </Link>


          <Link
            to="/ai-study"
            className="mobile-quick-action"
          >
            <div>
              ✦
            </div>

            <span>
              AI Study
            </span>
          </Link>


          <Link
            to="/quiz-history"
            className="mobile-quick-action"
          >
            <div>
              ▥
            </div>

            <span>
              Scores
            </span>
          </Link>


          <Link
            to="/planner"
            className="mobile-quick-action"
          >
            <div>
              ✓
            </div>

            <span>
              Planner
            </span>
          </Link>

        </div>

      </section>


      {/* =====================================
          MOBILE STUDY PROGRESS
      ===================================== */}

      <section className="mobile-dashboard-section">

        <div className="mobile-section-header">

          <h3>
            Study progress
          </h3>

          <Link to="/quiz-history">
            History
          </Link>

        </div>


        <div className="mobile-progress-grid">

          <article>

            <span>
              Average
            </span>

            <strong>
              {
                loading
                  ? '—'
                  : `${quizAnalytics.average}%`
              }
            </strong>

          </article>


          <article>

            <span>
              Quizzes
            </span>

            <strong>
              {
                loading
                  ? '—'
                  : quizAnalytics.attempts
              }
            </strong>

          </article>


          <article>

            <span>
              Best
            </span>

            <strong>
              {
                loading
                  ? '—'
                  : `${quizAnalytics.best}%`
              }
            </strong>

          </article>


          <article>

            <span>
              Latest
            </span>

            <strong>
              {
                loading
                  ? '—'
                  : `${quizAnalytics.recent}%`
              }
            </strong>

          </article>

        </div>

      </section>


      {/* =====================================
          MOBILE PERFORMANCE
      ===================================== */}

      {
        quizAnalytics.attempts >
          0 && (

          <section className="mobile-dashboard-section">

            <div className="mobile-section-header">

              <h3>
                Performance
              </h3>

            </div>


            <div className="mobile-performance-card">

              <div className="mobile-performance-row">

                <span>
                  Strongest
                </span>

                <div>

                  <strong>
                    {
                      quizAnalytics
                        .strongestSubject
                        ?.name ||
                      '—'
                    }
                  </strong>

                  <small>
                    {
                      quizAnalytics
                        .strongestSubject
                        ?.average ||
                      0
                    }%
                  </small>

                </div>

              </div>


              <div className="mobile-performance-row">

                <span>
                  Needs review
                </span>

                <div>

                  <strong>
                    {
                      quizAnalytics
                        .weakestSubject
                        ?.name ||
                      '—'
                    }
                  </strong>

                  <small>
                    {
                      quizAnalytics
                        .weakestSubject
                        ?.average ||
                      0
                    }%
                  </small>

                </div>

              </div>


              <div className="mobile-performance-row">

                <span>
                  Recent trend
                </span>

                <div>

                  <strong>
                    {
                      getTrendLabel()
                    }
                  </strong>

                  <small>
                    Last {
                      quizAnalytics
                        .recentTrend
                        .length
                    } quizzes
                  </small>

                </div>

              </div>

            </div>

          </section>

        )
      }


      {/* =====================================
          MOBILE AI SMART INSIGHTS
      ===================================== */}

      <section className="mobile-dashboard-section">

        <div className="mobile-section-header">

          <h3>
            AI study insights
          </h3>


          <button
            type="button"
            className="mobile-insight-refresh"
            disabled={
              insightLoading
            }
            onClick={() =>
              loadSmartInsights(
                true,
              )
            }
          >
            {
              insightLoading
                ? 'Analyzing...'
                : 'Refresh'
            }
          </button>

        </div>


        <div className="mobile-smart-insight-card">

          {
            insightLoading ? (

              <div className="insight-loading">

                <div className="ai-thinking">
                  <span />
                  <span />
                  <span />
                </div>

                <p>
                  StudyFlow AI is analyzing
                  your quiz history.
                </p>

              </div>

            ) : insightError ? (

              <div className="insight-error">

                <strong>
                  Could not load study insights.
                </strong>

                <p>
                  {insightError}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    loadSmartInsights(
                      true,
                    )
                  }
                >
                  Try again
                </button>

              </div>

            ) : studyInsight ? (

              <>

                <div className="mobile-insight-summary">

                  <span>
                    STUDYFLOW AI
                  </span>

                  <p>
                    {
                      studyInsight
                        .summary
                    }
                  </p>


                  {
                    insightGeneratedAt && (

                      <small>
                        {
                          insightCached
                            ? 'Saved analysis'
                            : 'New analysis'
                        }
                        {' · '}
                        {
                          formatInsightDate(
                            insightGeneratedAt,
                          )
                        }
                      </small>

                    )
                  }

                </div>


                {
                  smartWeakTopics
                    .length >
                    0 && (

                    <div className="mobile-insight-group">

                      <h4>
                        Weak topics
                      </h4>


                      <div className="mobile-insight-topic-list">

                        {
                          smartWeakTopics
                            .slice(
                              0,
                              4,
                            )
                            .map(
                              (
                                topic,
                                index,
                              ) => (

                                <article
                                  className="mobile-insight-topic"
                                  key={
                                    `${topic.topic}-${index}`
                                  }
                                >

                                  <div className="mobile-insight-topic-top">

                                    <span
                                      className={
                                        `insight-priority ${getPriorityClass(
                                          topic.priority,
                                        )}`
                                      }
                                    >
                                      {
                                        getPriorityLabel(
                                          topic.priority,
                                        )
                                      }
                                    </span>

                                    <small>
                                      Missed {
                                        topic.misses ||
                                        1
                                      } {
                                        Number(
                                          topic.misses ||
                                          1,
                                        ) ===
                                        1
                                          ? 'time'
                                          : 'times'
                                      }
                                    </small>

                                  </div>


                                  <strong>
                                    {
                                      topic.topic
                                    }
                                  </strong>


                                  <span className="insight-subject">
                                    {
                                      topic.subject ||
                                      'General'
                                    }
                                  </span>


                                  {
                                    topic.reason && (

                                      <p>
                                        {
                                          topic.reason
                                        }
                                      </p>

                                    )
                                  }


                                  {
                                    topic.reviewFocus && (

                                      <div className="insight-review-focus">

                                        <span>
                                          Review focus
                                        </span>

                                        <p>
                                          {
                                            topic.reviewFocus
                                          }
                                        </p>

                                      </div>

                                    )
                                  }


                                  {
                                    topic.materialId ? (

                                      <Link
                                        className="insight-action"
                                        to={
                                          `/ai-study?material=${topic.materialId}`
                                        }
                                      >
                                        ✦ Review with AI
                                      </Link>

                                    ) : (

                                      <Link
                                        className="insight-action"
                                        to="/ai-study"
                                      >
                                        ✦ Ask StudyFlow AI
                                      </Link>

                                    )
                                  }

                                </article>

                              ),
                            )
                        }

                      </div>

                    </div>

                  )
                }


                {
                  smartRecommendations
                    .length >
                    0 && (

                    <div className="mobile-insight-group">

                      <h4>
                        Recommended next
                      </h4>


                      <div className="mobile-insight-recommendations">

                        {
                          smartRecommendations
                            .slice(
                              0,
                              4,
                            )
                            .map(
                              (
                                recommendation,
                                index,
                              ) => (

                                <article
                                  className="mobile-insight-recommendation"
                                  key={
                                    `${recommendation.title}-${index}`
                                  }
                                >

                                  <div className="mobile-recommendation-number">
                                    {
                                      index +
                                      1
                                    }
                                  </div>


                                  <div>

                                    <span
                                      className={
                                        `insight-priority ${getPriorityClass(
                                          recommendation.priority,
                                        )}`
                                      }
                                    >
                                      {
                                        getPriorityLabel(
                                          recommendation.priority,
                                        )
                                      }
                                    </span>


                                    <strong>
                                      {
                                        recommendation.title
                                      }
                                    </strong>


                                    <p>
                                      {
                                        recommendation.action
                                      }
                                    </p>


                                    {
                                      recommendation
                                        .materialName && (

                                        <small>
                                          {
                                            recommendation
                                              .materialName
                                          }
                                        </small>

                                      )
                                    }

                                  </div>


                                  {
                                    recommendation
                                      .materialId && (

                                      <Link
                                        to={
                                          `/ai-study?material=${recommendation.materialId}`
                                        }
                                      >
                                        ›
                                      </Link>

                                    )
                                  }

                                </article>

                              ),
                            )
                        }

                      </div>

                    </div>

                  )
                }


                {
                  smartWeakTopics.length ===
                    0 &&
                  smartRecommendations.length ===
                    0 && (

                    <div className="insight-empty">

                      <strong>
                        No weak topics detected.
                      </strong>

                      <p>
                        Complete more quizzes
                        to build your study profile.
                      </p>

                    </div>

                  )
                }

              </>

            ) : (

              <div className="insight-empty">

                <strong>
                  No study insights yet.
                </strong>

                <p>
                  Complete a quiz to generate
                  personalized recommendations.
                </p>

              </div>

            )
          }

        </div>

      </section>


      {/* =====================================
          PHASE 2C.7.1.2
          ADAPTIVE STUDY PLAN
      ===================================== */}

      <section className="adaptive-plan-dashboard-slot desktop-adaptive-plan">

        <AdaptiveStudyPlan
          userId={
            user?.id
          }
        />

      </section>


      {/* =====================================
          MOBILE RAW MISTAKES
      ===================================== */}

      {
        quizAnalytics
          .weakAreas
          .length >
          0 && (

          <section className="mobile-dashboard-section">

            <div className="mobile-section-header">

              <h3>
                Question-level mistakes
              </h3>

              <Link to="/quiz-history">
                Review
              </Link>

            </div>


            <div className="mobile-weak-list">

              {
                quizAnalytics
                  .weakAreas
                  .slice(
                    0,
                    3,
                  )
                  .map(
                    (
                      area,
                      index,
                    ) => (

                      <article
                        key={
                          `${area.question}-${index}`
                        }
                      >

                        <div className="mobile-weak-number">
                          {
                            index +
                            1
                          }
                        </div>


                        <div>

                          <span>
                            {
                              area.subject
                            }
                          </span>

                          <strong>
                            {
                              area.question
                            }
                          </strong>

                          <small>
                            Missed {
                              area.misses
                            } {
                              area.misses ===
                              1
                                ? 'time'
                                : 'times'
                            }
                          </small>

                        </div>


                        {
                          area.materialId && (

                            <Link
                              to={
                                `/ai-study?material=${area.materialId}`
                              }
                            >
                              Review
                            </Link>

                          )
                        }

                      </article>

                    ),
                  )
              }

            </div>

          </section>

        )
      }


      {/* =====================================
          MOBILE SUBJECTS
      ===================================== */}

      <section className="mobile-dashboard-section">

        <div className="mobile-section-header">

          <h3>
            My subjects
          </h3>

          <Link to="/subjects">
            See all
          </Link>

        </div>


        {
          subjects.length ===
          0 ? (

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

              {
                subjects
                  .slice(
                    0,
                    4,
                  )
                  .map(
                    (subject) => (

                      <Link
                        key={
                          subject.id
                        }
                        to={
                          `/materials?subject=${subject.id}`
                        }
                        className="mobile-subject-row"
                      >

                        <div className="mobile-subject-icon">
                          {
                            subject.name
                              .charAt(
                                0,
                              )
                              .toUpperCase()
                          }
                        </div>


                        <div className="mobile-subject-info">

                          <strong>
                            {
                              subject.name
                            }
                          </strong>

                          <span>
                            {
                              getMaterialCount(
                                subject,
                              )
                            } materials
                          </span>

                        </div>


                        <span className="mobile-row-arrow">
                          ›
                        </span>

                      </Link>

                    ),
                  )
              }

            </div>

          )
        }

      </section>


      {/* =====================================
          MOBILE TODAY
      ===================================== */}

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

          {
            loading ? (

              <p className="muted">
                Loading...
              </p>

            ) : todayTasks.length ===
              0 ? (

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
                .slice(
                  0,
                  3,
                )
                .map(
                  (task) => (

                    <div
                      className="mobile-task-row"
                      key={
                        task.id
                      }
                    >

                      <div className="mobile-task-dot" />


                      <div>

                        <strong>
                          {
                            task.title
                          }
                        </strong>

                        <span>
                          {
                            task.subject
                          }
                          {' · '}
                          {
                            task.duration_min
                          }
                          {' min'}
                        </span>

                      </div>

                    </div>

                  ),
                )

            )
          }

        </div>

      </section>


      {/* =====================================
          ANALYTICS ERROR
      ===================================== */}

      {
        analyticsError && (

          <div className="notice error">
            {analyticsError}
          </div>

        )
      }


      {/* =====================================
          DESKTOP TASK STATS
      ===================================== */}

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
          hint="Task completion rate"
        />

      </section>


      {/* =====================================
          DESKTOP QUIZ ANALYTICS
      ===================================== */}

      <section className="dashboard-analytics desktop-dashboard-content">

        <div className="dashboard-analytics-heading">

          <div>

            <p className="eyebrow">
              LEARNING ANALYTICS
            </p>

            <h3>
              Quiz performance
            </h3>

          </div>


          <Link to="/quiz-history">
            View history
          </Link>

        </div>


        <div className="dashboard-quiz-stat-grid">

          <article>

            <span>
              Average Score
            </span>

            <strong>
              {
                loading
                  ? '—'
                  : `${quizAnalytics.average}%`
              }
            </strong>

            <small>
              Across {
                quizAnalytics.attempts
              } attempts
            </small>

          </article>


          <article>

            <span>
              Best Score
            </span>

            <strong>
              {
                loading
                  ? '—'
                  : `${quizAnalytics.best}%`
              }
            </strong>

            <small>
              Highest quiz result
            </small>

          </article>


          <article>

            <span>
              Latest Score
            </span>

            <strong>
              {
                loading
                  ? '—'
                  : `${quizAnalytics.recent}%`
              }
            </strong>

            <small>
              Most recent attempt
            </small>

          </article>


          <article>

            <span>
              Correct Answers
            </span>

            <strong>
              {
                loading
                  ? '—'
                  : `${quizAnalytics.correct}/${quizAnalytics.questions}`
              }
            </strong>

            <small>
              All saved quizzes
            </small>

          </article>

        </div>


        {
          quizAnalytics.attempts >
            0 && (

            <div className="dashboard-insight-grid">

              <article className="dashboard-performance-card">

                <span>
                  Strongest Subject
                </span>

                <strong>
                  {
                    quizAnalytics
                      .strongestSubject
                      ?.name ||
                    '—'
                  }
                </strong>

                <p>
                  {
                    quizAnalytics
                      .strongestSubject
                      ?.average ||
                    0
                  }% average
                </p>

              </article>


              <article className="dashboard-performance-card needs-review">

                <span>
                  Needs Review
                </span>

                <strong>
                  {
                    quizAnalytics
                      .weakestSubject
                      ?.name ||
                    '—'
                  }
                </strong>

                <p>
                  {
                    quizAnalytics
                      .weakestSubject
                      ?.average ||
                    0
                  }% average
                </p>

              </article>


              <article className="dashboard-performance-card">

                <span>
                  Recent Trend
                </span>

                <strong>
                  {
                    getTrendLabel()
                  }
                </strong>

                <p>
                  Based on recent quizzes
                </p>

              </article>

            </div>

          )
        }


        {/* =================================
            DESKTOP SMART INSIGHTS
        ================================= */}

        <div className="dashboard-smart-insights">

          <div className="dashboard-smart-insight-header">

            <div>

              <p className="eyebrow">
                STUDYFLOW AI
              </p>

              <h3>
                Smart review recommendations
              </h3>

            </div>


            <button
              type="button"
              className="dashboard-insight-refresh"
              disabled={
                insightLoading
              }
              onClick={() =>
                loadSmartInsights(
                  true,
                )
              }
            >
              {
                insightLoading
                  ? 'Analyzing...'
                  : 'Refresh analysis'
              }
            </button>

          </div>


          {
            insightLoading ? (

              <div className="dashboard-insight-loading">

                <div className="ai-thinking">
                  <span />
                  <span />
                  <span />
                </div>

                <p>
                  Analyzing your quiz history...
                </p>

              </div>

            ) : insightError ? (

              <div className="dashboard-insight-error">

                <strong>
                  Could not load AI insights.
                </strong>

                <p>
                  {insightError}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    loadSmartInsights(
                      true,
                    )
                  }
                >
                  Try again
                </button>

              </div>

            ) : studyInsight ? (

              <>

                <div className="dashboard-smart-summary">

                  <p>
                    {
                      studyInsight
                        .summary
                    }
                  </p>


                  {
                    insightGeneratedAt && (

                      <span>
                        {
                          insightCached
                            ? 'Saved analysis'
                            : 'New analysis'
                        }
                        {' · '}
                        {
                          formatInsightDate(
                            insightGeneratedAt,
                          )
                        }
                      </span>

                    )
                  }

                </div>


                <div className="dashboard-smart-grid">

                  {/* =========================
                      WEAK TOPICS
                  ========================= */}

                  <div className="dashboard-smart-column">

                    <div className="dashboard-subheading">

                      <strong>
                        Weak topics
                      </strong>

                      <span>
                        AI classified
                      </span>

                    </div>


                    {
                      smartWeakTopics
                        .length >
                      0 ? (

                        <div className="dashboard-weak-topic-list">

                          {
                            smartWeakTopics
                              .slice(
                                0,
                                5,
                              )
                              .map(
                                (
                                  topic,
                                  index,
                                ) => (

                                  <article
                                    className="dashboard-weak-topic"
                                    key={
                                      `${topic.topic}-${index}`
                                    }
                                  >

                                    <div className="dashboard-topic-heading">

                                      <span
                                        className={
                                          `insight-priority ${getPriorityClass(
                                            topic.priority,
                                          )}`
                                        }
                                      >
                                        {
                                          getPriorityLabel(
                                            topic.priority,
                                          )
                                        }
                                      </span>

                                      <small>
                                        {
                                          topic.subject ||
                                          'General'
                                        }
                                        {' · '}
                                        Missed {
                                          topic.misses ||
                                          1
                                        }x
                                      </small>

                                    </div>


                                    <strong>
                                      {
                                        topic.topic
                                      }
                                    </strong>


                                    {
                                      topic.reason && (

                                        <p>
                                          {
                                            topic.reason
                                          }
                                        </p>

                                      )
                                    }


                                    {
                                      topic.reviewFocus && (

                                        <div className="dashboard-review-focus">

                                          <span>
                                            Review focus
                                          </span>

                                          <p>
                                            {
                                              topic.reviewFocus
                                            }
                                          </p>

                                        </div>

                                      )
                                    }


                                    {
                                      topic.materialId ? (

                                        <Link
                                          className="insight-action"
                                          to={
                                            `/ai-study?material=${topic.materialId}`
                                          }
                                        >
                                          ✦ Review with AI
                                        </Link>

                                      ) : (

                                        <Link
                                          className="insight-action"
                                          to="/ai-study"
                                        >
                                          ✦ Ask StudyFlow AI
                                        </Link>

                                      )
                                    }

                                  </article>

                                ),
                              )
                          }

                        </div>

                      ) : (

                        <div className="insight-empty">

                          <strong>
                            No weak topics detected.
                          </strong>

                          <p>
                            Complete more quizzes
                            to build your profile.
                          </p>

                        </div>

                      )
                    }

                  </div>


                  {/* =========================
                      RECOMMENDATIONS
                  ========================= */}

                  <div className="dashboard-smart-column">

                    <div className="dashboard-subheading">

                      <strong>
                        Recommended next
                      </strong>

                      <span>
                        Study actions
                      </span>

                    </div>


                    {
                      smartRecommendations
                        .length >
                      0 ? (

                        <div className="dashboard-recommendation-list">

                          {
                            smartRecommendations
                              .slice(
                                0,
                                5,
                              )
                              .map(
                                (
                                  recommendation,
                                  index,
                                ) => (

                                  <article
                                    className="dashboard-recommendation"
                                    key={
                                      `${recommendation.title}-${index}`
                                    }
                                  >

                                    <div className="dashboard-recommendation-index">
                                      {
                                        index +
                                        1
                                      }
                                    </div>


                                    <div>

                                      <span
                                        className={
                                          `insight-priority ${getPriorityClass(
                                            recommendation.priority,
                                          )}`
                                        }
                                      >
                                        {
                                          getPriorityLabel(
                                            recommendation.priority,
                                          )
                                        }
                                      </span>


                                      <strong>
                                        {
                                          recommendation.title
                                        }
                                      </strong>


                                      <p>
                                        {
                                          recommendation.action
                                        }
                                      </p>


                                      {
                                        recommendation
                                          .materialName && (

                                          <small>
                                            {
                                              recommendation
                                                .materialName
                                            }
                                          </small>

                                        )
                                      }

                                    </div>


                                    {
                                      recommendation
                                        .materialId && (

                                      <Link
                                        to={
                                          `/ai-study?material=${recommendation.materialId}`
                                        }
                                        aria-label="Open recommended material"
                                      >
                                        ›
                                      </Link>

                                    )
                                  }

                                  </article>

                                ),
                              )
                          }

                        </div>

                      ) : (

                        <div className="insight-empty">

                          <strong>
                            No recommendations yet.
                          </strong>

                          <p>
                            Take another quiz
                            to generate more data.
                          </p>

                        </div>

                      )
                    }

                  </div>

                </div>

              </>

            ) : (

              <div className="insight-empty">

                <strong>
                  No study insights yet.
                </strong>

                <p>
                  Complete an interactive quiz
                  to generate recommendations.
                </p>

              </div>

            )
          }

        </div>


        {/* =================================
            RECENT TREND
        ================================= */}

        {
          quizAnalytics
            .recentTrend
            .length >
            0 && (

            <div className="dashboard-trend">

              <div className="dashboard-subheading">

                <strong>
                  Recent scores
                </strong>

                <span>
                  Oldest → latest
                </span>

              </div>


              <div className="dashboard-trend-bars">

                {
                  quizAnalytics
                    .recentTrend
                    .map(
                      (item) => (

                        <div
                          className="dashboard-trend-item"
                          key={
                            item.id
                          }
                        >

                          <div className="dashboard-trend-track">

                            <div
                              className="dashboard-trend-fill"
                              style={{
                                height:
                                  `${Math.max(
                                    item.percentage,
                                    4,
                                  )}%`,
                              }}
                            />

                          </div>

                          <strong>
                            {
                              item.percentage
                            }%
                          </strong>

                          <span>
                            {
                              item.subject
                            }
                          </span>

                        </div>

                      ),
                    )
                }

              </div>

            </div>

          )
        }


        {/* =================================
            QUESTION LEVEL MISTAKES
        ================================= */}

        {
          quizAnalytics
            .weakAreas
            .length >
            0 && (

            <div className="dashboard-weak-areas">

              <div className="dashboard-subheading">

                <strong>
                  Question-level mistakes
                </strong>

                <span>
                  Raw quiz data
                </span>

              </div>


              {
                quizAnalytics
                  .weakAreas
                  .slice(
                    0,
                    4,
                  )
                  .map(
                    (
                      area,
                      index,
                    ) => (

                      <article
                        key={
                          `${area.question}-${index}`
                        }
                      >

                        <div className="dashboard-weak-rank">
                          {
                            index +
                            1
                          }
                        </div>


                        <div>

                          <span>
                            {
                              area.subject
                            }
                          </span>

                          <strong>
                            {
                              area.question
                            }
                          </strong>

                          <small>
                            Missed {
                              area.misses
                            } {
                              area.misses ===
                              1
                                ? 'time'
                                : 'times'
                            }
                          </small>

                        </div>


                        {
                          area.materialId && (

                            <Link
                              to={
                                `/ai-study?material=${area.materialId}`
                              }
                            >
                              Review
                            </Link>

                          )
                        }

                      </article>

                    ),
                  )
              }

            </div>

          )
        }

      </section>


      {/* =====================================
          DESKTOP CONTENT
      ===================================== */}

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


          {
            todayTasks.length ? (

              <div className="simple-list">

                {
                  todayTasks
                    .slice(
                      0,
                      4,
                    )
                    .map(
                      (task) => (

                        <div
                          className="simple-list-item"
                          key={
                            task.id
                          }
                        >

                          <div>

                            <strong>
                              {
                                task.title
                              }
                            </strong>

                            <span>
                              {
                                task.subject
                              }
                            </span>

                          </div>


                          <span className="pill">
                            {
                              task.duration_min
                            } min
                          </span>

                        </div>

                      ),
                    )
                }

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

            )
          }

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