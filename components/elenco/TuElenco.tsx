'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { activarBonoElenco } from '@/app/perfil/red/elenco-acciones'
import { enlaceWhatsapp } from '@/lib/embajadores/textos'
import {
  distintivo, enlaceElenco, mensajeColegasElenco, progresoEscalera, recompensaEscalon, type TipoFundador,
} from '@/lib/elenco/textos'

export type DatosElenco = {
  numero: number; tipo: string; bono_estado: string; bono_limite: string; bono_hasta: string | null
  registrados: number; activos: number; puntos: number; escalon: number; semanas_cartelera: number
  plan_vigente: string | null; cortesia_hasta: string | null
}

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
const PLAN: Record<string, string> = { premium: 'Premium', destacado: 'Destacado', empresas: 'Empresas' }

/** Mi red: bloque «Tu elenco» del fundador (solo sus cifras). */
export default function TuElenco({ datos, nombre, bienvenida }: { datos: DatosElenco; nombre: string; bienvenida: boolean }) {
  const router = useRouter()
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const tipo: TipoFundador = datos.tipo === 'organizacion' ? 'organizacion' : 'persona'
  const enlace = enlaceElenco(datos.numero)
  const progreso = progresoEscalera(datos.puntos)
  const planBono = tipo === 'organizacion' ? 'Empresas' : 'Premium'

  const copiar = async () => {
    try { await navigator.clipboard.writeText(enlace) } catch { /* sin portapapeles */ }
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }
  const activar = () => {
    if (!window.confirm(`¿Activar ahora tus 3 meses de ${planBono}? Empiezan hoy, sin tarjeta y sin cobros.`)) return
    startTransition(async () => {
      setError('')
      const r = await activarBonoElenco()
      if (r.ok) router.refresh()
      else setError(r.error ?? 'No se pudo activar.')
    })
  }

  return (
    <section className="account-card cortesia" style={{ marginBottom: '20px' }}>
      <p className="cortesia-eyebrow">{bienvenida ? 'Bienvenida' : 'Tu elenco'}</p>
      <h2 className="cortesia-titulo">{distintivo(datos.numero)}</h2>
      <p className="cortesia-p">
        {bienvenida && <>Gracias por aceptar la invitación. </>}
        Estamos construyendo entre todos la casa del teatro en español. Tu plan de base es el gratuito, para siempre y sin compromiso.
      </p>

      <div className="cortesia-enlace">
        <p className="cortesia-p" style={{ marginBottom: '6px' }}><strong>Bono de bienvenida: 3 meses de {planBono}</strong></p>
        {datos.bono_estado === 'disponible' && (
          <>
            <p className="cortesia-p">Actívalo cuando quieras hasta el <strong>{fecha(datos.bono_limite)}</strong>. Sin tarjeta y sin cobros.</p>
            <button type="button" className="ds-btn-primary" style={{ width: 'auto', padding: '9px 18px', fontSize: '13px', marginTop: '8px' }} disabled={pending} onClick={activar}>
              {pending ? 'Activando…' : 'Activar mis 3 meses'}
            </button>
            {error && <p className="inv-error">{error}</p>}
          </>
        )}
        {datos.bono_estado === 'activo' && datos.bono_hasta && <p className="cortesia-p">Activo hasta el <strong>{fecha(datos.bono_hasta)}</strong>.</p>}
        {datos.bono_estado === 'usado' && <p className="cortesia-p">Ya lo disfrutaste.</p>}
        {datos.bono_estado === 'caducado' && <p className="cortesia-p">El plazo para activarlo terminó el {fecha(datos.bono_limite)}.</p>}
        {datos.plan_vigente && datos.cortesia_hasta && (
          <p className="cortesia-cifra">
            Ahora disfrutas de {PLAN[datos.plan_vigente] ?? datos.plan_vigente} por el Elenco Fundador
            {datos.cortesia_hasta.startsWith('infinity') ? ', para siempre.' : `; tu tiempo de cortesía llega hasta el ${fecha(datos.cortesia_hasta)}.`}
          </p>
        )}
      </div>

      <div className="cortesia-enlace">
        <p className="cortesia-p" style={{ marginBottom: '8px' }}><strong>Tu enlace para colegas.</strong> Unirse es gratis; cada colega activo te suma puntos.</p>
        <div className="compartir-url">
          <input readOnly value={enlace} aria-label="Tu enlace del Elenco" onFocus={e => e.currentTarget.select()} />
          <button type="button" onClick={copiar}>{copiado ? '✓ Copiado' : 'Copiar enlace'}</button>
        </div>
        <div className="cortesia-botones">
          <a className="ds-btn-secondary cortesia-wa" href={enlaceWhatsapp(mensajeColegasElenco(nombre, datos.numero))} target="_blank" rel="noopener noreferrer">
            Compartir por WhatsApp
          </a>
        </div>

        <div className="elenco-cifras">
          <div><b>{datos.registrados}</b><span>colegas registrados</span></div>
          <div><b>{datos.activos}</b><span>colegas activos</span></div>
          <div><b>{datos.puntos}</b><span>puntos</span></div>
        </div>

        {progreso ? (
          <>
            <p className="cortesia-cifra" style={{ marginTop: 0 }}>
              {datos.puntos} de {progreso.siguiente} puntos para tu siguiente escalón: {recompensaEscalon(progreso.siguiente, tipo)}.
            </p>
            <div className="elenco-progreso" role="progressbar" aria-valuemin={progreso.anterior} aria-valuemax={progreso.siguiente} aria-valuenow={datos.puntos}>
              <span style={{ width: `${Math.round(progreso.progreso * 100)}%` }} />
            </div>
          </>
        ) : (
          <p className="cortesia-cifra">Has completado la escalera: eres Miembro de Honor.</p>
        )}
        {datos.semanas_cartelera > 0 && (
          <p className="cortesia-cifra">Tienes {datos.semanas_cartelera} semana{datos.semanas_cartelera === 1 ? '' : 's'} de destacado en Cartelera: escríbenos a hola@obrasdeteatro.com y lo aplicamos a vuestro espectáculo.</p>
        )}
        <p className="cortesia-cifra">
          Persona activa (correo confirmado y foto): 1 punto. Organización con perfil completo y logo, o sala con su ficha reclamada: 3 puntos.{' '}
          <Link href="/elenco-fundador/bases">Bases del programa</Link>
        </p>
      </div>
    </section>
  )
}
