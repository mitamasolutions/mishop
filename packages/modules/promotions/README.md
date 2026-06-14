# @mitama/promotions

Módulo de marketing de la Fase 5: **descuentos**, **cupones** y **newsletter**.

## Qué expone

- **Descuentos**: % o monto fijo; alcance producto / categoría / orden;
  condiciones (mínimo de compra, primer pedido, rol de cliente); vigencia y
  tope máximo. Regla de combinabilidad en `resolveCombinability`
  (`application/promotion-use-cases.ts`): por defecto **no se apilan** (gana el de
  mayor beneficio); los `combinable` se suman entre sí.
- **Cupones**: código único o generación masiva de un solo uso; límites de uso
  global y por cliente; normalización case-insensitive; vigencia. La redención
  usa **lock optimista por `version`** + idempotencia transaccional para no
  sobrevender bajo concurrencia.
- **Newsletter**: suscripción con doble opt-in, baja y export CSV.

## ⚠️ Reward points = código semilla para la Fase L (Loyalty)

Este módulo **también** contiene los casos de uso de reward points
(`ConfigureRewardProgramUseCase`, `AccrueRewardPointsUseCase`,
`ReverseRewardPointsUseCase`) con su tabla `RewardLedgerEntry` y config por
tienda. Están aquí por razones históricas, **no porque pertenezcan a
`promotions`**.

Estado y reglas:

- **No entran en `v1.0.0`.** Reward points se separó a la **Fase L · Loyalty**
  (ver [`docs/PLAN.md`](../../../docs/PLAN.md)).
- **No están cableados a eventos** (`order.completed` no dispara acumulación) ni
  se exponen como feature del checkout. Sólo son alcanzables por sus endpoints
  HTTP directos.
- Ya corregidos contra **doble acumulación** (idempotencia transaccional), así
  que sirven como punto de partida.
- **Faltan** (trabajo de la Fase L): canje de puntos como pago parcial, lectura
  de `expiresAt` para excluir puntos vencidos, reversa basada en la acumulación
  original del `orderId`, y redondeo correcto (hoy `Math.floor` sobre float).

**Al abrir la Fase L:** extraer estos casos de uso, su schema y sus tests a un
módulo `loyalty` dedicado, y borrarlos de aquí en esa misma release.

## Patrones de referencia

- Lock optimista `version`: `infra/prisma-promotion.repository.ts`
  (`commitCouponRedemption`) — mismo patrón que `inventory`.
- Adapters in-memory para tests: `infra/in-memory-promotion.repository.ts`.
- Spec funcional: [`docs/specs/fase-05-marketing-promociones.md`](../../../docs/specs/fase-05-marketing-promociones.md).
