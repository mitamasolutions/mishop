# Sprint 1 · r10 — Media (media)

> Estado: 🟡 parcial · Origen: `f3-products-inventories` · Hito: —
> Módulo: `packages/modules/media`

## Resumen

Subida de imágenes a un backend de almacenamiento **configurable** (local /
S3-compatible / Cloudinary) mediante un puerto abstracto, con imagen por producto
y por variante, orden y alt text.

## Historia de usuario

> Como administrador, quiero subir imágenes a mis productos y variantes,
> ordenarlas y ponerles alt text, para presentar el catálogo sin acoplarme a un
> proveedor de almacenamiento concreto.

## Alcance

**Dentro:**
- Backend de almacenamiento configurable vía puerto abstracto.
- Imagen por **producto** (galería general) y por **variante** específica.
- URL, orden (`rank`) y texto alternativo (alt).

**Fuera:**
- Transformaciones/optimización avanzada de imágenes.
- Imágenes en el CSV de import/export (solo URLs, o se omiten).

## Requisitos funcionales

1. Las imágenes se suben a un backend **configurable** (local en desarrollo /
   S3-compatible / Cloudinary) mediante un **puerto abstracto**.
2. Cada imagen tiene URL, orden (`rank`) y texto alternativo (alt); puede
   asociarse al **producto** (galería general) o a una **variante** específica.

## Reglas de negocio

- Backend de media no disponible (p. ej. credenciales S3 inválidas) → error
  controlado en la subida con mensaje claro; no deja imágenes "huérfanas".
- Cambiar el backend de almacenamiento no requiere tocar la UI.

## Asunciones

- Media en backend configurable vía puerto abstracto; imagen por producto y por
  variante, con orden y alt text.

## Criterios de aceptación

- [ ] Subir imágenes a un producto y a una variante, ordenarlas y ponerles alt
      text.
- [ ] Cambiar el backend de almacenamiento no requiere tocar la UI.
- [ ] Backend no disponible → error controlado sin imágenes huérfanas.

## Estado

**Entregado:** modelo `ProductImage` persistido (schema `media.prisma`); imágenes
asociadas a producto/variante con orden y alt.

**Pendiente:** afinar/confirmar el puerto abstracto de backend configurable
(local/S3/Cloudinary) y su selección por configuración; cobertura de tests del
adapter de almacenamiento.
