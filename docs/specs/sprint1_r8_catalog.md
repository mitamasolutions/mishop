# Sprint 1 · r8 — Catálogo (catalog)

> Estado: ✅ entregado · Origen: `f3-products-inventories` · Hito: —
> Módulo: `packages/modules/catalog`

## Resumen

Gestión completa del catálogo: productos simples y con variantes, taxonomías
(categorías jerárquicas, colecciones, marcas, tags, tipos), atributos de
especificación, precios (base, oferta, listas de precios, tier prices, costo),
canales de venta y SEO. Modelo alineado a Medusa v2 con lógica de nopCommerce
(marca de primera clase, precio especial con fechas). El inventario vive en
[[sprint1_r9_inventory]] y las imágenes en [[sprint1_r10_media]].

## Historia de usuario

> Como administrador de la tienda (no necesariamente técnico), quiero gestionar
> mi catálogo completo —productos, variantes, categorías, marcas, precios— desde
> un panel claro, para vender los mismos productos en el ecommerce y, en el
> futuro, en el POS sin reconfigurar nada.

## Alcance

**Dentro:**
- Productos, variantes, opciones/valores, tipos de producto, atributos de
  especificación, categorías jerárquicas, colecciones, marcas, tags, canales de
  venta, precios (base, oferta, tier prices, costo), SEO.
- Vistas admin (CRUD) por entidad con búsqueda/filtros/paginación y árbol de
  categorías drag & drop.
- API REST de administración.
- Import/export CSV de productos y variantes.

**Fuera:**
- Storefront público.
- Multi-moneda activa (esquema preparado; solo moneda base en esta fase).
- Bundles/kits en la UI.
- Multi-idioma del contenido de catálogo.

## Requisitos funcionales

### Productos y variantes
1. Crear **productos simples** (una variante por defecto) y **con variantes**,
   generadas desde **opciones** (Talla, Color) y sus **valores**; cada
   combinación seleccionada produce una variante.
2. Cada variante: `sku` (obligatorio, único global), opcionales `barcode`,
   `ean`, `upc` (campos separados, sin validación de estándar), título, `rank`,
   peso/dimensiones, `manage_inventory`, `allow_backorder`.
3. El producto: título, slug (`handle`), subtítulo, descripción, estado
   (`borrador`/`publicado`/`propuesto`), thumbnail, material, dimensiones, y
   referencias a tipo, colección, marca, categorías, tags y canales.
4. **Precio, costo e inventario** se gestionan a nivel **variante**; el precio en
   listados es el de la variante por defecto (o el menor).

### Taxonomías
5. **Tipos de producto:** entidad plana; máximo uno por producto.
6. **Categorías:** árbol jerárquico (padre/hijo, profundidad ilimitada) con
   `rank`, `is_active`, slug y SEO; un producto en varias; drag & drop en admin.
7. **Colecciones:** agrupaciones planas; un producto en varias.
8. **Marcas** (primera clase, estilo nopCommerce Manufacturer): nombre, slug,
   logo, descripción y SEO; **máximo una** por producto; filtrable.
9. **Tags:** texto reutilizable, M:N con productos; evita duplicados por valor
   canónico.
10. **Canales de venta:** determinan visibilidad; un producto en varios canales;
    cada canal puede asociarse a ubicaciones de stock.

### Atributos y especificaciones
11. Distinguir **opciones de variante** (generan SKUs) de **atributos de
    especificación** (descriptivos/filtrables, no generan variantes).
12. Los atributos de especificación se definen como pares clave-valor
    reutilizables y se asignan por producto.

### Precios
13. Cada variante tiene **precio base** y **costo** (interno, nunca expuesto en
    tienda).
14. El esquema soporta `currency_code` por precio (multi-moneda preparado), pero
    el admin **solo captura la moneda base** en esta fase.
15. **Oferta puntual:** por variante, precio de oferta con fecha inicio/fin
    opcionales.
16. **Listas de precios** (vigencia inicio/fin, estado) que sobreescriben precios
    de muchas variantes.
17. **Tier prices:** precio por cantidad por variante, con mínimo (y máximo
    opcional).
18. **Precio efectivo** por prioridad: `lista de precios activa` > `oferta de
    variante vigente` > `tier price aplicable` > `precio base`.

### SEO
19. Cada producto, categoría y marca tiene **slug único** (autogenerado,
    editable) + meta title/description opcionales.
20. Al cambiar un slug, el sistema crea automáticamente un **redirect 301** desde
    el slug anterior al nuevo, conservando el historial.

### Relacionados
21. Un producto puede declarar **productos relacionados** y **cross-sell**;
    también comparte taxonomías para sugerencias.

