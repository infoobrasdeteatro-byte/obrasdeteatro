/**
 * ID-001: reconstrucción del isotipo oficial de ObrasDeTeatro (dos paneles
 * con el borde interior cóncavo que forma la chispa en el hueco central) a
 * partir de la referencia visual proporcionada por Dirección -- no existe
 * un archivo SVG/vectorial del isotipo en este repositorio (verificado en
 * `public/`, metadatos y documentación antes de construir esto). Es una
 * aproximación fiel a las proporciones de la referencia, no un trazado
 * calcado del vectorial original -- pendiente de sustituir por el archivo
 * fuente si difiere en la auditoría visual. Sin texto del logotipo, tal
 * como se pidió explícitamente.
 */
export default function ObrasIsotype({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="currentColor" className={className} aria-hidden="true">
      <path d="M35,24 L57,24 C47,33 41,45 41,60 C41,75 47,87 57,96 L35,96 A5,5 0 0 1 30,91 L30,29 A5,5 0 0 1 35,24 Z" />
      <path d="M85,24 L63,24 C73,33 79,45 79,60 C79,75 73,87 63,96 L85,96 A5,5 0 0 0 90,91 L90,29 A5,5 0 0 0 85,24 Z" />
    </svg>
  )
}
