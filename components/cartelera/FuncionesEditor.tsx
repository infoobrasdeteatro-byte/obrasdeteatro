'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/geo/countries'
import {
  ZONAS_PAIS, zonaPorDefecto, localAUtc, fechaFuncion, validarFuncion, fechasRepetidas, mensajeErrorCartelera,
  MAX_FUNCIONES_DE_UNA_VEZ, type CamposFuncion,
} from '@/lib/cartelera/cartelera'
import { Seccion } from './EspectaculoForm'

export type FuncionPropia = {
  id: string
  inicio: string
  zona_horaria: string
  lugar_nombre: string | null
  ciudad: string | null
  pais_code: string | null
  estado: string
  nota: string | null
}

type Sala = { id: string; nombre: string; municipio: string; region: string; pais_code: string }

const PAISES_CARTELERA = COUNTRIES.filter(c => ZONAS_PAIS[c.code])
const fechaCorta = (d: string) =>
  new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`))
const nombrePais = (code: string | null) => COUNTRIES.find(c => c.code === code)?.name ?? code ?? ''

/** Busca salas publicadas de Espacios escénicos por nombre o municipio. */
function BuscadorSala({ elegida, onElegir }: { elegida: Sala | null; onElegir: (s: Sala | null) => void }) {
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState<Sala[]>([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    const texto = q.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ ]/g, ' ').trim()
    if (texto.length < 3) { setResultados([]); return }
    let vigente = true
    const t = setTimeout(async () => {
      setBuscando(true)
      const patron = `%${texto.replace(/\s+/g, '%')}%`
      const { data } = await createClient()
        .from('espacios_escenicos')
        .select('id, nombre, municipio, region, pais_code')
        .eq('estado', 'publicado')
        .or(`nombre_normalizado.ilike.${patron},municipio_slug.ilike.${patron.replace(/ /g, '-')}`)
        .order('nombre')
        .limit(8)
      if (vigente) { setResultados(data ?? []); setBuscando(false) }
    }, 250)
    return () => { vigente = false; clearTimeout(t) }
  }, [q])

  if (elegida) {
    return (
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px', background: 'var(--subtle)', borderRadius: 'var(--radius)' }}>
        <span style={{ fontSize: '14px' }}>
          <strong>{elegida.nombre}</strong> · {elegida.municipio}, {nombrePais(elegida.pais_code)}
        </span>
        <button type="button" className="table-link" style={{ marginLeft: 'auto' }} onClick={() => onElegir(null)}>Cambiar</button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <input id="buscar-sala" className="ds-input" value={q} onChange={e => setQ(e.target.value)}
        placeholder="Escribe el nombre de la sala o la ciudad (mín. 3 letras)" autoComplete="off" />
      {(resultados.length > 0 || (q.trim().length >= 3 && !buscando)) && (
        <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--white, #fff)' }}>
          {resultados.map(s => (
            <li key={s.id}>
              <button type="button" onClick={() => { onElegir(s); setQ('') }}
                style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: 'none', border: 0, borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: '14px' }}>
                <strong>{s.nombre}</strong> <span style={{ color: 'var(--muted)' }}>· {s.municipio}, {nombrePais(s.pais_code)}</span>
              </button>
            </li>
          ))}
          {resultados.length === 0 && (
            <li style={{ padding: '9px 12px', fontSize: '13px', color: 'var(--muted)' }}>
              No encontramos esa sala en Espacios escénicos. Marca «Otro lugar» y escríbelo a mano.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTOS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

const ESTADOS_FUNCION = [
  { value: 'programada', label: 'A la venta' },
  { value: 'agotada', label: 'Entradas agotadas' },
  { value: 'cancelada', label: 'Cancelada' },
]

export default function FuncionesEditor({ espectaculoId, funciones }: { espectaculoId: string; funciones: FuncionPropia[] }) {
  const router = useRouter()
  const [otroLugar, setOtroLugar] = useState(false)
  const [sala, setSala] = useState<Sala | null>(null)
  const [c, setC] = useState<CamposFuncion>({
    inicio: '', zona_horaria: 'Europe/Madrid', espacio_id: null, lugar_nombre: '', ciudad: '', pais_code: 'ES', nota: '',
  })
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('20')
  const [minuto, setMinuto] = useState('00')
  const [cantidad, setCantidad] = useState('1')
  const [cadaDias, setCadaDias] = useState(1)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const set = <K extends keyof CamposFuncion>(k: K, v: CamposFuncion[K]) => setC(p => ({ ...p, [k]: v }))

  const elegirSala = (s: Sala | null) => {
    setSala(s)
    if (s) setC(p => ({ ...p, espacio_id: s.id, zona_horaria: zonaPorDefecto(s.pais_code, s.region) }))
    else setC(p => ({ ...p, espacio_id: null }))
  }
  const elegirPais = (code: string) => setC(p => ({ ...p, pais_code: code, zona_horaria: zonaPorDefecto(code) }))
  const paisZonas = sala && !otroLugar ? sala.pais_code : c.pais_code
  const zonas = ZONAS_PAIS[paisZonas] ?? []

  const anadir = async () => {
    setAviso(null)
    const base: CamposFuncion = otroLugar ? { ...c, espacio_id: null } : { ...c, espacio_id: sala?.id ?? null }
    if (!otroLugar && !sala) { setAviso({ tipo: 'error', texto: 'Busca y elige la sala, o marca «Otro lugar».' }); return }
    if (!fecha) { setAviso({ tipo: 'error', texto: 'Elige el día de la (primera) función.' }); return }
    const n = Number(cantidad)
    if (!Number.isInteger(n) || n < 1 || n > MAX_FUNCIONES_DE_UNA_VEZ) {
      setAviso({ tipo: 'error', texto: `El número de funciones va de 1 a ${MAX_FUNCIONES_DE_UNA_VEZ}.` }); return
    }
    const dias = fechasRepetidas(fecha, n, cadaDias)
    if (dias.length === 0) { setAviso({ tipo: 'error', texto: 'La fecha no es válida.' }); return }
    const filas = []
    for (const d of dias) {
      const campos = { ...base, inicio: `${d}T${hora}:${minuto}` }
      const problema = validarFuncion(campos)
      if (problema) { setAviso({ tipo: 'error', texto: dias.length > 1 ? `${d}: ${problema}` : problema }); return }
      filas.push({
        espectaculo_id: espectaculoId,
        inicio: localAUtc(campos.inicio, campos.zona_horaria)!,
        zona_horaria: campos.zona_horaria,
        espacio_id: campos.espacio_id,
        lugar_nombre: campos.espacio_id ? null : campos.lugar_nombre.trim(),
        ciudad: campos.espacio_id ? null : campos.ciudad.trim(),
        pais_code: campos.espacio_id ? null : campos.pais_code,
        nota: campos.nota.trim() || null,
      })
    }
    setOcupado(true)
    const { error } = await createClient().from('funciones').insert(filas)
    setOcupado(false)
    if (error) { setAviso({ tipo: 'error', texto: mensajeErrorCartelera(error.message) }); return }
    // Se quedan la sala y la hora: para añadir otra tanda basta con cambiar el día.
    setC(p => ({ ...p, nota: '' }))
    setCantidad('1')
    setAviso({ tipo: 'ok', texto: filas.length === 1 ? 'Función añadida.' : `${filas.length} funciones añadidas.` })
    router.refresh()
  }

  const cambiarEstado = async (id: string, estado: string) => {
    const { error } = await createClient().from('funciones').update({ estado }).eq('id', id)
    if (error) setAviso({ tipo: 'error', texto: mensajeErrorCartelera(error.message) })
    router.refresh()
  }
  const borrar = async (id: string) => {
    if (!confirm('¿Borrar esta función?')) return
    const { error } = await createClient().from('funciones').delete().eq('id', id)
    if (error) setAviso({ tipo: 'error', texto: mensajeErrorCartelera(error.message) })
    router.refresh()
  }

  const ahora = Date.now()
  return (
    <section className="account-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Seccion titulo={`Funciones (${funciones.length})`} />

      {funciones.length === 0 ? (
        <p className="ds-form-hint">Todavía no hay funciones. Añade al menos una para poder publicar.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {funciones.map(f => {
            const pasada = new Date(f.inicio).getTime() < ahora
            return (
              <li key={f.id} style={{
                display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)', opacity: pasada ? 0.6 : 1,
              }}>
                <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>{fechaFuncion(f.inicio, f.zona_horaria)}</div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    {f.lugar_nombre} · {f.ciudad}, {nombrePais(f.pais_code)}{f.nota ? ` · ${f.nota}` : ''}{pasada ? ' · ya pasó' : ''}
                  </div>
                </div>
                <select className="ds-select" aria-label="Estado de la función" value={f.estado}
                  style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                  onChange={e => cambiarEstado(f.id, e.target.value)}>
                  {ESTADOS_FUNCION.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
                <button type="button" className="table-link table-link--danger" onClick={() => borrar(f.id)}>Borrar</button>
              </li>
            )
          })}
        </ul>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <strong style={{ fontSize: '14px' }}>Añadir función</strong>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
          <input type="checkbox" checked={otroLugar} onChange={e => setOtroLugar(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--black)' }} />
          Otro lugar (no está en Espacios escénicos)
        </label>

        {!otroLugar ? (
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="buscar-sala">Sala *</label>
            <BuscadorSala elegida={sala} onElegir={elegirSala} />
          </div>
        ) : (
          <div className="ds-form-grid">
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="lugar_nombre">Lugar *</label>
              <input id="lugar_nombre" className="ds-input" maxLength={160} value={c.lugar_nombre}
                onChange={e => set('lugar_nombre', e.target.value)} placeholder="Centro Cultural, plaza, bar…" />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="ciudad">Ciudad *</label>
              <input id="ciudad" className="ds-input" maxLength={120} value={c.ciudad}
                onChange={e => set('ciudad', e.target.value)} placeholder="Buenos Aires" />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="pais_code">País *</label>
              <select id="pais_code" className="ds-select" value={c.pais_code} onChange={e => elegirPais(e.target.value)}>
                {PAISES_CARTELERA.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="ds-form-grid">
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="fecha">Día {Number(cantidad) > 1 ? 'de la primera función' : ''} *</label>
            <input id="fecha" type="date" className="ds-input" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="hora">Hora * <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(formato 24 h)</span></label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select id="hora" className="ds-select" aria-label="Hora" value={hora} onChange={e => setHora(e.target.value)}>
                {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <span aria-hidden="true">:</span>
              <select className="ds-select" aria-label="Minutos" value={minuto} onChange={e => setMinuto(e.target.value)}>
                {MINUTOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <span style={{ fontSize: '13px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>h</span>
            </div>
          </div>
          {zonas.length > 1 && (
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="zona_horaria">Hora de</label>
              <select id="zona_horaria" className="ds-select" value={c.zona_horaria} onChange={e => set('zona_horaria', e.target.value)}>
                {zonas.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
              </select>
            </div>
          )}
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="cantidad">Número de funciones</label>
            <input id="cantidad" className="ds-input" type="number" min={1} max={MAX_FUNCIONES_DE_UNA_VEZ}
              value={cantidad} onChange={e => setCantidad(e.target.value)} />
          </div>
          {Number(cantidad) > 1 && (
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="cada">Repetir</label>
              <select id="cada" className="ds-select" value={cadaDias} onChange={e => setCadaDias(Number(e.target.value))}>
                <option value={1}>Todos los días</option>
                <option value={7}>Una vez por semana (mismo día)</option>
              </select>
            </div>
          )}
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="nota">Nota</label>
            <input id="nota" className="ds-input" maxLength={200} value={c.nota}
              onChange={e => set('nota', e.target.value)} placeholder="Función accesible, con coloquio…" />
          </div>
        </div>
        <p className="ds-form-hint" style={{ marginTop: '-4px' }}>
          La hora es la del lugar de la función. Con «Número de funciones» añades varias de una vez a la misma hora
          (por ejemplo, 4 funciones todos los días desde el jueves). Para otro pase el mismo día, añádelo aparte con otra hora.
        </p>
        {fecha && Number(cantidad) > 1 && fechasRepetidas(fecha, Number(cantidad), cadaDias).length > 0 && (
          <p className="ds-form-hint" style={{ marginTop: '-4px' }}>
            Se añadirán {cantidad} funciones a las {hora}:{minuto} h: del {fechaCorta(fechasRepetidas(fecha, Number(cantidad), cadaDias)[0])} al{' '}
            {fechaCorta(fechasRepetidas(fecha, Number(cantidad), cadaDias).at(-1)!)}.
          </p>
        )}

        {aviso && <div className={aviso.tipo === 'ok' ? 'ds-alert-success' : 'ds-alert-error'}>{aviso.texto}</div>}
        <div>
          <button type="button" className="ds-btn-primary" disabled={ocupado}
            style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }} onClick={anadir}>
            {ocupado ? 'Añadiendo…' : Number(cantidad) > 1 ? `+ Añadir ${cantidad} funciones` : '+ Añadir función'}
          </button>
        </div>
      </div>
    </section>
  )
}
