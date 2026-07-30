import ObrasIsotype from './ObrasIsotype'

/**
 * UX-001B: estado "conversación nueva / bienvenida" -- se muestra mientras
 * el hilo está vacío. ID-001: la insignia es un contenedor circular neutro
 * con el isotipo oficial de ObrasDeTeatro dentro -- ver .scenaia-welcome-badge.
 */
export default function ChatWelcome() {
  return (
    <div className="scenaia-welcome">
      <div className="scenaia-welcome-badge">
        <ObrasIsotype />
      </div>
      <p className="scenaia-welcome-title">Habla con ScenaIA</p>
      <p className="scenaia-welcome-text">
        Pregunta por obras, autores o compañías del ecosistema. ScenaIA recuerda esta conversación mientras la
        ventana permanezca abierta.
      </p>
    </div>
  )
}
