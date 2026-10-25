import TopNav from '@/components/design-system/TopNav'
import Link from 'next/link'
import EcosistemaPulso from '@/components/homepage/EcosistemaPulso'
import { obtenerDatosPortada } from '@/lib/portada/datos'
import { colaboradoresActivos } from '@/lib/colaboradores/datos'
import FranjaColaboradores from '@/components/colaboradores/FranjaColaboradores'
import SeccionesPlataforma from '@/components/homepage/SeccionesPlataforma'
import CintaLogo from '@/components/homepage/CintaLogo'
import FranjaEnCartel from '@/components/cartelera/FranjaEnCartel'
import { enCartelPortada } from '@/lib/cartelera/portada'

// Las cifras y listas de la portada son reales: se vuelven a leer cada 10 minutos.
export const revalidate = 600

export default async function Home() {
  const ahora = Date.now()
  const [datos, colaboradores, cartel] = await Promise.all([obtenerDatosPortada(), colaboradoresActivos(), enCartelPortada(ahora)])
  // La franja se titula «Medios colaboradores»: solo los de tipo medio.
  const medios = colaboradores.filter(c => c.tipo === 'medio')
  // Total de espacios escénicos de los 20 países, de la misma rpc del mapa.
  const totalEspacios = datos.actividadPaises
    ? datos.actividadPaises.reduce((suma, p) => suma + p.espacios, 0)
    : null
  return (
    <>
      <TopNav heroMode />

      {/* ── HERO ── */}
      <section className="hero" aria-label="Presentación de obrasdeteatro.com">
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-line-left" aria-hidden="true" />

        <div className="hero-content">
          <div className="hero-eyebrow">
            <div className="hero-eyebrow-dot" />
            <span className="hero-eyebrow-text">Plataforma activa · Comunidad hispanohablante</span>
          </div>

          <h1 className="hero-headline">
            El ecosistema digital<br />
            del teatro en <em>español.</em>
          </h1>

          <p className="hero-sub">
            Obras, dramaturgos, artistas, directores, compañías, salas, festivales, castings y convocatorias,
            todos conectados en una sola plataforma para los 20 países de habla hispana.
          </p>

          {/* Primero «Crear cuenta gratis»: es el botón que se queda grabado. */}
          <div className="hero-ctas">
            <Link href="/auth/registro" className="btn-hero-primary">
              Crear cuenta gratis
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <Link href="/directorio" className="btn-hero-secondary">
              Explorar profesionales
            </Link>
          </div>

        </div>

        <div className="hero-scroll" aria-hidden="true">
          <span className="hero-scroll-text">Explorar</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* ── MEDIOS COLABORADORES (solo si hay alguno activo) ── */}
      <FranjaColaboradores colaboradores={medios} />

      {/* ── LAS OCHO SECCIONES DE LA PLATAFORMA ── */}
      <SeccionesPlataforma totalEspacios={totalEspacios} totalObras={datos.obras} />

      {/* ── EL PULSO DEL ECOSISTEMA (vista previa visual) ── */}
      <EcosistemaPulso datos={datos} />

      {/* ── CINTA CON EL LOGO EN MOVIMIENTO ── */}
      <CintaLogo />

      {/* ── EN CARTEL: al final, después de lo profesional (solo si hay espectáculos) ── */}
      <FranjaEnCartel fichas={cartel.fichas} entradas={cartel.entradas} ahora={ahora} destacados={cartel.destacados} anteriores={cartel.anteriores} />

      {/* ── FOOTER ── */}
    </>
  )
}
