'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { etiquetaEstado, mensajeErrorCartelera } from '@/lib/cartelera/cartelera'
import { useGuardarPendientes } from './Pendientes'
import Compartir from './Compartir'

/**
 * Estado del espectáculo y lo que se puede hacer con él. «Enviar a publicar»
 * pide estado «publicado»; la base decide si sale ya (perfil verificado y
 * texto limpio) o queda en revisión, y aplica el límite del plan.
 */
export default function EstadoPanel({
  espectaculo, funcionesFuturas, limite,
}: {
  espectaculo: { id: string; estado: string; motivo_rechazo: string | null; slug?: string; titulo?: string; cuando?: string | null; donde?: string | null }
  funcionesFuturas: number
  limite: { maximo: number | null; publicados: number }
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const e = espectaculo.estado
  const guardarPendientes = useGuardarPendientes()
  const SECCION: Record<string, string> = { funciones: 'Funciones', entradas: 'Entradas', ficha: 'Ficha artística' }

  const cambiar = async (estado: string) => {
    setAviso(null)
    let guardados: string[] = []
    if (estado === 'publicado') {
      // Lo escrito y no añadido en Funciones, Entradas o Ficha se guarda ahora, no se pierde.
      setOcupado(true)
      const r = await guardarPendientes()
      setOcupado(false)
      guardados = r.guardados
      if (r.fallidos.length) {
        setAviso({ tipo: 'error', texto: `Hay datos sin completar en ${r.fallidos.map(f => `«${SECCION[f] ?? f}»`).join(' y ')}: revisa el aviso en rojo de esa sección y vuelve a pulsar «Enviar a publicar».` })
        return
      }
    }
    if (estado === 'publicado' && funcionesFuturas === 0 && !guardados.includes('funciones')) {
      setAviso({ tipo: 'error', texto: 'Todavía no hay ninguna función guardada. En «Funciones», rellena país, sala o lugar, día y hora, y pulsa «+ Añadir función»: cuando aparezca en la lista ya podrás publicar.' })
      return
    }
    setOcupado(true)
    const { data, error } = await createClient().from('espectaculos').update({ estado }).eq('id', espectaculo.id).select('estado').single()
    setOcupado(false)
    if (error || !data) { setAviso({ tipo: 'error', texto: mensajeErrorCartelera(error?.message) }); return }
    if (estado === 'publicado') {
      setAviso(data.estado === 'publicado'
        ? { tipo: 'ok', texto: 'Publicado. Ya aparece en la cartelera.' }
        : { tipo: 'ok', texto: 'Enviado a revisión. Cuando el equipo de ObrasDeTeatro lo apruebe aparecerá en la cartelera; verás el estado aquí.' })
    }
    router.refresh()
  }

  const titulo: Record<string, string> = {
    borrador: 'Borrador: solo lo ves tú',
    pendiente_revision: 'En revisión',
    publicado: 'Publicado en la cartelera',
    rechazado: 'No aprobado',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado',
    retirado: 'Retirado por el equipo de ObrasDeTeatro',
  }
  const pista: Record<string, string> = {
    borrador: 'Cuando tengas el cartel, las funciones y las entradas, envíalo a publicar.',
    pendiente_revision: 'El equipo lo está revisando. Puedes seguir editándolo mientras tanto.',
    publicado: 'Pasa solo a «Finalizado» cuando termina su última función.',
    rechazado: espectaculo.motivo_rechazo ? `Motivo: ${espectaculo.motivo_rechazo}. Corrígelo y vuelve a enviarlo.` : 'Corrígelo y vuelve a enviarlo.',
    finalizado: 'Ya no sale en el listado, pero su ficha sigue visible. Añade funciones nuevas y vuelve a publicarlo si regresa.',
    cancelado: 'No se muestra en la cartelera.',
    retirado: 'Si crees que es un error, escríbenos a hola@obrasdeteatro.com.',
  }

  const boton = (texto: string, estado: string, primario = false) => (
    <button type="button" className={primario ? 'ds-btn-primary' : 'ds-btn-secondary'} disabled={ocupado}
      style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }} onClick={() => cambiar(estado)}>
      {ocupado ? '…' : texto}
    </button>
  )

  return (
    <section className="account-card cart-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <span className="obras-stat-label">Estado · {etiquetaEstado(e)}</span>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '19px', color: 'var(--black)', marginTop: '4px' }}>{titulo[e] ?? e}</h2>
          <p className="ds-form-hint" style={{ marginTop: '4px' }}>{pista[e]}</p>
        </div>
      </div>

      {['borrador', 'rechazado', 'cancelado', 'finalizado'].includes(e) && limite.maximo !== null && (
        <p className="ds-form-hint">
          Tu plan permite {limite.maximo} espectáculo{limite.maximo === 1 ? '' : 's'} publicado{limite.maximo === 1 ? '' : 's'} a la vez
          (ahora tienes {limite.publicados}).
        </p>
      )}

      {aviso && <div className={aviso.tipo === 'ok' ? 'ds-alert-success' : 'ds-alert-error'}>{aviso.texto}</div>}

      {e !== 'retirado' && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {['borrador', 'rechazado', 'cancelado', 'finalizado'].includes(e) && boton(e === 'borrador' ? 'Enviar a publicar' : 'Volver a enviar a publicar', 'publicado', true)}
          {e === 'pendiente_revision' && boton('Retirar de revisión', 'borrador')}
          {(e === 'publicado' || e === 'finalizado') && espectaculo.slug && (
            <>
              <Compartir slug={espectaculo.slug} titulo={espectaculo.titulo ?? ''} cuando={espectaculo.cuando} donde={espectaculo.donde} variante="primario" />
              <a href={`/cartelera/${espectaculo.slug}`} target="_blank" rel="noopener" className="ds-btn-secondary" style={{ padding: '9px 16px', fontSize: '13px' }}>Ver ficha pública</a>
            </>
          )}
          {e === 'publicado' && boton('Cancelar espectáculo', 'cancelado')}
          {e === 'publicado' && boton('Marcar como finalizado', 'finalizado')}
        </div>
      )}
    </section>
  )
}
