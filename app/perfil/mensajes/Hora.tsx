'use client'

import { useEffect, useState } from 'react'
import { fechaMensaje } from '@/lib/mensajes/mensajes'

/**
 * Hora de un mensaje en la zona horaria de quien lee. Se formatea en el
 * navegador: en el servidor (Vercel, UTC) saldría con otra hora.
 */
export default function Hora({ iso }: { iso: string }) {
  const [texto, setTexto] = useState('')
  useEffect(() => { setTexto(fechaMensaje(iso)) }, [iso])
  return <time dateTime={iso}>{texto}</time>
}
