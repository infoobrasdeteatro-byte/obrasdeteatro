'use client'

import { useEffect, useState } from 'react'
import BandejaReclamaciones, { type ReclamacionAdmin } from './BandejaReclamaciones'
import BandejaSugerencias, { type SugerenciaAdmin } from './BandejaSugerencias'

type Pestana = 'reclamaciones' | 'sugerencias'

const PESTANAS: { id: Pestana; label: string }[] = [
  { id: 'reclamaciones', label: 'Reclamaciones' },
  { id: 'sugerencias', label: 'Sugerencias' },
]

/**
 * Pestañas «Reclamaciones» y «Sugerencias» de /admin/espacios. Los enlaces de
 * los correos de aviso llegan con #reclamaciones o #sugerencias y abren la
 * suya.
 */
export default function Bandejas({ reclamaciones, sugerencias }: { reclamaciones: ReclamacionAdmin[]; sugerencias: SugerenciaAdmin[] }) {
  const [activa, setActiva] = useState<Pestana>('reclamaciones')

  useEffect(() => {
    if (window.location.hash === '#sugerencias') setActiva('sugerencias')
  }, [])

  const pendientes: Record<Pestana, number> = {
    reclamaciones: reclamaciones.filter(r => r.estado === 'pendiente').length,
    sugerencias: sugerencias.filter(s => s.estado === 'pendiente').length,
  }

  return (
    <div style={{ marginBottom: '32px' }}>
      <div className="esp-pestanas" role="tablist" aria-label="Bandejas de moderación">
        {PESTANAS.map(p => (
          <button key={p.id} id={p.id} type="button" role="tab" className="esp-pestana"
            aria-selected={activa === p.id} aria-controls={`panel-${p.id}`} onClick={() => setActiva(p.id)}>
            {p.label}{pendientes[p.id] > 0 ? ` (${pendientes[p.id]})` : ''}
          </button>
        ))}
      </div>
      <div id="panel-reclamaciones" role="tabpanel" aria-labelledby="reclamaciones" hidden={activa !== 'reclamaciones'}>
        <BandejaReclamaciones inicial={reclamaciones} />
      </div>
      <div id="panel-sugerencias" role="tabpanel" aria-labelledby="sugerencias" hidden={activa !== 'sugerencias'}>
        <BandejaSugerencias inicial={sugerencias} />
      </div>
    </div>
  )
}
