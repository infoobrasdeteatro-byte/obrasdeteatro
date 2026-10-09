'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { TIPOS, type Filtros, type Opcion } from '@/lib/espacios/espacios'

type Props = {
  filtros: Filtros
  paises: Opcion[]
  regiones: Opcion[]
  municipios: Opcion[]
  conFiltros: boolean
}

/**
 * Buscador de /espacios: país → región → municipio, tipo y nombre.
 *
 * Es un formulario GET: sin JavaScript funciona con el botón «Buscar» y la
 * búsqueda queda en la URL. Con JavaScript, cambiar un desplegable vacía los
 * que dependen de él y envía el formulario, así la región y el municipio
 * siempre son del país elegido.
 */
export default function FiltrosEspacios({ filtros, paises, regiones, municipios, conFiltros }: Props) {
  const form = useRef<HTMLFormElement>(null)

  const cambiar = (vaciar: ('region' | 'm')[]) => {
    const f = form.current
    if (!f) return
    for (const nombre of vaciar) {
      const campo = f.elements.namedItem(nombre) as HTMLSelectElement | null
      if (campo) campo.value = ''
    }
    f.requestSubmit()
  }

  return (
    <form ref={form} method="get" action="/espacios" className="account-card" style={{ marginBottom: '20px' }} role="search">
      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="esp-pais">País</label>
          <select id="esp-pais" name="pais" className="ds-select" defaultValue={filtros.pais ?? ''} onChange={() => cambiar(['region', 'm'])}>
            <option value="">Todos</option>
            {paises.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="esp-region">Región</label>
          <select id="esp-region" name="region" className="ds-select" defaultValue={filtros.region ?? ''}
            disabled={regiones.length === 0} onChange={() => cambiar(['m'])}>
            <option value="">{filtros.pais ? 'Todas' : 'Elige antes un país'}</option>
            {regiones.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="esp-municipio">Municipio</label>
          <select id="esp-municipio" name="m" className="ds-select" defaultValue={filtros.municipio ?? ''}
            disabled={municipios.length === 0} onChange={() => cambiar([])}>
            <option value="">{filtros.region ? 'Todos' : 'Elige antes una región'}</option>
            {municipios.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="esp-tipo">Tipo</label>
          <select id="esp-tipo" name="tipo" className="ds-select" defaultValue={filtros.tipo ?? ''} onChange={() => cambiar([])}>
            <option value="">Todos</option>
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="esp-q">Nombre</label>
          <input id="esp-q" name="q" type="search" className="ds-input" defaultValue={filtros.q} maxLength={80} placeholder="Guimerá, Pérez Galdós…" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '14px' }}>
        <button type="submit" className="ds-btn-primary" style={{ width: 'auto', padding: '10px 22px', fontSize: '13px' }}>
          Buscar
        </button>
        {conFiltros && <Link href="/espacios" className="table-link">Quitar filtros</Link>}
      </div>
    </form>
  )
}
