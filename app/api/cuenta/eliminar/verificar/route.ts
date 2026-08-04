import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verificarCondicionesPrevias } from '@/lib/cuenta/verificar-condiciones-previas'

/**
 * AEC-003B Fase 3: endpoint exclusivamente diagnóstico. No escribe en
 * ningún sitio -- delega toda la lógica de solo lectura en
 * lib/cuenta/verificar-condiciones-previas.ts.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, code: 'unauthenticated' }, { status: 401 })
  }

  const diagnostico = await verificarCondicionesPrevias(user.id)
  return NextResponse.json({ ok: true, ...diagnostico })
}
