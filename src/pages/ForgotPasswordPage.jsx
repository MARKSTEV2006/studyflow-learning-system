import {
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import {
  supabase,
  supabaseConfigured,
} from '../lib/supabase'

import '../styles/login.css'


export default function ForgotPasswordPage() {
  const [
    email,
    setEmail,
  ] =
    useState('')

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    message,
    setMessage,
  ] =
    useState('')

  const [
    busy,
    setBusy,
  ] =
    useState(false)


  async function handleResetRequest(
    event,
  ) {
    event.preventDefault()

    setError('')
    setMessage('')

    if (
      !supabaseConfigured
    ) {
      setError(
        'Supabase is not configured.',
      )

      return
    }

    const cleanEmail =
      email
        .trim()
        .toLowerCase()

    if (
      !cleanEmail
    ) {
      setError(
        'Enter your email address.',
      )

      return
    }

    setBusy(true)

    try {
      const {
        error:
          resetError,
      } =
        await supabase
          .auth
          .resetPasswordForEmail(
            cleanEmail,
            {
              redirectTo:
                `${window.location.origin}/reset-password`,
            },
          )

      if (
        resetError
      ) {
        throw resetError
      }

      setMessage(
        `Password reset link sent to ${cleanEmail}. Check your Inbox, Spam, or Promotions.`,
      )
    } catch (
      requestError
    ) {
      console.error(
        'Forgot password error:',
        requestError,
      )

      setError(
        requestError?.message ||
          'Could not send the password reset email.',
      )
    } finally {
      setBusy(false)
    }
  }


  return (
    <div className="auth-page studyflow-login">

      <section className="auth-intro">

        <div className="auth-brand">
          <div className="brand-mark large">
            S
          </div>

          <span>
            StudyFlow
          </span>
        </div>

        <div className="auth-copy">

          <p className="eyebrow">
            ACCOUNT RECOVERY
          </p>

          <h1>
            Get back
            <br />
            to studying.
          </h1>

          <p>
            Request a secure password reset link
            using the email connected to your
            StudyFlow account.
          </p>

        </div>

        <div className="auth-feature-row">
          <span>
            Secure
          </span>

          <span>
            Simple
          </span>

          <span>
            Private
          </span>
        </div>

      </section>


      <section className="auth-panel">

        <form
          className="auth-card"
          onSubmit={
            handleResetRequest
          }
        >

          <div className="mobile-auth-brand">

            <div className="mobile-auth-logo">
              S
            </div>

            <div>
              <strong>
                StudyFlow
              </strong>

              <span>
                Account Recovery
              </span>
            </div>

          </div>


          <div className="auth-card-heading">

            <p className="eyebrow">
              PASSWORD RESET
            </p>

            <h2>
              Forgot your password?
            </h2>

            <p>
              Enter your StudyFlow email and
              we'll send you a password reset link.
            </p>

          </div>


          <label className="field">

            <span>
              Email
            </span>

            <input
              type="email"
              placeholder="student@example.com"
              value={
                email
              }
              onChange={(
                event,
              ) =>
                setEmail(
                  event.target.value,
                )
              }
              required
              autoComplete="email"
            />

          </label>


          {
            error && (
              <div className="notice error">
                {error}
              </div>
            )
          }


          {
            message && (
              <div className="notice success">
                {message}
              </div>
            )
          }


          <button
            type="submit"
            className="primary-button auth-primary-button"
            disabled={
              busy
            }
          >

            {
              busy
                ? 'Sending reset link...'
                : 'Send reset link'
            }

          </button>


          <div className="auth-switch">

            <span>
              Remember your password?
            </span>

            <Link
              to="/login"
              className="auth-inline-link"
            >
              Back to sign in
            </Link>

          </div>

        </form>

      </section>

    </div>
  )
}