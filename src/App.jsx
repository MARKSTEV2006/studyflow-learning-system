import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import { useAuth } from './context/AuthContext'

import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MySubjectsPage from './pages/MySubjectsPage'
import StudyMaterialsPage from './pages/StudyMaterialsPage'
import AIStudyPage from './pages/AIStudyPage'
import QuizHistoryPage from './pages/src/pages/QuizHistoryPage'
import PlannerPage from './pages/PlannerPage'
import FocusPage from './pages/FocusPage'
import StudyGuidePage from './pages/StudyGuidePage'
import AboutPage from './pages/AboutPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  const {
    session,
    loading,
  } = useAuth()

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

      <Route element={<ProtectedRoute />}>

        <Route element={<AppLayout />}>

          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />

          <Route
            path="/subjects"
            element={<MySubjectsPage />}
          />

          <Route
            path="/materials"
            element={<StudyMaterialsPage />}
          />

          <Route
            path="/ai-study"
            element={<AIStudyPage />}
          />

          <Route
            path="/quiz-history"
            element={<QuizHistoryPage />}
          />

          <Route
            path="/planner"
            element={<PlannerPage />}
          />

          <Route
            path="/focus"
            element={<FocusPage />}
          />

          <Route
            path="/study-guide"
            element={<StudyGuidePage />}
          />

          <Route
            path="/about"
            element={<AboutPage />}
          />

        </Route>

      </Route>

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

      <Route
        path="*"
        element={<NotFoundPage />}
      />

    </Routes>
  )
}