# ACTA — Preparación del Preview de Vercel para el Primer Ensayo Funcional

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Fecha:** 2026-07-19
**Estado resultante:** PREVIEW OPERATIVO — `dpl_H4GfUACfzeRyZH3r3jaAbqwM3331`, estado `READY`

---

### 1. Objeto del Acta

Certifica la preparación de un despliegue Preview de Vercel que incluye, por primera vez, la implementación completa de Bloque III hasta el Orquestador del Flujo Completo, permitiendo ejecutar el primer ensayo funcional de ScenaIA desde la aplicación real.

### 2. Hallazgo previo, determinante para toda esta actividad

**Verificado antes de cualquier acción:** ningún commit de Bloque III había llegado nunca al repositorio remoto. El último despliegue de Vercel correspondía al commit `a61b21c`, anterior incluso a la Fase A. Todo el trabajo de esta sesión de gobernanza (Fases B, C, D, Orquestador) existía únicamente como cambios sin comitear en el árbol de trabajo local.

### 3. Tratamiento del incidente de trazabilidad durante la preparación

El árbol de trabajo mezclaba, sin comitear, el Conjunto A (verificado) con el Conjunto B/C (incidente de trazabilidad, sin resolver). Antes de modificar nada:

1. **Snapshot completo preservado** vía `git stash` (`stash@{0}`, todavía presente) — recuperable en cualquier momento, incluye tanto Conjunto A como B/C tal como estaban.
2. **Rama nueva y dedicada** `scenaia-bloque-3`, creada desde el último commit de preservación (`5976d1f`) — sin tocar `main` ni `develop`.
3. **Limpieza quirúrgica de 4 archivos entrelazados** (`types/supabase.ts`, `lib/repository-layer/index.ts`, `lib/repository-layer/__tests__/contract-invariants.test.ts`) que mezclaban contenido verificado y no verificado — se retiró únicamente la porción del Conjunto B (entradas/exportaciones de `execution-audit`), preservando íntegra la porción verificada. `docs/auditoria/ESTADO_MAESTRO_DOCUMENTAL.md`, sin ninguna parte mía, se dejó completamente fuera del commit.
4. **Verificación del commit antes de comitear:** con `git stash push --keep-index`, se apartó temporalmente el Conjunto B/C todavía no comiteado y se ejecutó `tsc`, `eslint`, `npm run build` y la suite completa de pruebas contra exactamente lo que iba a comitearse — build limpio, 240/240 pruebas, antes de confirmar el commit. El Conjunto B/C se restauró íntegro al árbol de trabajo local inmediatamente después, sin comitear.
5. **Commit `989eaaa`** en `scenaia-bloque-3` — 88 archivos, exclusivamente Conjunto A. El Conjunto B/C permanece sin comitear, sin publicarse, preservado tanto en el árbol de trabajo local como en el stash.

### 4. Validación, por categoría

**Infraestructura:** proyecto Vercel real y enlazado (`obrasdeteatro`, integración GitHub activa). Push a `scenaia-bloque-3` disparó automáticamente un despliegue Preview (`target: null`) — mismo comportamiento ya observado para la rama `develop`. Build completado en Vercel: estado `READY`, sin errores de runtime registrados.

**Configuración:** build de Vercel exitoso a partir del commit `989eaaa`. Variables de entorno necesarias (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) ya en uso por el resto de la aplicación en este mismo proyecto — no se ha podido confirmar directamente su valor en el entorno Preview con las herramientas disponibles (sin endpoint de variables de entorno en el conector usado), pero el build no falló por variables ausentes.

**Autenticación — hallazgo real, no anticipado:** el despliegue está protegido por la **Vercel Deployment Protection** del propio equipo (Vercel Authentication) — una capa de acceso previa e independiente de la autenticación de la aplicación (Supabase). Antes de llegar a `/auth/login`, quien acceda a la URL del Preview deberá estar autenticado en el equipo de Vercel, o usar un enlace de acceso temporal. Se generó uno, válido 23 horas (ver §5). Esto no estaba contemplado en el objetivo original ("autenticándose mediante el flujo habitual de la aplicación") — se señala explícitamente, sin modificar la configuración del proyecto.

**Integración:** `POST /api/scenaia-verified` incluido en el build (confirmado en la salida de compilación, ruta dinámica listada). No probado con una petición HTTP real contra el Preview desplegado en esta actividad — validación pendiente, a realizar por la Dirección con la sesión autenticada real.

**Aplicación:** ninguna diferencia de configuración detectada respecto al resto de la aplicación, ya en producción, que pudiera impedir el ensayo — mismo mecanismo de auth, mismas variables, mismo framework, sin cambios en `next.config.ts` ni en middleware.

### 5. Acceso al Preview

- **URL estable de la rama** (se actualiza automáticamente en cada push futuro a `scenaia-bloque-3`): `https://obrasdeteatro-git-scenaia-bloque-3-obrasdeteatro-s-projects.vercel.app`
- **Enlace de acceso temporal** (evita el login de Vercel, válido hasta 2026-07-20 15:23 aprox.): añadir `?_vercel_share=5UapVnFGEKplejcDCGvIKSqQko7ufXHm` a la URL anterior.
- **Endpoint del primer ensayo funcional:** `POST /api/scenaia-verified`, cuerpo `{ "message": "..." }`, requiere sesión autenticada de la aplicación (login normal vía `/auth/login` primero).

### 6. Veredicto

**Preview operativo y listo para el primer ensayo funcional.** Único hallazgo relevante no anticipado: la protección de acceso propia de Vercel, ajena a la arquitectura de ScenaIA — de infraestructura/configuración de la organización Vercel, no de la aplicación. No se propone ni se aplica ningún cambio para retirarla — corresponde a una decisión de la Dirección, ajena al alcance arquitectónico de esta actividad.