### Admin, búsqueda, import/export
22. **Vista de administración por cada entidad** (productos, variantes,
    categorías árbol, colecciones, marcas, tipos, tags, canales, atributos) con
    búsqueda, filtros y paginación.
23. El listado de productos permite buscar por nombre y SKU, y filtrar por
    categoría, estado/canal y nivel de stock.
24. **Import/export CSV** a nivel producto+variante (una fila por variante), con
    validación por fila y reporte de filas rechazadas; las imágenes no viajan en
    el CSV.

## Reglas de negocio

- Un producto simple es internamente un producto con **una** variante por
  defecto; nunca existe producto sin al menos una variante.
- `sku` es único global; se rechazan altas/ediciones con SKU duplicado.
- El **costo** jamás se expone en respuestas públicas/tienda.
- La marca es **única por producto** (máximo una).
- Un slug no puede colisionar con otro de la misma entidad; el sistema sugiere
  una variante única.
- Al cambiar un slug, el anterior queda como redirect 301 y no se reutiliza
  mientras exista el redirect.
- La moneda de captura en esta fase es **una sola** (la base de la plataforma).

## Asunciones

- Modelo de variantes alineado a Medusa: `product` → `product_option` →
  `product_option_value` → `product_variant` con puente `product_variant_option`.
- Identificadores separados: `sku` (único, obligatorio), `barcode`, `ean`, `upc`.
- Multi-moneda preparado, una sola moneda activa.
- Ofertas híbridas: oferta+vigencia por variante **y** listas de precios,
  resueltas por prioridad.
- Marca de primera clase; categorías jerárquicas; colecciones planas; tags M:N;
  tipos planos; canales múltiples por producto.
- Costo interno por variante, nunca expuesto.
- SEO con slug único por entidad y redirect 301 automático.
- Gestión vía panel admin (API CRUD + UI); storefront/POS fuera de esta fase.
- Import/export CSV a nivel producto+variante con reporte de errores por fila.

## Criterios de aceptación

- [ ] Crear un producto simple con título, slug, precio y stock en una ubicación
      deja una variante por defecto.
- [ ] Crear un producto con dos opciones genera una variante por combinación,
      cada una con su SKU/precio/stock.
- [ ] Rechazo de SKU duplicado con mensaje en español.
- [ ] Crear/editar/reordenar categorías en árbol drag & drop y asignar producto a
      varias.
- [ ] Crear marca con nombre/slug/logo/SEO y asignarla (solo una por producto).
- [ ] Crear colecciones, tipos, tags y canales y asociarlos; el producto solo es
      visible en los canales asignados.
- [ ] Definir precio base y costo por variante; el costo no aparece en respuestas
      públicas.
- [ ] Oferta con fechas cambia el precio efectivo dentro de la vigencia.
- [ ] Lista de precios con vigencia gana sobre la oferta de variante.
- [ ] Definir tier prices por cantidad.
- [ ] Cambiar el slug responde con redirect 301 al nuevo desde el anterior.
- [ ] Buscar por nombre/SKU y filtrar por categoría/estado/canal/stock con
      paginación.
- [ ] Exportar/reimportar CSV (una fila por variante); las filas con error se
      reportan sin abortar el import.
- [ ] Existe vista admin funcional para cada entidad.

## Casos borde

- SKU duplicado / variante sin SKU / producto con cero variantes → rechazo.
- Colisión de slug → se sugiere uno único; slug vía redirect no reutilizable.
- Oferta con fecha fin < inicio → validación bloqueante.
- Empate lista activa vs oferta → gana la lista.
- Import CSV con filas inválidas → se importan las válidas + reporte por fila.
- Eliminar categoría con hijos/productos → confirmación con destino de hijos y
  desasociación; sin cascada silenciosa.
- Eliminar marca/colección en uso → desasocia o bloquea según confirmación.

## Estado

**Entregado:** módulo `catalog` completo (18 modelos Prisma, 78 casos de uso,
8 controladores). CRUD de productos/variantes/precios/marcas/categorías/
colecciones, opciones+especificaciones, canales, listas de precios y URL
redirects. Pantallas admin de catálogo presentes (productos con tabs general/
variants/inventory/prices/options/specifications/taxonomy, marcas, categorías,
colecciones, etiquetas, tipos, listas de precios, canales).

**Pendiente (cierre fino, F2):** migrar `Product.handle` y `ProductVariant.sku`
de `@unique` full a **índice parcial único `WHERE deleted_at IS NULL`** para
permitir reutilizar el handle/SKU tras un soft-delete — ver
[[sprint1_r20_db_baseline_constraints]].
