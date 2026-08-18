import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Link,
  useSearchParams,
} from 'react-router-dom'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import {
  FunctionsHttpError,
} from '@supabase/supabase-js'

import {
  supabase,
} from '../lib/supabase'


const normalQuickPrompts = [
  'Make me a 10-item quiz',
  'Create a reviewer',
  'Explain a topic simply',
  'Give me possible exam questions',
]


const materialQuickPrompts = [
  {
    label: 'Summarize',
    type: 'chat',
    prompt:
      'Summarize this study material. Focus on the main ideas and important details.',
  },

  {
    label: 'Create Reviewer',
    type: 'chat',
    prompt:
      'Create a complete reviewer based only on this study material.',
  },

  {
    label: 'Key Concepts',
    type: 'chat',
    prompt:
      'Identify and explain the key concepts in this study material.',
  },

  {
    label: 'Flashcards',
    type: 'chat',
    prompt:
      'Create useful study flashcards based only on this study material.',
  },

  {
    label: 'Quiz Me',
    type: 'quiz',
  },

  {
    label: 'Exam Questions',
    type: 'chat',
    prompt:
      'Create possible exam questions based only on this study material.',
  },
]


export default function AIStudyPage() {
  const [searchParams] =
    useSearchParams()

  const materialId =
    searchParams.get(
      'material',
    )


  /* =========================================
     CHAT STATE
  ========================================= */

  const [
    message,
    setMessage,
  ] =
    useState('')

  const [
    messages,
    setMessages,
  ] =
    useState([
      {
        role: 'ai',
        text:
          'Hi. I am StudyFlow AI. What do you want to study?',
      },
    ])

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


  /* =========================================
     MATERIAL STATE
  ========================================= */

  const [
    selectedMaterial,
    setSelectedMaterial,
  ] =
    useState(null)

  const [
    materialLoading,
    setMaterialLoading,
  ] =
    useState(false)

  const [
    materialError,
    setMaterialError,
  ] =
    useState('')


  /* =========================================
     QUIZ STATE
  ========================================= */

  const [
    quiz,
    setQuiz,
  ] =
    useState(null)

  const [
    quizLoading,
    setQuizLoading,
  ] =
    useState(false)

  const [
    quizIndex,
    setQuizIndex,
  ] =
    useState(0)

  const [
    selectedAnswer,
    setSelectedAnswer,
  ] =
    useState(null)

  const [
    answerChecked,
    setAnswerChecked,
  ] =
    useState(false)

  const [
    quizScore,
    setQuizScore,
  ] =
    useState(0)

  const [
    quizAnswers,
    setQuizAnswers,
  ] =
    useState([])

  const [
    quizComplete,
    setQuizComplete,
  ] =
    useState(false)

  const [
    reviewingMistakes,
    setReviewingMistakes,
  ] =
    useState(false)


  /* =========================================
     QUIZ SAVE STATE
  ========================================= */

  const [
    quizSaving,
    setQuizSaving,
  ] =
    useState(false)

  const [
    quizSaved,
    setQuizSaved,
  ] =
    useState(false)

  const [
    quizSaveError,
    setQuizSaveError,
  ] =
    useState('')

  const [
    quizModel,
    setQuizModel,
  ] =
    useState(null)

  const quizSaveRef =
    useRef(false)

  const chatEndRef =
    useRef(null)


  /* =========================================
     CLEAR QUIZ
  ========================================= */

  function clearQuizState() {
    setQuiz(null)
    setQuizIndex(0)
    setSelectedAnswer(null)
    setAnswerChecked(false)

    setQuizScore(0)
    setQuizAnswers([])
    setQuizComplete(false)

    setReviewingMistakes(
      false,
    )

    setQuizSaving(
      false,
    )

    setQuizSaved(
      false,
    )

    setQuizSaveError(
      '',
    )

    setQuizModel(
      null,
    )

    quizSaveRef.current =
      false
  }


  /* =========================================
     AUTO SCROLL
  ========================================= */

  useEffect(
    () => {
      chatEndRef
        .current
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        })
    },
    [
      messages,
      loading,
    ],
  )


  /* =========================================
     LOAD MATERIAL
  ========================================= */

  useEffect(
    () => {
      if (!materialId) {
        setSelectedMaterial(
          null,
        )

        setMaterialError(
          '',
        )

        clearQuizState()

        return
      }

      clearQuizState()

      loadSelectedMaterial()
    },
    [
      materialId,
    ],
  )


  /* =========================================
     AUTO SAVE COMPLETED QUIZ
  ========================================= */

  useEffect(
    () => {
      if (
        !quizComplete ||
        !quiz ||
        !selectedMaterial ||
        quizSaved ||
        quizSaving ||
        quizSaveRef.current
      ) {
        return
      }

      /*
       * Wait until all answers
       * are already stored in state.
       */
      if (
        quizAnswers.length !==
        quiz.questions.length
      ) {
        return
      }

      saveQuizAttempt()
    },
    [
      quizComplete,
      quizAnswers.length,
      quizSaved,
      quizSaving,
    ],
  )


  /* =========================================
     LOAD SELECTED MATERIAL
  ========================================= */

  async function loadSelectedMaterial() {
    setMaterialLoading(
      true,
    )

    setMaterialError(
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
          materialQueryError,
      } =
        await supabase
          .from(
            'study_materials',
          )
          .select(`
            id,
            user_id,
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
          .eq(
            'id',
            materialId,
          )
          .eq(
            'user_id',
            session.user.id,
          )
          .maybeSingle()

      if (
        materialQueryError
      ) {
        throw materialQueryError
      }

      if (!data) {
        throw new Error(
          'Study material not found or you do not have access to it.',
        )
      }

      setSelectedMaterial(
        data,
      )

      setMessages([
        {
          role: 'ai',

          text:
`### Material ready

**${data.file_name}**

Choose one of the study actions above or ask me a question about this material.`,
        },
      ])
    }

    catch (
      requestError
    ) {
      console.error(
        'Selected material error:',
        requestError,
      )

      setSelectedMaterial(
        null,
      )

      setMaterialError(
        requestError?.message ||
        'Could not load the selected material.',
      )
    }

    finally {
      setMaterialLoading(
        false,
      )
    }
  }


  /* =========================================
     FILE SIZE
  ========================================= */

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


  /* =========================================
     SEND CHAT MESSAGE
  ========================================= */

  async function sendMessage(
    text,
  ) {
    const cleanMessage =
      text.trim()

    if (
      !cleanMessage ||
      loading
    ) {
      return
    }

    setError(
      '',
    )

    const conversationHistory =
      messages
        .filter(
          (item) =>
            item
              ?.text
              ?.trim(),
        )
        .slice(
          -8,
        )
        .map(
          (item) => ({
            role:
              item.role ===
              'ai'
                ? 'model'
                : 'user',

            text:
              item.text,
          }),
        )

    setMessages(
      (current) => [
        ...current,

        {
          role: 'user',
          text: cleanMessage,
        },
      ],
    )

    setMessage(
      '',
    )

    setLoading(
      true,
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
                message:
                  cleanMessage,

                history:
                  conversationHistory,

                materialId:
                  selectedMaterial
                    ?.id ||
                  null,
              },
            },
          )

      if (
        functionError
      ) {
        console.error(
          'StudyFlow function error:',
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
            // Response wasn't JSON.
          }

          console.error(
            'EDGE FUNCTION ERROR BODY:',
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

      if (
        data?.error
      ) {
        throw new Error(
          data.error,
        )
      }

      setMessages(
        (current) => [
          ...current,

          {
            role: 'ai',

            text:
              data?.answer ||
              'No response was received from StudyFlow AI.',
          },
        ],
      )
    }

    catch (
      requestError
    ) {
      console.error(
        'StudyFlow AI error:',
        requestError,
      )

      setError(
        requestError?.message ||
        'Could not contact StudyFlow AI.',
      )
    }

    finally {
      setLoading(
        false,
      )
    }
  }


  /* =========================================
     START INTERACTIVE QUIZ
  ========================================= */

  async function startInteractiveQuiz() {
    if (
      !selectedMaterial ||
      quizLoading
    ) {
      return
    }

    setError(
      '',
    )

    clearQuizState()

    setQuizLoading(
      true,
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
                mode: 'quiz',

                materialId:
                  selectedMaterial.id,

                message:
                  `Create a 10-item interactive multiple-choice quiz based only on ${selectedMaterial.file_name}.`,
              },
            },
          )

      if (
        functionError
      ) {
        console.error(
          'Interactive quiz function error:',
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
            // Response wasn't JSON.
          }

          throw new Error(
            errorBody?.error ||
            errorBody?.message ||
            `StudyFlow AI returned HTTP ${functionError.context.status}.`,
          )
        }

        throw functionError
      }

      if (
        data?.error
      ) {
        throw new Error(
          data.error,
        )
      }

      if (
        !data?.quiz ||
        !Array.isArray(
          data.quiz.questions,
        ) ||
        data.quiz.questions.length ===
          0
      ) {
        throw new Error(
          'StudyFlow AI did not return a valid quiz.',
        )
      }

      setQuiz(
        data.quiz,
      )

      setQuizModel(
        data?.model ||
        null,
      )
    }

    catch (
      requestError
    ) {
      console.error(
        'Interactive quiz error:',
        requestError,
      )

      setError(
        requestError?.message ||
        'Could not generate the interactive quiz.',
      )
    }

    finally {
      setQuizLoading(
        false,
      )
    }
  }


  /* =========================================
     SELECT ANSWER
  ========================================= */

  function chooseQuizAnswer(
    optionIndex,
  ) {
    if (
      answerChecked ||
      quizComplete
    ) {
      return
    }

    setSelectedAnswer(
      optionIndex,
    )
  }


  /* =========================================
     CHECK ANSWER
  ========================================= */

  function checkQuizAnswer() {
    if (
      selectedAnswer ===
        null ||
      answerChecked ||
      !quiz
    ) {
      return
    }

    const question =
      quiz.questions[
        quizIndex
      ]

    const correct =
      selectedAnswer ===
      question.correctIndex

    if (correct) {
      setQuizScore(
        (current) =>
          current + 1,
      )
    }

    setQuizAnswers(
      (current) => [
        ...current,

        {
          questionIndex:
            quizIndex,

          selectedIndex:
            selectedAnswer,

          correctIndex:
            question.correctIndex,

          correct,
        },
      ],
    )

    setAnswerChecked(
      true,
    )
  }


  /* =========================================
     SAVE QUIZ RESULT
  ========================================= */

  async function saveQuizAttempt() {
    if (
      !quiz ||
      !selectedMaterial ||
      quizSaving ||
      quizSaved ||
      quizSaveRef.current
    ) {
      return
    }

    if (
      quizAnswers.length !==
      quiz.questions.length
    ) {
      return
    }

    quizSaveRef.current =
      true

    setQuizSaving(
      true,
    )

    setQuizSaveError(
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

      if (sessionError) {
        throw sessionError
      }

      if (!session) {
        throw new Error(
          'Your session expired. Please sign in again.',
        )
      }

      const savedAnswers =
        quizAnswers.map(
          (answer) => {
            const question =
              quiz.questions[
                answer.questionIndex
              ]

            return {
              questionIndex:
                answer.questionIndex,

              question:
                question?.question ||
                '',

              options:
                question?.options ||
                [],

              selectedIndex:
                answer.selectedIndex,

              selectedAnswer:
                question
                  ?.options
                  ?.[
                    answer.selectedIndex
                  ] ||
                null,

              correctIndex:
                answer.correctIndex,

              correctAnswer:
                question
                  ?.options
                  ?.[
                    answer.correctIndex
                  ] ||
                null,

              correct:
                Boolean(
                  answer.correct,
                ),

              explanation:
                question
                  ?.explanation ||
                '',
            }
          },
        )

      const finalScore =
        savedAnswers.filter(
          (answer) =>
            answer.correct,
        ).length

      const totalQuestions =
        quiz.questions.length

      const percentage =
        Number(
          (
            (
              finalScore /
              totalQuestions
            ) *
            100
          ).toFixed(
            2,
          ),
        )

      const {
        error:
          saveError,
      } =
        await supabase
          .from(
            'quiz_attempts',
          )
          .insert({
            user_id:
              session.user.id,

            material_id:
              selectedMaterial.id,

            subject_id:
              selectedMaterial
                .subject_id ||
              null,

            quiz_title:
              quiz.title ||
              'StudyFlow Quiz',

            material_name:
              selectedMaterial
                .file_name ||
              null,

            subject_name:
              selectedMaterial
                .subjects
                ?.name ||
              null,

            score:
              finalScore,

            total_questions:
              totalQuestions,

            percentage,

            answers:
              savedAnswers,

            ai_model:
              quizModel ||
              null,
          })

      if (saveError) {
        throw saveError
      }

      setQuizSaved(
        true,
      )
    }

    catch (
      saveError
    ) {
      console.error(
        'Quiz save error:',
        saveError,
      )

      quizSaveRef.current =
        false

      setQuizSaveError(
        saveError?.message ||
        'Could not save this quiz result.',
      )
    }

    finally {
      setQuizSaving(
        false,
      )
    }
  }


  /* =========================================
     NEXT QUESTION
  ========================================= */

  function nextQuizQuestion() {
    if (
      !quiz ||
      !answerChecked
    ) {
      return
    }

    if (
      quizIndex >=
      quiz.questions.length -
        1
    ) {
      setQuizComplete(
        true,
      )

      return
    }

    setQuizIndex(
      (current) =>
        current + 1,
    )

    setSelectedAnswer(
      null,
    )

    setAnswerChecked(
      false,
    )
  }


  /* =========================================
     RETRY SAME QUIZ
  ========================================= */

  function retryQuiz() {
    setQuizIndex(
      0,
    )

    setSelectedAnswer(
      null,
    )

    setAnswerChecked(
      false,
    )

    setQuizScore(
      0,
    )

    setQuizAnswers(
      [],
    )

    setQuizComplete(
      false,
    )

    setReviewingMistakes(
      false,
    )

    setQuizSaving(
      false,
    )

    setQuizSaved(
      false,
    )

    setQuizSaveError(
      '',
    )

    quizSaveRef.current =
      false
  }


  function closeQuiz() {
    clearQuizState()
  }


  /* =========================================
     MATERIAL ACTION
  ========================================= */

  async function handleMaterialAction(
    item,
  ) {
    if (!selectedMaterial) {
      setError(
        'Select a study material first.',
      )

      return
    }

    if (
      item.type ===
      'quiz'
    ) {
      await startInteractiveQuiz()

      return
    }

    await sendMessage(
      item.prompt,
    )
  }


  /* =========================================
     CHAT SUBMIT
  ========================================= */

  async function handleSubmit(
    event,
  ) {
    event.preventDefault()

    await sendMessage(
      message,
    )
  }


  return (
    <div className="mobile-ai-page">

      {/* =====================================
          AI HEADER
      ===================================== */}

      <section className="mobile-ai-hero">

        <div className="mobile-ai-logo">
          ✦
        </div>

        <span className="mobile-small-label">
          STUDYFLOW AI
        </span>

        <h2>
          What do you want to study?
        </h2>

        <p>
          Ask questions, create reviewers,
          prepare quizzes, and study any subject.
        </p>

      </section>


      {/* =====================================
          MATERIAL
      ===================================== */}

      {materialLoading ? (

        <section className="ai-selected-material-card">

          <span className="ai-material-label">
            STUDY MATERIAL
          </span>

          <strong>
            Loading material...
          </strong>

        </section>

      ) : materialError ? (

        <section className="ai-selected-material-card">

          <span className="ai-material-label">
            STUDY MATERIAL
          </span>

          <strong>
            Could not load material
          </strong>

          <p>
            {materialError}
          </p>

          <Link
            to="/materials"
            className="ai-material-change"
          >
            Back to materials
          </Link>

        </section>

      ) : selectedMaterial ? (

        <section className="ai-selected-material-card">

          <div className="ai-selected-material-top">

            <div className="ai-material-file-icon">
              {
                selectedMaterial
                  .file_type
                  ?.toUpperCase() ||
                'FILE'
              }
            </div>


            <div className="ai-selected-material-info">

              <span className="ai-material-label">
                SELECTED MATERIAL
              </span>

              <strong>
                {
                  selectedMaterial
                    .file_name
                }
              </strong>


              <div className="ai-material-meta">

                <span>
                  {
                    selectedMaterial
                      .subjects
                      ?.name ||
                    'No subject'
                  }
                </span>

                <span>
                  {
                    selectedMaterial
                      .file_type
                      ?.toUpperCase()
                  }
                </span>

                <span>
                  {
                    formatFileSize(
                      selectedMaterial
                        .file_size,
                    )
                  }
                </span>

              </div>

            </div>


            <Link
              to="/materials"
              className="ai-material-change"
            >
              Change
            </Link>

          </div>


          <div className="ai-material-actions">

            {
              materialQuickPrompts.map(
                (item) => (

                  <button
                    type="button"
                    key={item.label}
                    disabled={
                      loading ||
                      quizLoading
                    }
                    onClick={() =>
                      handleMaterialAction(
                        item,
                      )
                    }
                  >

                    <span>
                      ✦
                    </span>

                    {item.label}

                  </button>

                ),
              )
            }

          </div>


          <p className="ai-material-phase-note">
            StudyFlow AI will use this material
            as the source for your study session.
          </p>

        </section>

      ) : (

        <section className="mobile-ai-material">

          <div>

            <span>
              STUDY MATERIAL
            </span>

            <strong>
              No material selected
            </strong>

          </div>

          <Link to="/materials">
            Select
          </Link>

        </section>

      )}


      {/* =====================================
          NORMAL QUICK PROMPTS
      ===================================== */}

      {!selectedMaterial && (

        <section>

          <h3 className="mobile-section-title">
            Quick prompts
          </h3>

          <div className="mobile-ai-prompts">

            {
              normalQuickPrompts.map(
                (prompt) => (

                  <button
                    type="button"
                    key={prompt}
                    disabled={loading}
                    onClick={() =>
                      sendMessage(
                        prompt,
                      )
                    }
                  >

                    <span>
                      ✦
                    </span>

                    {prompt}

                  </button>

                ),
              )
            }

          </div>

        </section>

      )}


      {/* =====================================
          QUIZ LOADING
      ===================================== */}

      {quizLoading && (

        <section className="interactive-quiz quiz-loading-card">

          <div className="quiz-loading-icon">
            ✦
          </div>

          <div>

            <span className="quiz-label">
              INTERACTIVE QUIZ
            </span>

            <h3>
              Generating your quiz...
            </h3>

            <p>
              StudyFlow AI is creating 10 questions
              from your selected material.
            </p>

          </div>

        </section>

      )}


      {/* =====================================
          INTERACTIVE QUIZ
      ===================================== */}

      {quiz && (

        <section className="interactive-quiz">

          {!quizComplete ? (
            <>

              <div className="quiz-topbar">

                <div>

                  <span className="quiz-label">
                    INTERACTIVE QUIZ
                  </span>

                  <h3>
                    {
                      quiz.title ||
                      'StudyFlow Quiz'
                    }
                  </h3>

                </div>

                <button
                  type="button"
                  className="quiz-close"
                  aria-label="Close quiz"
                  onClick={closeQuiz}
                >
                  ×
                </button>

              </div>


              <div className="quiz-progress-row">

                <span>
                  Question {
                    quizIndex + 1
                  } of {
                    quiz.questions.length
                  }
                </span>

                <strong>
                  Score: {
                    quizScore
                  }
                </strong>

              </div>


              <div className="quiz-progress">

                <div
                  style={{
                    width:
                      `${
                        (
                          (
                            quizIndex +
                            1
                          ) /
                          quiz.questions
                            .length
                        ) *
                        100
                      }%`,
                  }}
                />

              </div>


              <div className="quiz-question">

                <h2>
                  {
                    quiz
                      .questions[
                        quizIndex
                      ]
                      .question
                  }
                </h2>

              </div>


              <div className="quiz-options">

                {
                  quiz
                    .questions[
                      quizIndex
                    ]
                    .options
                    .map(
                      (
                        option,
                        optionIndex,
                      ) => {
                        const question =
                          quiz.questions[
                            quizIndex
                          ]

                        const isSelected =
                          selectedAnswer ===
                          optionIndex

                        const isCorrect =
                          answerChecked &&
                          optionIndex ===
                            question.correctIndex

                        const isWrong =
                          answerChecked &&
                          isSelected &&
                          optionIndex !==
                            question.correctIndex

                        return (
                          <button
                            type="button"
                            key={
                              `${quizIndex}-${optionIndex}`
                            }
                            className={[
                              'quiz-option',
                              isSelected
                                ? 'selected'
                                : '',
                              isCorrect
                                ? 'correct'
                                : '',
                              isWrong
                                ? 'wrong'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            disabled={
                              answerChecked
                            }
                            onClick={() =>
                              chooseQuizAnswer(
                                optionIndex,
                              )
                            }
                          >

                            <span className="quiz-option-letter">
                              {
                                String.fromCharCode(
                                  65 +
                                  optionIndex,
                                )
                              }
                            </span>

                            <span className="quiz-option-text">
                              {option}
                            </span>

                          </button>
                        )
                      },
                    )
                }

              </div>


              {answerChecked && (

                <div
                  className={
                    selectedAnswer ===
                    quiz.questions[
                      quizIndex
                    ].correctIndex
                      ? 'quiz-feedback correct'
                      : 'quiz-feedback wrong'
                  }
                >

                  <strong>
                    {
                      selectedAnswer ===
                      quiz.questions[
                        quizIndex
                      ].correctIndex
                        ? '✓ Correct'
                        : '✕ Incorrect'
                    }
                  </strong>

                  <p>
                    {
                      quiz.questions[
                        quizIndex
                      ].explanation
                    }
                  </p>

                </div>

              )}


              {!answerChecked ? (

                <button
                  type="button"
                  className="quiz-primary-button"
                  disabled={
                    selectedAnswer ===
                    null
                  }
                  onClick={
                    checkQuizAnswer
                  }
                >
                  Check Answer
                </button>

              ) : (

                <button
                  type="button"
                  className="quiz-primary-button"
                  onClick={
                    nextQuizQuestion
                  }
                >
                  {
                    quizIndex ===
                    quiz.questions.length -
                      1
                      ? 'View Results'
                      : 'Next Question'
                  }
                </button>

              )}

            </>
          ) : (

            <div className="quiz-results">

              <div className="quiz-result-icon">
                ✓
              </div>

              <span className="quiz-label">
                QUIZ COMPLETE
              </span>

              <h2>
                {quizScore} / {
                  quiz.questions.length
                }
              </h2>

              <p className="quiz-result-percent">
                {
                  Math.round(
                    (
                      quizScore /
                      quiz.questions.length
                    ) *
                    100,
                  )
                }% accuracy
              </p>


              {/* =================================
                  SAVE STATUS
              ================================= */}

              <div className="quiz-save-status">

                {quizSaving && (

                  <span className="quiz-save-message saving">
                    Saving result...
                  </span>

                )}


                {quizSaved && (

                  <div className="quiz-save-message saved">

                    <span>
                      ✓ Result saved to Quiz History
                    </span>

                    <Link to="/quiz-history">
                      View History
                    </Link>

                  </div>

                )}


                {quizSaveError && (

                  <div className="quiz-save-message error">

                    <span>
                      {quizSaveError}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        quizSaveRef.current =
                          false

                        saveQuizAttempt()
                      }}
                    >
                      Retry Save
                    </button>

                  </div>

                )}

              </div>


              <div className="quiz-result-stats">

                <div>
                  <span>
                    Correct
                  </span>

                  <strong>
                    {quizScore}
                  </strong>
                </div>

                <div>
                  <span>
                    Wrong
                  </span>

                  <strong>
                    {
                      quiz.questions.length -
                      quizScore
                    }
                  </strong>
                </div>

              </div>


              <div className="quiz-result-actions">

                {
                  quizAnswers.some(
                    (answer) =>
                      !answer.correct,
                  ) && (

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        setReviewingMistakes(
                          (current) =>
                            !current,
                        )
                      }
                    >
                      {
                        reviewingMistakes
                          ? 'Hide Mistakes'
                          : 'Review Mistakes'
                      }
                    </button>

                  )
                }


                <button
                  type="button"
                  className="secondary-button"
                  onClick={retryQuiz}
                >
                  Try Again
                </button>


                <button
                  type="button"
                  className="quiz-primary-button"
                  onClick={
                    startInteractiveQuiz
                  }
                >
                  New Quiz
                </button>

              </div>


              {reviewingMistakes && (

                <div className="quiz-mistakes">

                  {
                    quizAnswers
                      .filter(
                        (answer) =>
                          !answer.correct,
                      )
                      .map(
                        (answer) => {
                          const question =
                            quiz.questions[
                              answer.questionIndex
                            ]

                          return (
                            <article
                              key={
                                answer.questionIndex
                              }
                            >

                              <span>
                                Question {
                                  answer.questionIndex +
                                  1
                                }
                              </span>

                              <strong>
                                {
                                  question.question
                                }
                              </strong>

                              <p>
                                <b>
                                  Your answer:
                                </b>{' '}
                                {
                                  question.options[
                                    answer.selectedIndex
                                  ]
                                }
                              </p>

                              <p>
                                <b>
                                  Correct answer:
                                </b>{' '}
                                {
                                  question.options[
                                    answer.correctIndex
                                  ]
                                }
                              </p>

                              <small>
                                {
                                  question.explanation
                                }
                              </small>

                            </article>
                          )
                        },
                      )
                  }

                </div>

              )}


              <button
                type="button"
                className="quiz-close-results"
                onClick={closeQuiz}
              >
                Back to AI Study
              </button>

            </div>

          )}

        </section>

      )}


      {/* =====================================
          CHAT
      ===================================== */}

      {!quiz && !quizLoading && (

        <section className="ai-chat-thread">

          {
            messages.map(
              (
                chatMessage,
                index,
              ) => (

                <div
                  key={
                    `${chatMessage.role}-${index}`
                  }
                  className={
                    chatMessage.role ===
                    'user'
                      ? 'ai-chat-message user'
                      : 'ai-chat-message ai'
                  }
                >

                  <span className="ai-message-author">
                    {
                      chatMessage.role ===
                      'user'
                        ? 'You'
                        : 'StudyFlow AI'
                    }
                  </span>


                  {
                    chatMessage.role ===
                    'ai' ? (

                      <div className="ai-markdown">

                        <ReactMarkdown
                          remarkPlugins={[
                            remarkGfm,
                          ]}
                          components={{
                            a({
                              children,
                              ...props
                            }) {
                              return (
                                <a
                                  {...props}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {children}
                                </a>
                              )
                            },
                          }}
                        >
                          {
                            chatMessage.text
                          }
                        </ReactMarkdown>

                      </div>

                    ) : (

                      <p className="ai-user-text">
                        {
                          chatMessage.text
                        }
                      </p>

                    )
                  }

                </div>

              ),
            )
          }


          {loading && (

            <div className="ai-chat-message ai">

              <span className="ai-message-author">
                StudyFlow AI
              </span>

              <div className="ai-thinking">
                <span />
                <span />
                <span />
              </div>

            </div>

          )}


          <div
            ref={chatEndRef}
          />

        </section>

      )}


      {/* =====================================
          ERROR
      ===================================== */}

      {error && (

        <div className="notice error">
          {error}
        </div>

      )}


      {/* =====================================
          INPUT
      ===================================== */}

      {!quiz && !quizLoading && (

        <form
          className="mobile-ai-input"
          onSubmit={
            handleSubmit
          }
        >

          <input
            type="text"
            value={message}
            disabled={loading}
            placeholder={
              selectedMaterial
                ? `Ask about ${selectedMaterial.file_name}...`
                : 'Ask StudyFlow AI...'
            }
            autoComplete="off"
            onChange={(
              event,
            ) =>
              setMessage(
                event.target.value,
              )
            }
          />


          <button
            type="submit"
            disabled={
              loading ||
              !message.trim()
            }
            aria-label="Send message"
          >
            ↑
          </button>

        </form>

      )}

    </div>
  )
}