# Fase 3 · Catálogo, Inventario y Media (Products & Inventories)

## Resumen

Gestión completa del catálogo de productos para la plataforma mitama-commerce
(ecommerce + POS para LATAM): productos simples y con variantes, taxonomías
(categorías, colecciones, marcas, tags, tipos), atributos y especificaciones,
precios (base, oferta, tier prices, costo), inventario por ubicación y media de
imágenes. Todo administrable desde el panel de administración (API + UI), con
un modelo de datos alineado al esquema de Medusa v2 pero conservando la lógica
de negocio de nopCommerce (marca de primera clase, precio especial con fechas).
Esta fase entrega los módulos `catalog`, `inventory` y `media`.

## Historia de usuario

> Como **administrador de la tienda (no necesariamente técnico)**, quiero
> **gestionar mi catálogo completo —productos, variantes, categorías, marcas,
> precios e inventario por ubicación— desde un panel claro**, para **vender los
> mismos productos en el ecommerce y, en el futuro, en el POS sin reconfigurar
> nada**.

## Alcance

**Dentro:**

- Módulo `catalog`: productos, variantes, opciones/valores, tipos de producto,
  atributos de especificación, categorías jerárquicas, colecciones, marcas,
  tags, canales de venta, precios (base, oferta, tier prices, costo), SEO.
- Módulo `inventory`: ubicaciones de stock, niveles por ubicación
  (`stocked`/`reserved`/`incoming`), backorder y umbral de stock bajo por
  variante, ajustes manuales y consulta.
- Módulo `media`: subida de imágenes a un backend configurable (local /
  S3-compatible / Cloudinary), orden, alt text, imagen por producto y por
  variante.
- Vistas de administración (UI) para **cada** módulo y taxonomía: listados con
  búsqueda/filtros/paginación, formularios de alta/edición y árbol de
  categorías con drag & drop.
- API REST de administración (CRUD) que respalda toda la UI.
- Import/export CSV de productos y variantes.

**Fuera:**

- Storefront público que consume el catálogo (queda para una fase posterior).
- POS y su flujo de venta (solo se garantiza que el modelo de datos lo soporte).
- Multi-moneda activa (el esquema lo soporta; en esta fase solo se captura la
  moneda base de la plataforma).
- Bundles/kits en la UI (el esquema de inventario lo deja preparado, sin UI).
- Reservas automáticas por órdenes (el campo `reserved` existe; lo poblará el
  módulo de órdenes en su fase).
- Multi-idioma del contenido de catálogo (la UI/mensajes son español-first,
  pero no hay traducciones por producto en esta fase).

## Requisitos funcionales

### Productos y variantes

1. El sistema permite crear **productos simples** (una sola variante por
   defecto) y **productos con variantes**, generadas a partir de **opciones**
   (ej. Talla, Color) y sus **valores**; cada combinación seleccionada produce
   una variante.
2. Cada variante tiene: `sku` (obligatorio, único global), y opcionales
   `barcode`, `ean`, `upc` (campos separados, sin validación de estándar),
   título, orden (`rank`), peso/dimensiones, `manage_inventory` y
   `allow_backorder`.
3. El producto tiene: título, slug (`handle`), subtítulo, descripción, estado
   (`borrador`/`publicado`/`propuesto`), thumbnail, material, dimensiones, y
   referencias a tipo, colección, marca, categorías, tags y canales.
4. El **precio, el costo y el inventario** se gestionan a nivel de **variante**.
   El precio mostrado en listados es el de la variante por defecto (o el menor).

### Taxonomías

5. **Tipos de producto**: entidad plana, etiqueta clasificatoria; no impone
   atributos ni comportamiento. Un producto tiene como máximo un tipo.
6. **Categorías**: árbol jerárquico (padre/hijo, profundidad ilimitada) con
   `rank`, `is_active`, slug y SEO. Un producto puede pertenecer a varias
   categorías. La UI ofrece reordenamiento/reanidado por **drag & drop**.
7. **Colecciones**: agrupaciones planas (no jerárquicas) para marketing
   (ej. "Verano 2026"), con título y slug. Un producto puede estar en varias.
