import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verificarCondicionesPrevias, type CondicionPrevia } from '@/lib/cuenta/verificar-condiciones-previas'
import { verificarReautenticacion } from '@/lib/cuenta/verificar-reautenticacion'

/**
 * AEC-003B Fase 4 (DA-005): verifica que un usuario está en condiciones de
 * continuar -- reautenticación y consentimiento informado, cada uno
 * comprobado de forma independiente, más las condiciones técnicas ya
 * evaluadas por el motor de la Fase 3 (reutilizado, no duplicado).
 *
 * No ejecuta ninguna acción irreversible: ni cancela Stripe, ni anonimiza,
 * ni invalida el Plano 1, ni dispara el Evento Arquitectónico Atómico.
 *
 * AEC-003B Fase 6: la comprobación de reautenticación se extrajo a
 * lib/cuenta/verificar-reautenticacion.ts para que el orquestador de la
 * Fase 6 la reutilice sin duplicarla -- mismo comportamiento, sin cambios.
 *
 * AEC-003C: las dos condiciones de Stripe ya no bloquean aquí. Las resuelve
 * /ejecutar, que cancela la suscripción antes del punto de no retorno y
 * repite la verificación completa, fail-closed incluido. Exigirlas aquí
 * impedía la baja a cualquier suscriptor: la única pieza que cancela se
 * ejecuta en "Confirmar", y "Confirmar" solo aparece si este paso tiene
 * éxito. `credit_reservations` sigue bloqueando: /ejecutar no la resuelve.
 * `suscripcionSeCancelara` avisa a la interfaz de que confirmar cancelará
 * la suscripción en el acto (consentimiento informado, DA-005).
 */
const RESUELTAS_EN_EJECUCION: ReadonlyArray<CondicionPrevia['id']> = ['stripe_suscripcion', 'stripe_cobros_pendientes']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ ok: false, code: 'unauthenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('extincion_solicitada_at')
    .eq('id', user.id)
    .single()

  if (!profile?.extincion_solicitada_at) {
    return NextResponse.json({ ok: false, code: 'no_hay_solicitud' }, { status: 400 })
  }

  // Condiciones técnicas de DA-005 -- fuente única, reutilizada de la Fase 3.
  // Solo bloquean las que /ejecutar no resuelve por sí mismo (AEC-003C).
  const diagnostico = await verificarCondicionesPrevias(user.id)
  const incumplidas = diagnostico.condiciones.filter(c => !c.cumple)
  if (incumplidas.some(c => !RESUELTAS_EN_EJECUCION.includes(c.id))) {
    return NextResponse.json({ ok: false, code: 'condiciones_no_cumplidas', diagnostico }, { status: 400 })
  }
  const suscripcionSeCancelara = incumplidas.length > 0

  const { password, consentimiento } = await req.json()

  // Consentimiento informado -- comprobación independiente de la identidad.
  if (consentimiento !== true) {
    return NextResponse.json({ ok: false, code: 'consentimiento_no_otorgado' }, { status: 400 })
  }

  // Reautenticación inmediata -- comprobación independiente del consentimiento.
  const reautenticado = await verificarReautenticacion(user.email, password)
  if (!reautenticado) {
    return NextResponse.json({ ok: false, code: 'contrasena_incorrecta' }, { status: 400 })
  }

  // Ambas condiciones (identidad y consentimiento) y las condiciones
  // técnicas se cumplen. No se ejecuta todavía ninguna acción irreversible.
  return NextResponse.json({ ok: true, listo: true, suscripcionSeCancelara })
}
