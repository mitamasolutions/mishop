/**
 * Errores compartidos por todos los providers/plugins de pago.
 * Viven en `@mitama/contracts` para que tanto el módulo `payments` como los
 * plugins (`@mitama/payment_*`) puedan importarlos sin acoplarse entre sí.
 */
export class InvalidWebhookSignatureError extends Error {
  constructor() {
    super('Firma de webhook inválida');
  }
}

export class TransientPaymentProviderError extends Error {
  constructor(message = 'Error transitorio del provider de pago') {
    super(message);
  }
}
