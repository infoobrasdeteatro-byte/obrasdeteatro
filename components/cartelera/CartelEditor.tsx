'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SelectorImagen from '@/app/perfil/SelectorImagen'
import { validarImagen, urlPublica, rutaDesdeUrl } from '@/lib/perfil-multimedia/multimedia'
import { redimensionarImagen } from '@/lib/perfil-multimedia/redimensionar'
import { BUCKET_CARTELES, rutaCartel, mensajeErrorCartelera } from '@/lib/cartelera/cartelera'
import { Seccion } from './EspectaculoForm'

/** Cartel del espectáculo: vertical, se reduce a 1600 px y se guarda en «carteles/{user_id}/». */
export default function CartelEditor({
  userId, espectaculoId, cartelUrl, supabaseUrl,
}: { userId: string; espectaculoId: string; cartelUrl: string | null; supabaseUrl: string }) {
  const router = useRouter()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const subir = async () => {
    setAviso(null)
    if (!archivo) { setAviso({ tipo: 'error', texto: 'Elige una imagen.' }); return }
    const problema = validarImagen(archivo)
    if (problema) { setAviso({ tipo: 'error', texto: problema }); return }
    setOcupado(true)
    try {
      const { blob, tipo, ext } = await redimensionarImagen(archivo, 1600)
      const supabase = createClient()
      const ruta = rutaCartel(userId, ext)
      const { error: eSubida } = await supabase.storage.from(BUCKET_CARTELES).upload(ruta, blob, { contentType: tipo })
      if (eSubida) throw new Error(mensajeErrorCartelera(eSubida.message))
      const { error } = await supabase.from('espectaculos')
        .update({ cartel_url: urlPublica(supabaseUrl, BUCKET_CARTELES, ruta) }).eq('id', espectaculoId)
      if (error) { await supabase.storage.from(BUCKET_CARTELES).remove([ruta]); throw new Error(mensajeErrorCartelera(error.message)) }
      const anterior = rutaDesdeUrl(cartelUrl, BUCKET_CARTELES)
      if (anterior) await supabase.storage.from(BUCKET_CARTELES).remove([anterior])
      setArchivo(null)
      setAviso({ tipo: 'ok', texto: 'Cartel guardado.' })
      router.refresh()
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo subir el cartel.' })
    }
    setOcupado(false)
  }

  const quitar = async () => {
    if (!confirm('¿Quitar el cartel?')) return
    setOcupado(true); setAviso(null)
    const supabase = createClient()
    const { error } = await supabase.from('espectaculos').update({ cartel_url: null }).eq('id', espectaculoId)
    if (error) setAviso({ tipo: 'error', texto: mensajeErrorCartelera(error.message) })
    else {
      const anterior = rutaDesdeUrl(cartelUrl, BUCKET_CARTELES)
      if (anterior) await supabase.storage.from(BUCKET_CARTELES).remove([anterior])
      router.refresh()
    }
    setOcupado(false)
  }

  return (
    <section className="account-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Seccion titulo="Cartel" />
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{
          width: '140px', aspectRatio: '2 / 3', borderRadius: 'var(--radius)', overflow: 'hidden',
          background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {cartelUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={cartelUrl} alt="Cartel actual" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', padding: '8px' }}>Sin cartel</span>}
        </div>
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p className="ds-form-hint">
            Formato vertical (2:3, por ejemplo 1000 × 1500 px). JPEG, PNG o WebP de hasta 5 MB. Usa solo imágenes
            que tengas derecho a publicar.
          </p>
          <SelectorImagen id="cartel" archivo={archivo} onCambio={setArchivo} deshabilitado={ocupado}
            etiqueta={cartelUrl ? 'Elegir otro cartel' : 'Elegir cartel'} />
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="ds-btn-primary" disabled={ocupado || !archivo}
              style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }} onClick={subir}>
              {ocupado ? 'Subiendo…' : 'Guardar cartel'}
            </button>
            {cartelUrl && (
              <button type="button" className="table-link table-link--danger" disabled={ocupado} onClick={quitar}>Quitar</button>
            )}
          </div>
          {aviso && <div className={aviso.tipo === 'ok' ? 'ds-alert-success' : 'ds-alert-error'}>{aviso.texto}</div>}
        </div>
      </div>
    </section>
  )
}