8. **Marcas** (entidad de primera clase, estilo nopCommerce Manufacturer):
   nombre, slug, logo, descripción y SEO (meta title/description). Un producto
   tiene **como máximo una** marca. Filtrable en admin.
9. **Tags**: texto reutilizable, relación muchos-a-muchos con productos, para
   filtros y búsqueda; el sistema evita duplicados por valor canónico.
10. **Canales de venta**: determinan en qué tiendas/escaparates es visible un
    producto; un producto puede publicarse en varios canales. Cada canal puede
    asociarse a ubicaciones de stock.

### Atributos y especificaciones

11. El sistema distingue **opciones de variante** (generan SKUs: Talla, Color)
    de **atributos de especificación** (descriptivos y filtrables, no generan
    variantes: Material, Garantía).
12. Los atributos de especificación se definen como pares clave-valor
    reutilizables a nivel de catálogo y se asignan por producto.

### Precios

13. Cada variante tiene **precio base** y **costo** (interno, para margen/POS,
    nunca expuesto en tienda).
14. El esquema de precios soporta `currency_code` por precio (multi-moneda
    preparado), pero el admin **solo captura la moneda base** de la plataforma
    en esta fase.
15. **Oferta puntual**: por variante se puede definir un precio de oferta con
    fecha de inicio y fin opcionales.
16. **Campañas**: se pueden crear **listas de precios** (vigencia
    `inicio`/`fin`, estado) que sobreescriben precios de muchas variantes.
17. **Tier prices**: precio por cantidad por variante, con cantidad mínima
    (y máxima opcional); aplican al alcanzar el umbral.
18. El **precio efectivo** se resuelve por prioridad:
    `lista de precios activa` > `oferta de variante vigente` >
    `tier price aplicable` > `precio base`.

### Inventario (módulo `inventory`)

19. El stock se modela **por ubicación**: cada variante se asocia a un
    `inventory_item` (relación 1–1 en esta fase, `required_quantity` = 1 fijo,
    preparado para bundles sin migración), y el stock vive en niveles por
    ubicación con `stocked`, `reserved` e `incoming`.
20. Por variante se configura: **backorder** (permitir vender sin stock,
    no bloquea ventas) y **umbral de stock bajo** (solo dispara alerta/aviso
    visual, no bloquea ventas).
21. La UI permite **ajuste manual** de stock por ubicación, consulta de niveles
    y un listado/alerta de productos bajo umbral.

### Media (módulo `media`)

22. Las imágenes se suben a un backend de almacenamiento **configurable**
    (local en desarrollo / S3-compatible / Cloudinary) mediante un puerto
    abstracto.
23. Cada imagen tiene URL, orden (`rank`) y texto alternativo (alt); puede
    asociarse al **producto** (galería general) o a una **variante** específica.

### SEO

24. Cada producto, categoría y marca tiene **slug único** (autogenerado desde
    el nombre, editable) más meta title y meta description opcionales.
25. Al cambiar un slug, el sistema crea automáticamente un **redirect 301**
    desde el slug anterior al nuevo, conservando el historial.

### Relacionados

26. Un producto puede declarar **productos relacionados** y **cross-sell**;
    también comparte taxonomías (tags/categorías) para sugerencias.

### Admin: vistas, búsqueda, import/export

27. Existe una **vista de administración por cada módulo/entidad**:
    productos, variantes, categorías (árbol drag & drop), colecciones, marcas,
    tipos, tags, canales de venta, atributos, ubicaciones de stock, niveles de
    inventario y media. Cada listado ofrece búsqueda, filtros y paginación.
28. El **listado de productos** permite buscar por nombre y SKU, y filtrar por
    categoría, estado/canal y nivel de stock.
29. **Import/export CSV** opera a nivel de productos y variantes (una fila por
    variante), con validación por fila y reporte de filas rechazadas; las
    imágenes no viajan en el CSV (solo URLs, o se omiten).

## Reglas de negocio

- Un producto simple es, internamente, un producto con **una** variante por
  defecto; nunca existe un producto sin al menos una variante.
