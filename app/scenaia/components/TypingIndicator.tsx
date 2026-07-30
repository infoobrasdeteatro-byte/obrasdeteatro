import ObrasIsotype from './ObrasIsotype'

/** UX-001B: estado conversacional "escribiendo" -- solo visual, sin texto técnico. */
export default function TypingIndicator() {
  return (
    <div className="scenaia-msg scenaia-msg--assistant" aria-live="polite" aria-label="ScenaIA está escribiendo">
      <div className="scenaia-avatar">
        <ObrasIsotype />
      </div>
      <div className="scenaia-typing">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
