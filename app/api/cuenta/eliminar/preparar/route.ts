import { NextRequest, NextResponse } from 'next/server'
import { createClient as createBrowserlikeClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { verificarCondicionesPrevias } from '@/lib/cuenta/verificar-condiciones-previas'

/**
 * AEC-003B Fase 4 (DA-005): verifica que un usuario está en condiciones de
 * continuar -- reautenticación y consentimiento informado, cada uno
 * comprobado de forma independiente, más las condiciones técnicas ya
 * evaluadas por el motor de la Fase 3 (reutilizado, no duplicado).
 *
 * No ejecuta ninguna acción irreversible: ni cancela Stripe, ni anonimiza,
 * ni invalida el Plano 1, ni dispara el Evento Arquitectónico Atómico.
 * Esas piezas llegan en fases posteriores.
 */
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
  const diagnostico = await verificarCondicionesPrevias(user.id)
  if (!diagnostico.cumpleTodas) {
    return NextResponse.json({ ok: false, code: 'condiciones_no_cumplidas', diagnostico }, { status: 400 })
  }

  const { password, consentimiento } = await req.json()

  // Consentimiento informado -- comprobación independiente de la identidad.
  if (consentimiento !== true) {
    return NextResponse.json({ ok: false, code: 'consentimiento_no_otorgado' }, { status: 400 })
  }

  // Reautenticación inmediata -- comprobación independiente del consentimiento.
  if (typeof password !== 'string' || password.length === 0) {
    return NextResponse.json({ ok: false, code: 'reautenticacion_requerida' }, { status: 400 })
  }

  const reautenticacionClient = createBrowserlikeClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error: authError } = await reautenticacionClient.auth.signInWithPassword({
    email: user.email,
    password,
  })

  if (authError) {
    return NextResponse.json({ ok: false, code: 'contrasena_incorrecta' }, { status: 400 })
  }

  // Ambas condiciones (identidad y consentimiento) y las condiciones
  // técnicas se cumplen. No se ejecuta todavía ninguna acción irreversible.
  return NextResponse.json({ ok: true, listo: true })
}
