'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * Bloque 8 «Documentación»: descarga del CV y del dossier artístico en PDF,
 * generados al momento con lo que hay en el perfil (ruta
 * /perfil/documentos/[tipo]). El correo y el teléfono solo salen impresos si
 * la persona lo marca.
 */

export type Contenido = {
  bio: boolean
  experiencia: number
  formacion: number
  premios: number
  especialidades: number
  fotos: number
  proyectos: number
  videos: number
  avatar: boolean
  portada: boolean
  tieneTelefono: boolean
}

const etiquetaGrupo = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '8px' }
const casilla = { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)', cursor: 'pointer' }

function Fila({ ok, texto, bloque }: { ok: boolean; texto: string; bloque: number }) {
  return (
    <li style={{ display: 'flex', gap: '8px', alignItems: 'baseline', fontSize: '13px', fontFamily: 'var(--sans)', color: ok ? 'var(--text)' : 'var(--muted)', padding: '3px 0' }}>
      <span aria-hidden="true" style={{ color: ok ? '#15803d' : 'var(--muted)', width: '14px' }}>{ok ? '✓' : '○'}</span>
      <span style={{ flex: 1 }}>{texto}</span>
      {!ok && <Link href={`/perfil/bloque/${bloque}`} className="table-link" style={{ fontSize: '12px' }}>Completar →</Link>}
    </li>
  )
}

export default function DocumentacionPanel({ c }: { c: Contenido }) {
  const [email, setEmail] = useState(true)
  const [telefono, setTelefono] = useState(false)
  const qs = (extra = '') => {
    const p = new URLSearchParams()
    if (email) p.set('email', '1')
    if (telefono) p.set('telefono', '1')
    const s = p.toString()
    return s ? `?${s}${extra ? `&${extra}` : ''}` : extra ? `?${extra}` : ''
  }
  const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

  const tarjeta = (titulo: string, texto: string, tipo: 'cv' | 'dossier') => (
    <div className="account-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', letterSpacing: '-0.3px', margin: 0 }}>{titulo}</h2>
      <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, fontFamily: 'var(--sans)', margin: 0 }}>{texto}</p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
        {/* Enlaces normales (no fetch): el navegador descarga el PDF por su cuenta. */}
        <a href={`/perfil/documentos/${tipo}${qs()}`} className="ds-btn-primary" style={{ width: 'auto', display: 'inline-block', padding: '10px 18px', textDecoration: 'none' }}>
          Descargar PDF
        </a>
        <a href={`/perfil/documentos/${tipo}${qs('ver=1')}`} target="_blank" rel="noopener" className="ds-btn-secondary" style={{ width: 'auto', display: 'inline-block', padding: '10px 18px', textDecoration: 'none' }}>
          Ver antes
        </a>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="account-card">
        <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, fontFamily: 'var(--sans)', margin: '0 0 14px' }}>
          Tu CV y tu dossier se generan al momento con lo que tienes en el perfil. Si cambias algo en los bloques, la próxima descarga ya sale actualizada.
        </p>
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={etiquetaGrupo}>Datos de contacto que salen impresos</legend>
          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
            <label style={casilla}><input type="checkbox" checked={email} onChange={e => setEmail(e.target.checked)} /> Mi correo electrónico</label>
            <label style={{ ...casilla, opacity: c.tieneTelefono ? 1 : 0.5 }}>
              <input type="checkbox" checked={telefono && c.tieneTelefono} disabled={!c.tieneTelefono} onChange={e => setTelefono(e.target.checked)} />
              Mi teléfono{!c.tieneTelefono && ' (no hay ninguno en tu perfil)'}
            </label>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)', margin: '8px 0 0' }}>
            La web, la URL de tu perfil público y tus redes se incluyen siempre que las tengas.
          </p>
        </fieldset>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {tarjeta('CV profesional', 'Una o dos páginas con tu foto, contacto, perfil, experiencia, formación, premios y especialidades. Para presentarte a castings y convocatorias.', 'cv')}
        {tarjeta('Dossier artístico', 'Portada con tu imagen, biografía completa, trayectoria, proyectos y espectáculos, galería de fotos con sus créditos y vídeos. Para salas, festivales y programadores.', 'dossier')}
      </div>

      <div className="account-card">
        <p style={etiquetaGrupo}>Lo que tus documentos incluyen ahora</p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          <Fila ok={c.avatar} texto="Foto de perfil" bloque={1} />
          <Fila ok={c.bio} texto="Biografía" bloque={1} />
          <Fila ok={c.experiencia > 0} texto={c.experiencia ? plural(c.experiencia, 'experiencia profesional', 'experiencias profesionales') : 'Experiencia profesional'} bloque={4} />
          <Fila ok={c.formacion > 0} texto={c.formacion ? plural(c.formacion, 'formación', 'formaciones') : 'Formación'} bloque={2} />
          <Fila ok={c.premios > 0} texto={c.premios ? plural(c.premios, 'premio', 'premios') : 'Premios (opcional)'} bloque={2} />
          <Fila ok={c.especialidades > 0} texto="Especialidades" bloque={3} />
          <Fila ok={c.portada} texto="Imagen de portada (para el dossier)" bloque={5} />
          <Fila ok={c.fotos > 0} texto={c.fotos ? plural(c.fotos, 'foto en la galería', 'fotos en la galería') : 'Galería de fotos (para el dossier)'} bloque={5} />
          <Fila ok={c.proyectos > 0} texto={c.proyectos ? plural(c.proyectos, 'proyecto del portfolio', 'proyectos del portfolio') : 'Portfolio de proyectos (para el dossier)'} bloque={5} />
        </ul>
      </div>
    </div>
  )
}
