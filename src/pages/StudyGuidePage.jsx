const steps = [
  {
    number: '01',
    title: 'Choose a target',
    text: 'Do not start with “study Math.” Use a small target such as “solve 10 probability questions” or “explain recursion without notes.”',
  },
  {
    number: '02',
    title: 'Study in a focused block',
    text: 'Work on one target for 25 to 45 minutes. Keep unrelated tabs, messages, and other tasks out of the session.',
  },
  {
    number: '03',
    title: 'Recall from memory',
    text: 'Close your material and write or say what you remember. This shows what you can actually retrieve without prompts.',
  },
  {
    number: '04',
    title: 'Practice',
    text: 'Answer questions, solve problems, write code, or explain the topic. Reading alone can feel productive even when recall is weak.',
  },
  {
    number: '05',
    title: 'Check mistakes',
    text: 'Compare your answers with your source. Record the parts you missed and turn them into the next study task.',
  },
  {
    number: '06',
    title: 'Review later',
    text: 'Return to the topic after a gap instead of repeating it immediately. Short spaced reviews help you test what stayed in memory.',
  },
]

export default function StudyGuidePage() {
  return (
    <div className="page-stack">
      <section className="intro-panel">
        <p className="eyebrow">STUDY GUIDE</p>
        <h2>Use a repeatable study cycle.</h2>
        <p>
          StudyFlow is built around planning, focused work, active recall, practice,
          correction, and later review.
        </p>
      </section>

      <section className="guide-grid">
        {steps.map((step) => (
          <article className="guide-step" key={step.number}>
            <span>{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">EXAMPLE</p>
            <h3>Programming study session</h3>
          </div>
        </div>

        <div className="example-flow">
          <div>
            <strong>Target</strong>
            <p>Explain JavaScript arrays and complete five array exercises.</p>
          </div>
          <div>
            <strong>Focus</strong>
            <p>Study examples and write your own code for 25 minutes.</p>
          </div>
          <div>
            <strong>Recall</strong>
            <p>Without notes, write what map, filter, and reduce do.</p>
          </div>
          <div>
            <strong>Check</strong>
            <p>Run your code, correct errors, and list the concepts you still miss.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