- `sku` es único a nivel global; el sistema rechaza altas/ediciones con SKU
  duplicado.
- El **costo** jamás se expone en respuestas públicas/tienda; solo en el admin.
- El backorder y el umbral de stock bajo se configuran **por variante**, no por
  producto.
- El umbral de stock bajo **no** bloquea ventas; solo alerta. El backorder
  permite vender en negativo cuando está activo.
- La marca es **única por producto** (máximo una).
- Un slug no puede colisionar con otro de la misma entidad (producto, categoría
  o marca); el sistema sugiere una variante única si hay colisión.
- Al cambiar un slug, el slug anterior queda registrado como redirect 301 y no
  puede reutilizarse mientras exista el redirect.
- La moneda de captura en esta fase es **una sola** (la base de la plataforma),
  aunque el esquema admita varias.
- Reglas de arquitectura del repo (inviolables): Prisma solo en `infra/`,
  comunicación entre módulos por eventos/`@mitama/contracts`, dependencias
  hacia adentro (`http → application → domain`).

## Criterios de aceptación

- [ ] Puedo crear un producto simple con título, slug, precio y stock en una
      ubicación, y queda con una variante por defecto.
- [ ] Puedo crear un producto con dos opciones (Talla, Color) y el sistema
      genera una variante por cada combinación seleccionada, cada una con su
      propio SKU, precio y stock.
- [ ] El sistema rechaza guardar una variante con un SKU ya existente y muestra
      un mensaje en español.
- [ ] Puedo crear, editar y reordenar categorías en un árbol con drag & drop, y
      asignar un producto a varias categorías.
- [ ] Puedo crear una marca con nombre, slug, logo y SEO, y asignarla a un
      producto (solo una marca por producto).
- [ ] Puedo crear colecciones, tipos, tags y canales de venta, y asociarlos a un
      producto; el producto solo es visible en los canales asignados.
- [ ] Puedo definir un precio base y un costo por variante; el costo no aparece
      en ninguna respuesta marcada como pública.
- [ ] Puedo poner una oferta a una variante con fecha de inicio y fin, y el
      precio efectivo cambia dentro de la vigencia y vuelve al base fuera de ella.
- [ ] Puedo crear una lista de precios con vigencia que sobreescribe precios de
      varias variantes, y su prioridad gana sobre la oferta de variante.
- [ ] Puedo definir tier prices por cantidad en una variante.
- [ ] Puedo registrar stock por ubicación con cantidades `stocked` e `incoming`,
      activar backorder y fijar un umbral de stock bajo por variante.
- [ ] El listado de productos bajo umbral muestra las variantes por debajo de su
      umbral, sin impedir su venta.
- [ ] Puedo subir imágenes a un producto y a una variante, ordenarlas y ponerles
      alt text; cambiar el backend de almacenamiento no requiere tocar la UI.
- [ ] Al cambiar el slug de un producto, una petición al slug anterior responde
      con redirect 301 al nuevo.
- [ ] El listado de productos permite buscar por nombre y SKU y filtrar por
      categoría, estado/canal y stock, con paginación.
- [ ] Puedo exportar productos a CSV (una fila por variante) y reimportar; las
      filas con error se reportan individualmente sin abortar todo el import.
- [ ] Existe una vista de administración funcional para cada entidad listada en
      el requisito 27.

## Flujo principal (alta de producto con variantes)

1. El admin entra a la vista de productos y elige "Nuevo producto".
2. Captura datos generales: título (slug autogenerado, editable), descripción,
   tipo, marca, colección(es), categoría(s), tags y canales de venta.
3. Define las **opciones** (ej. Talla: S/M/L; Color: Rojo/Azul) y el sistema
   propone la matriz de **variantes** (combinaciones).
4. Para cada variante captura SKU, precio base, costo, y opcionalmente
   barcode/ean/upc, peso/dimensiones, backorder y umbral de stock bajo.
5. Asigna **stock por ubicación** a cada variante (`stocked`/`incoming`).
6. Sube **imágenes** al producto y, si aplica, asocia imágenes a variantes
   concretas; ordena y agrega alt text.
