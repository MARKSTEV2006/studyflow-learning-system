import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import { useAuth } from './context/AuthContext'

import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'

import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

import DashboardPage from './pages/DashboardPage'
import MySubjectsPage from './pages/MySubjectsPage'
import StudyMaterialsPage from './pages/StudyMaterialsPage'
import AIStudyPage from './pages/AIStudyPage'
import QuizHistoryPage from './pages/QuizHistoryPage'
import PlannerPage from './pages/PlannerPage'
import FocusPage from './pages/FocusPage'
import StudyGuidePage from './pages/StudyGuidePage'
import AboutPage from './pages/AboutPage'
import NotFoundPage from './pages/NotFoundPage'


export default function App() {
  const {
    session,
    loading,
  } =
    useAuth()


  /* =========================================
     APP LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="page-loader">

        <div className="loader-mark">
          S
        </div>

        <p>
          Loading StudyFlow...
        </p>

      </div>
    )
  }


  return (
    <Routes>

      {/* =====================================
          PUBLIC AUTH ROUTES
      ===================================== */}

      <Route
        path="/login"
        element={
          session ? (
            <Navigate
              to="/dashboard"
              replace
            />
          ) : (
            <LoginPage />
          )
        }
      />


      {/* =====================================
          FORGOT PASSWORD
      ===================================== */}

      <Route
        path="/forgot-password"
        element={
          <ForgotPasswordPage />
        }
      />


      {/* =====================================
          RESET PASSWORD
          
          Important:
          Huwag ilagay sa ProtectedRoute.
          
          Kapag click ng user ang recovery
          link galing email, kailangan niyang
          ma-open itong page directly.
      ===================================== */}

      <Route
        path="/reset-password"
        element={
          <ResetPasswordPage />
        }
      />


      {/* =====================================
          PROTECTED APPLICATION
      ===================================== */}

      <Route
        element={
          <ProtectedRoute />
        }
      >

        <Route
          element={
            <AppLayout />
          }
        >

          {/* DASHBOARD */}

          <Route
            path="/dashboard"
            element={
              <DashboardPage />
            }
          />


          {/* SUBJECTS */}

          <Route
            path="/subjects"
            element={
              <MySubjectsPage />
            }
          />


          {/* MATERIALS */}

          <Route
            path="/materials"
            element={
              <StudyMaterialsPage />
            }
          />


          {/* AI STUDY */}

          <Route
            path="/ai-study"
            element={
              <AIStudyPage />
            }
          />


          {/* QUIZ HISTORY */}

          <Route
            path="/quiz-history"
            element={
              <QuizHistoryPage />
            }
          />


          {/* PLANNER */}

          <Route
            path="/planner"
            element={
              <PlannerPage />
            }
          />


          {/* FOCUS */}

          <Route
            path="/focus"
            element={
              <FocusPage />
            }
          />


          {/* STUDY GUIDE */}

          <Route
            path="/study-guide"
            element={
              <StudyGuidePage />
            }
          />


          {/* ABOUT */}

          <Route
            path="/about"
            element={
              <AboutPage />
            }
          />

        </Route>

      </Route>


      {/* =====================================
          ROOT REDIRECT
      ===================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to={
              session
                ? '/dashboard'
                : '/login'
            }
            replace
          />
        }
      />


      {/* =====================================
          404
      ===================================== */}

      <Route
        path="*"
        element={
          <NotFoundPage />
        }
      />

    </Routes>
  )
}