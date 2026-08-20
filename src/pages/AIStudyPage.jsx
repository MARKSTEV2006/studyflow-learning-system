import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Link,
  useSearchParams,
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

import AIChatThread from '../components/AIChatThread'


/* =========================================
   SUPABASE AI CHAT HISTORY
========================================= */

const DEFAULT_CHAT_MESSAGES = [
  {
    role:
      'ai',

    text:
      'Hi. I am StudyFlow AI. What do you want to study?',
  },
]


function createDefaultChatMessages() {
  const now =
    new Date()
      .toISOString()

  return DEFAULT_CHAT_MESSAGES.map(
    (
      item,
      index,
    ) => ({
      ...item,

      id:
        `welcome-${index}`,

      createdAt:
        now,
    }),
  )
}


function getChatContextKey(
  materialId,
) {
  return materialId
    ? `material:${materialId}`
    : 'general'
}


function getLegacyChatStorageKey(
  userId,
  materialId,
) {
  if (!userId) {
    return null
  }


  return `studyflow-ai-chat:${userId}:${
    materialId ||
    'general'
  }`
}


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
  const {
    user,
  } =
    useAuth()


  const [
    searchParams,
  ] =
    useSearchParams()


  const materialId =
    searchParams.get(
      'material',
    )


  const chatContextKey =
    getChatContextKey(
      materialId,
    )


  const legacyChatStorageKey =
    getLegacyChatStorageKey(
      user?.id,
      materialId,
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
    useState(
      createDefaultChatMessages,
    )


  const [
    conversationId,
    setConversationId,
  ] =
    useState(null)


  const [
    chatHistoryLoading,
    setChatHistoryLoading,
  ] =
    useState(true)


  const [
    chatHistoryReady,
    setChatHistoryReady,
  ] =
    useState(false)


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


  /* =========================================
     SMART INSIGHT REFRESH STATE
  ========================================= */

  const [
    smartInsightRefreshing,
    setSmartInsightRefreshing,
  ] =
    useState(false)


  const [
    smartInsightUpdated,
    setSmartInsightUpdated,
  ] =
    useState(false)


  const quizSaveRef =
    useRef(false)


  const chatEndRef =
    useRef(null)


  const chatLoadSequenceRef =
    useRef(0)


  /* =========================================
     CLEAR QUIZ STATE
  ========================================= */

  function clearQuizState() {
    setQuiz(
      null,
    )

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

    setQuizModel(
      null,
    )

    setSmartInsightRefreshing(
      false,
    )

    setSmartInsightUpdated(
      false,
    )

    quizSaveRef.current =
      false
  }


  /* =========================================
     TOUCH CONVERSATION
  ========================================= */

  async function touchConversation(
    activeConversationId,
    userId,
  ) {
    if (
      !activeConversationId ||
      !userId
    ) {
      return
    }


    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          'ai_conversations',
        )
        .update({
          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          activeConversationId,
        )
        .eq(
          'user_id',
          userId,
        )


    if (
      updateError
    ) {
      console.warn(
        'Could not update AI conversation timestamp:',
        updateError,
      )
    }
  }


  /* =========================================
     SAVE ONE CHAT MESSAGE
  ========================================= */

  async function saveChatMessage({
    activeConversationId,
    userId,
    role,
    content,
    aiModel = null,
  }) {
    const cleanContent =
      String(
        content ||
        '',
      )
        .trim()


    if (
      !activeConversationId ||
      !userId ||
      !cleanContent
    ) {
      throw new Error(
        'StudyFlow chat history is not ready.',
      )
    }


    const {
      data:
        insertedMessage,

      error:
        insertError,
    } =
      await supabase
        .from(
          'ai_messages',
        )
        .insert({
          conversation_id:
            activeConversationId,

          user_id:
            userId,

          role,

          content:
            cleanContent,

          ai_model:
            aiModel,
        })
        .select(`
          id,
          role,
          content,
          ai_model,
          created_at
        `)
        .single()


    if (
      insertError
    ) {
      throw insertError
    }


    await touchConversation(
      activeConversationId,
      userId,
    )


    return insertedMessage
  }


  /* =========================================
     MIGRATE OLD LOCAL CHAT ONCE

     If Phase 2C.8 localStorage history exists
     and this Supabase conversation is empty,
     move the old messages into ai_messages.
  ========================================= */

  async function migrateLegacyChat({
    activeConversationId,
    userId,
  }) {
    if (
      !legacyChatStorageKey ||
      !activeConversationId ||
      !userId
    ) {
      return []
    }


    try {
      const savedChat =
        window
          .localStorage
          .getItem(
            legacyChatStorageKey,
          )


      if (!savedChat) {
        return []
      }


      const parsedChat =
        JSON.parse(
          savedChat,
        )


      const validChat =
        Array.isArray(
          parsedChat,
        )
          ? parsedChat
              .filter(
                (
                  item,
                ) =>
                  item &&
                  (
                    item.role ===
                      'user' ||
                    item.role ===
                      'ai'
                  ) &&
                  typeof item.text ===
                    'string' &&
                  item.text.trim(),
              )
              .filter(
                (
                  item,
                  index,
                ) =>
                  !(
                    index === 0 &&
                    item.role ===
                      'ai' &&
                    item.text.trim() ===
                      DEFAULT_CHAT_MESSAGES[0]
                        .text
                  ),
              )
          : []


      if (
        validChat.length ===
        0
      ) {
        window
          .localStorage
          .removeItem(
            legacyChatStorageKey,
          )

        return []
      }


      const baseTime =
        Date.now() -
        validChat.length


      const rows =
        validChat.map(
          (
            item,
            index,
          ) => ({
            conversation_id:
              activeConversationId,

            user_id:
              userId,

            role:
              item.role,

            content:
              item.text.trim(),

            ai_model:
              null,

            created_at:
              new Date(
                baseTime +
                index,
              )
                .toISOString(),
          }),
        )


      const {
        error:
          migrationError,
      } =
        await supabase
          .from(
            'ai_messages',
          )
          .insert(
            rows,
          )


      if (
        migrationError
      ) {
        throw migrationError
      }


      await touchConversation(
        activeConversationId,
        userId,
      )


      window
        .localStorage
        .removeItem(
          legacyChatStorageKey,
        )


      return rows.map(
        (
          row,
          index,
        ) => ({
          id:
            `legacy-${index}`,

          role:
            row.role,

          text:
            row.content,

          createdAt:
            row.created_at,
        }),
      )
    } catch (
      migrationError
    ) {
      console.warn(
        'Could not migrate old StudyFlow AI chat:',
        migrationError,
      )


      return []
    }
  }


  /* =========================================
     LOAD / CREATE SUPABASE CONVERSATION

     One conversation per:
     - logged-in user
     - general AI context OR material context
  ========================================= */

  useEffect(
    () => {
      const loadSequence =
        chatLoadSequenceRef
          .current +
        1


      chatLoadSequenceRef
        .current =
        loadSequence


      if (
        !user?.id
      ) {
        setConversationId(
          null,
        )

        setMessages(
          createDefaultChatMessages(),
        )

        setChatHistoryReady(
          false,
        )

        setChatHistoryLoading(
          false,
        )

        return
      }


      async function loadChatHistory() {
        setChatHistoryLoading(
          true,
        )

        setChatHistoryReady(
          false,
        )

        setConversationId(
          null,
        )

        setMessages(
          createDefaultChatMessages(),
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
            !session ||
            session.user.id !==
              user.id
          ) {
            throw new Error(
              'Your session expired. Please sign in again.',
            )
          }


          const {
            data:
              existingConversation,

            error:
              conversationQueryError,
          } =
            await supabase
              .from(
                'ai_conversations',
              )
              .select(`
                id,
                user_id,
                material_id,
                context_key,
                title,
                created_at,
                updated_at
              `)
              .eq(
                'user_id',
                user.id,
              )
              .eq(
                'context_key',
                chatContextKey,
              )
              .maybeSingle()


          if (
            conversationQueryError
          ) {
            throw conversationQueryError
          }


          let activeConversation =
            existingConversation


          if (
            !activeConversation
          ) {
            const {
              data:
                createdConversation,

              error:
                conversationInsertError,
            } =
              await supabase
                .from(
                  'ai_conversations',
                )
                .insert({
                  user_id:
                    user.id,

                  material_id:
                    materialId ||
                    null,

                  context_key:
                    chatContextKey,

                  title:
                    materialId
                      ? 'Study Material Chat'
                      : 'StudyFlow AI Chat',
                })
                .select(`
                  id,
                  user_id,
                  material_id,
                  context_key,
                  title,
                  created_at,
                  updated_at
                `)
                .single()


            if (
              conversationInsertError
            ) {
              if (
                conversationInsertError
                  .code ===
                '23505'
              ) {
                const {
                  data:
                    duplicateConversation,

                  error:
                    duplicateQueryError,
                } =
                  await supabase
                    .from(
                      'ai_conversations',
                    )
                    .select(`
                      id,
                      user_id,
                      material_id,
                      context_key,
                      title,
                      created_at,
                      updated_at
                    `)
                    .eq(
                      'user_id',
                      user.id,
                    )
                    .eq(
                      'context_key',
                      chatContextKey,
                    )
                    .single()


                if (
                  duplicateQueryError
                ) {
                  throw duplicateQueryError
                }


                activeConversation =
                  duplicateConversation
              } else {
                throw conversationInsertError
              }
            } else {
              activeConversation =
                createdConversation
            }
          }


          if (
            !activeConversation
              ?.id
          ) {
            throw new Error(
              'StudyFlow could not create your AI conversation.',
            )
          }


          const {
            data:
              messageRows,

            error:
              messageQueryError,
          } =
            await supabase
              .from(
                'ai_messages',
              )
              .select(`
                id,
                conversation_id,
                user_id,
                role,
                content,
                ai_model,
                created_at
              `)
              .eq(
                'conversation_id',
                activeConversation.id,
              )
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
              .limit(
                100,
              )


          if (
            messageQueryError
          ) {
            throw messageQueryError
          }


          let loadedMessages =
            Array.isArray(
              messageRows,
            )
              ? [
                  ...messageRows,
                ]
                  .reverse()
                  .map(
                    (
                      row,
                    ) => ({
                      id:
                        row.id,

                      role:
                        row.role ===
                        'user'
                          ? 'user'
                          : 'ai',

                      text:
                        row.content ||
                        '',

                      createdAt:
                        row.created_at ||
                        null,
                    }),
                  )
                  .filter(
                    (
                      item,
                    ) =>
                      item.text.trim(),
                  )
              : []


          if (
            loadedMessages.length ===
            0
          ) {
            loadedMessages =
              await migrateLegacyChat({
                activeConversationId:
                  activeConversation.id,

                userId:
                  user.id,
              })
          }


          if (
            chatLoadSequenceRef
              .current !==
            loadSequence
          ) {
            return
          }


          setConversationId(
            activeConversation.id,
          )


          setMessages(
            loadedMessages.length >
              0
              ? loadedMessages
              : createDefaultChatMessages(),
          )


          setChatHistoryReady(
            true,
          )
        } catch (
          chatError
        ) {
          console.error(
            'StudyFlow AI chat history error:',
            chatError,
          )


          if (
            chatLoadSequenceRef
              .current ===
            loadSequence
          ) {
            setConversationId(
              null,
            )

            setMessages(
              createDefaultChatMessages(),
            )

            setChatHistoryReady(
              false,
            )

            setError(
              chatError?.message ||
              'Could not load your AI chat history.',
            )
          }
        } finally {
          if (
            chatLoadSequenceRef
              .current ===
            loadSequence
          ) {
            setChatHistoryLoading(
              false,
            )
          }
        }
      }


      loadChatHistory()
    },

    [
      user?.id,
      chatContextKey,
      materialId,
    ],
  )


  /* =========================================
     AUTO SCROLL
  ========================================= */

  useEffect(
    () => {
      chatEndRef
        .current
        ?.scrollIntoView({
          behavior:
            'smooth',

          block:
            'end',
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
      if (
        !materialId
      ) {
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
     PHASE 2C.6.2.4
     REFRESH SMART INSIGHTS AFTER QUIZ
  ========================================= */

  async function refreshSmartInsightsAfterQuiz(
    accessToken,
  ) {
    setSmartInsightRefreshing(
      true,
    )

    setSmartInsightUpdated(
      false,
    )


    try {
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
                  `Bearer ${accessToken}`,
              },

              body: {
                mode:
                  'analyze-progress',

                /*
                 * false = use cache when current.
                 *
                 * A newly saved quiz increases
                 * quiz_attempts count, so the
                 * previous study_insights row
                 * becomes stale automatically.
                 */
                force:
                  false,
              },
            },
          )


      if (
        functionError
      ) {
        console.warn(
          'Quiz saved, but smart insight refresh failed:',
          functionError,
        )


        if (
          functionError instanceof
          FunctionsHttpError
        ) {
          try {
            const errorBody =
              await functionError
                .context
                .json()


            console.warn(
              'SMART INSIGHT ERROR BODY:',
              errorBody,
            )
          } catch {
            // Response was not JSON.
          }
        }


        return false
      }


      if (
        data?.error
      ) {
        console.warn(
          'Quiz saved, but StudyFlow insight returned an error:',
          data.error,
        )

        return false
      }


      console.log(
        'StudyFlow smart insights updated after quiz:',
        data,
      )


      setSmartInsightUpdated(
        true,
      )


      return true
    } catch (
      requestError
    ) {
      /*
       * Insight refresh failure does not
       * affect the saved quiz result.
       */

      console.warn(
        'Smart insight refresh error:',
        requestError,
      )


      return false
    } finally {
      setSmartInsightRefreshing(
        false,
      )
    }
  }


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
       * Wait until every answer
       * is stored before saving.
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
      quiz,
      selectedMaterial,
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


      if (
        !data
      ) {
        throw new Error(
          'Study material not found or you do not have access to it.',
        )
      }


      setSelectedMaterial(
        data,
      )
    } catch (
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
    } finally {
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
    if (
      !size
    ) {
      return '0 MB'
    }


    return `${(
      size /
      1024 /
      1024
    ).toFixed(
      2,
    )} MB`
  }


  /* =========================================
     SEND CHAT MESSAGE

     Flow:
     1. Save user message to Supabase
     2. Send request to StudyFlow AI
     3. Save AI reply to Supabase
     4. Update local UI
  ========================================= */

  async function sendMessage(
    text,
  ) {
    const cleanMessage =
      text.trim()


    if (
      !cleanMessage ||
      loading ||
      chatHistoryLoading ||
      materialLoading ||
      (
        materialId &&
        !selectedMaterial
      )
    ) {
      return
    }


    if (
      !user?.id ||
      !conversationId ||
      !chatHistoryReady
    ) {
      setError(
        'Your AI chat history is still loading. Please try again.',
      )

      return
    }


    setError(
      '',
    )


    const conversationHistory =
      messages
        .filter(
          (
            item,
          ) =>
            item
              ?.text
              ?.trim(),
        )
        .slice(
          -8,
        )
        .map(
          (
            item,
          ) => ({
            role:
              item.role ===
              'ai'
                ? 'model'
                : 'user',

            text:
              item.text,
          }),
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


      if (
        sessionError
      ) {
        throw sessionError
      }


      if (
        !session ||
        session.user.id !==
          user.id
      ) {
        throw new Error(
          'Your session expired. Please sign in again.',
        )
      }


      /* =====================================
         SAVE USER MESSAGE FIRST
      ===================================== */

      const savedUserMessage =
        await saveChatMessage({
          activeConversationId:
            conversationId,

          userId:
            user.id,

          role:
            'user',

          content:
            cleanMessage,
        })


      setMessages(
        (
          current,
        ) => [
          ...current,

          {
            id:
              savedUserMessage
                ?.id ||
              `user-${Date.now()}`,

            role:
              'user',

            text:
              cleanMessage,

            createdAt:
              savedUserMessage
                ?.created_at ||
              new Date()
                .toISOString(),
          },
        ],
      )


      /* =====================================
         CALL STUDYFLOW AI
      ===================================== */

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
          } catch {
            // Response was not JSON.
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


      const aiAnswer =
        data?.answer ||
        'No response was received from StudyFlow AI.'


      /* =====================================
         SAVE AI REPLY
      ===================================== */

      const savedAiMessage =
        await saveChatMessage({
          activeConversationId:
            conversationId,

          userId:
            user.id,

          role:
            'ai',

          content:
            aiAnswer,

          aiModel:
            data?.model ||
            null,
        })


      setMessages(
        (
          current,
        ) => [
          ...current,

          {
            id:
              savedAiMessage
                ?.id ||
              `ai-${Date.now()}`,

            role:
              'ai',

            text:
              aiAnswer,

            createdAt:
              savedAiMessage
                ?.created_at ||
              new Date()
                .toISOString(),
          },
        ],
      )
    } catch (
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
    } finally {
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
                  'quiz',

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
          } catch {
            // Response was not JSON.
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
    } catch (
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
    } finally {
      setQuizLoading(
        false,
      )
    }
  }


  /* =========================================
     SELECT QUIZ ANSWER
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
     CHECK QUIZ ANSWER
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


    if (
      correct
    ) {
      setQuizScore(
        (
          current,
        ) =>
          current + 1,
      )
    }


    setQuizAnswers(
      (
        current,
      ) => [
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
     NEXT QUIZ QUESTION
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
      quiz.questions.length - 1
    ) {
      setQuizComplete(
        true,
      )

      return
    }


    setQuizIndex(
      (
        current,
      ) =>
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
     SAVE QUIZ ATTEMPT
     + AUTO REFRESH SMART INSIGHTS
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


    quizSaveRef.current =
      true


    setQuizSaving(
      true,
    )


    setQuizSaveError(
      '',
    )


    setSmartInsightUpdated(
      false,
    )


    try {
      /* =====================================
         SESSION
      ===================================== */

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


      /* =====================================
         BUILD ANSWER HISTORY
      ===================================== */

      const savedAnswers =
        quizAnswers.map(
          (
            answer,
          ) => {
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
                question?.explanation ||
                '',
            }
          },
        )


      /* =====================================
         FINAL SCORE
      ===================================== */

      const finalScore =
        savedAnswers.filter(
          (
            answer,
          ) =>
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


      /* =====================================
         SAVE QUIZ
      ===================================== */

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


      if (
        saveError
      ) {
        throw saveError
      }


      /* =====================================
         QUIZ SAVE COMPLETE
      ===================================== */

      setQuizSaved(
        true,
      )


      /*
       * Database save is already finished.
       * Stop showing "Saving result..."
       * while the separate AI analysis runs.
       */

      setQuizSaving(
        false,
      )


      /* =====================================
         AUTO UPDATE STUDY INSIGHTS
      ===================================== */

      await refreshSmartInsightsAfterQuiz(
        session.access_token,
      )
    } catch (
      saveError
    ) {
      console.error(
        'Quiz save error:',
        saveError,
      )


      quizSaveRef.current =
        false


      setQuizSaved(
        false,
      )


      setQuizSaveError(
        saveError?.message ||
        'Could not save this quiz result.',
      )
    } finally {
      setQuizSaving(
        false,
      )
    }
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


    setSmartInsightRefreshing(
      false,
    )


    setSmartInsightUpdated(
      false,
    )


    quizSaveRef.current =
      false
  }


  /* =========================================
     CLOSE QUIZ
  ========================================= */

  function closeQuiz() {
    clearQuizState()
  }


  /* =========================================
     MATERIAL ACTION
  ========================================= */

  async function handleMaterialAction(
    item,
  ) {
    if (
      !selectedMaterial
    ) {
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
     CLEAR SUPABASE CHAT
  ========================================= */

  async function clearChat() {
    if (
      loading ||
      chatHistoryLoading
    ) {
      return
    }


    setError(
      '',
    )


    if (
      !conversationId ||
      !user?.id
    ) {
      setMessages(
        createDefaultChatMessages(),
      )

      setMessage(
        '',
      )

      return
    }


    try {
      const {
        error:
          deleteError,
      } =
        await supabase
          .from(
            'ai_messages',
          )
          .delete()
          .eq(
            'conversation_id',
            conversationId,
          )
          .eq(
            'user_id',
            user.id,
          )


      if (
        deleteError
      ) {
        throw deleteError
      }


      await touchConversation(
        conversationId,
        user.id,
      )


      setMessages(
        createDefaultChatMessages(),
      )


      setMessage(
        '',
      )
    } catch (
      clearError
    ) {
      console.error(
        'Clear StudyFlow AI chat error:',
        clearError,
      )


      setError(
        clearError?.message ||
        'Could not clear your AI chat history.',
      )
    }
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


        {
          !chatHistoryLoading &&
          messages.length >
            1 && (

            <button
              type="button"
              className="ai-clear-chat-button"
              onClick={
                clearChat
              }
              disabled={
                loading ||
                quizLoading ||
                chatHistoryLoading
              }
            >
              Clear chat
            </button>

          )
        }

      </section>


      {/* =====================================
          MATERIAL
      ===================================== */}

      {
        materialLoading ? (

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
                materialQuickPrompts
                  .map(
                    (
                      item,
                    ) => (

                      <button
                        type="button"
                        key={
                          item.label
                        }
                        disabled={
                          loading ||
                          quizLoading ||
                          chatHistoryLoading
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

                        {
                          item.label
                        }

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

        )
      }


      {/* =====================================
          NORMAL QUICK PROMPTS
      ===================================== */}

      {
        !selectedMaterial && (

          <section>

            <h3 className="mobile-section-title">
              Quick prompts
            </h3>


            <div className="mobile-ai-prompts">

              {
                normalQuickPrompts
                  .map(
                    (
                      prompt,
                    ) => (

                      <button
                        type="button"
                        key={
                          prompt
                        }
                        disabled={
                          loading ||
                          chatHistoryLoading
                        }
                        onClick={() =>
                          sendMessage(
                            prompt,
                          )
                        }
                      >

                        <span>
                          ✦
                        </span>

                        {
                          prompt
                        }

                      </button>

                    ),
                  )
              }

            </div>

          </section>

        )
      }


      {/* =====================================
          QUIZ LOADING
      ===================================== */}

      {
        quizLoading && (

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

        )
      }


      {/* =====================================
          INTERACTIVE QUIZ
      ===================================== */}

      {
        quiz && (

          <section className="interactive-quiz">

            {
              !quizComplete ? (
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
                      onClick={
                        closeQuiz
                      }
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
                                  .filter(
                                    Boolean,
                                  )
                                  .join(
                                    ' ',
                                  )}
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
                                  {
                                    option
                                  }
                                </span>

                              </button>
                            )
                          },
                        )
                    }

                  </div>


                  {
                    answerChecked && (

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

                    )
                  }


                  {
                    !answerChecked ? (

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

                    )
                  }

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
                    {
                      quizScore
                    } / {
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
                      SAVE + SMART INSIGHT STATUS
                  ================================= */}

                  <div className="quiz-save-status">

                    {
                      quizSaving && (

                        <span className="quiz-save-message saving">
                          Saving result...
                        </span>

                      )
                    }


                    {
                      quizSaved && (

                        <div className="quiz-save-message saved">

                          <span>
                            ✓ Result saved to Quiz History
                          </span>


                          <Link to="/quiz-history">
                            View History
                          </Link>

                        </div>

                      )
                    }


                    {
                      smartInsightRefreshing && (

                        <span className="quiz-save-message saving">
                          Updating smart study insights...
                        </span>

                      )
                    }


                    {
                      smartInsightUpdated &&
                      !smartInsightRefreshing && (

                        <span className="quiz-save-message saved">
                          ✓ Smart recommendations updated
                        </span>

                      )
                    }


                    {
                      quizSaveError && (

                        <div className="quiz-save-message error">

                          <span>
                            {
                              quizSaveError
                            }
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

                      )
                    }

                  </div>


                  <div className="quiz-result-stats">

                    <div>

                      <span>
                        Correct
                      </span>


                      <strong>
                        {
                          quizScore
                        }
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
                        (
                          answer,
                        ) =>
                          !answer.correct,
                      ) && (

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            setReviewingMistakes(
                              (
                                current,
                              ) =>
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
                      onClick={
                        retryQuiz
                      }
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


                  {
                    reviewingMistakes && (

                      <div className="quiz-mistakes">

                        {
                          quizAnswers
                            .filter(
                              (
                                answer,
                              ) =>
                                !answer.correct,
                            )
                            .map(
                              (
                                answer,
                              ) => {
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

                    )
                  }


                  <button
                    type="button"
                    className="quiz-close-results"
                    onClick={
                      closeQuiz
                    }
                  >
                    Back to AI Study
                  </button>

                </div>

              )
            }

          </section>

        )
      }


      {/* =====================================
          PHASE 2C.10
          AI STUDY CHAT UI CLEANUP
      ===================================== */}

      {
        !quiz &&
        !quizLoading && (

          <AIChatThread
  messages={
    messages
  }
  loading={
    loading
  }
  historyLoading={
    chatHistoryLoading
  }
  endRef={
    chatEndRef
  }
  userEmail={
    user?.email
  }
  userName={
    user?.user_metadata
      ?.full_name ||
    user?.user_metadata
      ?.name ||
    ''
  }
/>

        )
      }


      {/* =====================================
          ERROR
      ===================================== */}

      {
        error && (

          <div className="notice error">
            {
              error
            }
          </div>

        )
      }


      {/* =====================================
          INPUT
      ===================================== */}

      {
        !quiz &&
        !quizLoading && (

          <form
            className="mobile-ai-input"
            onSubmit={
              handleSubmit
            }
          >

            <input
              type="text"
              value={
                message
              }
              disabled={
                loading ||
                chatHistoryLoading ||
                materialLoading ||
                (
                  materialId &&
                  !selectedMaterial
                )
              }
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
                chatHistoryLoading ||
                materialLoading ||
                !chatHistoryReady ||
                (
                  materialId &&
                  !selectedMaterial
                ) ||
                !message.trim()
              }
              aria-label="Send message"
            >
              ↑
            </button>

          </form>

        )
      }

    </div>
  )
}