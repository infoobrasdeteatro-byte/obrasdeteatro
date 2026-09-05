import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const RAIZ = join(__dirname, '..', '..', '..')
const sinComentarios = (ruta: string) =>
  readFileSync(join(RAIZ, ruta), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '')

const ACCESO = sinComentarios('lib/auth/scenaia-access.ts')
const PAGINA = sinComentarios('app/scenaia/page.tsx')
const ENDPOINT = sinComentarios('app/api/scenaia-verified/route.ts')
const CLIENTE = sinComentarios('app/scenaia/ScenaiaClient.tsx')
const MIDDLEWARE = sinComentarios('middleware.ts')

/**
 * P1.3 — UNA SOLA FUENTE DE VERDAD PARA EL ACCESO.
 *
 * El riesgo real de proteger en dos capas no es que una falle: es que
 * diverjan. Una condicion en la pagina, otra distinta en el endpoint y una
 * tercera en el middleware producen exactamente el agujero que este bloque
 * cierra. Estas invariantes impiden que vuelva a haber mas de una regla.
 */
describe('Acceso a ScenaIA — punto unico de decision (P1.3)', () => {
  it('13 · LA PAGINA Y EL ENDPOINT usan el MISMO helper', () => {
    for (const [nombre, fuente] of [
      ['pagina', PAGINA],
      ['endpoint', ENDPOINT],
    ] as const) {
      expect(fuente, nombre).toMatch(/from '@\/lib\/auth\/scenaia-access'/)
      expect(fuente, nombre).toMatch(/resolveScenaiaAccess\(/)
    }
  })

  it('14 · NINGUNA capa reimplementa la politica', () => {
    // Ni comprueban verificacion, ni miran el plan, ni consultan
    // suscripciones por su cuenta: preguntan y traducen el veredicto.
    for (const [nombre, fuente] of [
      ['pagina', PAGINA],
      ['endpoint', ENDPOINT],
      ['cliente', CLIENTE],
      ['middleware', MIDDLEWARE],
    ] as const) {
      expect(fuente, nombre).not.toMatch(/isVerified|\.verificado|verificado:/)  // leer el CAMPO seria reimplementar; `acceso.reason === 'no_verificado'` es consumir el veredicto
      expect(fuente, nombre).not.toMatch(/getProfilePlan|getUsageLimit|getSubscription/)
      expect(fuente, nombre).not.toMatch(/'gratuito'|'premium'|'destacado'|'empresas'/)
    }
  })

  it('EL CLIENTE no decide nada: no es una frontera', () => {
    // Estado de React, redirecciones y UI no protegen: quien protege es el
    // endpoint. El cliente ni siquiera conoce el helper.
    expect(CLIENTE).not.toMatch(/scenaia-access|resolveScenaiaAccess/)
  })

  it('EL MIDDLEWARE no es una segunda fuente de verdad', () => {
    expect(MIDDLEWARE).not.toMatch(/scenaia-access|resolveScenaiaAccess/)
  })

  it('la regla NO consulta `subscriptions`: el entitlement es el plan efectivo', () => {
    expect(ACCESO).not.toMatch(/getSubscription|subscriptions/i)
  })

  it('la regla NO mantiene su propia lista de planes: la pide al catalogo de cuotas', () => {
    // Si manana Direccion anade un plan, el acceso lo reconoce sin tocar
    // este archivo; y un plan sin cuota declarada no concede acceso.
    expect(ACCESO).not.toMatch(/'gratuito'|'premium'|'destacado'|'empresas'/)
    expect(ACCESO).toMatch(/getUsageLimit\(plan\)/)
  })

  it('el endpoint DENIEGA antes de ejecutar: nada se gasta sin acceso', () => {
    const antesDeEjecutar = ENDPOINT.slice(0, ENDPOINT.indexOf('coordinateFlow('))

    expect(antesDeEjecutar).toMatch(/resolveScenaiaAccess\(/)
    expect(antesDeEjecutar).toMatch(/if \(!acceso\.allowed\)/)
  })

  it('el endpoint NO deriva la identidad del cuerpo de la peticion', () => {
    // La identidad sale de la sesion y del veredicto, jamas de lo que
    // envie el cliente.
    expect(ENDPOINT).toMatch(/coordinateFlow\(\s*acceso\.userId/)
    expect(ENDPOINT).not.toMatch(/body\.userId|body\.profileId/)
  })

  it('la economia NO cambia: la regla no toca cuotas, tarifas ni creditos', () => {
    expect(ACCESO).not.toMatch(/PLAN_AI_QUOTAS|amountPerCredit|creditsPerPeriod|estimatedCost|reservedCost/)
  })
})


/**
 * UX-003 — LA EXPERIENCIA DEL BLOQUEO NO ES UNA AUTORIZACION.
 *
 * P1.3 cerraba el acceso correctamente pero dejaba al usuario en
 * `/dashboard` sin explicacion. La pantalla de verificacion cuenta lo que
 * falta; lo que NO puede hacer es decidir nada. Estas invariantes fijan esa
 * frontera, que es donde se abren los huecos.
 *
 * La pagina es un Server Component y el entorno de pruebas es Node sin DOM,
 * asi que no se prueba su renderizado. Lo que si se prueba -- y es lo que
 * importa -- es que consuma el veredicto en vez de reimplementarlo.
 */
describe('Verificacion — experiencia del bloqueo (UX-003)', () => {
  const VERIFICACION = sinComentarios('app/verificacion/page.tsx')

  it('1 · la pantalla CONSUME el veredicto de P1.3, no lo reimplementa', () => {
    expect(VERIFICACION).toMatch(/from '@\/lib\/auth\/scenaia-access'/)
    expect(VERIFICACION).toMatch(/resolveScenaiaAccess\(/)
  })

  it('3 · NO reimplementa la politica: ni verificacion, ni plan, ni suscripcion', () => {
    expect(VERIFICACION).not.toMatch(/isVerified|\.verificado|verificado:/)  // leer el CAMPO seria reimplementar; `acceso.reason === 'no_verificado'` es consumir el veredicto
    expect(VERIFICACION).not.toMatch(/getProfilePlan|getUsageLimit|getSubscription|getProfessionalProfilePublic/)
    expect(VERIFICACION).not.toMatch(/'gratuito'|'premium'|'destacado'|'empresas'/)
  })

  it('2 · un usuario VERIFICADO no se queda aqui: se le devuelve a ScenaIA', () => {
    expect(VERIFICACION).toMatch(/if \(acceso\.allowed\)/)
    expect(VERIFICACION).toMatch(/redirect\('\/scenaia'\)/)
  })

  it('solo se muestra por SU causa: cualquier otra tiene su propio destino', () => {
    // Contarle "verifica tu correo" a quien tiene otro problema seria
    // mentirle.
    expect(VERIFICACION).toMatch(/acceso\.reason !== 'no_verificado'/)
    expect(VERIFICACION).toMatch(/redirect\(acceso\.reason === 'no_autenticado' \? '\/auth\/login' : '\/dashboard'\)/)
  })

  it('7 · NO EXISTE BYPASS: la pantalla no ejecuta nada de ScenaIA', () => {
    expect(VERIFICACION).not.toMatch(/coordinateFlow|scenaia-verified|ScenaiaClient/)
  })

  it('8 · "volver a intentar" devuelve al flujo real, sin comprobacion paralela', () => {
    // Es un enlace a `/scenaia`: al entrar, el acceso se resuelve otra vez
    // con el mecanismo de siempre. No hay una segunda politica que pueda
    // decir algo distinto.
    expect(VERIFICACION).toMatch(/href="\/scenaia"/)
    expect(VERIFICACION).not.toMatch(/useState|useEffect|'use client'|fetch\(/)
  })

  it('la pagina de ScenaIA envia AQUI, y solo por esta causa', () => {
    expect(PAGINA).toMatch(/if \(acceso\.reason === 'no_verificado'\) redirect\('\/verificacion'\)/)
    expect(PAGINA).toMatch(/if \(acceso\.reason === 'no_autenticado'\) redirect\('\/auth\/login'\)/)
  })

  it('9/10 · NO requiere Supabase Auth ni middleware', () => {
    // Fuera de `/auth/`: el middleware no la rebota, y por eso no hay que
    // tocarlo. Y no toca Auth: se apoya en el correo que Supabase ya envia.
    expect(VERIFICACION).not.toMatch(/signUp|resend|verifyOtp|updateUser|admin/)
    expect(MIDDLEWARE).not.toMatch(/verificacion/)
  })

  it('4 · NO INVENTA REENVIO: no simula una operacion que no existe', () => {
    expect(VERIFICACION).not.toMatch(/reenv|resend/i)
    // Orientacion, no un boton que no haria nada.
    expect(readFileSync(join(RAIZ, 'app/verificacion/page.tsx'), 'utf-8')).toMatch(/spam o correo no deseado/)
  })

  it('sin mensajes comerciales: ni planes, ni cuotas, ni precios', () => {
    const texto = readFileSync(join(RAIZ, 'app/verificacion/page.tsx'), 'utf-8')

    expect(texto).not.toMatch(/plan|cuota|credito|crédito|precio|suscrip|mejora|upgrade/i)
  })

  it('reutiliza el sistema de diseno: sin estilos nuevos', () => {
    const texto = readFileSync(join(RAIZ, 'app/verificacion/page.tsx'), 'utf-8')

    expect(texto).toMatch(/auth-page|auth-card|auth-title/)
    // Ninguna clase propia inventada para esta pantalla.
    expect(texto).not.toMatch(/verificacion-[a-z]/)
  })
})
