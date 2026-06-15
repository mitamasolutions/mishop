# Sprint 1 · r22 — Hardening del Admin

> Estado: ⬜ pendiente · Origen: PLAN_REFORCE_100 Fase 7 (Admin) + PENDIENTES Fase 7 · Hito: F7
> Alcance transversal: `apps/admin`

## Resumen

Endurecer el admin Next.js a estándares de producción: sesión en cookie segura
(no `localStorage`), env de API obligatoria en build prod, headers de seguridad/
CSP y uso acotado de `skipStoreScope`. **Bloqueante para producción real.**

## Requisitos pendientes

- **Refresh token en cookie HttpOnly/Secure/SameSite** en lugar de Zustand
  persist en `localStorage`. Requiere endpoint en API que setee la cookie en
  `/auth/login` y la lea en `/auth/refresh`. (Relacionado con [[sprint1_r1_auth]].)
- **`NEXT_PUBLIC_API_URL` obligatoria** en build prod: eliminar el fallback
  `http://localhost:3000`. El build debe **romper** si falta.
- **CSP / headers de seguridad** en `next.config.ts` (`headers()` con
  `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`).
- **Revisar `skipStoreScope`** en cada llamada `apiFetch`: usarlo solo en
  endpoints realmente globales (settings global, reference data, activity log
  global). (Relacionado con [[sprint1_r3_stores]].)

## Criterios de aceptación

- [ ] Build de prod del admin **falla** si faltan envs requeridas.
- [ ] La sesión admin no depende de tokens accesibles por JS desde la consola del
      navegador (`localStorage`).
- [ ] DevTools muestra headers CSP en cada respuesta del admin.
- [ ] `skipStoreScope` solo aparece en endpoints globales.

## Estado

**Pendiente.** Prioridad #1 entre las brechas bloqueantes del Sprint 1 (bloquea
producción real).
