'use server'

import { redirect } from 'next/navigation'
import { darDeBajaPorToken } from '@/lib/alertas/baja'

/** POST del botón de /alertas/baja. Es lo único que da de baja desde esa página. */
export async function confirmarBaja(formData: FormData): Promise<void> {
  const resultado = await darDeBajaPorToken(String(formData.get('t') ?? ''))
  redirect(`/alertas/baja?resultado=${resultado}`)
}
