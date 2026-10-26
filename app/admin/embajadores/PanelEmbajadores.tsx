'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { anularInvitacion, crearInvitacion } from './acciones'
import { OFICIOS, enlaceInvitacion, enlaceWhatsapp, mensajeWhatsapp, tituloEmbajador, type Genero, type Oficio } from '@/lib/embajadores/textos'

export type FilaInvitacion = {
  id: string; token: string; nombre: string; genero: Genero; oficio: string; telefono: string | null; email: string | null
  estado: string; creada_at: string; caduca_at: string; aceptada_por: string | null; aceptada_at: string | null
}
export type FilaEmbajador = { nombre: string; genero: Genero; situacion: string; referidos: number; pagan: number }

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
const ESTADO: Record<string, { texto: string; color: string }> = {
  pendiente: { texto: 'Pendiente', color: '#92400e' },
  aceptada: { texto: 'Aceptada', color: '#166534' },
  anulada: { texto: 'Anulada', color: '#6b7280' },
  caducada: { texto: 'Caducada', color: '#6b7280' },
}
const SITUACION: Record<string, string> = { activa: 'Activa', vencida: 'Vencida', renuncio: 'Renunció' }

export default function PanelEmbajadores({ invitaciones, embajadores }: { invitaciones: FilaInvitacion[]; embajadores: FilaEmbajador[] }) {
  const router = useRouter()
  const [f, setF] = useState({ nombre: '', genero: '', oficio: 'interpretacion', telefono: '', email: '', nota: '' })
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
  const [version, setVersion] = useState<Record<string, 'conoce' | 'nuevo'>>({})
  const [copiado, setCopiado] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const crear = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      setAviso(null)
      const r = await crearInvitacion(f)
      if (r.ok) {
        setAviso({ ok: true, texto: `Invitación creada para ${f.nombre.trim()}. Envíala desde la lista.` })
        setF({ nombre: '', genero: '', oficio: f.oficio, telefono: '', email: '', nota: '' })
        router.refresh()
      } else setAviso({ ok: false, texto: r.error })
    })
  }

  const mensaje = (i: FilaInvitacion) =>
    mensajeWhatsapp({ nombre: i.nombre, genero: i.genero, oficio: i.oficio as Oficio, token: i.token, version: version[i.id] ?? 'nuevo' })

  const copiar = async (i: FilaInvitacion) => {
    try { await navigator.clipboard.writeText(mensaje(i)) } catch { /* sin portapapeles */ }
    setCopiado(i.id); setTimeout(() => setCopiado(null), 2000)
  }

  const anular = (i: FilaInvitacion) => {
    if (!window.confirm(`¿Anular la invitación de ${i.nombre}? El enlace dejará de funcionar.`)) return
    startTransition(async () => { await anularInvitacion(i.id); router.refresh() })
  }

  const campo: React.CSSProperties = { marginBottom: 0 }

  return (
    <>
      <section className="account-card" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', marginBottom: '12px' }}>Nueva invitación</h2>
        {aviso && <div className={aviso.ok ? 'ds-alert-success' : 'ds-alert-error'} style={{ marginBottom: '12px' }}>{aviso.texto}</div>}
        <form onSubmit={crear} className="ds-form-grid">
          <div className="ds-form-group" style={campo}>
            <label className="ds-label" htmlFor="emb-nombre">Nombre</label>
            <input id="emb-nombre" className="ds-input" value={f.nombre} maxLength={120} required onChange={e => setF({ ...f, nombre: e.target.value })} />
          </div>
          <div className="ds-form-group" style={campo}>
            <label className="ds-label" htmlFor="emb-genero">Distintivo</label>
            <select id="emb-genero" className="ds-select" value={f.genero} required onChange={e => setF({ ...f, genero: e.target.value })}>
              <option value="" disabled>Elige…</option>
              <option value="f">Embajadora de Escena</option>
              <option value="m">Embajador de Escena</option>
            </select>
          </div>
          <div className="ds-form-group" style={campo}>
            <label className="ds-label" htmlFor="emb-oficio">Oficio</label>
            <select id="emb-oficio" className="ds-select" value={f.oficio} onChange={e => setF({ ...f, oficio: e.target.value })}>
              {OFICIOS.map(o => <option key={o.id} value={o.id}>{o.etiqueta}</option>)}
            </select>
          </div>
          <div className="ds-form-group" style={campo}>
            <label className="ds-label" htmlFor="emb-tel">WhatsApp (opcional, con prefijo)</label>
            <input id="emb-tel" className="ds-input" type="tel" placeholder="+34 600 000 000" value={f.telefono} onChange={e => setF({ ...f, telefono: e.target.value })} />
          </div>
          <div className="ds-form-group" style={campo}>
            <label className="ds-label" htmlFor="emb-email">Correo (opcional)</label>
            <input id="emb-email" className="ds-input" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
          </div>
          <div className="ds-form-group" style={campo}>
            <label className="ds-label" htmlFor="emb-nota">Nota interna (opcional)</label>
            <input id="emb-nota" className="ds-input" maxLength={500} value={f.nota} onChange={e => setF({ ...f, nota: e.target.value })} />
          </div>
          <div>
            <button type="submit" className="ds-btn-primary" disabled={pending} style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }}>
              {pending ? 'Creando…' : 'Crear invitación'}
            </button>
          </div>
        </form>
        <p className="ds-form-hint" style={{ marginTop: '10px' }}>
          Cada enlace es de un solo uso y caduca a los 30 días si no se acepta. Lo envías tú desde tu WhatsApp, revisando el mensaje antes.
        </p>
      </section>

      <section className="account-card" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', marginBottom: '10px' }}>Invitaciones</h2>
        {invitaciones.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Todavía no hay invitaciones.</p>
        ) : (
          <div className="red-lista">
            {invitaciones.map(i => (
              <div key={i.id} className="red-fila" style={{ flexDirection: 'column', gap: '6px' }}>
                <div className="red-cabecera" style={{ width: '100%' }}>
                  <span className="red-nombre">{i.nombre} · <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{tituloEmbajador(i.genero)} · {OFICIOS.find(o => o.id === i.oficio)?.etiqueta.split(' (')[0]}</span></span>
                  <span className="red-fecha" style={{ color: ESTADO[i.estado]?.color }}>
                    {ESTADO[i.estado]?.texto ?? i.estado}
                    {i.estado === 'pendiente' && ` · caduca ${fecha(i.caduca_at)}`}
                    {i.estado === 'aceptada' && i.aceptada_at && ` · ${fecha(i.aceptada_at)}`}
                  </span>
                </div>
                {i.estado === 'pendiente' && (
                  <div className="red-acciones" style={{ marginTop: 0 }}>
                    <select className="ds-select" style={{ width: 'auto', padding: '6px 10px', fontSize: '12.5px' }}
                      value={version[i.id] ?? 'nuevo'} onChange={e => setVersion({ ...version, [i.id]: e.target.value as 'conoce' | 'nuevo' })}
                      aria-label="Versión del mensaje">
                      <option value="nuevo">No conoce el proyecto</option>
                      <option value="conoce">Ya conoce el proyecto</option>
                    </select>
                    <a className="ds-btn-primary" href={enlaceWhatsapp(mensaje(i), i.telefono)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      Enviar por WhatsApp
                    </a>
                    <button type="button" className="ds-btn-secondary" onClick={() => copiar(i)}>{copiado === i.id ? '✓ Copiado' : 'Copiar mensaje'}</button>
                    <a className="red-enlace" href={enlaceInvitacion(i.token)} target="_blank" rel="noopener noreferrer">Ver página</a>
                    <button type="button" className="red-enlace" disabled={pending} onClick={() => anular(i)}>Anular</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="account-card">
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', marginBottom: '10px' }}>Referidos por embajador/a <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>· interno</span></h2>
        {embajadores.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Cuando alguien acepte su invitación, aquí verás los colegas que trae.</p>
        ) : (
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left', color: 'var(--muted)' }}><th>Nombre</th><th>Membresía</th><th>Colegas referidos</th><th>Pagan</th></tr></thead>
            <tbody>
              {[...embajadores].sort((a, b) => b.referidos - a.referidos).map((e, n) => (
                <tr key={n} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 8px 8px 0' }}>{e.nombre}</td>
                  <td>{SITUACION[e.situacion] ?? e.situacion}</td>
                  <td>{e.referidos}</td>
                  <td>{e.pagan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
