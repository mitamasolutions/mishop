/**
 * Genera un slug URL-safe a partir de un texto libre. Reutilizado por marcas,
 * categorías y productos para cumplir el requisito de slug único + SEO.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos (marcas diacriticas)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // no-alfanumérico → guion
    .replace(/-{2,}/g, '-') // colapsa guiones repetidos
    .replace(/^-+|-+$/g, ''); // recorta guiones de los extremos
}
