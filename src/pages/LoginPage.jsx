import { useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!supabaseConfigured) {
      setError('Supabase is not configured. Add your values to .env.local first.')
      return
    }

    if (password.length < 6) {
      setError('Use a password with at least 6 characters.')
      return
    }

    setBusy(true)

    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) throw signUpError

        if (!data.session) {
          setMessage('Account created. Check your email to confirm your account, then sign in.')
          setMode('login')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError
      }
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-intro">
        <div className="auth-brand">
          <div className="brand-mark large">S</div>
          <span>StudyFlow</span>
        </div>

        <div className="auth-copy">
          <p className="eyebrow">PERSONAL LEARNING SYSTEM</p>
          <h1>Study with a clear plan.</h1>
          <p>
            Keep your study tasks, focus sessions, and learning method in one clean workspace.
          </p>
        </div>

        <div className="auth-feature-row">
          <span>Plan</span>
          <span>Focus</span>
          <span>Review</span>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-card-heading">
            <p className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</p>
            <h2>{mode === 'login' ? 'Sign in to StudyFlow' : 'Create your account'}</h2>
            <p>
              {mode === 'login'
                ? 'Continue your study plan.'
                : 'Create one student account to save your study tasks.'}
            </p>
          </div>

          {!supabaseConfigured && (
            <div className="notice warning">
              Add your Supabase URL and publishable key to <code>.env.local</code>.
            </div>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="student@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <div className="notice error">{error}</div>}
          {message && <div className="notice success">{message}</div>}

          <button className="primary-button" type="submit" disabled={busy}>
            {busy
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>

          <button
            type="button"
            className="text-button"
            onClick={() => {
              setMode((current) => (current === 'login' ? 'register' : 'login'))
              setError('')
              setMessage('')
            }}
          >
            {mode === 'login'
              ? 'No account yet? Create one'
              : 'Already have an account? Sign in'}
          </button>
        </form>
      </section>
    </div>
  )
}
