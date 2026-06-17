# Postmortem: Flujo de recuperación de contraseña

**Proyecto:** obrasdeteatro.com  
**Fecha de resolución:** 2026-06-17  
**Módulo afectado:** Sistema de autenticación — recuperación de contraseña  
**Severidad:** Alta (el flujo completo era inoperativo en producción)

---

## Causa raíz

El SDK de Supabase (`@supabase/ssr` → `@supabase/auth-js`) tiene activada por defecto la opción `detectSessionInUrl: true`. Al instanciar `createBrowserClient()`, el SDK detecta automáticamente el parámetro `?code=` presente en la URL de callback y ejecuta internamente `exchangeCodeForSession()`, consumiendo el código PKCE antes de que ningún `useEffect` del componente React se haya ejecutado.

El código original del callback (`route.ts` primero, luego `page.tsx`) llamaba a `exchangeCodeForSession(code)` de forma explícita dentro del `useEffect`. Para cuando ese `useEffect` se ejecutaba, el código ya había sido consumido por el SDK en la inicialización del cliente. El intento manual devolvía error, y el handler de error redirigía a `/auth/login?error=auth_error`.

**En resumen:** doble intento de PKCE exchange sobre el mismo código. El primero (automático, del SDK) tenía éxito. El segundo (manual, del código de la app) fallaba.

---

## Diagnóstico final

### Evidencia en logs de Supabase

Los logs de Supabase Auth (accesibles vía MCP) mostraban inequívocamente que `exchangeCodeForSession` **sí funcionaba**:

```
POST /token  grant_type: pkce  provider_type: recovery  → status 200
```

Los registros de `auth.flow_state` creados en cada intento de recuperación **desaparecían** tras el click en el enlace — señal de que el código PKCE se consumió y la sesión se estableció correctamente.

### Secuencia real de ejecución

```
1. Browser navega a /auth/callback/recovery?code=XXXX
2. createBrowserClient() inicializa
   └─ detectSessionInUrl: true → detecta ?code= → llama exchangeCodeForSession() internamente
   └─ POST /token (pkce) → 200 ✅ → código consumido, sesión de recovery creada
3. React monta el componente, useEffect se ejecuta
   └─ lee code del URL → llama exchangeCodeForSession(code) de nuevo
   └─ FALLA: código ya consumido → error
4. Handler de error: router.replace('/auth/login?error=auth_error')
5. Usuario ve: "El enlace ha expirado o no es válido"
```

### Ruta incorrecta descartada

En una fase anterior del diagnóstico se implementó un `route.ts` (Route Handler de servidor) que también fallaba, pero por una razón diferente: el verificador PKCE generado por `createBrowserClient` se almacena en `localStorage` del navegador, inaccesible desde el contexto de servidor. Ese problema fue la primera capa; la causa raíz descrita arriba fue la segunda.

---

## Solución implementada

### Commit definitivo: `feb8397`

```
fix: usar onAuthStateChange en lugar de exchangeCodeForSession manual
```

**Archivo:** `app/auth/callback/recovery/page.tsx`

Se eliminó la llamada manual a `exchangeCodeForSession`. En su lugar, la página se suscribe a `onAuthStateChange` y escucha dos eventos:

- `PASSWORD_RECOVERY` — el SDK procesa el código y establece la sesión de recovery antes de que nos suscribamos; el evento se dispara durante la ejecución normal
- `INITIAL_SESSION` con sesión activa — cubre el caso donde el exchange completa antes de que se registre el listener

```tsx
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    router.replace('/auth/update-password')
  } else if (event === 'INITIAL_SESSION' && session) {
    router.replace('/auth/update-password')
  }
})
```

El SDK maneja el PKCE exchange de forma transparente; la página solo reacciona al resultado.

### Commit de transición: `7e910c3`

```
fix: callback recovery como página cliente para PKCE
```

Eliminó el `route.ts` (handler de servidor) y lo sustituyó por `page.tsx` (componente cliente). Necesario para que el verificador PKCE de `localStorage` fuera accesible. Este commit resolvió la primera capa del problema pero no la segunda.

---

## Estado del sistema tras la resolución

### auth.flow_state

| Comportamiento | Estado |
|----------------|--------|
| Entradas creadas en cada solicitud de recuperación | ✅ Correcto |
| Entradas consumidas (eliminadas) tras exchange exitoso | ✅ Correcto — confirmado: los registros de los tests post-fix no aparecen en la tabla |
| Entradas residuales | 3 entradas de tests previos al fix (junio 15–17 09:26) — no representan error activo |

### Logs de error

| Tipo de error | Frecuencia post-fix | Evaluación |
|---------------|---------------------|------------|
| `PASSWORD_RECOVERY` errors | 0 | ✅ Limpio |
| `One-time token not found` | 2 ocurrencias | ✅ Esperado — segundo clic sobre un enlace ya consumido, comportamiento correcto |
| Cualquier error en `/token pkce` | 0 | ✅ Limpio |

Secuencia del último test validado (2026-06-17 11:03 UTC):
```
user_recovery_requested     → 200 ✅
mail.send (recovery)        → ✅
/verify                     → 303 ✅ (redirect a callback)
/token grant_type: pkce     → 200 ✅ (exchange PKCE exitoso)
/user PUT user_modified     → 200 ✅ (contraseña actualizada)
```

### Estructura de rutas

| Ruta | Estado |
|------|--------|
| `app/auth/callback/route.ts` | Activa — confirmación de email |
| `app/auth/callback/recovery/page.tsx` | Activa — callback de recuperación (solución) |
| `app/auth/callback/recovery/route.ts` | Eliminado en commit `7e910c3` ✅ |
| `app/auth/update-password/page.tsx` | Activa — formulario nueva contraseña |
| `app/auth/nueva-password/page.tsx` | **Huérfana** — no referenciada en ningún archivo; candidata a eliminación |

---

## Archivo huérfano identificado

`app/auth/nueva-password/page.tsx` existe en el repositorio pero ningún archivo del proyecto la referencia. Fue la página de destino original del flujo de recuperación anterior al refactor. Puede eliminarse de forma segura.

---

## Lecciones

1. **El SDK de Supabase gestiona automáticamente el PKCE exchange** cuando detecta `?code=` en la URL. No debe llamarse `exchangeCodeForSession` manualmente si `detectSessionInUrl` está activo (valor por defecto).

2. **Los logs de Supabase son la fuente de verdad** para diagnosticar fallos de auth. El estado de `auth.flow_state` (consumido = éxito, persistente = fallo) es el indicador más directo.

3. **`onAuthStateChange` es el patrón correcto** para reaccionar a eventos de autenticación en componentes cliente. No intentar interceptar el proceso PKCE manualmente.
