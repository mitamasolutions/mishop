# Regiones, Territorios y Zonas (geografía + configuración de envío)

## Resumen
Permite al administrador gestionar la geografía comercial de la plataforma en
tres niveles jerárquicos al estilo nopCommerce: **Región** (moneda, países y
proveedores de pago habilitados), **Territorio** (pertenece a una región y
concentra la configuración de envío), y **Zona** (pertenece a un territorio,
es el agrupador geográfico más fino). Es la base para calcular medios de pago y
costos de envío por ubicación.

## Historia de usuario
> Como administrador, quiero crear regiones con su nombre, moneda, países y
> proveedores de pago; definir territorios con su configuración de envío dentro
> de cada región; y zonas dentro de cada territorio, para organizar la
> geografía comercial y las reglas de envío de la plataforma.

## Alcance
**Dentro:**
- CRUD de **Región** (extiende la entidad `Region` existente, hoy de solo
  lectura, para volverla editable).
- Asociación Región ↔ Países (muchos-a-muchos) y Región ↔ Proveedores de pago.
- CRUD de **Territorio** dentro de una región, con su configuración de envío.
- CRUD de **Zona** dentro de un territorio.
- Catálogo sembrado de **Proveedores de pago** (solo selección, no creación).
- Soft delete, flag "activo", permisos ACL y registro en activity-log.

**Fuera:**
- Crear/editar el catálogo de monedas y países (siguen siendo solo lectura de
  `reference-data`).
- Crear nuevos proveedores de pago o integrar sus pasarelas (solo se habilitan
  los del catálogo).
- Cálculo efectivo del costo de envío / impuestos en el checkout (esta spec
  define el almacenamiento de las reglas, no el motor que las evalúa).
- Impuestos por región/zona (más allá de los flags booleanos del territorio).

## Requisitos funcionales

### Región
1. El administrador puede crear una región indicando **nombre** (obligatorio) y
   **una moneda** (obligatoria, del catálogo `Currency`).
2. Tras crear, puede asociar a la región **N países** (del catálogo `Country`) y
   **N proveedores de pago** (del catálogo sembrado).
3. Un **país puede pertenecer a varias regiones** (relación muchos-a-muchos).
4. Una **tienda pertenece a una sola región**.
5. El administrador puede editar nombre, moneda, países y proveedores de pago de
   una región.
6. El administrador puede desactivar (soft delete) una región; no hay borrado
   físico.

### Territorio
7. El administrador puede crear territorios **dentro de una región**.
8. La vista de territorio presenta dos secciones:
   - **General:** nombre, código, activo.
   - **Envío:** garantía automática al finalizar pedido; cantidad mínima de
     subtotal de pedido (+ flag "calcular incluyendo impuestos"); envío gratis
     sobre "X" (+ valor de "X", + flag "calcular 'X' incluyendo impuestos");
     envío gratis sobre "X" sin descuentos; costo de envío; descripción.
9. Los campos monetarios del territorio (cantidad mínima de subtotal, valor de
   "X", costo de envío) se expresan en la **moneda de la región** a la que
   pertenece.
10. Los campos "incluyendo impuestos" / "garantía automática" / "envío gratis"
    son **flags booleanos**.

### Zona
11. El administrador puede crear zonas **dentro de un territorio**, con:
    nombre, código, activo, descripción.

### Transversal
12. **Código único por nivel padre:** el código de un territorio es único dentro
    de su región; el de una zona es único dentro de su territorio.
13. Toda creación/edición/desactivación de región, territorio o zona queda
    registrada en el **activity-log**.
14. Las operaciones de escritura exigen permisos ACL (p. ej. `regions.create`,
    `regions.update`, `regions.delete`, `shipping.update` — nombres exactos a
    confirmar en implementación).

## Reglas de negocio
- "Activo" es un **estado** (encender/apagar) independiente del borrado; el
  borrado es **soft delete** (`deletedAt`), nunca físico, siguiendo el patrón de
  `reference-data`.
- No se puede **eliminar/desactivar una región** que tenga **tiendas o
  territorios asociados** activos: la operación se rechaza con un error claro.
- No se puede eliminar un **territorio** con zonas asociadas activas (mismo
  criterio).
- Una región siempre tiene exactamente **una** moneda.
- Países y proveedores de pago son **opcionales** al crear la región; pueden
  quedar vacíos y agregarse después.
- Al **cambiar la moneda de una región**, los montos ya guardados en sus
  territorios **no se reconvierten**: se conservan tal cual y pasan a
  interpretarse en la nueva moneda. La conversión, si se desea, es manual.
- Las regiones, territorios y zonas son **catálogo global** de la plataforma
  (no scoped por tienda).

## Criterios de aceptación
- [ ] Crear una región solo con nombre + moneda tiene éxito; sin moneda o sin
      nombre falla con error de validación.
- [ ] El mismo país puede asignarse a dos regiones distintas sin error.
- [ ] Una tienda no puede asociarse a más de una región.
- [ ] Crear un territorio dentro de una región persiste los campos de las
      secciones General y Envío.
- [ ] Dos territorios de la **misma** región no pueden compartir código; dos
      territorios de regiones **distintas** sí pueden tener el mismo código.
- [ ] Dos zonas del mismo territorio no pueden compartir código.
- [ ] Los montos del territorio se muestran en la moneda de su región.
- [ ] Desactivar una región con territorios o tiendas activas es rechazado con
      un mensaje explicativo.
- [ ] Un territorio desactivado/eliminado no aparece en los listados por
      defecto (soft delete).
- [ ] Crear/editar/eliminar región, territorio o zona genera una entrada en el
      activity-log.
- [ ] Un usuario sin el permiso correspondiente recibe 403 al intentar una
      mutación.

## Flujo principal
1. El administrador abre "Regiones" y crea una región (nombre + moneda).
2. Edita la región para seleccionar países y proveedores de pago.
3. Dentro de la región, crea un territorio: completa la sección **General**
   (nombre, código, activo) y la sección **Envío** (reglas y montos).
4. Dentro del territorio, crea una o más zonas (nombre, código, activo,
   descripción).
5. El sistema valida unicidad de códigos por nivel y registra cada acción en el
   activity-log.

## Casos borde y manejo de errores
- Crear región sin moneda → error de validación ("la moneda es obligatoria").
- Código de territorio/zona duplicado en el mismo padre → error de unicidad.
- Asignar a una región un país inexistente o un proveedor de pago fuera del
  catálogo → error de validación.
- Eliminar región con tiendas/territorios o territorio con zonas → operación
  rechazada con mensaje explicativo.
- Cambiar la moneda de una región que ya tiene territorios con montos → los
  montos **no se reconvierten**; se mantienen con el mismo valor numérico y se
  reinterpretan en la nueva moneda.

## Asunciones
- La "Región" editable **extiende la entidad `Region` existente** de
  `reference-data` (hoy de solo lectura), en lugar de crear una entidad nueva
  paralela.
- La relación país↔región pasa de 1-a-N (FK actual) a **muchos-a-muchos**.
- Los **proveedores de pago** son un catálogo **predefinido y sembrado**
  (Stripe, MercadoPago, PayPal, transferencia, efectivo, etc.); la región solo
  selecciona cuáles habilita.
- Jerarquía estricta **Región → Territorio → Zona** (estilo nopCommerce), sin
  saltarse niveles.
- Los campos de la imagen son la **configuración de envío del territorio**, no
  una entidad "método de envío" separada.
- "Activo" es un flag de estado; el borrado es soft delete.
- Las tres entidades son catálogo **global**, no scoped por tienda.
