# Sprint 1 · r15 — Envíos (shipping)

> Estado: 🟡 parcial · Origen: `fase-4-pagos-envios-impuestos` · Hito: F5 (Pagos/envíos), F6 (Admin)
> Módulo: `packages/modules/shipping` · Doc relacionada: [`providers/como-escribir-un-provider.md`](providers/como-escribir-un-provider.md)

## Resumen

Contrato `ShippingProvider` que calcula tarifas con tres estrategias (fija, por
peso, por total del carrito), métodos y zonas por tienda (sobre `reference-data`),
**pickup en tienda** y **tracking** de envíos con notificación al cliente. El
tracking se actualiza manualmente (sin integración real con carriers en esta
fase).

## Historia de usuario

> Como comerciante, quiero ofrecer métodos de envío con tarifas por zona y
> registrar tracking que notifique al cliente, para cobrar el envío correcto y
> mantener informado al comprador.

## Alcance

**Dentro:**
- Contrato `ShippingProvider` con tarifas fija/peso/total del carrito.
- Métodos de envío y zonas por tienda; pickup en tienda (costo 0).
- Elegibilidad por cobertura de zona de la dirección.
- Tracking (`Shipment`: `trackingNumber`, `carrier`, `status`) con notificación.

**Fuera:**
- Integración real con APIs de carriers (FedEx, DHL, Estafeta): tracking manual.
- Generación de etiquetas.

## Requisitos funcionales

1. `ShippingProvider` calcula tarifas con tres estrategias: **fija, por peso y
   por total del carrito**.
2. Cada tienda configura sus **métodos de envío** y las **zonas**
   (`reference-data`) a las que aplican.
3. **Pickup en tienda** es un método con **costo 0**, sin dirección de entrega,
   disponible solo si la tienda lo habilita.
4. **Elegibilidad:** un método se ofrece solo si la dirección de destino cae en
   una zona cubierta; si ningún método cubre la dirección, el checkout indica
   "sin envío disponible".
5. **Tracking** como entidad `Shipment` con `trackingNumber`, `carrier` y
   `status` (`pending`, `shipped`, `in_transit`, `delivered`, `cancelled`),
   actualizado manualmente desde el admin.
6. Cambiar un `Shipment` a `shipped`/`delivered` **encola una notificación al
   cliente** usando la cola de correos transaccionales (`OrderEmailJob`).

## Reglas de negocio

- Un método de envío solo se ofrece si su zona cubre la dirección y la tienda lo
  tiene habilitado.
- Transición de estado de envío inválida se rechaza; no muta el agregado.
- Comunicación con `orders` por eventos del bus.

## Asunciones

- `ShippingProvider` con tarifas fija, por peso y por total; métodos y zonas por
  tienda; pickup como método de costo 0.
- Elegibilidad por cobertura de zona; sin cobertura → "sin envío disponible".
- Tracking como `Shipment`, actualizado manualmente; cambios de estado encolan
  notificación vía `OrderEmailJob`.

## Criterios de aceptación

- [ ] Tarifa fija, por peso y por total del carrito devuelven el costo esperado
      para una dirección dada (unitarios).
- [ ] Una dirección fuera de toda zona cubierta no ofrece métodos de envío (salvo
      pickup si está habilitado).
- [ ] Cambiar un `Shipment` a `shipped` encola una notificación al cliente.

## Estado

**Entregado:** entidades `StoreShippingMethod`, `StoreShippingMethodZone`,
`Shipment`; `SelectShippingMethod` para checkout; zonas + reglas regionales.
Adapters Prisma + in-memory.

**Pendiente:**
- Cálculo de tarifa en tiempo real / estrategias completas verificadas en
  checkout (integra con recálculo server-side de [[sprint1_r13_orders]]).
- Pantalla admin **Envíos** (`/envios` o tab en orden): crear shipment con
  tracking + carrier, cambiar estado, notificar — ver
  [[sprint1_r23_admin_operativo]].
- Integración real con carriers y etiquetas → Sprint futuro.
