import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import { COUNTRIES } from '@/lib/geo/countries'
import { LIMITE_DIARIO_NOTICIAS, diaMadrid, nombrePais } from '@/lib/noticias/presentacion'
import ColaNoticias, { type NoticiaPanel } from './ColaNoticias'
import AltaManualForm from './AltaManualForm'
import FuentesPanel, { type FuentePanel } from './FuentesPanel'

export const metadata: Metadata = {
  title: 'Noticias | Administración | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

/**
 * Panel de noticias. Mismo prefijo, guard y marco que /admin/convocatorias:
 * sin enlace en ninguna navegación, se llega por URL.
 *
 * El guard de rol NO es la seguridad: quien no modera recibiría cero filas
 * (políticas «Moderación gestiona …» con es_moderador()) y el trigger
 * noticias_guarda() le impediría cambiar estados. Todas las lecturas y
 * escrituras viajan con la sesión del usuario, nunca con service role.
 *
 * Las reglas (límite de 3 al día, fuente activa, transiciones) viven en el
 * trigger. Este panel muestra el contador y, si el trigger rechaza, su mensaje
 * tal cual.
 */
export default async function AdminNoticiasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: roles } = await supabase
    .from('profile_roles')
    .select('role')
    .eq('profile_id', user.id)
    .in('role', ['admin', 'moderator'])

  if ((roles ?? []).length === 0) {
    return (
      <Marco>
        <div className="page-header">
          <h1 className="page-title">Acceso restringido</h1>
        </div>
        <div className="obras-empty">
          <p className="obras-empty-text">
            Esta página es del equipo de moderación. Tu cuenta no tiene el rol
            <strong style={{ color: 'var(--text)' }}> admin </strong>ni
            <strong style={{ color: 'var(--text)' }}> moderator</strong>, así que no puede
            revisar noticias.
          </p>
          <Link href="/dashboard" className="ds-btn-secondary"
            style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}>
            Volver al inicio
          </Link>
        </div>
      </Marco>
    )
  }

  const ahora = Date.now()
  const hace48h = new Date(ahora - 48 * 3_600_000).toISOString()
  const hace30d = new Date(ahora - 30 * 24 * 3_600_000).toISOString()

  const columnas = 'id, titular, resumen, categoria_id, pais_code, fuente_id, url_original, fecha_original, created_at, publicado_at, origen, lote_importacion'

  const [candidatas, publicadas, recientes, ultimos30, fuentes, categorias] = await Promise.all([
    supabase.from('noticias').select(columnas)
      .eq('estado', 'candidata')
      .order('created_at', { ascending: true })
      .limit(100),
    supabase.from('noticias').select(columnas)
      .eq('estado', 'publicada')
      .order('publicado_at', { ascending: false })
      .limit(20),
    // Para el contador: publicaciones de las últimas 48 h, en cualquier estado
    // (una retirada después sigue contando, igual que en el trigger).
    supabase.from('noticias').select('publicado_at')
      .gte('publicado_at', hace48h),
    supabase.from('noticias').select('pais_code')
      .gte('publicado_at', hace30d),
    supabase.from('noticias_fuentes')
      .select('id, nombre, dominio, url_web, pais_code, tipo_fuente, estado_permiso, url_licencia, activa')
      .order('activa', { ascending: false })
      .order('nombre', { ascending: true }),
    supabase.from('noticias_categorias').select('id, etiqueta, orden, activo')
      .order('orden', { ascending: true }),
  ])

  const error = candidatas.error ?? publicadas.error ?? recientes.error ?? ultimos30.error ?? fuentes.error ?? categorias.error

  const hoy = diaMadrid(new Date(ahora))
  const publicadasHoy = (recientes.data ?? [])
    .filter(r => r.publicado_at && diaMadrid(r.publicado_at) === hoy).length

  const listaFuentes: FuentePanel[] = fuentes.data ?? []
  const fuentePorId = new Map(listaFuentes.map(f => [f.id, f]))
  const etiquetaPorId = new Map((categorias.data ?? []).map(c => [c.id, c.etiqueta]))

  const aPanel = (n: NonNullable<typeof candidatas.data>[number]): NoticiaPanel => {
    const fuente = fuentePorId.get(n.fuente_id)
    return {
      id: n.id,
      titular: n.titular,
      resumen: n.resumen,
      categoria: etiquetaPorId.get(n.categoria_id) ?? n.categoria_id,
      pais: nombrePais(n.pais_code),
      fuente: fuente?.nombre ?? 'Fuente desconocida',
      fuenteActiva: fuente?.activa ?? false,
      urlOriginal: n.url_original,
      fechaOriginal: n.fecha_original,
      creadaEn: n.created_at,
      publicadaEn: n.publicado_at,
      origen: n.origen,
      lote: n.lote_importacion,
    }
  }

  const reparto = new Map<string, number>()
  for (const r of ultimos30.data ?? []) reparto.set(r.pais_code, (reparto.get(r.pais_code) ?? 0) + 1)
  const repartoOrdenado = [...reparto.entries()].sort((a, b) => b[1] - a[1])
  const totalReparto = repartoOrdenado.reduce((s, [, n]) => s + n, 0)
  const paisesSinNoticias = COUNTRIES.filter(c => !reparto.has(c.code)).map(c => c.name)

  const limiteAgotado = publicadasHoy >= LIMITE_DIARIO_NOTICIAS

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Noticias</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Revisión de candidatas, alta manual y fuentes. Nada se publica sin pasar por aquí.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/noticias" className="table-link">Ver sección pública →</Link>
          <span className="status-pill status-pill--draft"
            style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.04em' }}>
            ADMINISTRACIÓN
          </span>
        </div>
      </div>

      {error && (
        <div className="ds-alert-error" style={{ marginBottom: '20px' }}>
          No se pudo leer el panel de noticias: {error.message}
        </div>
      )}

      <div className="obras-stat-grid">
        <div className="obras-stat-card">
          <div className="obras-stat-label">Publicadas hoy (hora de Madrid)</div>
          <div className={`obras-stat-value ${limiteAgotado ? 'obras-stat-value--amber' : 'obras-stat-value--green'}`}>
            {publicadasHoy} de {LIMITE_DIARIO_NOTICIAS}
          </div>
        </div>
        <div className="obras-stat-card">
          <div className="obras-stat-label">Candidatas en cola</div>
          <div className="obras-stat-value">{(candidatas.data ?? []).length}</div>
        </div>
        <div className="obras-stat-card">
          <div className="obras-stat-label">Fuentes activas</div>
          <div className="obras-stat-value">{listaFuentes.filter(f => f.activa).length} de {listaFuentes.length}</div>
        </div>
      </div>

      {limiteAgotado && (
        <div className="ds-status-banner ds-status-banner--draft" style={{ marginBottom: '20px' }}>
          <div>
            <div className="ds-status-title">Límite diario alcanzado</div>
            <div className="ds-status-hint">
              Hoy ya se han publicado {LIMITE_DIARIO_NOTICIAS} noticias. Las candidatas pueden esperar: se podrá publicar de nuevo a partir de las 00:00 (hora de Madrid).
            </div>
          </div>
        </div>
      )}

      <Bloque titulo={`Candidatas (${(candidatas.data ?? []).length})`}
        ayuda="De la más antigua a la más reciente. Las que pasan 7 días sin revisar se descartan solas como «caducada».">
        <ColaNoticias modo="candidatas" noticias={(candidatas.data ?? []).map(aPanel)} />
      </Bloque>

      <Bloque titulo="Publicadas recientes"
        ayuda="Retirar una noticia la quita de la sección pública y deja constancia en el registro. No libera plaza del día.">
        <ColaNoticias modo="publicadas" noticias={(publicadas.data ?? []).map(aPanel)} />
      </Bloque>

      <Bloque titulo="Reparto por país · últimos 30 días"
        ayuda="Publicaciones de los últimos 30 días, incluidas las retiradas después. Sirve para que ningún país domine la sección.">
        <div className="account-card">
          {totalReparto === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Todavía no hay publicaciones en los últimos 30 días.</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {repartoOrdenado.map(([code, n]) => {
                  const pct = Math.round((n / totalReparto) * 100)
                  return (
                    <div key={code} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 70px', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text)' }}>{nombrePais(code)}</span>
                      <div style={{ background: 'var(--subtle)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}
                        role="img" aria-label={`${pct} %`}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--black)' }} />
                      </div>
                      <span style={{ color: 'var(--muted)', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}>
                        {n} · {pct} %
                      </span>
                    </div>
                  )
                })}
              </div>
              {paisesSinNoticias.length > 0 && (
                <p className="ds-form-hint" style={{ marginTop: '14px' }}>
                  Sin noticias en 30 días: {paisesSinNoticias.join(', ')}.
                </p>
              )}
            </>
          )}
        </div>
      </Bloque>

      <Bloque titulo="Alta manual"
        ayuda="Para fuentes públicas sin RSS, como las notas de prensa de un ministerio. Solo aparecen las fuentes activas.">
        <AltaManualForm
          fuentes={listaFuentes.filter(f => f.activa).map(f => ({ id: f.id, nombre: f.nombre, pais_code: f.pais_code }))}
          categorias={(categorias.data ?? []).filter(c => c.activo).map(c => ({ id: c.id, etiqueta: c.etiqueta }))}
          limiteAgotado={limiteAgotado}
        />
      </Bloque>

      <Bloque titulo="Fuentes"
        ayuda="Marca el permiso como concedido cuando conteste un medio. Una fuente solo puede activarse con permiso concedido o no necesario.">
        <FuentesPanel fuentes={listaFuentes} />
      </Bloque>
    </Marco>
  )
}

function Bloque({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '14px' }}>
        <h2 className="obras-stat-label" style={{ marginBottom: ayuda ? '4px' : 0 }}>{titulo}</h2>
        {ayuda && <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{ayuda}</p>}
      </div>
      {children}
    </section>
  )
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
