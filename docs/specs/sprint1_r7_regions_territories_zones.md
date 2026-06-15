# Sprint 1 · r7 — Regiones, Territorios y Zonas (reference-data)

> Estado: ✅ entregado · Origen: `f2-regiones-territorios-zonas` · Hito: F1
> Módulo: `packages/modules/reference-data`

## Resumen

Geografía comercial en tres niveles jerárquicos al estilo nopCommerce: **Región**
(moneda, países y proveedores de pago habilitados), **Territorio** (config de
envío dentro de una región) y **Zona** (agrupador geográfico más fino dentro de
un territorio). Es la base para calcular medios de pago y costos de envío por
ubicación. Extiende la entidad `Region` (antes readonly) de
[[sprint1_r6_reference_data]].

## Historia de usuario

> Como administrador, quiero crear regiones con su moneda, países y proveedores
> de pago; territorios con su configuración de envío; y zonas dentro de cada
> territorio, para organizar la geografía comercial y las reglas de envío.

## Alcance

**Dentro:**
- CRUD de **Región** (vuelve editable la entidad `Region`).
- Asociación Región ↔ Países (muchos-a-muchos) y Región ↔ Proveedores de pago.
- CRUD de **Territorio** dentro de una región, con su configuración de envío.
- CRUD de **Zona** dentro de un territorio.
- Catálogo sembrado de proveedores de pago (solo selección).
- Soft delete, flag "activo", permisos ACL y registro en activity-log.

**Fuera:**
- Crear/editar catálogo de monedas y países (siguen readonly en r6).
- Crear nuevos proveedores de pago o integrar pasarelas.
- Cálculo efectivo de envío/impuestos en checkout (esta spec define el
  almacenamiento de reglas, no el motor — ver [[sprint1_r15_shipping]] y
  [[sprint1_r16_taxes]]).

## Requisitos funcionales

### Región
1. Crear región indicando **nombre** (obligatorio) y **una moneda** (obligatoria,
   del catálogo `Currency`).
2. Tras crear, asociar **N países** (de `Country`) y **N proveedores de pago**
   (del catálogo sembrado).
3. Un **país puede pertenecer a varias regiones** (muchos-a-muchos).
4. Una **tienda pertenece a una sola región**.
5. Editar nombre, moneda, países y proveedores de pago.
6. Desactivar (soft delete) una región; no hay borrado físico.

### Territorio
7. Crear territorios **dentro de una región**.
8. La vista presenta dos secciones:
   - **General:** nombre, código, activo.
   - **Envío:** garantía automática al finalizar pedido; cantidad mínima de
     subtotal de pedido (+ flag "calcular incluyendo impuestos"); envío gratis
     sobre "X" (+ valor de "X", + flag "calcular 'X' incluyendo impuestos");
     envío gratis sobre "X" sin descuentos; costo de envío; descripción.
9. Los campos monetarios del territorio se expresan en la **moneda de la región**
   a la que pertenece.
10. Los campos "incluyendo impuestos" / "garantía automática" / "envío gratis"
    son **flags booleanos**.

### Zona
11. Crear zonas **dentro de un territorio**, con: nombre, código, activo,
    descripción.

### Transversal
12. **Código único por nivel padre:** territorio único dentro de su región; zona
    única dentro de su territorio.
13. Toda creación/edición/desactivación queda registrada en el **activity-log**.
14. Las operaciones de escritura exigen permisos ACL (`regions.create`,
    `regions.update`, `regions.delete`, `shipping.update`, etc.).

## Reglas de negocio

- "Activo" es un **estado** independiente del borrado; el borrado es **soft
  delete** (`deletedAt`), nunca físico.
- No se puede eliminar/desactivar una región con **tiendas o territorios activos**
  asociados: se rechaza con error claro.
- No se puede eliminar un territorio con zonas activas (mismo criterio).
- Una región siempre tiene exactamente **una** moneda.
- Países y proveedores de pago son **opcionales** al crear la región.
- Al **cambiar la moneda de una región**, los montos guardados en sus
  territorios **no se reconvierten**: se conservan tal cual y se reinterpretan en
  la nueva moneda.
- Regiones, territorios y zonas son **catálogo global**, no scoped por tienda.

## Asunciones

- La "Región" editable **extiende la entidad `Region` existente** de
  `reference-data`, no crea una entidad paralela.
- La relación país↔región pasa de 1-a-N a **muchos-a-muchos**.
- Los proveedores de pago son catálogo predefinido y sembrado; la región solo
  selecciona cuáles habilita.
- Jerarquía estricta **Región → Territorio → Zona**, sin saltarse niveles.
- Los campos de envío son la **configuración de envío del territorio**, no una
  entidad "método de envío" separada.
- Las tres entidades son catálogo global.

## Criterios de aceptación

- [ ] Crear una región solo con nombre + moneda tiene éxito; sin moneda o sin
      nombre falla con error de validación.
- [ ] El mismo país puede asignarse a dos regiones distintas sin error.
- [ ] Una tienda no puede asociarse a más de una región.
- [ ] Crear un territorio persiste los campos de General y Envío.
- [ ] Dos territorios de la **misma** región no pueden compartir código; en
      regiones distintas sí pueden.
- [ ] Dos zonas del mismo territorio no pueden compartir código.
- [ ] Los montos del territorio se muestran en la moneda de su región.
- [ ] Desactivar una región con territorios o tiendas activas es rechazado con
      mensaje explicativo.
- [ ] Un territorio desactivado/eliminado no aparece en los listados por defecto.
- [ ] Crear/editar/eliminar región, territorio o zona genera entrada en
      activity-log.
- [ ] Un usuario sin permiso recibe 403 al intentar una mutación.

## Estado

**Entregado:** entidades Region/Territory/Zone con adapters Prisma, CRUD,
asociaciones M:N país↔región y región↔payment-provider, soft delete y flag
activo. Pantallas admin de regiones, territorios y zonas presentes en el catálogo.
