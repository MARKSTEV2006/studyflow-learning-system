import { useEffect, useMemo, useState } from 'react'

const presets = [15, 25, 45, 60]

export default function FocusPage() {
  const [minutes, setMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running || secondsLeft <= 0) return

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setRunning(false)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [running, secondsLeft])

  function selectPreset(value) {
    setMinutes(value)
    setSecondsLeft(value * 60)
    setRunning(false)
  }

  function reset() {
    setSecondsLeft(minutes * 60)
    setRunning(false)
  }

  const display = useMemo(() => {
    const mins = Math.floor(secondsLeft / 60)
    const secs = secondsLeft % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [secondsLeft])

  const finished = secondsLeft === 0

  return (
    <div className="focus-layout">
      <section className="focus-card">
        <p className="eyebrow">FOCUS SESSION</p>
        <h2>{finished ? 'Session complete' : 'One task. One timer.'}</h2>
        <p className="muted">
          Put your phone away, close unrelated tabs, and work on one study task.
        </p>

        <div className="timer-display">{display}</div>

        <div className="preset-row">
          {presets.map((preset) => (
            <button
              key={preset}
              className={minutes === preset ? 'preset active' : 'preset'}
              onClick={() => selectPreset(preset)}
            >
              {preset} min
            </button>
          ))}
        </div>

        <div className="timer-actions">
          <button
            className="primary-button compact"
            onClick={() => {
              if (secondsLeft === 0) reset()
              setRunning((current) => !current)
            }}
          >
            {running ? 'Pause' : secondsLeft === 0 ? 'Start again' : 'Start focus'}
          </button>
          <button className="ghost-button" onClick={reset}>
            Reset
          </button>
        </div>
      </section>

      <aside className="panel focus-notes">
        <p className="eyebrow">BEFORE YOU START</p>
        <h3>Focus checklist</h3>
        <ul className="clean-list">
          <li>Choose one task with a clear finish point.</li>
          <li>Prepare only the materials you need.</li>
          <li>Do not switch subjects during the timer.</li>
          <li>Write down distractions instead of acting on them.</li>
          <li>After the timer, recall the main ideas without notes.</li>
        </ul>
      </aside>
    </div>
  )
}
