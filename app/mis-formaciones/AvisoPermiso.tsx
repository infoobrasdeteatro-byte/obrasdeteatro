import Link from 'next/link'
import type { Permiso } from '@/lib/formacion/permisos'

/** Aviso cuando el perfil no puede publicar formaciones (o necesita subir de plan). */
export default function AvisoPermiso({ permiso }: { permiso: Permiso }) {
  if (permiso === 'puede') return null
  return (
    <div className="ds-status-banner ds-status-banner--draft" style={{ marginBottom: '20px' }}>
      <div>
        <div className="ds-status-title">
          {permiso === 'necesita_plan'
            ? 'Para publicar formaciones como profesional necesitas un plan Premium o superior'
            : 'Tu tipo de perfil no puede publicar formaciones'}
        </div>
        <div className="ds-status-hint">
          Las escuelas, compañías, teatros, festivales, productoras e instituciones publican con
          cualquier plan. Los actores, directores, dramaturgos y demás profesionales, con plan
          Premium, Destacado o Empresa.
        </div>
      </div>
      {permiso === 'necesita_plan' && (
        <Link href="/precios" className="ds-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', flex: 'none' }}>
          Ver planes
        </Link>
      )}
    </div>
  )
}
