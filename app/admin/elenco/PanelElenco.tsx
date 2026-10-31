'use client'

import { Fragment, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { anularInvitacionElenco, aplicarSemanasCartelera, crearInvitacionElenco } from './acciones'
import { csvFundadores, csvReferidos, type FilaFundador } from '@/lib/elenco/admin'
import { etiquetaOrigen } from '@/lib/elenco/origen-plan'
import {
  ESTADO_BONO, OFICIOS_PERSONA, TIPOS_ORGANIZACION_ELENCO, enlaceInvitacionElenco, mensajeInvitacion, numeroFundador,
} from '@/lib/elenco/textos'
import { enlaceWhatsapp } from '@/lib/embajadores/textos'

export type Espectaculo = { id: string; titulo: string }

const fecha = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const ESTADO: Record<string, { texto: string; color: string }> = {
  pendiente: { texto: 'Pendiente', color: '#92400e' },
  aceptada: { texto: 'Aceptada', color: '#166534' },
}
const CLASE: Record<string, string> = { persona: 'Persona', organizacion: 'Organización', sala: 'Sala' }

function descargar(nombre: string, contenido: string) {
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function PanelElenco({ filas, espectaculos }: { filas: FilaFundador[]; espectaculos: Record<string, Espectaculo[]> }) {
  const router = useRouter()
  const vacio = { nombre: '', tipo: 'persona', oficio: OFICIOS_PERSONA[0] as string, telefono: '', email: '', nota: '' }
  const [f, setF] = useState(vacio)
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [semana, setSemana] = useState<{ espectaculoId: string; desde: string; semanas: number }>({ espectaculoId: '', desde: '', semanas: 1 })
  const [pending, startTransition] = useTransition()
  const llenas = filas.length >= 100
  const oficios: readonly string[] = f.tipo === 'organizacion' ? TIPOS_ORGANIZACION_ELENCO : OFICIOS_PERSONA

  const crear = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      setAviso(null)
      const r = await crearInvitacionElenco(f)
      if (r.ok) {
        setAviso({ ok: true, texto: `Invitación nº ${numeroFundador(r.numero)} creada para ${f.nombre.trim()}. Envíala desde la tabla.` })
        setF({ ...vacio, tipo: f.tipo, oficio: f.oficio })
        router.refresh()
      } else setAviso({ ok: false, texto: r.error })
    })
  }

  const copiar = async (fila: FilaFundador) => {
    try { await navigator.clipboard.writeText(enlaceInvitacionElenco(fila.token)) } catch { /* sin portapapeles */ }
    setCopiado(fila.id); setTimeout(() => setCopiado(null), 2000)
  }

  const anular = (fila: FilaFundador) => {
    if (!window.confirm(`¿Anular la invitación nº ${numeroFundador(fila.numero)} de ${fila.nombre}? El enlace dejará de funcionar y el número quedará libre.`)) return
    startTransition(async () => { await anularInvitacionElenco(fila.id); router.refresh() })
  }

  const aplicar = (fila: FilaFundador) => {
    startTransition(async () => {
      setAviso(null)
      const r = await aplicarSemanasCartelera({ fundadorId: fila.id, ...semana })
      setAviso(r.ok ? { ok: true, texto: 'Semanas de destacado aplicadas en Cartelera.' } : { ok: false, texto: r.error })
      if (r.ok) router.refresh()
    })
  }

  const campo: React.CSSProperties = { marginBottom: 0 }
  const celda: React.CSSProperties = { padding: '8px 8px 8px 0', verticalAlign: 'top' }

  return (
    <>
      <section className="account-card" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', marginBottom: '12px' }}>Nueva invitación</h2>
        {aviso && <div className={aviso.ok ? 'ds-alert-success' : 'ds-alert-error'} style={{ marginBottom: '12px' }}>{aviso.texto}</div>}
        {llenas ? (
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Las 100 plazas están ocupadas. Anula una invitación pendiente para liberar su número.</p>
        ) : (
          <form onSubmit={crear} className="ds-form-grid">
            <div className="ds-form-group" style={campo}>
              <label className="ds-label" htmlFor="el-nombre">Nombre</label>
              <input id="el-nombre" className="ds-input" value={f.nombre} maxLength={120} required onChange={e => setF({ ...f, nombre: e.target.value })} />
            </div>
            <div className="ds-form-group" style={campo}>
              <label className="ds-label" htmlFor="el-tipo">Destinatario</label>
              <select id="el-tipo" className="ds-select" value={f.tipo}
                onChange={e => setF({ ...f, tipo: e.target.value, oficio: e.target.value === 'organizacion' ? TIPOS_ORGANIZACION_ELENCO[0] : OFICIOS_PERSONA[0] })}>
                <option value="persona">Persona</option>
                <option value="organizacion">Organización</option>
              </select>
            </div>
            <div className="ds-form-group" style={campo}>
              <label className="ds-label" htmlFor="el-oficio">{f.tipo === 'organizacion' ? 'Tipo de organización' : 'Oficio'}</label>
              <select id="el-oficio" className="ds-select" value={f.oficio} onChange={e => setF({ ...f, oficio: e.target.value })}>
                {oficios.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="ds-form-group" style={campo}>
              <label className="ds-label" htmlFor="el-tel">WhatsApp (con prefijo)</label>
              <input id="el-tel" className="ds-input" type="tel" placeholder="+34 600 000 000" value={f.telefono} onChange={e => setF({ ...f, telefono: e.target.value })} />
            </div>
            <div className="ds-form-group" style={campo}>
              <label className="ds-label" htmlFor="el-email">Correo</label>
              <input id="el-email" className="ds-input" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
            </div>
            <div className="ds-form-group" style={campo}>
              <label className="ds-label" htmlFor="el-nota">Nota interna (opcional)</label>
              <input id="el-nota" className="ds-input" maxLength={500} value={f.nota} onChange={e => setF({ ...f, nota: e.target.value })} />
            </div>
            <div>
              <button type="submit" className="ds-btn-primary" disabled={pending} style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }}>
                {pending ? 'Creando…' : 'Crear invitación'}
              </button>
            </div>
          </form>
        )}
        <p className="ds-form-hint" style={{ marginTop: '10px' }}>
          Teléfono y/o correo. Se asigna el siguiente número libre. Cada enlace es de un solo uso; lo envías tú desde tu WhatsApp, revisando el mensaje antes.
        </p>
      </section>

      <section className="account-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)' }}>Elenco 001–100</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="ds-btn-secondary" onClick={() => descargar('elenco-fundadores.csv', csvFundadores(filas))}>Exportar CSV</button>
            <button type="button" className="ds-btn-secondary" onClick={() => descargar('elenco-referidos.csv', csvReferidos(filas))}>CSV de referidos</button>
          </div>
        </div>
        {filas.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Todavía no hay invitaciones.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', minWidth: '880px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                  <th>Nº</th><th>Nombre</th><th>Tipo</th><th>Invitación</th><th>Fecha</th><th>Registrados</th><th>Activos</th><th>De pago</th><th>Puntos</th><th>Escalón</th><th>Bono</th><th />
                </tr>
              </thead>
              <tbody>
                {filas.map(fila => (
                  <Fragment key={fila.id}>
                    <tr style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={celda}><strong>{numeroFundador(fila.numero)}</strong></td>
                      <td style={celda}>{fila.nombre}<div style={{ color: 'var(--muted)', fontSize: '12px' }}>{fila.oficio}</div></td>
                      <td style={celda}>{fila.tipo === 'organizacion' ? 'Organización' : 'Persona'}</td>
                      <td style={{ ...celda, color: ESTADO[fila.estado]?.color }}>{ESTADO[fila.estado]?.texto ?? fila.estado}</td>
                      <td style={celda}>{fecha(fila.fecha)}</td>
                      <td style={celda}>{fila.registrados}</td>
                      <td style={celda}>{fila.activos}</td>
                      <td style={celda}>{fila.dePago}</td>
                      <td style={celda}>{fila.puntos}</td>
                      <td style={celda}>{fila.escalon || '—'}</td>
                      <td style={celda}>{ESTADO_BONO[fila.bono]}</td>
                      <td style={celda}>
                        <button type="button" className="red-enlace" onClick={() => setAbierto(abierto === fila.id ? null : fila.id)}>
                          {abierto === fila.id ? 'Cerrar' : 'Detalle'}
                        </button>
                      </td>
                    </tr>
                    {fila.estado === 'pendiente' && (
                      <tr>
                        <td />
                        <td colSpan={11} style={{ paddingBottom: '10px' }}>
                          <div className="red-acciones" style={{ marginTop: 0 }}>
                            <a className="ds-btn-primary" style={{ textDecoration: 'none' }} target="_blank" rel="noopener noreferrer"
                              href={enlaceWhatsapp(mensajeInvitacion(fila.tipo, fila.nombre, fila.token), fila.telefono)}>
                              Enviar por WhatsApp
                            </a>
                            <button type="button" className="ds-btn-secondary" onClick={() => copiar(fila)}>{copiado === fila.id ? '✓ Copiado' : 'Copiar enlace'}</button>
                            <a className="red-enlace" href={enlaceInvitacionElenco(fila.token)} target="_blank" rel="noopener noreferrer">Ver página</a>
                            <button type="button" className="red-enlace" disabled={pending} onClick={() => anular(fila)}>Anular</button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {abierto === fila.id && (
                      <tr>
                        <td />
                        <td colSpan={11} style={{ padding: '6px 0 16px' }}>
                          <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '8px' }}>
                            {[fila.telefono, fila.email].filter(Boolean).join(' · ')}{fila.nota ? ` · ${fila.nota}` : ''}
                            {fila.bono === 'disponible' && fila.bonoLimite && ` · Bono activable hasta el ${fecha(fila.bonoLimite)}`}
                          </p>
                          {fila.referidos.length === 0 ? (
                            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Sin referidos todavía.</p>
                          ) : (
                            <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse' }}>
                              <thead><tr style={{ textAlign: 'left', color: 'var(--muted)' }}><th>Nombre</th><th>Tipo</th><th>Alta</th><th>Activo</th><th>Plan</th><th>Origen del plan</th></tr></thead>
                              <tbody>
                                {fila.referidos.map(r => (
                                  <tr key={r.profileId} style={{ borderTop: '1px solid var(--border)' }}>
                                    <td style={celda}>{r.nombre}</td>
                                    <td style={celda}>{CLASE[r.clase] ?? r.clase}</td>
                                    <td style={celda}>{fecha(r.alta)}</td>
                                    <td style={celda}>{r.activo ? 'Sí' : 'No'}</td>
                                    <td style={celda}>{r.plan}</td>
                                    <td style={celda}>
                                      {etiquetaOrigen(r.origen)}
                                      {r.origen.origen === 'pago' && r.origen.desde && <span style={{ color: 'var(--muted)' }}> · desde {fecha(r.origen.desde)}</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          {fila.semanasPendientes > 0 && (
                            <div style={{ marginTop: '12px' }}>
                              <p style={{ fontSize: '13px', marginBottom: '6px' }}><strong>{fila.semanasPendientes} semana{fila.semanasPendientes === 1 ? '' : 's'} de destacado en Cartelera</strong> por aplicar.</p>
                              {(espectaculos[fila.id] ?? []).length === 0 ? (
                                <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Esta organización aún no tiene espectáculos en Cartelera.</p>
                              ) : (
                                <div className="red-acciones" style={{ marginTop: 0 }}>
                                  <select className="ds-select" style={{ width: 'auto' }} aria-label="Espectáculo" value={semana.espectaculoId}
                                    onChange={e => setSemana({ ...semana, espectaculoId: e.target.value })}>
                                    <option value="">Espectáculo…</option>
                                    {(espectaculos[fila.id] ?? []).map(e => <option key={e.id} value={e.id}>{e.titulo}</option>)}
                                  </select>
                                  <input type="date" className="ds-input" style={{ width: 'auto' }} aria-label="Desde" value={semana.desde}
                                    onChange={e => setSemana({ ...semana, desde: e.target.value })} />
                                  <select className="ds-select" style={{ width: 'auto' }} aria-label="Semanas" value={semana.semanas}
                                    onChange={e => setSemana({ ...semana, semanas: Number(e.target.value) })}>
                                    {Array.from({ length: Math.min(4, fila.semanasPendientes) }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} semana{n === 1 ? '' : 's'}</option>)}
                                  </select>
                                  <button type="button" className="ds-btn-primary" disabled={pending || !semana.espectaculoId || !semana.desde} onClick={() => aplicar(fila)}>Aplicar</button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
