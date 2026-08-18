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
} from '../../../lib/supabase'

import {
  useAuth,
} from '../../../context/AuthContext'


export default function QuizHistoryPage() {
  const {
    user,
  } =
    useAuth()

  const [
    attempts,
    setAttempts,
  ] =
    useState([])

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

  const [
    expandedAttempt,
    setExpandedAttempt,
  ] =
    useState(null)


  /* =========================================
     LOAD QUIZ HISTORY
  ========================================= */

  useEffect(
    () => {
      if (!user) {
        return
      }

      loadQuizHistory()
    },
    [
      user?.id,
    ],
  )


  async function loadQuizHistory() {
    setLoading(
      true,
    )

    setError(
      '',
    )

    const {
      data,

      error:
        historyError,
    } =
      await supabase
        .from(
          'quiz_attempts',
        )
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
          ai_model,
          created_at
        `)
        .eq(
          'user_id',
          user.id,
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          },
        )

    if (
      historyError
    ) {
      console.error(
        'Quiz history error:',
        historyError,
      )

      setError(
        historyError.message,
      )

      setAttempts(
        [],
      )

      setLoading(
        false,
      )

      return
    }

    setAttempts(
      data ||
      [],
    )

    setLoading(
      false,
    )
  }


  /* =========================================
     DELETE ATTEMPT
  ========================================= */

  async function deleteAttempt(
    attempt,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${attempt.quiz_title}" from your quiz history?`,
      )

    if (!confirmed) {
      return
    }

    setError(
      '',
    )

    const {
      error:
        deleteError,
    } =
      await supabase
        .from(
          'quiz_attempts',
        )
        .delete()
        .eq(
          'id',
          attempt.id,
        )
        .eq(
          'user_id',
          user.id,
        )

    if (
      deleteError
    ) {
      setError(
        deleteError.message,
      )

      return
    }

    setAttempts(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            attempt.id,
        ),
    )

    if (
      expandedAttempt ===
      attempt.id
    ) {
      setExpandedAttempt(
        null,
      )
    }
  }


  /* =========================================
     STATISTICS
  ========================================= */

  const stats =
    useMemo(
      () => {
        if (
          attempts.length ===
          0
        ) {
          return {
            totalAttempts:
              0,

            average:
              0,

            best:
              0,

            correct:
              0,

            questions:
              0,
          }
        }

        const totalPercentage =
          attempts.reduce(
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

        const questions =
          attempts.reduce(
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

        const correct =
          attempts.reduce(
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

        const best =
          Math.max(
            ...attempts.map(
              (attempt) =>
                Number(
                  attempt.percentage ||
                  0,
                ),
            ),
          )

        return {
          totalAttempts:
            attempts.length,

          average:
            Math.round(
              totalPercentage /
              attempts.length,
            ),

          best:
            Math.round(
              best,
            ),

          correct,

          questions,
        }
      },
      [
        attempts,
      ],
    )


  /* =========================================
     FORMAT DATE
  ========================================= */

  function formatDate(
    value,
  ) {
    if (!value) {
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

          year:
            'numeric',

          hour:
            'numeric',

          minute:
            '2-digit',
        },
      )
      .format(
        new Date(
          value,
        ),
      )
  }


  return (
    <div className="page-stack quiz-history-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <section className="quiz-history-hero">

        <div>

          <p className="eyebrow">
            STUDY PROGRESS
          </p>

          <h2>
            Quiz History
          </h2>

          <p>
            Review your saved scores,
            past attempts, and answers.
          </p>

        </div>


        <Link
          to="/materials"
          className="quiz-history-start"
        >
          Take a Quiz
        </Link>

      </section>


      {/* =====================================
          STATS
      ===================================== */}

      <section className="quiz-history-stats">

        <article>

          <span>
            Attempts
          </span>

          <strong>
            {
              stats.totalAttempts
            }
          </strong>

        </article>


        <article>

          <span>
            Average
          </span>

          <strong>
            {
              stats.average
            }%
          </strong>

        </article>


        <article>

          <span>
            Best Score
          </span>

          <strong>
            {
              stats.best
            }%
          </strong>

        </article>


        <article>

          <span>
            Correct
          </span>

          <strong>
            {
              stats.correct
            } / {
              stats.questions
            }
          </strong>

        </article>

      </section>


      {/* =====================================
          ERROR
      ===================================== */}

      {error && (

        <div className="notice error">
          {error}
        </div>

      )}


      {/* =====================================
          HISTORY
      ===================================== */}

      <section className="quiz-history-panel">

        <div className="quiz-history-panel-header">

          <div>

            <p className="eyebrow">
              HISTORY
            </p>

            <h3>
              Recent Attempts
            </h3>

          </div>


          {!loading && (

            <span>
              {
                attempts.length
              } attempts
            </span>

          )}

        </div>


        {loading ? (

          <div className="quiz-history-empty">
            Loading quiz history...
          </div>

        ) : attempts.length ===
          0 ? (

          <div className="quiz-history-empty">

            <div className="quiz-history-empty-icon">
              ▥
            </div>

            <strong>
              No quiz attempts yet.
            </strong>

            <p>
              Complete an interactive quiz
              and your score will appear here.
            </p>

            <Link to="/materials">
              Choose Study Material
            </Link>

          </div>

        ) : (

          <div className="quiz-history-list">

            {
              attempts.map(
                (attempt) => {
                  const expanded =
                    expandedAttempt ===
                    attempt.id

                  const answers =
                    Array.isArray(
                      attempt.answers,
                    )
                      ? attempt.answers
                      : []

                  return (
                    <article
                      className="quiz-history-item"
                      key={
                        attempt.id
                      }
                    >

                      <div className="quiz-history-main">

                        <div className="quiz-history-score">

                          <strong>
                            {
                              Math.round(
                                Number(
                                  attempt.percentage ||
                                  0,
                                ),
                              )
                            }%
                          </strong>

                          <span>
                            {
                              attempt.score
                            } / {
                              attempt.total_questions
                            }
                          </span>

                        </div>


                        <div className="quiz-history-info">

                          <span className="quiz-history-subject">
                            {
                              attempt.subject_name ||
                              'General'
                            }
                          </span>

                          <strong>
                            {
                              attempt.quiz_title ||
                              'StudyFlow Quiz'
                            }
                          </strong>

                          <p>
                            {
                              attempt.material_name ||
                              'Study material'
                            }
                          </p>

                          <small>
                            {
                              formatDate(
                                attempt.created_at,
                              )
                            }
                          </small>

                        </div>


                        <button
                          type="button"
                          className="quiz-history-expand"
                          onClick={() =>
                            setExpandedAttempt(
                              expanded
                                ? null
                                : attempt.id,
                            )
                          }
                        >
                          {
                            expanded
                              ? 'Hide'
                              : 'Review'
                          }
                        </button>

                      </div>


                      {expanded && (

                        <div className="quiz-history-review">

                          <div className="quiz-history-review-top">

                            <strong>
                              Answer Review
                            </strong>

                            <button
                              type="button"
                              onClick={() =>
                                deleteAttempt(
                                  attempt,
                                )
                              }
                            >
                              Delete
                            </button>

                          </div>


                          {
                            answers.length ===
                            0 ? (

                              <p className="quiz-history-no-answers">
                                No detailed answers were stored for this attempt.
                              </p>

                            ) : (

                              answers.map(
                                (
                                  answer,
                                  index,
                                ) => (

                                  <div
                                    className={
                                      answer.correct
                                        ? 'quiz-history-answer correct'
                                        : 'quiz-history-answer wrong'
                                    }
                                    key={
                                      `${attempt.id}-${index}`
                                    }
                                  >

                                    <span>
                                      {
                                        answer.correct
                                          ? '✓'
                                          : '✕'
                                      } Question {
                                        index + 1
                                      }
                                    </span>


                                    <strong>
                                      {
                                        answer.question
                                      }
                                    </strong>


                                    <p>
                                      <b>
                                        Your answer:
                                      </b>{' '}
                                      {
                                        answer.selectedAnswer ||
                                        'No answer'
                                      }
                                    </p>


                                    {!answer.correct && (

                                      <p>
                                        <b>
                                          Correct answer:
                                        </b>{' '}
                                        {
                                          answer.correctAnswer
                                        }
                                      </p>

                                    )}


                                    {
                                      answer.explanation && (

                                        <small>
                                          {
                                            answer.explanation
                                          }
                                        </small>

                                      )
                                    }

                                  </div>

                                ),
                              )

                            )
                          }


                          {attempt.ai_model && (

                            <div className="quiz-history-model">
                              Generated with {
                                attempt.ai_model
                              }
                            </div>

                          )}


                          {attempt.material_id && (

                            <Link
                              className="quiz-history-retake"
                              to={
                                `/ai-study?material=${attempt.material_id}`
                              }
                            >
                              Study This Material Again
                            </Link>

                          )}

                        </div>

                      )}

                    </article>
                  )
                },
              )
            }

          </div>

        )}

      </section>

    </div>
  )
}