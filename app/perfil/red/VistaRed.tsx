import Link from 'next/link'
import Image from 'next/image'
import { hrefTelefono, hrefWhatsapp } from '@/lib/red/contacto'
import ResponderSolicitud from './ResponderSolicitud'

export type Fila = {
  id: string; direccion: string; estado: string; mensaje: string | null; created_at: string
  otro_id: string; otro_nombre: string; otro_slug: string | null; otro_avatar: string | null; otro_publico: boolean
  email: string | null; telefono: string | null; whatsapp: string | null
}

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Atlantic/Canary' })

/** Contenido de Mi red (separado de la página para poder previsualizarlo). */
export default function VistaRed({ filas }: { filas: Fila[] }) {
  const pendientes = filas.filter(f => f.direccion === 'recibida' && f.estado === 'pendiente')
  const aceptadas  = filas.filter(f => f.direccion === 'recibida' && f.estado === 'aceptada')
  const rechazadas = filas.filter(f => f.direccion === 'recibida' && f.estado === 'rechazada')
  const enviadas   = filas.filter(f => f.direccion === 'enviada')

  return (
    <>
      <div style={{ marginBottom: '24px' }}>
        <p className="red-eyebrow">Mi cuenta</p>
        <h1 className="red-titulo">Mi red</h1>
        <p className="red-intro">
          Aquí decides con quién compartes tu teléfono y tu WhatsApp. Quien te lo pide no recibe ningún aviso si rechazas,
          y puedes retirar el acceso cuando quieras. <Link href="/perfil/bloque/6">Editar mi contacto →</Link>
        </p>
      </div>

      <Seccion titulo="Solicitudes recibidas" cuenta={pendientes.length} vacio="No tienes solicitudes pendientes.">
        {pendientes.map(f => (
          <Tarjeta key={f.id} f={f}>
            {f.mensaje && <p className="red-mensaje">«{f.mensaje}»</p>}
            <ResponderSolicitud id={f.id} estado="pendiente" />
          </Tarjeta>
        ))}
      </Seccion>

      <Seccion titulo="Con acceso a tu contacto" cuenta={aceptadas.length} vacio="Todavía no has compartido tu contacto con nadie.">
        {aceptadas.map(f => (
          <Tarjeta key={f.id} f={f}>
            <ResponderSolicitud id={f.id} estado="aceptada" />
          </Tarjeta>
        ))}
      </Seccion>

      <Seccion titulo="Solicitudes enviadas" cuenta={enviadas.length} vacio="No has pedido el contacto a nadie. Puedes hacerlo desde cualquier perfil del Directorio.">
        {enviadas.map(f => (
          <Tarjeta key={f.id} f={f}>
            {f.estado === 'aceptada' ? (
              <div className="red-datos">
                {f.email && <a href={`mailto:${f.email}`}>{f.email}</a>}
                {f.telefono && <a href={hrefTelefono(f.telefono)}>Tel. {f.telefono}</a>}
                {f.whatsapp && (hrefWhatsapp(f.whatsapp)
                  ? <a href={hrefWhatsapp(f.whatsapp)!} target="_blank" rel="noopener noreferrer">WhatsApp · {f.whatsapp} ↗</a>
                  : <span>WhatsApp · {f.whatsapp}</span>)}
                {!f.email && !f.telefono && !f.whatsapp && <span>Ha aceptado, pero ahora mismo no tiene datos de contacto.</span>}
              </div>
            ) : (
              <p className="red-estado">Pendiente de respuesta</p>
            )}
          </Tarjeta>
        ))}
      </Seccion>

      {rechazadas.length > 0 && (
        <Seccion titulo="Rechazadas" cuenta={rechazadas.length} vacio="">
          {rechazadas.map(f => (
            <Tarjeta key={f.id} f={f}>
              <ResponderSolicitud id={f.id} estado="rechazada" />
            </Tarjeta>
          ))}
        </Seccion>
      )}
    </>
  )
}

function Seccion({ titulo, cuenta, vacio, children }: { titulo: string; cuenta: number; vacio: string; children: React.ReactNode }) {
  return (
    <section className="account-card" style={{ marginBottom: '20px' }}>
      <h2 className="red-seccion">{titulo}{cuenta > 0 && <span className="red-cuenta">{cuenta}</span>}</h2>
      {cuenta === 0 ? <p className="red-vacio">{vacio}</p> : <div className="red-lista">{children}</div>}
    </section>
  )
}

function Tarjeta({ f, children }: { f: Fila; children: React.ReactNode }) {
  const nombre = f.otro_publico && f.otro_slug
    ? <Link href={`/perfil/${f.otro_slug}`} className="red-nombre">{f.otro_nombre}</Link>
    : <span className="red-nombre">{f.otro_nombre}</span>
  return (
    <div className="red-fila">
      {f.otro_avatar
        ? <Image src={f.otro_avatar} alt="" width={44} height={44} className="red-avatar" />
        : <span className="red-avatar red-avatar--inicial" aria-hidden="true">{f.otro_nombre.charAt(0).toUpperCase()}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="red-cabecera">
          {nombre}
          <span className="red-fecha">{fecha(f.created_at)}</span>
        </div>
        {children}
      </div>
    </div>
  )
}
