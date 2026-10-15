import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import TopNav from '@/components/design-system/TopNav'
import { createClient } from '@/lib/supabase/server'
import { COUNTRIES } from '@/lib/geo/countries'
import { GENEROS, etiquetaGenero } from '@/lib/cartelera/cartelera'
import {
  CUANDO, AMBIENTES, esCuando, esFecha, esAmbiente, enCuando, agruparPorEspectaculo, contarPor, ciudadDetectada,
  normalizarCiudad, diaLocal, type FuncionListado,
} from '@/lib/cartelera/listado'
import { funcionesFuturas, resumenEntradas, destacadosHoy } from '@/lib/cartelera/datos'
import { Poster, TarjetaEspectaculo, TuEspectaculoAqui, rutaEspectaculo, rutaEntradas } from '@/components/cartelera/publico'

export const metadata: Metadata = {
  title: 'Cartelera de teatro: obras, funciones y entradas | ObrasDeTeatro',
  description: 'Qué ver hoy, este fin de semana y en los próximos días: teatro, comedia, musicales, danza e infantil en España y Latinoamérica, con horarios y entradas.',
  alternates: { canonical: '/cartelera' },
}

type SP = { ciudad?: string; pais?: string; cuando?: string; fecha?: string; genero?: string; ambiente?: string; vista?: string; q?: string }
type Props = { searchParams: Promise<SP> }

const nombrePais = (code: string | null) => COUNTRIES.find(c => c.code === code)?.name ?? code ?? ''
const limpiar = (s: string) => s.replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)

/**
 * Cartelera pública. Sin sesión. Los filtros son enlaces y un formulario GET:
 * funciona sin JavaScript y cada vista tiene su URL.
 *
 * Ubicación: la que diga la URL; si no dice nada, la ciudad del visitante
 * (cabeceras de Vercel) cuando hay funciones en ella, o su país; si no, toda.
 */