7. Opcionalmente configura **oferta** (fechas) o asocia el producto a una
   **lista de precios**, y define **tier prices**.
8. Completa **SEO** (meta title/description; slug ya generado).
9. Guarda en estado `borrador` o `publicado`. Si publica, el producto queda
   visible en los canales asignados.

## Casos borde y manejo de errores

- **SKU duplicado** → rechazo con mensaje en español indicando el SKU en
  conflicto; no se persiste nada.
- **Variante sin SKU** → validación bloqueante; el SKU es obligatorio.
- **Producto con cero variantes** → imposible; siempre existe la variante por
  defecto.
- **Colisión de slug** (producto/categoría/marca) → el sistema sugiere un slug
  único; no permite guardar duplicado.
- **Slug que ya fue de otro producto vía redirect** → no reutilizable mientras
  exista el redirect; se avisa al admin.
- **Venta/stock negativo sin backorder** → no permitido; con backorder activo,
  se permite y el nivel queda en negativo.
- **Umbral de stock bajo alcanzado** → se marca como alerta visual; nunca
  bloquea la venta.
- **Oferta con fecha de fin anterior a la de inicio** → validación bloqueante.
- **Prioridad de precios** → si coinciden lista activa y oferta de variante,
  gana la lista; se documenta el precio efectivo resultante.
- **Import CSV con filas inválidas** → se importan las válidas y se devuelve un
  reporte de las filas rechazadas con el motivo por fila; no se aborta todo.
- **Backend de media no disponible** (ej. credenciales S3 inválidas) → error
  controlado en la subida con mensaje claro; no deja imágenes "huérfanas".
- **Eliminar una categoría con hijos/productos** → se pide confirmación y se
  define el destino de los hijos (reanidar al padre) y la desasociación de
  productos; no se borra en cascada silenciosa.
- **Eliminar una marca/colección en uso** → se desasocia de los productos o se
  bloquea según confirmación; nunca deja referencias colgantes.

## Asunciones (refinadas)

- **Modelo de variantes** alineado a Medusa: `product` → `product_option` →
  `product_option_value` → `product_variant` con tabla puente
  `product_variant_option`. Producto simple = una variante por defecto.
- **Identificadores de variante** separados: `sku` (único, obligatorio),
  `barcode`, `ean`, `upc` (opcionales, sin validación de estándar).
- **Multi-moneda** preparado en el esquema (`currency_code` por precio) pero
  **una sola moneda activa** en esta fase _(refinada: 14 → B)_.
- **Ofertas híbridas**: campo de oferta+vigencia por variante para promos
  puntuales **y** listas de precios para campañas, resueltas por prioridad
  _(refinada: 12 → B)_.
- **Inventario desacoplado** estilo Medusa: `inventory_item` ↔ variante (1–1,
  `required_quantity` = 1 fijo, preparado para bundles sin migrar) +
  `inventory_level` por ubicación con `stocked`/`reserved`/`incoming`; backorder
  y umbral de stock bajo por variante _(refinada: 16 → D)_.
- **Marca de primera clase** (estilo nopCommerce Manufacturer): nombre, slug,
  logo, descripción y SEO; **una marca por producto** _(refinada: 9 → A)_.
- Opciones de variante vs. atributos de especificación son conceptos distintos;
  solo las opciones generan SKUs.
- Categorías jerárquicas (árbol con `mpath`/`parent_id` y drag & drop),
  colecciones planas, tags muchos-a-muchos, tipos planos, canales de venta
  múltiples por producto.
- Costo interno por variante, nunca expuesto en tienda.
- Media en backend configurable vía puerto abstracto; imagen por producto y por
  variante, con orden y alt text.
- SEO con slug único por entidad y redirect 301 automático al cambiar slug.
- Toda la gestión es vía **panel de administración** (API CRUD + UI con vista
  por módulo); el storefront público y el POS quedan fuera de esta fase, pero el
  modelo de datos los soporta.
- Import/export CSV a nivel producto+variante (una fila por variante), con
  reporte de errores por fila; imágenes no viajan en el CSV.
