'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface Props {
  profileId: string
  initialAvatarUrl: string | null
  displayName: string
}

function buildInitialCrop(w: number, h: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, 1, w, h),
    w,
    h,
  )
}

export default function AvatarUpload({ profileId, initialAvatarUrl, displayName }: Props) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl)
  const [imgSrc, setImgSrc] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [showModal, setShowModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const inicial = displayName.charAt(0).toUpperCase()

  const closeModal = useCallback(() => {
    setShowModal(false)
    setError('')
  }, [])

  // ESC closes modal + body scroll lock
  useEffect(() => {
    if (!showModal) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [showModal, closeModal])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError('')

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Usa una imagen en formato JPG, PNG o WebP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen pesa más de 2 MB. Comprime la foto antes de subirla.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      const img = new window.Image()
      img.onload = () => {
        if (img.naturalWidth < 400 || img.naturalHeight < 400) {
          setError('La imagen es demasiado pequeña. Usa una foto de al menos 400×400 px.')
          return
        }
        setImgSrc(src)
        setCrop(undefined)
        setCompletedCrop(undefined)
        setShowModal(true)
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  }

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    setCrop(buildInitialCrop(w, h))
  }, [])

  const handleSaveCrop = async () => {
    if (!completedCrop || !imgRef.current) return
    setUploading(true)
    setError('')

    try {
      const img = imgRef.current
      const scaleX = img.naturalWidth / img.width
      const scaleY = img.naturalHeight / img.height

      const sw = completedCrop.width * scaleX
      const sh = completedCrop.height * scaleY
      const size = Math.min(800, Math.round(sw))

      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Error al procesar la imagen.')

      ctx.drawImage(
        img,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        sw, sh,
        0, 0, size, size,
      )

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Error al generar la imagen.'))),
          'image/jpeg',
          0.82,
        )
      )

      const supabase = createClient()
      const storagePath = `${profileId}/avatar.jpg`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true })
      if (upErr) throw new Error('No se pudo subir la foto. Inténtalo de nuevo.')

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(storagePath)
      const urlWithV = `${publicUrl}?v=${Date.now()}`

      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithV, updated_at: new Date().toISOString() })
        .eq('id', profileId)
      if (dbErr) throw new Error('Foto subida, pero no se pudo guardar el enlace. Inténtalo de nuevo.')

      setAvatarUrl(urlWithV)
      setShowModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado. Inténtalo de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('id', profileId)
      if (!dbErr) {
        // best-effort: failure leaves an orphan file but does not affect UX
        await supabase.storage.from('avatars').remove([`${profileId}/avatar.jpg`])
        setAvatarUrl(null)
        setShowDeleteConfirm(false)
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="avatar-section">
        {/* Circle avatar / initial */}
        <div className="avatar-display-wrap">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={`Foto de perfil de ${displayName}`}
              width={80}
              height={80}
              className="avatar-img"
              sizes="80px"
            />
          ) : (
            <div className="avatar-inicial" aria-label={`Inicial de ${displayName}`}>
              {inicial}
            </div>
          )}
          <button
            type="button"
            className="avatar-overlay-btn"
            onClick={() => { setShowDeleteConfirm(false); fileInputRef.current?.click() }}
            aria-label={avatarUrl ? 'Cambiar foto de perfil' : 'Añadir foto de perfil'}
          >
            {avatarUrl ? 'Cambiar' : '+ Foto'}
          </button>
        </div>

        {/* Info + actions */}
        <div className="avatar-info">
          <p className="avatar-label">Foto de perfil</p>
          <p className="avatar-hint">JPG, PNG o WebP · mín. 400×400 px · máx. 2 MB</p>
          <div className="avatar-actions">
            <button
              type="button"
              className="avatar-action-btn"
              onClick={() => { setShowDeleteConfirm(false); fileInputRef.current?.click() }}
            >
              {avatarUrl ? 'Cambiar foto' : 'Añadir foto'}
            </button>
            {avatarUrl && !showDeleteConfirm && (
              <button
                type="button"
                className="avatar-action-btn avatar-action-btn--danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Eliminar foto
              </button>
            )}
          </div>

          {showDeleteConfirm && (
            <div className="avatar-delete-row">
              <span className="avatar-confirm-text">¿Eliminar tu foto de perfil?</span>
              <button
                type="button"
                className="avatar-action-btn"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="avatar-action-btn avatar-action-btn--danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          )}

          {error && !showModal && (
            <p className="avatar-error" role="alert">{error}</p>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileSelect}
      />

      {/* Crop modal */}
      {showModal && (
        <div
          className="avatar-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Ajusta tu foto de perfil"
        >
          <div className="avatar-modal">
            <h2 className="avatar-modal-title">Ajusta tu foto de perfil</h2>

            <div className="avatar-crop-area">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                minWidth={50}
                circularCrop
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Imagen para recortar"
                  onLoad={onImageLoad}
                  style={{ maxHeight: '60vh', maxWidth: '100%', display: 'block' }}
                />
              </ReactCrop>
            </div>

            {error && <p className="avatar-error" role="alert">{error}</p>}

            <div className="avatar-modal-actions">
              <button
                type="button"
                className="ds-btn-secondary"
                onClick={closeModal}
                disabled={uploading}
                style={{ width: 'auto', padding: '9px 20px', fontSize: '13px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="ds-btn-primary"
                onClick={handleSaveCrop}
                disabled={uploading || !completedCrop}
                style={{ width: 'auto', padding: '9px 24px', fontSize: '13px' }}
              >
                {uploading ? 'Subiendo...' : 'Guardar foto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