export default async function CarteleraPage({ searchParams }: Props) {
  const sp = await searchParams
  const ahora = Date.now()
  const supabase = await createClient()
  const todas = await funcionesFuturas(supabase, ahora)

  // ── Ubicación ───────────────────────────────────────────────────────────
  const ciudadesTodas = [...contarPor(todas, f => f.ciudad)].sort((a, b) => b[1] - a[1])
  const paisesTodos = [...contarPor(todas, f => f.pais_code)].sort((a, b) => b[1] - a[1])
  let ciudad: string | null = null
  let pais: string | null = null
  let automatica = false
  if (sp.ciudad && sp.ciudad !== 'todas') {
    ciudad = ciudadesTodas.find(([c]) => normalizarCiudad(c) === normalizarCiudad(sp.ciudad))?.[0] ?? limpiar(sp.ciudad)
  } else if (sp.pais && COUNTRIES.some(c => c.code === sp.pais)) {
    pais = sp.pais
  } else if (!sp.ciudad) {
    const h = await headers()
    ciudad = ciudadDetectada(h.get('x-vercel-ip-city'), ciudadesTodas.map(([c]) => c))
    const paisVisitante = h.get('x-vercel-ip-country')
    if (!ciudad && paisVisitante && paisesTodos.some(([p]) => p === paisVisitante)) pais = paisVisitante
    automatica = Boolean(ciudad || pais)
  }
  const enUbicacion = (f: FuncionListado) =>
    ciudad ? normalizarCiudad(f.ciudad) === normalizarCiudad(ciudad) : pais ? f.pais_code === pais : true

  // ── Filtros ─────────────────────────────────────────────────────────────
  const q = sp.q ? limpiar(sp.q) : ''
  const nq = normalizarCiudad(q)
  const cuando = esCuando(sp.cuando) || sp.cuando === 'ultimos' ? sp.cuando : esFecha(sp.fecha) ? sp.fecha! : null
  const genero = GENEROS.some(g => g.value === sp.genero) ? sp.genero! : null
  const ambiente = esAmbiente(sp.ambiente) ? AMBIENTES.find(a => a.value === sp.ambiente)! : null
  const vista = sp.vista === 'agenda' ? 'agenda' : 'carteles'

  const base = todas.filter(enUbicacion)
  // Última función de cada espectáculo (para «Últimos días»).
  const ultima = new Map<string, string>()
  for (const f of base) if ((ultima.get(f.espectaculo.id) ?? '') < f.inicio) ultima.set(f.espectaculo.id, f.inicio)

  const pasaQ = (f: FuncionListado) => !nq || [f.espectaculo.titulo, f.espectaculo.compania_nombre, f.lugar_nombre, f.ciudad]
    .some(t => normalizarCiudad(t).includes(nq))
  const pasaGenero = (f: FuncionListado) =>
    genero ? f.espectaculo.genero_id === genero : ambiente ? (ambiente.generos as readonly string[]).includes(f.espectaculo.genero_id) : true
  const pasaCuando = (f: FuncionListado, c: string | null) => {
    if (!c) return true
    if (c === 'ultimos') return new Date(ultima.get(f.espectaculo.id)!).getTime() - ahora < 7 * 86400_000
    return enCuando(f, c, ahora)
  }

  const conQ = base.filter(pasaQ)
  const final = conQ.filter(f => pasaGenero(f) && pasaCuando(f, cuando))
  const fichas = agruparPorEspectaculo(final)
  const entradas = await resumenEntradas(supabase, fichas.map(e => e.id))

  const cuentaCuando = (c: string) => new Set(conQ.filter(f => pasaGenero(f) && pasaCuando(f, c)).map(f => f.espectaculo.id)).size
  const cuentaGenero = contarPor(conQ.filter(f => pasaCuando(f, cuando)), f => f.espectaculo.genero_id)
  const cuentaAmbiente = (gs: readonly string[]) =>
    new Set(conQ.filter(f => pasaCuando(f, cuando) && gs.includes(f.espectaculo.genero_id)).map(f => f.espectaculo.id)).size
  const ciudadesBase = [...contarPor(conQ.filter(f => pasaGenero(f) && pasaCuando(f, cuando)), f => f.ciudad)].sort((a, b) => b[1] - a[1])

  // Destacados de hoy que tienen funciones en la ubicación elegida (o de portada).
  const destacados = await destacadosHoy(supabase, ahora)
  const fichasBase = agruparPorEspectaculo(base)
  const enDestacado = fichasBase.filter(e => destacados.has(e.id)).slice(0, 10)

  // ── Enlaces ─────────────────────────────────────────────────────────────
  const actual: SP = {
    ...(sp.ciudad ? { ciudad: sp.ciudad } : {}), ...(sp.pais ? { pais: sp.pais } : {}),
    ...(cuando && esFecha(cuando) ? { fecha: cuando } : cuando ? { cuando } : {}),
    ...(genero ? { genero } : {}), ...(ambiente ? { ambiente: ambiente.value } : {}),
    ...(vista === 'agenda' ? { vista } : {}), ...(q ? { q } : {}),
  }
  const enlace = (cambios: Partial<Record<keyof SP, string | null>>) => {
    const p = new URLSearchParams()
    const todo = { ...actual, ...cambios }
    for (const [k, v] of Object.entries(todo)) if (v) p.set(k, v)
    const s = p.toString()
    return s ? `/cartelera?${s}` : '/cartelera'
  }
  const enlaceUbicacion = (c: { ciudad?: string; pais?: string }) =>
    enlace({ ciudad: c.ciudad ?? (c.pais ? null : 'todas'), pais: c.pais ?? null })

  const textoUbicacion = ciudad ?? (pais ? nombrePais(pais) : 'Todas las ciudades')
  const hayFiltros = Boolean(cuando || genero || ambiente || q)

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh' }}>
        <div className="cart-wrap">

          <header className="cart-head">
            <div>
              <h1 className="cart-title">Cartelera</h1>
              <p className="cart-sub">Teatro, comedia, musicales, danza e infantil: funciones, horarios y entradas.</p>
              <div className="cart-ubicacion" style={{ marginTop: '10px' }}>
                <span aria-hidden="true">📍</span>
                <strong>{textoUbicacion}</strong>
                {automatica && <span style={{ color: 'var(--muted)', fontSize: '12.5px' }}>(según tu ubicación)</span>}
                <details>
                  <summary>Cambiar ubicación</summary>
                  <div className="cart-ubicacion-panel">
                    <Link href={enlaceUbicacion({})} className="cart-chip">Todas las ciudades</Link>
                    {ciudadesTodas.length > 0 && <h3>Ciudades</h3>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {ciudadesTodas.slice(0, 40).map(([c, n]) => (
                        <Link key={c} href={enlaceUbicacion({ ciudad: c })} className={`cart-chip${c === ciudad ? ' cart-chip--on' : ''}`}>
                          {c} <span className="cart-chip-n">{n}</span>
                        </Link>
                      ))}
                    </div>
                    {paisesTodos.length > 0 && <h3>Países</h3>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {paisesTodos.map(([p, n]) => (
                        <Link key={p} href={enlaceUbicacion({ pais: p })} className={`cart-chip${p === pais ? ' cart-chip--on' : ''}`}>
                          {nombrePais(p)} <span className="cart-chip-n">{n}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            </div>
            <form method="get" action="/cartelera" className="cart-buscar">
              {Object.entries(actual).filter(([k]) => k !== 'q').map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
              <input name="q" className="ds-input" defaultValue={q} placeholder="Buscar obra, compañía o sala" aria-label="Buscar en la cartelera" />
              <button type="submit" className="ds-btn-primary" style={{ width: 'auto', padding: '10px 16px', fontSize: '13px' }}>Buscar</button>
            </form>
          </header>

          {enDestacado.length > 0 && (
            <section className="cart-destacados" aria-labelledby="t-destacados">
              <div className="cart-fila-label" id="t-destacados">Destacados {ciudad ? `en ${ciudad}` : pais ? `en ${nombrePais(pais)}` : ''}</div>
              <div className="cart-destacados-lista">
                {enDestacado.map((e, i) => (
                  <Link key={e.id} href={rutaEspectaculo(e.slug)} className="cart-destacado">
                    <span className="cart-destacado-n" aria-hidden="true">{i + 1}</span>
                    <Poster url={e.cartel_url} titulo={e.titulo} prioridad={i < 3} />
                    <div className="cart-destacado-t">{e.titulo}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="cart-fila">
            <span className="cart-fila-label">Cuándo</span>
            <div className="cart-chips">
              <Link href={enlace({ cuando: null, fecha: null })} className={`cart-chip${!cuando ? ' cart-chip--on' : ''}`}>Todas las fechas</Link>
              {CUANDO.map(c => (
                <Link key={c.value} href={enlace({ cuando: c.value, fecha: null })} className={`cart-chip${cuando === c.value ? ' cart-chip--on' : ''}`}>
                  {c.label} <span className="cart-chip-n">{cuentaCuando(c.value)}</span>
                </Link>
              ))}
              <Link href={enlace({ cuando: 'ultimos', fecha: null })} className={`cart-chip${cuando === 'ultimos' ? ' cart-chip--on' : ''}`}>
                Últimos días <span className="cart-chip-n">{cuentaCuando('ultimos')}</span>
              </Link>
              <form method="get" action="/cartelera" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                {Object.entries(actual).filter(([k]) => k !== 'cuando' && k !== 'fecha').map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                <input type="date" name="fecha" className="ds-input" aria-label="Elegir fecha" defaultValue={esFecha(cuando) ? cuando! : ''}
                  style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }} />
                <button type="submit" className="cart-chip">Ir</button>
              </form>
            </div>
          </div>

          <div className="cart-fila">
            <span className="cart-fila-label">¿Qué te apetece?</span>
            <div className="cart-chips">
              {AMBIENTES.map(a => (
                <Link key={a.value} href={enlace({ ambiente: ambiente?.value === a.value ? null : a.value, genero: null })}
                  className={`cart-chip${ambiente?.value === a.value ? ' cart-chip--on' : ''}`}>
                  {a.label} <span className="cart-chip-n">{cuentaAmbiente(a.generos)}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="cart-cuerpo">
            <aside className="cart-lateral" aria-label="Filtros">
              <div>
                <h2>Género</h2>
                <ul>
                  <li><Link href={enlace({ genero: null, ambiente: null })} className={!genero && !ambiente ? 'on' : ''}><span>Todos</span><span /></Link></li>
                  {GENEROS.filter(g => cuentaGenero.get(g.value) || g.value === genero).map(g => (
                    <li key={g.value}>
                      <Link href={enlace({ genero: g.value, ambiente: null })} className={genero === g.value ? 'on' : ''}>
                        <span>{g.label}</span><span>{cuentaGenero.get(g.value) ?? 0}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              {!ciudad && ciudadesBase.length > 1 && (
                <div>
                  <h2>Ciudad</h2>
                  <ul>
                    {ciudadesBase.slice(0, 12).map(([c, n]) => (
                      <li key={c}><Link href={enlaceUbicacion({ ciudad: c })}><span>{c}</span><span>{n}</span></Link></li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>

            <section aria-label="Espectáculos">
              <div className="cart-barra">
                <span>
                  {fichas.length} espectáculo{fichas.length === 1 ? '' : 's'}
                  {genero ? ` · ${etiquetaGenero(genero)}` : ambiente ? ` · ${ambiente.label}` : ''}
                  {hayFiltros && <> · <Link href={enlace({ cuando: null, fecha: null, genero: null, ambiente: null, q: null })} className="table-link">Quitar filtros</Link></>}
                </span>
                <span className="cart-vistas" role="group" aria-label="Vista">
                  <Link href={enlace({ vista: null })} className={vista === 'carteles' ? 'on' : ''}>Carteles</Link>
                  <Link href={enlace({ vista: 'agenda' })} className={vista === 'agenda' ? 'on' : ''}>Agenda</Link>
                </span>
              </div>

              {fichas.length === 0 && (
                <div className="cart-vacio">
                  <p style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '12px' }}>
                    {todas.length === 0
                      ? 'La cartelera está empezando: todavía no hay funciones programadas.'
                      : 'No hay funciones con estos filtros.'}
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {(hayFiltros || ciudad || pais) && <Link href="/cartelera?ciudad=todas" className="cart-btn cart-btn--sec">Ver toda la cartelera</Link>}
                    <Link href="/mis-espectaculos/nuevo" className="cart-btn">Publica tu espectáculo gratis</Link>
                  </div>
                </div>
              )}

              {fichas.length > 0 && vista === 'carteles' && (
                <div className="cart-grid">
                  <TuEspectaculoAqui />
                  {fichas.map((e, i) => (
                    <TarjetaEspectaculo key={e.id} e={e} entradas={entradas.get(e.id)} ahora={ahora} prioridad={i < 4} />
                  ))}
                </div>
              )}

              {fichas.length > 0 && vista === 'agenda' && <Agenda funciones={final.slice(0, 300)} entradas={entradas} />}
            </section>
          </div>

          {ciudadesTodas.length > 1 && (
            <section className="cart-seccion">
              <h2>Ciudades con más teatro</h2>
              <div className="cart-ciudades">
                {ciudadesTodas.slice(0, 8).map(([c, n]) => (
                  <Link key={c} href={enlaceUbicacion({ ciudad: c })} className="cart-ciudad">
                    <strong>{c}</strong>
                    <span>{n} espectáculo{n === 1 ? '' : 's'}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {paisesTodos.length > 0 && (
            <section className="cart-seccion">
              <h2>Explora por país</h2>
              <div className="cart-chips" style={{ flexWrap: 'wrap' }}>
                {paisesTodos.map(([p, n]) => (
                  <Link key={p} href={enlaceUbicacion({ pais: p })} className={`cart-chip${p === pais ? ' cart-chip--on' : ''}`}>
                    {nombrePais(p)} <span className="cart-chip-n">{n}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  )
}

/** Vista agenda: funciones por día (en la zona de cada función), con su hora y su botón. */
function Agenda({ funciones, entradas }: { funciones: FuncionListado[]; entradas: Map<string, { directa: string | null }> }) {
  const dias = new Map<string, FuncionListado[]>()
  for (const f of funciones) {
    const d = diaLocal(f.inicio, f.zona_horaria)
    dias.set(d, [...(dias.get(d) ?? []), f])
  }
  const tituloDia = (d: string) => new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${d}T12:00:00Z`))
  return (
    <div className="cart-agenda">
      {[...dias].sort(([a], [b]) => a.localeCompare(b)).map(([d, fs]) => (
        <section key={d} className="cart-agenda-dia">
          <h2>{tituloDia(d)}</h2>
          {fs.map(f => {
            const hora = new Intl.DateTimeFormat('es-ES', { timeZone: f.zona_horaria, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(f.inicio))
            const directa = entradas.get(f.espectaculo.id)?.directa
            return (
              <div key={f.id} className="cart-agenda-fila">
                <span className="cart-agenda-hora">{hora} h</span>
                <span className="cart-agenda-mini">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {f.espectaculo.cartel_url && <img src={f.espectaculo.cartel_url} alt="" loading="lazy" />}
                </span>
                <div style={{ minWidth: 0 }}>
                  <Link href={rutaEspectaculo(f.espectaculo.slug)} className="cart-agenda-t">{f.espectaculo.titulo}</Link>
                  <div className="cart-agenda-m">{f.ciudad} · {f.lugar_nombre}{f.estado === 'agotada' ? ' · Agotado' : ''}</div>
                </div>
                {directa && f.estado !== 'agotada'
                  ? <a href={rutaEntradas(directa)} className="cart-btn" rel="nofollow sponsored" target="_blank">Entradas</a>
                  : <Link href={`${rutaEspectaculo(f.espectaculo.slug)}#funciones`} className="cart-btn cart-btn--sec">Ver</Link>}
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
