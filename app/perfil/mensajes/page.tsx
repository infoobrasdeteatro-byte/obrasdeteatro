import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import Hilo, { type Otro } from './Hilo'
import Hora from './Hora'
import { motivoEscribir, textoNoPuede } from '@/lib/mensajes/mensajes'

export const metadata: Metadata = {
  title: 'Mensajes | ObrasDeTeatro',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ c?: string; con?: string }> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Mensajes (Fase 3 de la red): bandeja a la izquierda y conversación a la
 * derecha. ?c=<conversación> abre una; ?con=<perfil> abre la que haya con ese
 * perfil o una nueva. Las reglas de quién puede escribir están en la base.
 */
export default async function MensajesPage({ searchParams }: Props) {
  const { c, con } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=${encodeURIComponent('/perfil/mensajes' + (con ? `?con=${con}` : c ? `?c=${c}` : ''))}`)

  const { data } = await supabase.rpc('mis_conversaciones')
  const conversaciones = data ?? []

  let seleccion = c && UUID.test(c) ? conversaciones.find(x => x.id === c) ?? null : null
  if (!seleccion && con && UUID.test(con)) seleccion = conversaciones.find(x => x.otro_id === con) ?? null

  // Destinatario: el de la conversación elegida, o el perfil de ?con= si aún no hay conversación.
  let otro: Otro | null = seleccion
    ? { id: seleccion.otro_id, nombre: seleccion.otro_nombre, slug: seleccion.otro_slug, avatar: seleccion.otro_avatar, publico: seleccion.otro_publico }
    : null
  if (!otro && con && UUID.test(con) && con !== user.id) {
    const { data: p } = await supabase.from('profiles')
      .select('id, nombre, apellidos, nombre_artistico, slug, avatar_url').eq('id', con).maybeSingle()
    if (p) {
      otro = {
        id: p.id,
        nombre: p.nombre_artistico?.trim() || [p.nombre, p.apellidos].filter(Boolean).join(' ').trim() || 'Perfil',
        slug: p.slug, avatar: p.avatar_url, publico: true,
      }
    }
  }

  const [{ data: mensajes }, { data: motivoDb }] = await Promise.all([
    seleccion ? supabase.rpc('mensajes_de', { p_conversacion: seleccion.id }) : Promise.resolve({ data: [] }),
    otro ? supabase.rpc('puede_escribir', { p_perfil: otro.id }) : Promise.resolve({ data: null }),
  ])
  const motivo = motivoEscribir(motivoDb)
  const hayHilo = otro !== null

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div style={{ marginBottom: '20px' }}>
            <p className="red-eyebrow">Mi cuenta</p>
            <h1 className="red-titulo">Mensajes</h1>
            <p className="red-intro">
              Con tus contactos conectados, los mensajes son gratis. Para escribir a quien no es contacto necesitas un plan de pago;
              quien recibe tu mensaje siempre puede responderte.
            </p>
          </div>

          <div className={`msj${hayHilo ? ' msj--abierto' : ''}`}>
            <aside className="msj-bandeja" aria-label="Conversaciones">
              {conversaciones.length === 0 ? (
                <p className="msj-vacio">
                  Todavía no tienes conversaciones. Escribe a cualquiera de tus contactos desde <Link href="/perfil/red">Mi red</Link> o desde su perfil.
                </p>
              ) : (
                <ul className="msj-lista">
                  {conversaciones.map(x => (
                    <li key={x.id}>
                      <Link href={`/perfil/mensajes?c=${x.id}`} className={`msj-item${seleccion?.id === x.id ? ' msj-item--activa' : ''}`}>
                        <Avatar nombre={x.otro_nombre} url={x.otro_avatar} />
                        <span className="msj-item-texto">
                          <span className="msj-item-cabecera">
                            <span className="msj-item-nombre">{x.otro_nombre}</span>
                            <span className="msj-item-fecha"><Hora iso={x.ultimo_at} /></span>
                          </span>
                          <span className={`msj-item-ultimo${x.sin_leer > 0 ? ' msj-item-ultimo--nuevo' : ''}`}>
                            {x.ultimo_mio ? 'Tú: ' : ''}{x.ultimo_texto}
                          </span>
                        </span>
                        {x.sin_leer > 0 && <span className="msj-sin-leer" aria-label={`${x.sin_leer} sin leer`}>{x.sin_leer}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            <section className="msj-hilo-zona">
              {otro ? (
                <Hilo
                  key={seleccion?.id ?? `nuevo-${otro.id}`}
                  conversacionId={seleccion?.id ?? null}
                  otro={otro}
                  mensajes={mensajes ?? []}
                  puede={motivo === 'si'}
                  aviso={textoNoPuede(motivo, otro.nombre)}
                  motivo={motivo}
                />
              ) : (
                <p className="msj-vacio msj-vacio--centro">Elige una conversación para leerla.</p>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

function Avatar({ nombre, url }: { nombre: string; url: string | null }) {
  return url
    ? <Image src={url} alt="" width={40} height={40} className="red-avatar msj-avatar" />
    : <span className="red-avatar red-avatar--inicial msj-avatar" aria-hidden="true">{nombre.charAt(0).toUpperCase()}</span>
}
