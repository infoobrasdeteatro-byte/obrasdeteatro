import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { getIndividualProfileData } from '../individual-profile'
import { createFakeSupabaseClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(createClient).mockReset()
})

describe('getIndividualProfileData', () => {
  it('mapea una fila de perfil_actor, con contacto visible y redes según mostrar_*', async () => {
    const { client, builder } = createFakeSupabaseClient({
      data: {
        biografia: 'Biografía',
        experiencia: 'Experiencia',
        formacion: 'Formación',
        premios: 'Premios',
        habilidad_canto: true,
        habilidad_danza: false,
        habilidad_improvisacion: false,
        habilidad_esgrima: false,
        habilidad_musical: false,
        habilidad_doblaje: false,
        habilidad_presentacion: false,
        habilidad_magia: false,
        habilidad_circo: false,
        otras_habilidades: '',
        disp_castings: true,
        disp_teatro: false,
        disp_cine: false,
        disp_television: false,
        disp_publicidad: false,
        disp_giras: false,
        disp_internacional: false,
        foto_principal: 'foto.jpg',
        web: 'https://actor.example',
        email_profesional: 'actor@example.com',
        telefono: '600000000',
        whatsapp: '600000001',
        instagram: 'actor_ig',
        facebook: null,
        tiktok: null,
        linkedin: null,
        youtube: null,
        mostrar_email: true,
        mostrar_telefono: false,
        mostrar_whatsapp: true,
        mostrar_redes: true,
      },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getIndividualProfileData('user-1', 'actor')

    expect(result).toEqual({
      biography: 'Biografía',
      trajectory: 'Experiencia',
      training: 'Formación',
      awards: 'Premios',
      specializations: ['canto'],
      availability: ['castings'],
      activityCounters: null,
      photoUrl: 'foto.jpg',
      website: 'https://actor.example',
      contactEmail: 'actor@example.com',
      contactPhone: null,
      whatsapp: '600000001',
      socialLinks: { instagram: 'actor_ig' },
    })
    expect(client.from).toHaveBeenCalledWith('perfil_actor')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('perfil_director: whatsapp siempre null al no existir mostrar_whatsapp en esa tabla (fail-closed)', async () => {
    const { client } = createFakeSupabaseClient({
      data: {
        biografia: null,
        trayectoria: null,
        formacion: null,
        premios: null,
        esp_clasico: true,
        esp_contemporaneo: false,
        esp_musical: false,
        esp_infantil: false,
        esp_experimental: false,
        esp_opera: false,
        esp_zarzuela: false,
        esp_performance: false,
        esp_comunitario: false,
        otras_especialidades: null,
        disp_proyectos: false,
        disp_coproducciones: false,
        disp_festivales: false,
        disp_giras: false,
        disp_internacional: false,
        disp_formacion: false,
        foto_principal: null,
        web: null,
        email_profesional: null,
        telefono: null,
        whatsapp: '600000002',
        instagram: null,
        facebook: null,
        tiktok: null,
        linkedin: null,
        youtube: null,
        mostrar_email: false,
        mostrar_telefono: false,
        mostrar_redes: false,
      },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getIndividualProfileData('user-2', 'director')

    expect(result?.whatsapp).toBeNull()
    expect(result?.specializations).toEqual(['clasico'])
  })

  it('dramaturgo: incluye activityCounters a partir de total_obras_*', async () => {
    const { client } = createFakeSupabaseClient({
      data: {
        biografia: null,
        trayectoria: null,
        formacion: null,
        premios: null,
        esp_comedia: false,
        esp_drama: false,
        esp_tragedia: false,
        esp_musical: false,
        esp_infantil: false,
        esp_experimental: false,
        esp_historico: false,
        esp_monologo: false,
        esp_microteatro: false,
        otras_especialidades: null,
        total_obras_escritas: 5,
        total_obras_estrenadas: 2,
        total_obras_publicadas: 1,
        acepta_solicitudes_representacion: true,
        acepta_licenciamiento: false,
        acepta_publicacion_editorial: false,
        acepta_traduccion: false,
        acepta_adaptacion_audiovisual: false,
        foto_principal: null,
        web: null,
        email_profesional: null,
        telefono: null,
        whatsapp: null,
        instagram: null,
        facebook: null,
        tiktok: null,
        linkedin: null,
        youtube: null,
        mostrar_email: false,
        mostrar_telefono: false,
        mostrar_redes: false,
      },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getIndividualProfileData('user-3', 'dramaturgo')

    expect(result?.activityCounters).toEqual({ obrasEscritas: 5, obrasEstrenadas: 2, obrasPublicadas: 1 })
    expect(result?.availability).toEqual(['solicitudes_representacion'])
  })

  it('devuelve null cuando no existe fila especializada', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'not found' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getIndividualProfileData('user-sin-perfil', 'actor')

    expect(result).toBeNull()
  })

  it('devuelve null sin consultar la base de datos cuando el tipo no es de la familia Individual', async () => {
    const result = await getIndividualProfileData('user-4', 'compania')

    expect(result).toBeNull()
    expect(createClient).not.toHaveBeenCalled()
  })
})
