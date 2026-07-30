import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { coordinateFlow } from '@/lib/verified/orquestador'
import type { ConversationTurn } from '@/lib/verified/orquestador'

/**
 * Unico punto de entrada HTTP hacia el Orquestador del Flujo Completo
 * (Plan Tecnico aprobado, Acta de Cierre 2026-07-19). Adaptador de entrada
 * exclusivamente: resuelve la sesion ya autenticada (misma frontera que
 * PCE ya tenia -- coordinateFlow() recibe userId/session ya resueltos,
 * nunca deriva identidad por si mismo) y construye SessionInput a partir
 * de la peticion HTTP -- ninguna logica de negocio propia.
 *
 * Ruta separada de `app/api/scenaia/` (Conjunto B, incidente de
 * trazabilidad todavia abierto, sin modificar) -- mismo criterio de
 * ubicacion ya aplicado a `lib/verified/`.
 */

/**
 * UX-001A (Sprint aprobado): valida `body.history` de forma defensiva --
 * nunca se confia en la forma del cuerpo recibido. Cualquier entrada que
 * no sea exactamente `{ role: 'user' | 'assistant', content: string }` se
 * descarta en silencio (degradacion segura, mismo criterio ya aplicado en
 * el resto de este adaptador), nunca lanza excepcion. Sin persistencia:
 * el historial vive solo en el cuerpo de esta peticion.
 */
function parseHistory(value: unknown): ConversationTurn[] {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is ConversationTurn => {
    if (typeof item !== 'object' || item === null) return false
    const turn = item as Record<string, unknown>
    return (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string'
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json()
  const originalRequest = typeof body.message === 'string' ? body.message : ''

  if (originalRequest.trim().length === 0) {
    return NextResponse.json({ error: 'Falta el campo "message"' }, { status: 400 })
  }

  const session = {
    route: typeof body.route === 'string' ? body.route : null,
    module: typeof body.module === 'string' ? body.module : null,
    locale: typeof body.locale === 'string' ? body.locale : 'es',
  }
  const conversationHistory = parseHistory(body.history)

  const responseContext = await coordinateFlow(user.id, session, originalRequest, conversationHistory)

  return NextResponse.json(responseContext)
}
