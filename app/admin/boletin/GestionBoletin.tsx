'use client'

import { useState } from 'react'
import { DIAS, type ConfigBoletin } from '@/lib/boletin/constantes'
import { enviarPrueba, guardarConfig, vistaPrevia } from './acciones'

export default function GestionBoletin({ inicial }: { inicial: ConfigBoletin }) {
  const [c, setC] = useState(inicial)
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const guardar = async () => {
    setOcupado('guardar'); setAviso(null)
    const error = await guardarConfig(c)
    setOcupado(null)
    setAviso(error ? { ok: false, texto: error } : { ok: true, texto: 'Ajustes guardados. La web los muestra en unos minutos.' })
  }
  const prueba = async () => {
    setOcupado('prueba'); setAviso(null)
    const texto = await enviarPrueba()
    setOcupado(null)
    setAviso({ ok: texto.startsWith('Prueba enviada'), texto })
  }
  const ver = async () => {
    setOcupado('ver')
    const r = await vistaPrevia()
    setOcupado(null)
    if ('html' in r) setPreview(r.html); else setAviso({ ok: false, texto: r.error })
  }

  return (
    <>
      {aviso && <div className={aviso.ok ? 'ds-alert-success' : 'ds-alert-error'} style={{ marginBottom: '16px' }}>{aviso.texto}</div>}

      <section className="account-card" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', marginBottom: '12px' }}>Ajustes</h2>
        <div className="ds-form-grid">
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="b-nombre">Nombre del boletín</label>
            <input id="b-nombre" className="ds-input" value={c.nombre} maxLength={80} onChange={e => setC({ ...c, nombre: e.target.value })} />
          </div>
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="b-dia">Día de envío (hora de Madrid, por la mañana)</label>
            <select id="b-dia" className="ds-select" value={c.dia_envio} onChange={e => setC({ ...c, dia_envio: Number(e.target.value) })}>
              {DIAS.map((d, i) => <option key={d} value={i + 1}>{d[0].toUpperCase() + d.slice(1)}</option>)}
            </select>
          </div>
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="b-acceso">Quién lo recibe</label>
            <select id="b-acceso" className="ds-select" value={c.acceso} onChange={e => setC({ ...c, acceso: e.target.value })}>
              <option value="todos">Todos (gratuito, cualquiera puede suscribirse)</option>
              <option value="pago">Solo planes de pago (Premium, Destacado, Empresas)</option>
            </select>
          </div>
          <div className="ds-form-group" style={{ justifyContent: 'flex-end' }}>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', color: 'var(--text)', marginTop: '26px' }}>
              <input type="checkbox" checked={c.activo} onChange={e => setC({ ...c, activo: e.target.checked })} />
              Boletín activo (formulario visible en la web y envío semanal)
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
          <button type="button" className="ds-btn-primary" disabled={ocupado !== null} style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }} onClick={guardar}>
            {ocupado === 'guardar' ? 'Guardando…' : 'Guardar ajustes'}
          </button>
          <button type="button" className="ds-btn-secondary" disabled={ocupado !== null} style={{ padding: '9px 18px', fontSize: '13px' }} onClick={ver}>
            {ocupado === 'ver' ? 'Preparando…' : 'Vista previa de esta semana'}
          </button>
          <button type="button" className="ds-btn-secondary" disabled={ocupado !== null} style={{ padding: '9px 18px', fontSize: '13px' }} onClick={prueba}>
            {ocupado === 'prueba' ? 'Enviando…' : 'Enviarme una prueba'}
          </button>
        </div>
        <p className="ds-form-hint" style={{ marginTop: '10px' }}>
          Con «Solo planes de pago», el envío solo llega a suscriptores cuyo correo es el de una cuenta de pago, y la web lo anuncia como exclusivo.
          Si en una semana no se publica nada, no se envía.
        </p>
      </section>

      {preview && (
        <section className="account-card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--black)' }}>Vista previa</h2>
            <button type="button" className="table-link" onClick={() => setPreview(null)}>Cerrar</button>
          </div>
          <iframe title="Vista previa del boletín" srcDoc={preview} sandbox="" style={{ width: '100%', height: '720px', border: '1px solid var(--border)', background: '#fff' }} />
        </section>
      )}
    </>
  )
}
