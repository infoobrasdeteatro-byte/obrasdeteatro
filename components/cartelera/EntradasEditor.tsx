'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  TIPOS_OPCION, MONEDAS, validarOpcion, aFilaOpcion, precioTexto, etiquetaTipoOpcion, fechaFuncion,
  mensajeErrorCartelera, type CamposOpcion,
} from '@/lib/cartelera/cartelera'
import type { FuncionPropia } from './FuncionesEditor'
import { Seccion } from './EspectaculoForm'

export type OpcionPropia = {
  id: string
  funcion_id: string | null
  tipo: string
  proveedor: string
  url: string | null
  precio_desde: number | null
  moneda: string | null
  etiqueta: string | null
}

/**
 * Dónde se consiguen las entradas. ObrasDeTeatro solo enlaza: la venta la
 * hace la sala o la ticketera. Una opción vale para todas las funciones o
 * para una concreta.
 */
export default function EntradasEditor({
  espectaculoId, opciones, funciones, monedaSugerida,
}: { espectaculoId: string; opciones: OpcionPropia[]; funciones: FuncionPropia[]; monedaSugerida: string }) {
  const router = useRouter()
  const vacio: CamposOpcion = { tipo: 'venta', url: '', precio_desde: '', moneda: monedaSugerida, etiqueta: '', funcion_id: '' }
  const [c, setC] = useState<CamposOpcion>(vacio)
  const [taquilla, setTaquilla] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const set = <K extends keyof CamposOpcion>(k: K, v: CamposOpcion[K]) => setC(p => ({ ...p, [k]: v }))
  const online = c.tipo === 'venta' || c.tipo === 'reserva'
  const funcionTexto = (id: string | null) => {
    if (!id) return 'Todas las funciones'
    const f = funciones.find(x => x.id === id)
    return f ? fechaFuncion(f.inicio, f.zona_horaria) : 'Una función'
  }

  const anadir = async () => {
    setAviso(null)
    const problema = validarOpcion(c)
    if (problema) { setAviso({ tipo: 'error', texto: problema }); return }
    setOcupado(true)
    const orden = opciones.length ? opciones.length * 10 + 10 : 10
    const filas = [{ ...aFilaOpcion(c), espectaculo_id: espectaculoId, orden }]
    // Venta online y, además, taquilla del teatro: dos opciones de una vez.
    if (online && taquilla && !opciones.some(o => o.tipo === 'taquilla' && o.funcion_id === (c.funcion_id || null))) {
      filas.push({ ...aFilaOpcion({ ...c, tipo: 'taquilla', url: '', etiqueta: '' }), espectaculo_id: espectaculoId, orden: orden + 10 })
    }
    const { error } = await createClient().from('opciones_compra').insert(filas)
    setOcupado(false)
    if (error) { setAviso({ tipo: 'error', texto: mensajeErrorCartelera(error.message) }); return }
    setC({ ...vacio, moneda: c.moneda })
    setTaquilla(false)
    setAviso({ tipo: 'ok', texto: 'Guardado.' })
    router.refresh()
  }

  const borrar = async (id: string) => {
    if (!confirm('¿Quitar esta opción de entradas?')) return
    const { error } = await createClient().from('opciones_compra').delete().eq('id', id)
    if (error) setAviso({ tipo: 'error', texto: mensajeErrorCartelera(error.message) })
    router.refresh()
  }

  return (
    <section className="account-card cart-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Seccion titulo="Entradas" />

      {opciones.length === 0 ? (
        <p className="ds-form-hint">Añade dónde se compran o reservan las entradas (o si son gratuitas o solo en taquilla).</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {opciones.map(o => (
            <li key={o.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>
                  {o.etiqueta || etiquetaTipoOpcion(o.tipo)}
                  {precioTexto(o.precio_desde, o.moneda, o.tipo) && <span style={{ fontWeight: 400 }}> · {precioTexto(o.precio_desde, o.moneda, o.tipo)}</span>}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', overflowWrap: 'anywhere', textTransform: 'none' }}>
                  {funcionTexto(o.funcion_id)}{o.url ? ` · ${o.url}` : ''}
                </div>
              </div>
              <button type="button" className="table-link table-link--danger" onClick={() => borrar(o.id)}>Quitar</button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <strong style={{ fontSize: '14px' }}>Añadir</strong>
        <div className="ds-form-grid">
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="op_tipo">Tipo *</label>
            <select id="op_tipo" className="ds-select" value={c.tipo} onChange={e => set('tipo', e.target.value)}>
              {TIPOS_OPCION.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </div>
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="op_funcion">Para</label>
            <select id="op_funcion" className="ds-select" value={c.funcion_id} onChange={e => set('funcion_id', e.target.value)}>
              <option value="">Todas las funciones</option>
              {funciones.map(f => <option key={f.id} value={f.id}>{fechaFuncion(f.inicio, f.zona_horaria)}</option>)}
            </select>
          </div>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="op_url">Enlace {online ? '*' : ''}</label>
          <input id="op_url" className="ds-input" type="url" maxLength={800} value={c.url}
            onChange={e => set('url', e.target.value)} placeholder="Ej.: https://www.ticketera.com/tu-espectaculo" />
        </div>
        <div className="ds-form-grid">
          {c.tipo !== 'gratis' && (
            <>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="op_precio">Precio desde</label>
                <input id="op_precio" className="ds-input" inputMode="decimal" value={c.precio_desde}
                  onChange={e => set('precio_desde', e.target.value)} placeholder="Ej.: 15" />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="op_moneda">Moneda</label>
                <select id="op_moneda" className="ds-select" value={c.moneda} onChange={e => set('moneda', e.target.value)}>
                  {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="op_etiqueta">Texto del botón</label>
            <input id="op_etiqueta" className="ds-input" maxLength={80} value={c.etiqueta}
              onChange={e => set('etiqueta', e.target.value)} placeholder="Ej.: Comprar entradas" />
          </div>
        </div>
        {online && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
            <input type="checkbox" checked={taquilla} onChange={e => setTaquilla(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--black)' }} />
            Además, entradas a la venta en la taquilla del teatro o sala
          </label>
        )}
        {aviso && <div className={aviso.tipo === 'ok' ? 'ds-alert-success' : 'ds-alert-error'}>{aviso.texto}</div>}
        <div>
          <button type="button" className="ds-btn-primary" disabled={ocupado}
            style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }} onClick={anadir}>
            {ocupado ? 'Guardando…' : online && taquilla ? '+ Añadir venta online y taquilla' : '+ Añadir'}
          </button>
        </div>
        <p className="ds-form-hint">
          La venta la gestiona la sala o la ticketera: ObrasDeTeatro solo enlaza. Cada clic en el botón queda
          contado para tus estadísticas.
        </p>
      </div>
    </section>
  )
}
