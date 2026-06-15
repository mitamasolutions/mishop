# Sprint 1 · r11 — Clientes (customers)

> Estado: 🟡 parcial · Origen: `f3-ventas-customers-cart-orders` + PLAN_REFORCE F3/F6 · Hito: F3 (Checkout), F6 (Admin)
> Módulo: `packages/modules/customers`

## Resumen

Cliente comprador como entidad separada del usuario admin: registro vía API
pública, perfil, múltiples direcciones, y cliente invitado (guest) persistido por
email con conversión posterior a cuenta. En el MVP el comprador no tiene login
(guest checkout por email).

## Historia de usuario

> Como comprador, quiero registrarme o comprar como invitado y guardar varias
> direcciones, para completar mis compras y reutilizar mis datos de envío y
> facturación.

## Alcance

**Dentro:**
- Registro vía API pública con email + password; email único por tienda.
- Perfil (nombre, apellido, email, teléfono opcional, fecha de alta; password
  hasheado).
- Múltiples direcciones por cliente, predeterminadas de envío y/o facturación.
- Guest customer (sin password) persistido por email + conversión a cuenta.

**Fuera:**
- Verificación obligatoria de email y recuperación de contraseña del comprador.
- Segmentación, grupos/tiers, loyalty (Sprint futuro).
- UI de storefront (el comprador interactúa por API).

## Requisitos funcionales

1. Registro de cliente comprador vía API pública con email + password; el email
   es **único por tienda**. El cliente comprador es una entidad **separada** del
   usuario admin (`auth`).
2. El registro **no** exige verificación de email para comprar; la verificación
   queda opcional/posterior.
3. El perfil contiene nombre, apellido, email, teléfono (opcional) y fecha de
   alta; el password se almacena hasheado.
4. Un cliente puede tener **múltiples direcciones**; cada una puede marcarse como
   predeterminada de envío y/o facturación, y una misma dirección puede servir
   para ambos usos.
5. El **guest checkout** persiste un cliente "invitado" (sin password) asociado a
   la orden por email, convertible luego en cuenta usando ese mismo email.
6. **(PLAN_REFORCE F3)** `POST /cart/:cartId/customer` crea/reusa `Customer` con
   `isGuest=true` por email vía puerto `CustomerDirectory`; `customerId` se
   resuelve desde el recurso, nunca desde el body.

## Reglas de negocio

- El email del comprador es único por tienda; un invitado y una cuenta pueden
  compartir email solo en el flujo de conversión invitado → cuenta.
- Cliente invitado que ya existe como cuenta → en la conversión, se vincula por
  email respetando la unicidad por tienda.

## Asunciones

- Cliente comprador separado del usuario admin; registro por API pública con
  email + password único por tienda.
- El registro no exige verificación de email para comprar.
- Múltiples direcciones por cliente, marcables como predeterminadas.
- Guest checkout persiste cliente invitado (sin password), convertible a cuenta.

## Criterios de aceptación

- [ ] Un cliente puede registrarse vía API con email + password y obtener su
      perfil; un email duplicado en la misma tienda es rechazado.
- [ ] Un cliente puede crear, listar, editar y eliminar varias direcciones y
      marcar predeterminadas de envío y de facturación.
- [ ] Un invitado puede completar una compra sin cuenta; queda un cliente
      invitado persistido asociado a la orden por su email.
- [ ] Un invitado puede convertirse en cuenta registrada usando el mismo email.

## Estado

**Entregado:** módulo `customers` con CRUD + direcciones, guest customer
auto-creado en checkout (`CustomerDirectory`), patrón find-or-create por email.
Adapters Prisma + in-memory.

**Pendiente:**
- Pantalla admin **Clientes** (`/clientes`): listado con búsqueda, detalle con
  direcciones e historial de órdenes (filtra `customerId`) — ver
  [[sprint1_r23_admin_operativo]].
- Segmentación / grupos / loyalty quedan para Sprint futuro.
