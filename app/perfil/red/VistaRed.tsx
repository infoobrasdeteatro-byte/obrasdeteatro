import Link from 'next/link'
import Image from 'next/image'
import { hrefTelefono, hrefWhatsapp } from '@/lib/red/contacto'
import ResponderSolicitud from './ResponderSolicitud'
import AccionConexion from './AccionConexion'

export type Fila = {
  id: string; direccion: string; estado: string; mensaje: string | null; created_at: string
  otro_id: string; otro_nombre: string; otro_slug: string | null; otro_avatar: string | null; otro_publico: boolean
  email: string | null; telefono: string | null; whatsapp: string | null
}

/** Una conexión (mis_conexiones) o un seguimiento (mis_seguimientos). */
export type FilaConexion = {
  id: string; direccion: string; estado: string; mensaje: string | null; created_at: string
  otro_id: string; otro_nombre: string; otro_slug: string | null; otro_avatar: string | null; otro_publico: boolean
}
export type FilaSeguimiento = {
  direccion: string; created_at: string
  otro_id: string; otro_nombre: string; otro_slug: string | null; otro_avatar: string | null; otro_publico: boolean
}

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Atlantic/Canary' })

/** Contenido de Mi red (separado de la página para poder previsualizarlo). */
export default function VistaRed({ filas, conexiones = [], seguimientos = [] }: {
  filas: Fila[]; conexiones?: FilaConexion[]; seguimientos?: FilaSeguimiento[]
}) {
  const conRecibidas = conexiones.filter(c => c.direccion === 'recibida' && c.estado === 'pendiente')
  const conectados   = conexiones.filter(c => c.estado === 'aceptada')
  const conEnviadas  = conexiones.filter(c => c.direccion === 'enviada' && c.estado === 'pendiente')
  const seguidores   = seguimientos.filter(s => s.direccion === 'seguidor')
  const siguiendo    = seguimientos.filter(s => s.direccion === 'siguiendo')

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
          Tus conexiones profesionales, quién te sigue y a quién sigues. Estas cifras y listas solo las ves tú.
        </p>
      </div>

      <div className="obras-stat-grid">
        <Contador href="#conexiones" etiqueta="Conexiones" valor={conectados.length} />
        <Contador href="#seguidores" etiqueta="Seguidores" valor={seguidores.length} />
        <Contador href="#siguiendo" etiqueta="Siguiendo" valor={siguiendo.length} />
        <Contador href="#solicitudes" etiqueta="Solicitudes" valor={conRecibidas.length + pendientes.length} destacar />
      </div>

      <Seccion id="solicitudes" titulo="Solicitudes de conexión" cuenta={conRecibidas.length} vacio="No tienes solicitudes de conexión pendientes.">
        {conRecibidas.map(c => (
          <Tarjeta key={c.id} f={c}>
            {c.mensaje && <p className="red-mensaje">«{c.mensaje}»</p>}
            <AccionConexion tipo="recibida" id={c.id} otroId={c.otro_id} nombre={c.otro_nombre} />
          </Tarjeta>
        ))}
      </Seccion>

      <Seccion id="conexiones" titulo="Conexiones" cuenta={conectados.length} vacio="Todavía no tienes conexiones. Pulsa «Conectar» en el perfil de cualquier profesional del Directorio.">
        {conectados.map(c => (
          <Tarjeta key={c.id} f={c}>
            <AccionConexion tipo="conectados" otroId={c.otro_id} nombre={c.otro_nombre} />
          </Tarjeta>
        ))}
      </Seccion>

      {conEnviadas.length > 0 && (
        <Seccion titulo="Conexiones solicitadas" cuenta={conEnviadas.length} vacio="">
          {conEnviadas.map(c => (
            <Tarjeta key={c.id} f={c}>
              <p className="red-estado">Pendiente de respuesta</p>
              <AccionConexion tipo="enviada" otroId={c.otro_id} nombre={c.otro_nombre} />
            </Tarjeta>
          ))}
        </Seccion>
      )}

      <Seccion id="seguidores" titulo="Seguidores" cuenta={seguidores.length} vacio="Todavía no te sigue nadie.">
        {seguidores.map(f => <Tarjeta key={f.otro_id} f={f} />)}
      </Seccion>

      <Seccion id="siguiendo" titulo="Siguiendo" cuenta={siguiendo.length} vacio="No sigues a nadie todavía.">
        {siguiendo.map(f => <Tarjeta key={f.otro_id} f={f} />)}
      </Seccion>

      <div style={{ margin: '36px 0 16px' }}>
        <h2 className="red-titulo" style={{ fontSize: '22px' }}>Teléfono y WhatsApp</h2>
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

function Contador({ href, etiqueta, valor, destacar = false }: { href: string; etiqueta: string; valor: number; destacar?: boolean }) {
  return (
    <a href={href} className="obras-stat-card" style={{ textDecoration: 'none' }}>
      <div className="obras-stat-label">{etiqueta}</div>
      <div className={`obras-stat-value${destacar && valor > 0 ? ' obras-stat-value--amber' : ''}`}>{valor}</div>
    </a>
  )
}

function Seccion({ id, titulo, cuenta, vacio, children }: { id?: string; titulo: string; cuenta: number; vacio: string; children: React.ReactNode }) {
  return (
    <section id={id} className="account-card" style={{ marginBottom: '20px', scrollMarginTop: '80px' }}>
      <h2 className="red-seccion">{titulo}{cuenta > 0 && <span className="red-cuenta">{cuenta}</span>}</h2>
      {cuenta === 0 ? <p className="red-vacio">{vacio}</p> : <div className="red-lista">{children}</div>}
    </section>
  )
}

function Tarjeta({ f, children }: { f: Pick<Fila, 'otro_nombre' | 'otro_slug' | 'otro_avatar' | 'otro_publico' | 'created_at'>; children?: React.ReactNode }) {
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
