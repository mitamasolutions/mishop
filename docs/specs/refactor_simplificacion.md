# Refactorización de simplificación del monolito hexagonal

## Resumen

Reduce el código repetido y la inconsistencia interna de `mitama-commerce` sin
alterar su arquitectura hexagonal ni el comportamiento de negocio. Dirigida a los
mantenedores del proyecto: baja la fricción de DI, ordena los casos de uso,
segrega puertos gordos y unifica el manejo de errores.

## Historia de usuario

> Como mantenedor de mitama-commerce, quiero simplificar el boilerplate y la
> inconsistencia interna del monolito hexagonal, para reducir código repetido y
> bajar la fricción de mantenimiento sin alterar la arquitectura ni el
> comportamiento de negocio.

## Alcance

**Dentro:**
- Eliminación del boilerplate de DI en los 17 `<mod>.module.ts` mediante un helper
  de registro declarativo (tabla puerto→adapter→useCase).
- División de los mega-archivos de casos de uso en un archivo por caso.
- Segregación de puertos gordos (`OrderRepository` y análogos) en interfaces más
  específicas.
- Unificación de la frontera de manejo de errores (`Result` vs excepciones).
- `SETTINGS_ENCRYPTION_KEY` obligatorio en producción.
- Elevación de cobertura de tests en `orders` y `payments`.

**Fuera:**
- Cambios al schema Prisma o a la persistencia.
- Desacople de los repositorios respecto de la shape de Prisma (Fase 3 opcional).
- Cualquier cambio a los patrones de negocio: outbox, máquinas de estado,
  idempotencia, scoping multi-tienda, registry de pagos.
- Migración a otra librería de DI o a reflection pesada.

## Requisitos funcionales

1. Existe un helper de registro de módulos que recibe una descripción declarativa
   (puertos→adapters y use cases con sus dependencias) y produce los providers de
   NestJS, reemplazando los bloques manuales de `useFactory` + `inject`.
2. El helper se valida primero en un módulo piloto (`payments` o `auth`) y solo se
   propaga al resto tras aprobarse el patrón.
3. Cada caso de uso vive en su propio archivo (ej. `create-order.use-case.ts`),
   conservando el nombre de clase actual.
4. `OrderRepository` queda dividido en `OrderReader`, `OrderWriter` y un puerto
   para idempotencia/secuencias; el mismo criterio se aplica a `PaymentRepository`
   y `ProductRepository`.
5. La capa `application`/`domain` devuelve siempre `Result<T,E>`; las excepciones
   solo nacen en `infra` y son atrapadas por un converter en el borde HTTP que las
   mapea a respuestas.
6. La validación de entorno hace fallar el arranque en producción si
   `SETTINGS_ENCRYPTION_KEY` está ausente; en dev/test sigue siendo opcional.
7. Cada caso de uso de `orders` y `payments` tiene al menos un archivo de test que
   cubre el happy path y los errores principales.
8. El trabajo se entrega incremental y mergeable por fases (Fase 1 antes que
   Fase 2), no en un único PR.

## Reglas de negocio

- Las APIs públicas (`@mitama/<mod>`, `@mitama/contracts`), los endpoints REST y
  los contratos de eventos no cambian.
- No se introduce ningún cambio que altere el resultado de los e2e existentes en
  `apps/api/test`.
- Las reglas de boundaries de ESLint deben seguir pasando (sin imports cruzados,
  Prisma solo en `infra`, `domain` sin frameworks).
- Ningún refactor de errores reescribe la lógica de los patrones de negocio.

## Criterios de aceptación

- [ ] `yarn build`, `yarn lint` y `yarn test` pasan tras cada fase.
- [ ] El módulo piloto arranca (`yarn dev`), responde `GET /health` y al menos un
      endpoint propio del módulo, antes de propagar el patrón.
- [ ] Tras la propagación, ningún `<mod>.module.ts` contiene bloques manuales de
      `useFactory` + `inject` para el cableado estándar puerto→adapter→useCase.
- [ ] No queda ningún archivo que agrupe más de un caso de uso en
      `application/` de `orders` ni de `payments`.
- [ ] `OrderRepository` ya no existe como interfaz única; sus consumidores
      dependen de `OrderReader`/`OrderWriter`/puerto de idempotencia según su uso.
- [ ] Una excepción lanzada desde `infra` se traduce en una respuesta HTTP
      controlada por el converter, sin filtrarse como error 500 sin mapear.
- [ ] Arrancar la API en modo producción sin `SETTINGS_ENCRYPTION_KEY` falla con
      un mensaje claro; en dev/test arranca sin la variable.
- [ ] Cada caso de uso de `orders` y `payments` tiene su archivo de test asociado.
- [ ] Los e2e de `apps/api/test` siguen pasando sin modificación.

## Flujo principal

1. **Fase 1 — quick wins (sin cambio de lógica)**
   1. Implementar el helper de registro declarativo de módulos.
   2. Aplicarlo al módulo piloto y verificar (`build`/`lint`/`test`/`dev`).
   3. Propagar el patrón a los 17 módulos.
   4. Partir los mega-archivos de casos de uso (un archivo por caso),
      empezando por `orders` y `payments`.
2. **Fase 2 — calidad incremental**
   1. Segregar los puertos gordos en interfaces específicas y actualizar a sus
      consumidores.
   2. Introducir el converter de errores en el borde HTTP y normalizar la
      frontera `Result`/excepciones.
   3. Hacer `SETTINGS_ENCRYPTION_KEY` obligatorio en producción.
   4. Elevar la cobertura de tests de `orders` y `payments`.

## Casos borde y manejo de errores

- Módulo con cableado no estándar (ej. `auth` con `JwtModule`, guards globales) →
  el helper debe permitir providers manuales adicionales sin forzar todo al patrón
  declarativo.
- Use case que comparte tipos/DTOs con otro del mismo módulo al partir archivos →
  los tipos compartidos se extraen a un archivo común del módulo, no se duplican.
- Consumidor que hoy usa varios métodos de un puerto gordo → recibe las interfaces
  segregadas que necesita; si requiere lectura y escritura, depende de ambas.
- Excepción no prevista desde `infra` → el converter la mapea a una respuesta
  genérica controlada (no se expone el stack ni detalles internos).
- Arranque en producción sin la clave de cifrado → fallo de arranque explícito
  (fail-closed), nunca arranque silencioso guardando settings en plano.

## Asunciones

- El objetivo es simplificar sin cambiar comportamiento observable; APIs públicas,
  endpoints y e2e siguen pasando sin modificación.
- El boilerplate de DI se elimina con un helper/factory declarativo propio, no con
  otra librería de DI ni reflection pesada.
- El refactor se valida en un módulo piloto (`payments` o `auth`) antes de
  propagarse a los 17 módulos.
- Partir mega-archivos = un archivo por use case, conservando los nombres de clase.
- `OrderRepository` se parte en `OrderReader`/`OrderWriter`/idempotencia, con el
  mismo criterio para `PaymentRepository` y `ProductRepository`.
- Frontera de errores: `Result<T,E>` en application/domain, excepciones solo en
  infra atrapadas por un converter en el borde HTTP.
- `SETTINGS_ENCRYPTION_KEY` obligatorio solo en producción; opcional en dev/test.
- Cobertura mínima objetivo: 1 archivo de test por use case en `orders` y
  `payments`.
- Entrega incremental y mergeable por fases.
- Fuera de alcance: schema/persistencia, desacople de repos respecto de Prisma,
  y cambios a outbox, state machines, idempotencia o scoping.
