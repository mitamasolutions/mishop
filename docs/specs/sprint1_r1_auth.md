# Sprint 1 · r1 — Autenticación (auth)

> Estado: ✅ entregado · Origen: `f1-auth-stores-settings-activity-log` · Hito: F1 (Seguridad/RBAC)
> Módulo: `packages/modules/auth`

## Resumen

Autenticación de usuarios de backoffice con JWT: login email+contraseña, access
+ refresh token con rotación y detección de reuso, bloqueo por intentos,
recuperación de contraseña e invitación de usuarios. Las contraseñas viven en
tabla separada con historial y hash Argon2id. Equivale a la base de
Customers/Roles de nopCommerce, acotado a usuarios administrativos.

## Historia de usuario

> Como desarrollador, quiero una base de autenticación segura (JWT, rotación,
> bloqueo, recuperación, invitación), para que el resto de la plataforma se
> construya sobre sesiones administrativas confiables desde el día uno.

## Alcance

**Dentro:**
- Login email+contraseña, JWT access (15 min) + refresh (7 días) con rotación.
- Bloqueo por intentos, recuperación de contraseña, invitación de usuarios.
- Tabla de contraseñas hasheadas separada de usuarios, con historial.
- Estados de usuario: `invited`, `active`, `locked`, `disabled`.
- Página de login del admin (Next.js) en español; refresh en cookie httpOnly,
  access en memoria del cliente.

**Fuera:**
- 2FA, SSO, OAuth.
- Proveedor real de email (el "envío" se registra en log/consola).
- Clientes finales (ver `sprint1_r11_customers`).

## Requisitos funcionales

1. Login con email + contraseña que devuelve un access token JWT (15 min) y un
   refresh token (7 días).
2. **Rotación de refresh tokens:** cada refresh emite un par nuevo e invalida el
   anterior; si se detecta reuso de un refresh ya rotado, se revoca toda la
   **familia** de tokens de esa sesión.
3. **Bloqueo por intentos:** 5 intentos fallidos consecutivos bloquean la cuenta
   15 minutos; el contador se resetea con un login exitoso.
4. **Recuperación de contraseña:** token de un solo uso con expiración de 1 hora;
   el "envío" del email se registra en log/consola.
5. **Invitación de usuarios:** un admin crea el usuario con email y rol; el
   sistema genera un token de invitación válido 72 horas; el invitado define su
   contraseña al aceptar. Mientras tanto el usuario está `invited` y no puede
   hacer login.
6. **Estados de usuario:** `invited`, `active`, `locked`, `disabled`. Un usuario
   `disabled` no puede hacer login ni usar refresh tokens vigentes.
7. Las contraseñas se hashean con **Argon2id** y viven en una tabla separada de
   la de usuarios; cada cambio crea un registro nuevo (historial) y no se permite
   reutilizar ninguna de las **últimas 4** contraseñas.
8. **Admin:** página de login en español; sesión con refresh token en cookie
   httpOnly y access token solo en memoria del cliente.

## Reglas de negocio

- Historial de contraseñas conserva los hashes anteriores; se rechaza una nueva
  contraseña igual a cualquiera de las últimas 4.
- Login con email inexistente → mismo error genérico que contraseña incorrecta
  (no se revela existencia de cuentas).
- Reuso de refresh rotado (posible robo) → revocación de toda la familia y
  registro del incidente en el activity log.
- Los identificadores de código van en inglés; UI, mensajes de error y docs en
  español.

## Asunciones

- Solo usuarios administrativos en esta fase.
- Historial de contraseñas en tabla separada; prohibidas las últimas 4.
- Hash con Argon2id.
- Access JWT 15 min, refresh 7 días, rotación con detección de reuso y
  revocación de familia.
- Bloqueo: 5 intentos → 15 minutos; reset al login exitoso.
- Recuperación: token de un solo uso, 1 hora; email simulado por log.
- Invitación: token de 72 h; usuario `invited` hasta aceptar.
- Estados de usuario: `invited`, `active`, `locked`, `disabled`.
- Sesión admin: refresh en cookie httpOnly, access en memoria.
- Super admin de seed: `admin@mitama.local`, contraseña tomada de `.env`.

## Criterios de aceptación

- [ ] Un usuario `active` con credenciales válidas obtiene access + refresh
      token; con contraseña incorrecta recibe error sin revelar si el email
      existe.
- [ ] Tras 5 intentos fallidos la cuenta queda `locked` 15 minutos y el login
      correcto durante el bloqueo también se rechaza.
- [ ] Usar un refresh token ya rotado revoca toda la familia y obliga a re-login.
- [ ] Un token de recuperación expirado o ya usado es rechazado.
- [ ] Un usuario `invited` no puede hacer login; tras aceptar la invitación y
      definir contraseña pasa a `active` y puede entrar.
- [ ] Cambiar la contraseña a una de las últimas 4 usadas es rechazado con
      mensaje en español.
- [ ] Refresh token expirado o de un usuario `disabled` → 401, sesión terminada.
- [ ] Token de invitación expirado → el admin puede reenviar (token nuevo,
      invalida el anterior).
- [ ] En el admin: login funcional; refresh en cookie httpOnly, access en memoria.

## Estado

**Entregado:** módulo `auth` completo con adapters Prisma (user,
password-credential, refresh-token, invitation-token, password-reset-token),
18 casos de uso con specs in-memory, login operativo contra DB real. Cubre el
hito F1 de seguridad junto con [[sprint1_r2_users_roles]].

**Pendiente:** endurecer la sesión del admin (refresh token en cookie
HttpOnly/Secure/SameSite en lugar de `localStorage` vía Zustand) — ver
[[sprint1_r22_admin_hardening]].
