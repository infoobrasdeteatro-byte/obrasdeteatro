import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationalProfileData } from '../organizational-profile'
import { createFakeSupabaseClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(createClient).mockReset()
})

describe('getOrganizationalProfileData', () => {
  it('perfil_compania: contacto y responsable condicionados por sus propios flags', async () => {
    const { client, builder } = createFakeSupabaseClient({
      data: {
        nombre_compania: 'Compañía de Prueba',
        nombre_comercial: null,
        anio_fundacion: 2010,
        descripcion: 'Descripción',
        historia: null,
        mision: null,
        vision: null,
        valores: null,
        num_producciones: 12,
        num_integrantes: 8,
        tipo_clasico: true,
        tipo_contemporaneo: false,
        tipo_musical: false,
        tipo_infantil: false,
        tipo_experimental: false,
        tipo_comunitario: false,
        tipo_profesional: false,
        tipo_amateur: false,
        serv_contratacion: true,
        serv_coproducciones: false,
        serv_giras: false,
        serv_formacion: false,
        serv_internacional: false,
        responsable_nombre: 'Responsable',
        responsable_cargo: 'Dirección',
        responsable_email: 'resp@example.com',
        responsable_telefono: null,
        logo: null,
        web: null,
        email_corporativo: 'contacto@example.com',
        telefono: '900000000',
        whatsapp: null,
        instagram: null,
        facebook: null,
        tiktok: null,
        linkedin: null,
        youtube: null,
        mostrar_contacto: true,
        mostrar_responsable: false,
      },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getOrganizationalProfileData('user-1', 'compania')

    expect(result).toMatchObject({
      name: 'Compañía de Prueba',
      activityCategories: ['clasico'],
      services: ['contratacion'],
      activityCounters: { producciones: 12, integrantes: 8 },
      contactEmail: 'contacto@example.com',
      contactPhone: '900000000',
      responsibleContact: null,
    })
    expect(client.from).toHaveBeenCalledWith('perfil_compania')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('perfil_compania: expone responsibleContact cuando mostrar_responsable es true', async () => {
    const { client } = createFakeSupabaseClient({
      data: {
        nombre_compania: 'Compañía de Prueba',
        nombre_comercial: null,
        anio_fundacion: null,
        descripcion: null,
        historia: null,
        mision: null,
        vision: null,
        valores: null,
        num_producciones: 0,
        num_integrantes: 0,
        tipo_clasico: false,
        tipo_contemporaneo: false,
        tipo_musical: false,
        tipo_infantil: false,
        tipo_experimental: false,
        tipo_comunitario: false,
        tipo_profesional: false,
        tipo_amateur: false,
        serv_contratacion: false,
        serv_coproducciones: false,
        serv_giras: false,
        serv_formacion: false,
        serv_internacional: false,
        responsable_nombre: 'Responsable',
        responsable_cargo: 'Dirección',
        responsable_email: 'resp@example.com',
        responsable_telefono: '600000000',
        logo: null,
        web: null,
        email_corporativo: null,
        telefono: null,
        whatsapp: null,
        instagram: null,
        facebook: null,
        tiktok: null,
        linkedin: null,
        youtube: null,
        mostrar_contacto: false,
        mostrar_responsable: true,
      },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getOrganizationalProfileData('user-2', 'compania')

    expect(result?.responsibleContact).toEqual({
      name: 'Responsable',
      role: 'Dirección',
      email: 'resp@example.com',
      phone: '600000000',
    })
    expect(result?.contactEmail).toBeNull()
  })

  it('perfil_productora: responsibleContact siempre null (sin mostrar_responsable en esta tabla)', async () => {
    const { client } = createFakeSupabaseClient({
      data: {
        nombre_productora: 'Productora de Prueba',
        nombre_comercial: null,
        anio_fundacion: null,
        descripcion: null,
        historia: null,
        num_producciones: 0,
        num_proyectos_activos: 0,
        tipo_teatral: false,
        tipo_audiovisual: false,
        tipo_musical: false,
        tipo_eventos: false,
        tipo_festivales: false,
        tipo_independiente: false,
        tipo_distribucion: false,
        tipo_gestion_cultural: false,
        tipo_coproducciones_int: false,
        responsable_nombre: 'Alguien',
        responsable_cargo: 'Cargo',
        responsable_email: 'alguien@example.com',
        responsable_telefono: null,
        logo: null,
        web: null,
        email_corporativo: null,
        telefono: null,
        whatsapp: null,
        instagram: null,
        facebook: null,
        tiktok: null,
        linkedin: null,
        youtube: null,
        mostrar_contacto: true,
      },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getOrganizationalProfileData('user-3', 'productora')

    expect(result?.responsibleContact).toBeNull()
  })

  it('devuelve null cuando no existe fila especializada', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'not found' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getOrganizationalProfileData('user-sin-perfil', 'teatro')

    expect(result).toBeNull()
  })

  it('devuelve null sin consultar la base de datos cuando el tipo no es de la familia Organizacional', async () => {
    const result = await getOrganizationalProfileData('user-4', 'actor')

    expect(result).toBeNull()
    expect(createClient).not.toHaveBeenCalled()
  })
})
