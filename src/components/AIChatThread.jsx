import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'


function parseMessageDate(value) {
  if (!value) {
    return null
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null
  }

  return date
}


function getDayKey(value) {
  const date =
    parseMessageDate(value)

  if (!date) {
    return 'unknown'
  }

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    ),
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    ),
  ].join('-')
}


function isSameCalendarDay(
  first,
  second,
) {
  return (
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  )
}


function formatDayLabel(value) {
  const date =
    parseMessageDate(value)

  if (!date) {
    return ''
  }

  const today =
    new Date()

  const yesterday =
    new Date()

  yesterday.setDate(
    today.getDate() - 1,
  )

  if (
    isSameCalendarDay(
      date,
      today,
    )
  ) {
    return 'Today'
  }

  if (
    isSameCalendarDay(
      date,
      yesterday,
    )
  ) {
    return 'Yesterday'
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      month:
        'short',

      day:
        'numeric',

      year:
        date.getFullYear() !==
        today.getFullYear()
          ? 'numeric'
          : undefined,
    },
  ).format(
    date,
  )
}


function formatTime(value) {
  const date =
    parseMessageDate(value)

  if (!date) {
    return ''
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      hour:
        'numeric',

      minute:
        '2-digit',
    },
  ).format(
    date,
  )
}


function MessageBody({
  message,
}) {
  if (
    message.role ===
    'ai'
  ) {
    return (
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
          {message.text}
        </ReactMarkdown>
      </div>
    )
  }

  return (
    <p className="ai-user-text">
      {message.text}
    </p>
  )
}


function ChatMessage({
  message,
}) {
  const isUser =
    message.role ===
    'user'

  const timeLabel =
    formatTime(
      message.createdAt,
    )

  const bubble = (
    <div
      className={
        isUser
          ? 'sf-ai-bubble user'
          : 'sf-ai-bubble ai'
      }
    >
      <div className="sf-ai-message-meta">
        <strong>
          {isUser
            ? 'You'
            : 'StudyFlow AI'}
        </strong>

        {timeLabel && (
          <span>
            {timeLabel}
          </span>
        )}
      </div>

      <MessageBody
        message={message}
      />
    </div>
  )

  const avatar = (
    <div
      className={
        isUser
          ? 'sf-ai-avatar user'
          : 'sf-ai-avatar ai'
      }
      aria-hidden="true"
    >
      {isUser
        ? 'Y'
        : '✦'}
    </div>
  )

  return (
    <article
      className={
        isUser
          ? 'sf-ai-message-row user'
          : 'sf-ai-message-row ai'
      }
    >
      {isUser ? (
        <>
          {bubble}
          {avatar}
        </>
      ) : (
        <>
          {avatar}
          {bubble}
        </>
      )}
    </article>
  )
}


function HistoryLoading() {
  return (
    <div className="sf-ai-history-loading">
      <div className="sf-ai-history-loading-avatar">
        ✦
      </div>

      <div>
        <strong>
          Loading conversation
        </strong>

        <div className="sf-ai-history-loading-lines">
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}


function ThinkingMessage() {
  return (
    <article className="sf-ai-message-row ai">
      <div
        className="sf-ai-avatar ai"
        aria-hidden="true"
      >
        ✦
      </div>

      <div className="sf-ai-bubble ai thinking">
        <div className="sf-ai-message-meta">
          <strong>
            StudyFlow AI
          </strong>

          <span>
            Thinking
          </span>
        </div>

        <div className="ai-thinking">
          <span />
          <span />
          <span />
        </div>
      </div>
    </article>
  )
}


export default function AIChatThread({
  messages = [],
  loading = false,
  historyLoading = false,
  endRef,
}) {
  if (
    historyLoading
  ) {
    return (
      <section
        className="sf-ai-chat-thread"
        aria-live="polite"
      >
        <HistoryLoading />

        <div
          ref={endRef}
        />
      </section>
    )
  }

  let previousDayKey =
    null

  return (
    <section
      className="sf-ai-chat-thread"
      aria-live="polite"
    >
      {messages.map(
        (
          chatMessage,
          index,
        ) => {
          const dayKey =
            getDayKey(
              chatMessage.createdAt,
            )

          const showDate =
            dayKey !==
            previousDayKey

          previousDayKey =
            dayKey

          return (
            <div
              className="sf-ai-message-group"
              key={
                chatMessage.id ||
                `${chatMessage.role}-${index}`
              }
            >
              {showDate &&
                chatMessage.createdAt && (
                  <div className="sf-ai-date-separator">
                    <span>
                      {formatDayLabel(
                        chatMessage.createdAt,
                      )}
                    </span>
                  </div>
                )}

              <ChatMessage
                message={
                  chatMessage
                }
              />
            </div>
          )
        },
      )}

      {loading && (
        <ThinkingMessage />
      )}

      <div
        className="sf-ai-chat-end"
        ref={endRef}
      />
    </section>
  )
}
