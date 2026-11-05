'use client'

import { useState } from 'react'
import {
  CANALES, DISTINTIVOS, LIMITE_MAILTO, enlaceMailtoPreinvitacion, enlaceWhatsappPreinvitacion, preinvitacion, textoParaCopiar,
  type Canal, type Distintivo,
} from '@/lib/admin/preinvitacion'

/**
 * Preinvitación: el primer mensaje personal, sin enlace. Eliges distintivo,
 * canal y nombre; el texto sale de la plantilla y se puede editar antes de
 * abrir WhatsApp o el correo. No guarda nada ni envía nada por sí solo.
 */
export default function GeneradorPreinvitacion() {
  const [distintivo, setDistintivo] = useState<Distintivo>('embajador')
  const [canal, setCanal] = useState<Canal>('whatsapp')
  const [nombre, setNombre] = useState('')
  const [destino, setDestino] = useState('')
  const [texto, setTexto] = useState(() => preinvitacion('embajador', 'whatsapp'))
  const [copiado, setCopiado] = useState(false)

  // Cambiar distintivo, canal o nombre vuelve a la plantilla (se pierden los retoques).
  const regenerar = (d: Distintivo, c: Canal, n: string) => {
    setTexto(preinvitacion(d, c, n))
    setCopiado(false)
  }

  const mailto = canal === 'correo' ? enlaceMailtoPreinvitacion(texto.asunto ?? '', texto.cuerpo, destino) : null
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(canal === 'correo' ? textoParaCopiar(texto.asunto ?? '', texto.cuerpo) : texto.cuerpo)
      setCopiado(true)
    } catch { /* sin portapapeles */ }
  }

  return (
    <div className="account-card">
      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="pi-distintivo">Distintivo</label>
          <select id="pi-distintivo" className="ds-select" value={distintivo}
            onChange={e => { const d = e.target.value as Distintivo; setDistintivo(d); regenerar(d, canal, nombre) }}>
            {DISTINTIVOS.map(d => <option key={d.id} value={d.id}>{d.etiqueta}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="pi-canal">Canal</label>
          <select id="pi-canal" className="ds-select" value={canal}
            onChange={e => { const c = e.target.value as Canal; setCanal(c); setDestino(''); regenerar(distintivo, c, nombre) }}>
            {CANALES.map(c => <option key={c.id} value={c.id}>{c.etiqueta}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="pi-nombre">Nombre</label>
          <input id="pi-nombre" className="ds-input" value={nombre} maxLength={120} autoComplete="off"
            onChange={e => { setNombre(e.target.value); regenerar(distintivo, canal, e.target.value) }} />
          <p className="ds-form-hint">Solo se usa el nombre de pila.</p>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="pi-destino">{canal === 'whatsapp' ? 'Teléfono (opcional)' : 'Correo (opcional)'}</label>
          <input id="pi-destino" className="ds-input" value={destino} maxLength={200} autoComplete="off"
            type={canal === 'whatsapp' ? 'tel' : 'email'} placeholder={canal === 'whatsapp' ? '+34 600 000 000' : 'nombre@ejemplo.com'}
            onChange={e => setDestino(e.target.value)} />
          <p className="ds-form-hint">{canal === 'whatsapp' ? 'Con prefijo; sin él, WhatsApp te deja elegir el contacto.' : 'Si lo dejas vacío, lo escribes en tu programa de correo.'}</p>
        </div>
      </div>

      {canal === 'correo' && (
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="pi-asunto">Asunto</label>
          <input id="pi-asunto" className="ds-input" value={texto.asunto ?? ''}
            onChange={e => { setTexto({ ...texto, asunto: e.target.value }); setCopiado(false) }} />
        </div>
      )}
      <div className="ds-form-group">
        <label className="ds-label" htmlFor="pi-cuerpo">Mensaje</label>
        <textarea id="pi-cuerpo" className="ds-textarea" rows={16} value={texto.cuerpo}
          onChange={e => { setTexto({ ...texto, cuerpo: e.target.value }); setCopiado(false) }} />
        <p className="ds-form-hint">Revísalo y retócalo antes de enviarlo. Cambiar distintivo, canal o nombre vuelve a la plantilla.</p>
      </div>

      <div className="red-acciones">
        {canal === 'whatsapp' ? (
          <a className="ds-btn-primary" style={{ textDecoration: 'none' }} target="_blank" rel="noopener noreferrer"
            href={enlaceWhatsappPreinvitacion(texto.cuerpo, destino)}>
            Abrir en WhatsApp
          </a>
        ) : (
          <a className="ds-btn-primary" style={{ textDecoration: 'none' }} href={mailto ?? undefined}>Abrir en el correo</a>
        )}
        {mailto !== null && mailto.length > LIMITE_MAILTO && (
          <button type="button" className="ds-btn-secondary" onClick={copiar}>{copiado ? '✓ Copiado' : 'Copiar texto'}</button>
        )}
      </div>
      {mailto !== null && mailto.length > LIMITE_MAILTO && (
        <p className="ds-form-hint" style={{ marginTop: '8px' }}>
          El correo es largo ({mailto.length.toLocaleString('es-ES')} caracteres en el enlace) y algunos programas lo cortan. Si llega incompleto, usa «Copiar texto» y pégalo.
        </p>
      )}
    </div>
  )
}
