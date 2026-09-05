import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { resolveScenaiaAccess } from '@/lib/auth/scenaia-access'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import ScenaiaClient from './ScenaiaClient'

export default async function ScenaiaPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  /*
   * Misma decision que el endpoint, tomada en el mismo sitio (P1.3). Esta
   * comprobacion NO es la proteccion -- lo es la del endpoint --: existe
   * para que quien no puede usar ScenaIA no llegue a ver la interfaz y
   * descubra el limite al escribir.
   *
   * La pagina solo traduce el veredicto a una redireccion. No lo interpreta
   * ni lo reimplementa.
   */
  const acceso = await resolveScenaiaAccess(user?.id ?? null)

  if (!acceso.allowed) {
    /*
     * UX-003 -- cada causa tiene su destino. Antes todas acababan en
     * `/dashboard`, de modo que a quien solo le faltaba confirmar su correo
     * se le expulsaba sin decirle nada: un bloqueo correcto vivido como una
     * averia.
     *
     * La pagina no decide nada nuevo: traduce el veredicto que ya trae.
     */
    if (acceso.reason === 'no_autenticado') redirect('/auth/login')
    if (acceso.reason === 'no_verificado') redirect('/verificacion')

    redirect('/dashboard')
  }

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div style={{ marginBottom: '14px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '4px' }}>
              Módulo VI · Centro Profesional
            </p>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(20px, 2.6vw, 26px)', color: 'var(--black)', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: '4px' }}>
              ScenaIA
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
              Interpretación basada en la evidencia actualmente disponible en ScenaIA — no representa todavía tu trayectoria profesional completa.
            </p>
          </div>

          <ScenaiaClient />
        </main>
      </div>
    </div>
  )
}
