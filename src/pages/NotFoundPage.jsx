import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <div className="brand-mark large">S</div>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <Link className="primary-button compact" to="/dashboard">
        Back to StudyFlow
      </Link>
    </div>
  )
}
