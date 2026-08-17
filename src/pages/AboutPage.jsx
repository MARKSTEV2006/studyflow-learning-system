export default function AboutPage() {
  return (
    <div className="page-stack">
      <section className="intro-panel">
        <p className="eyebrow">SYSTEM DEFINITION</p>
        <h2>What is StudyFlow?</h2>
        <p>
          <strong>StudyFlow is a web-based personal learning system</strong> that helps
          students organize study tasks, manage focused study sessions, monitor task
          completion, and follow a simple study process in one interface.
        </p>
      </section>

      <section className="about-grid">
        <article className="panel">
          <p className="eyebrow">PURPOSE</p>
          <h3>What the system is for</h3>
          <p>
            The system gives you a clear place to decide what to study, when to study it,
            how long to spend on it, and what to do during a study session.
          </p>
        </article>

        <article className="panel">
          <p className="eyebrow">TARGET USER</p>
          <h3>Who can use it</h3>
          <p>
            It is designed for students who want a simple study planner and focus tool
            without a crowded interface.
          </p>
        </article>

        <article className="panel">
          <p className="eyebrow">CORE FUNCTIONS</p>
          <h3>What it currently does</h3>
          <ul className="clean-list">
            <li>Creates student accounts and signs users in.</li>
            <li>Keeps each user inside a protected dashboard.</li>
            <li>Stores personal study tasks.</li>
            <li>Tracks task completion.</li>
            <li>Provides a focus timer.</li>
            <li>Provides a reusable study guide.</li>
          </ul>
        </article>

        <article className="panel">
          <p className="eyebrow">SCOPE</p>
          <h3>What this starter version does not do yet</h3>
          <ul className="clean-list">
            <li>No school grading or enrollment module.</li>
            <li>No teacher administration module.</li>
            <li>No built-in quiz generator yet.</li>
            <li>No flashcards or file storage yet.</li>
            <li>No AI tutor yet.</li>
          </ul>
        </article>
      </section>

      <section className="panel">
        <p className="eyebrow">WORKFLOW</p>
        <h3>Basic system flow</h3>
        <div className="workflow">
          <span>Login</span>
          <b>→</b>
          <span>Plan Task</span>
          <b>→</b>
          <span>Focus</span>
          <b>→</b>
          <span>Practice</span>
          <b>→</b>
          <span>Mark Complete</span>
          <b>→</b>
          <span>Review</span>
        </div>
      </section>
    </div>
  )
}
