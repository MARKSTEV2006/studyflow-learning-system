import { Link } from 'react-router-dom'
import {
  useEffect,
  useState,
} from 'react'

import {
  supabase,
  supabaseConfigured,
} from '../lib/supabase'

import '../styles/login.css'


export default function LoginPage() {
  const [
    mode,
    setMode,
  ] =
    useState(
      'login',
    )


  const [
    email,
    setEmail,
  ] =
    useState(
      '',
    )


  const [
    password,
    setPassword,
  ] =
    useState(
      '',
    )


  const [
    message,
    setMessage,
  ] =
    useState(
      '',
    )


  const [
    error,
    setError,
  ] =
    useState(
      '',
    )


  const [
    busy,
    setBusy,
  ] =
    useState(
      false,
    )


  const [
    resendCooldown,
    setResendCooldown,
  ] =
    useState(
      0,
    )


  /* =========================================
     RESEND COUNTDOWN
  ========================================= */

  useEffect(
    () => {
      if (
        resendCooldown <= 0
      ) {
        return undefined
      }


      const timer =
        window.setInterval(
          () => {
            setResendCooldown(
              (current) => {
                if (
                  current <= 1
                ) {
                  window.clearInterval(
                    timer,
                  )

                  return 0
                }


                return (
                  current - 1
                )
              },
            )
          },

          1000,
        )


      return () => {
        window.clearInterval(
          timer,
        )
      }
    },

    [
      resendCooldown,
    ],
  )


  /* =========================================
     SUBMIT
  ========================================= */

  async function handleSubmit(
    event,
  ) {
    event.preventDefault()


    setMessage(
      '',
    )


    setError(
      '',
    )


    if (
      !supabaseConfigured
    ) {
      setError(
        'Supabase is not configured. Add your values to .env.local first.',
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


    if (
      password.length <
      6
    ) {
      setError(
        'Use a password with at least 6 characters.',
      )

      return
    }


    setBusy(
      true,
    )


    try {
      /* =====================================
         CREATE ACCOUNT
      ===================================== */

      if (
        mode ===
        'register'
      ) {
        const {
          data,

          error:
            signUpError,
        } =
          await supabase
            .auth
            .signUp({
              email:
                cleanEmail,

              password,

              options: {
                emailRedirectTo:
                  `${window.location.origin}/login`,
              },
            })


        if (
          signUpError
        ) {
          throw signUpError
        }


        if (
          !data?.session
        ) {
          setMessage(
            `Account created. We sent a confirmation link to ${cleanEmail}.`,
          )


          setMode(
            'login',
          )


          setResendCooldown(
            60,
          )


          return
        }


        setMessage(
          'Account created successfully.',
        )
      }


      /* =====================================
         SIGN IN
      ===================================== */

      else {
        const {
          error:
            signInError,
        } =
          await supabase
            .auth
            .signInWithPassword({
              email:
                cleanEmail,

              password,
            })


        if (
          signInError
        ) {
          const signInMessage =
            signInError
              ?.message
              ?.toLowerCase() ||
            ''


          if (
            signInMessage
              .includes(
                'email not confirmed',
              )
          ) {
            throw new Error(
              'Your email is not confirmed yet. Open the confirmation email or request a new link below.',
            )
          }


          throw signInError
        }
      }
    }


    catch (
      requestError
    ) {
      console.error(
        'StudyFlow authentication error:',
        requestError,
      )


      setError(
        requestError?.message ||
        'Something went wrong.',
      )
    }


    finally {
      setBusy(
        false,
      )
    }
  }


  /* =========================================
     RESEND CONFIRMATION
  ========================================= */

  async function resendConfirmation() {
    const cleanEmail =
      email
        .trim()
        .toLowerCase()


    setMessage(
      '',
    )


    setError(
      '',
    )


    if (
      !supabaseConfigured
    ) {
      setError(
        'Supabase is not configured.',
      )

      return
    }


    if (
      !cleanEmail
    ) {
      setError(
        'Enter your email address first.',
      )

      return
    }


    if (
      resendCooldown > 0
    ) {
      return
    }


    setBusy(
      true,
    )


    try {
      const {
        error:
          resendError,
      } =
        await supabase
          .auth
          .resend({
            type:
              'signup',

            email:
              cleanEmail,

            options: {
              emailRedirectTo:
                `${window.location.origin}/login`,
            },
          })


      if (
        resendError
      ) {
        throw resendError
      }


      setMessage(
        `A new confirmation link was sent to ${cleanEmail}. Check Inbox, Spam, or Promotions.`,
      )


      setResendCooldown(
        60,
      )
    }


    catch (
      requestError
    ) {
      console.error(
        'Resend confirmation error:',
        requestError,
      )


      const requestMessage =
        requestError
          ?.message
          ?.toLowerCase() ||
        ''


      if (
        requestMessage.includes(
          'rate limit',
        ) ||
        requestMessage.includes(
          'security purposes',
        )
      ) {
        setError(
          'Please wait before requesting another confirmation email.',
        )

        setResendCooldown(
          60,
        )

        return
      }


      setError(
        requestError?.message ||
        'Could not resend the confirmation email.',
      )
    }


    finally {
      setBusy(
        false,
      )
    }
  }


  /* =========================================
     SWITCH MODE
  ========================================= */

  function switchMode() {
    setMode(
      (
        current,
      ) =>
        current ===
        'login'
          ? 'register'
          : 'login',
    )


    setError(
      '',
    )


    setMessage(
      '',
    )
  }


  /* =========================================
     UI
  ========================================= */

  return (
    <div className="auth-page studyflow-login">

      {/* =====================================
          DESKTOP LEFT PANEL
      ===================================== */}

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
            PERSONAL LEARNING SYSTEM
          </p>


          <h1>
            Study with a
            <br />
            clear plan.
          </h1>


          <p>
            Keep your study tasks,
            focus sessions, and learning
            method in one clean workspace.
          </p>

        </div>


        <div className="auth-feature-row">

          <span>
            Plan
          </span>

          <span>
            Focus
          </span>

          <span>
            Review
          </span>

        </div>

      </section>


      {/* =====================================
          LOGIN PANEL
      ===================================== */}

      <section className="auth-panel">

        <form
          className="auth-card"
          onSubmit={
            handleSubmit
          }
        >

          {/* MOBILE BRAND */}

          <div className="mobile-auth-brand">

            <div className="mobile-auth-logo">
              S
            </div>

            <div>
              <strong>
                StudyFlow
              </strong>

              <span>
                Learning System
              </span>
            </div>

          </div>


          {/* =================================
              HEADING
          ================================= */}

          <div className="auth-card-heading">

            <p className="eyebrow">

              {
                mode ===
                'login'
                  ? 'WELCOME BACK'
                  : 'GET STARTED'
              }

            </p>


            <h2>

              {
                mode ===
                'login'
                  ? 'Sign in to StudyFlow'
                  : 'Create your account'
              }

            </h2>


            <p>

              {
                mode ===
                'login'
                  ? 'Continue your study plan.'
                  : 'Create your StudyFlow account and start organizing your learning.'
              }

            </p>

          </div>


          {/* =================================
              SUPABASE WARNING
          ================================= */}

          {
            !supabaseConfigured && (

              <div className="notice warning">

                Add your Supabase URL
                and publishable key to{' '}

                <code>
                  .env.local
                </code>.

              </div>

            )
          }


          {/* =================================
              EMAIL
          ================================= */}

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


          {/* =================================
              PASSWORD
          ================================= */}

          <label className="field">

            <span>
              Password
            </span>


            <input
              type="password"

              placeholder="At least 6 characters"

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
                6
              }

              autoComplete={
                mode ===
                'login'
                  ? 'current-password'
                  : 'new-password'
              }
            />

          </label>
          <div className="auth-link-row">
  <Link to="/forgot-password" className="forgot-password-link">
    Forgot password?
  </Link>
</div>
         


          {/* =================================
              ERROR
          ================================= */}

          {
            error && (

              <div className="notice error">
                {
                  error
                }
              </div>

            )
          }


          {/* =================================
              SUCCESS
          ================================= */}

          {
            message && (

              <div className="notice success">
                {
                  message
                }
              </div>

            )
          }


          {/* =================================
              PRIMARY ACTION
          ================================= */}

          <button
            className="primary-button auth-primary-button"

            type="submit"

            disabled={
              busy
            }
          >

            {
              busy
                ? (
                  <>
                    <span className="button-spinner" />

                    Please wait...
                  </>
                )

                : mode ===
                  'login'
                  ? 'Sign in'
                  : 'Create account'
            }

          </button>


          {/* =================================
              CONFIRMATION HELP
          ================================= */}

          {
            mode ===
            'login' && (

              <div className="confirmation-help">

                <div className="confirmation-help-icon">
                  ✉
                </div>


                <div className="confirmation-help-copy">

                  <strong>
                    Didn't receive the confirmation email?
                  </strong>

                  <span>
                    Enter your email above and request another link.
                  </span>

                </div>


                <button
                  type="button"

                  className="resend-confirmation-button"

                  disabled={
                    busy ||
                    !email.trim() ||
                    resendCooldown > 0
                  }

                  onClick={
                    resendConfirmation
                  }
                >

                  <span
                    className="resend-icon"
                    aria-hidden="true"
                  >
                    ↻
                  </span>


                  <span>
                    {
                      resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : 'Resend'
                    }
                  </span>

                </button>

              </div>

            )
          }


          {/* =================================
              MODE SWITCH
          ================================= */}

          <div className="auth-switch">

            <span>

              {
                mode ===
                'login'
                  ? "Don't have an account?"
                  : 'Already have an account?'
              }

            </span>


            <button
              type="button"

              className="text-button"

              onClick={
                switchMode
              }
            >

              {
                mode ===
                'login'
                  ? 'Create account'
                  : 'Sign in'
              }

            </button>

          </div>

        </form>

      </section>

    </div>
  )
}