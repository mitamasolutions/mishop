/**
 * Catálogo tipado de claves de configuración. Es la única fuente de verdad:
 * la API solo acepta lecturas/escrituras de claves listadas aquí, con el
 * tipo y valor por defecto que se definen en este archivo.
 */

export type SettingType = 'string' | 'number' | 'boolean' | 'json';

export type SettingValue = string | number | boolean | Record<string, unknown> | unknown[];

export interface SettingDefinition {
  type: SettingType;
  default: SettingValue;
  description: string;
}

export const SETTINGS_CATALOG = {
  'store.display_name': {
    type: 'string',
    default: '',
    description: 'Nombre comercial mostrado en el storefront y los recibos',
  },
  'store.support_email': {
    type: 'string',
    default: '',
    description: 'Correo de contacto para soporte a clientes',
  },
  'store.default_locale': {
    type: 'string',
    default: 'es-MX',
    description: 'Idioma/región por defecto para formatos de fecha y moneda',
  },
  'store.default_timezone': {
    type: 'string',
    default: 'America/Mexico_City',
    description: 'Zona horaria por defecto para reportes y programaciones',
  },
  'checkout.allow_guest_checkout': {
    type: 'boolean',
    default: true,
    description: 'Permite finalizar compras sin crear una cuenta',
  },
  'inventory.low_stock_threshold': {
    type: 'number',
    default: 5,
    description: 'Cantidad mínima de inventario antes de marcar "stock bajo"',
  },
  'pos.receipt_footer_text': {
    type: 'string',
    default: '',
    description: 'Texto adicional impreso al final del recibo del POS',
  },
  'notifications.channels': {
    type: 'json',
    default: { email: true, sms: false },
    description: 'Canales habilitados para notificaciones a clientes',
  },
} as const satisfies Record<string, SettingDefinition>;

export type SettingKey = keyof typeof SETTINGS_CATALOG;

export function isSettingKey(key: string): key is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTINGS_CATALOG, key);
}

export function matchesSettingType(type: SettingType, value: unknown): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'json':
      return typeof value === 'object' && value !== null;
  }
}
