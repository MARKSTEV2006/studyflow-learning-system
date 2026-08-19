import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  supabase,
  supabaseConfigured,
} from '../lib/supabase'

import '../styles/login.css'


export default function ResetPasswordPage() {
  const navigate =
    useNavigate()

  const [
    password,
    setPassword,
  ] =
    useState('')

  const [
    confirmPassword,
    setConfirmPassword,
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

  const [
    recoveryReady,
    setRecoveryReady,
  ] =
    useState(false)

  const [
    checkingSession,
    setCheckingSession,
  ] =
    useState(true)


  useEffect(
    () => {
      let mounted =
        true

      const {
        data: {
          subscription,
        },
      } =
        supabase
          .auth
          .onAuthStateChange(
            (
              event,
              session,
            ) => {
              if (
                !mounted
              ) {
                return
              }

              if (
                event ===
                'PASSWORD_RECOVERY'
              ) {
                setRecoveryReady(
                  true,
                )

                setCheckingSession(
                  false,
                )
              }

              if (
                session
              ) {
                setRecoveryReady(
                  true,
                )

                setCheckingSession(
                  false,
                )
              }
            },
          )


      async function checkSession() {
        const {
          data: {
            session,
          },
        } =
          await supabase
            .auth
            .getSession()

        if (
          !mounted
        ) {
          return
        }

        if (
          session
        ) {
          setRecoveryReady(
            true,
          )
        }

        setCheckingSession(
          false,
        )
      }


      checkSession()


      return () => {
        mounted =
          false

        subscription
          .unsubscribe()
      }
    },

    [],
  )


  async function handleUpdatePassword(
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


    if (
      !recoveryReady
    ) {
      setError(
        'This password reset link is invalid or expired. Request a new reset link.',
      )

      return
    }


    if (
      password.length <
      8
    ) {
      setError(
        'Use a password with at least 8 characters.',
      )

      return
    }


    if (
      password !==
      confirmPassword
    ) {
      setError(
        'Passwords do not match.',
      )

      return
    }


    setBusy(true)


    try {
      const {
        error:
          updateError,
      } =
        await supabase
          .auth
          .updateUser({
            password,
          })


      if (
        updateError
      ) {
        throw updateError
      }


      setMessage(
        'Password updated successfully. You can now sign in using your new password.',
      )


      setPassword('')
      setConfirmPassword('')


      window.setTimeout(
        async () => {
          await supabase
            .auth
            .signOut()

          navigate(
            '/login',
            {
              replace:
                true,
            },
          )
        },

        1800,
      )
    } catch (
      requestError
    ) {
      console.error(
        'Password update error:',
        requestError,
      )


      setError(
        requestError?.message ||
          'Could not update your password.',
      )
    } finally {
      setBusy(false)
    }
  }


  if (
    checkingSession
  ) {
    return (
      <div className="password-recovery-loading">

        <div className="brand-mark large">
          S
        </div>

        <strong>
          Checking reset link...
        </strong>

      </div>
    )
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
            SECURE ACCOUNT
          </p>

          <h1>
            Create a
            <br />
            new password.
          </h1>

          <p>
            Choose a new password for your
            StudyFlow account.
          </p>

        </div>


        <div className="auth-feature-row">
          <span>
            Reset
          </span>

          <span>
            Protect
          </span>

          <span>
            Continue
          </span>
        </div>

      </section>


      <section className="auth-panel">

        <form
          className="auth-card"
          onSubmit={
            handleUpdatePassword
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
                Secure Password Reset
              </span>

            </div>

          </div>


          <div className="auth-card-heading">

            <p className="eyebrow">
              NEW PASSWORD
            </p>

            <h2>
              Reset your password
            </h2>

            <p>
              Enter a new password for your
              StudyFlow account.
            </p>

          </div>


          {
            !recoveryReady && (
              <div className="notice error">

                This reset link is invalid or
                expired.

                <div className="recovery-link-row">

                  <Link
                    to="/forgot-password"
                    className="auth-inline-link"
                  >
                    Request another link
                  </Link>

                </div>

              </div>
            )
          }


          {
            recoveryReady && (
              <>

                <label className="field">

                  <span>
                    New password
                  </span>

                  <input
                    type="password"
                    placeholder="At least 8 characters"
                    value={
                      password
                    }
                    onChange={(
                      event,
                    ) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    required
                    minLength={
                      8
                    }
                    autoComplete="new-password"
                  />

                </label>


                <label className="field">

                  <span>
                    Confirm new password
                  </span>

                  <input
                    type="password"
                    placeholder="Enter password again"
                    value={
                      confirmPassword
                    }
                    onChange={(
                      event,
                    ) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    required
                    minLength={
                      8
                    }
                    autoComplete="new-password"
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
                      ? 'Updating password...'
                      : 'Update password'
                  }

                </button>

              </>
            )
          }


          <div className="auth-switch">

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