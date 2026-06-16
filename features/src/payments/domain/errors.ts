export class PaymentNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el pago ${id}`);
  }
}

export class PaymentProviderNotFoundError extends Error {
  constructor(code: string) {
    super(`No se encontró el provider de pago ${code}`);
  }
}

export class PaymentMethodUnavailableError extends Error {
  constructor(code: string) {
    super(`El método de pago ${code} no está disponible para la tienda`);
  }
}

export class InvalidPaymentTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Transición de pago inválida: ${from} -> ${to}`);
  }
}

export class InvalidWebhookSignatureError extends Error {
  constructor() {
    super('Firma de webhook inválida');
  }
}

export class DuplicateWebhookEventError extends Error {
  constructor(eventId: string) {
    super(`El webhook ${eventId} ya fue procesado`);
  }
}

export class RefundAmountExceededError extends Error {
  constructor() {
    super('El reembolso excede el saldo reembolsable');
  }
}

export class PaymentNotRefundableError extends Error {
  constructor(status: string) {
    super(`El pago en estado ${status} no puede reembolsarse`);
  }
}

export class TransientPaymentProviderError extends Error {
  constructor(message = 'Error transitorio del provider de pago') {
    super(message);
  }
}

export class OrderForPaymentNotFoundError extends Error {
  constructor(orderId: string) {
    super(`No se encontró la orden ${orderId} para autorizar pago`);
  }
}

export class PaymentStoreMismatchError extends Error {
  constructor() {
    super('La tienda del pago no coincide con la de la orden');
  }
}

export class PaymentCurrencyMismatchError extends Error {
  constructor() {
    super('La moneda del pago no coincide con la de la orden');
  }
}

export class PaymentAmountExceedsOrderError extends Error {
  constructor() {
    super('El monto del pago excede el saldo pendiente de la orden');
  }
}

export class OrderNotPayableError extends Error {
  constructor(paymentStatus: string) {
    super(`La orden en estado de pago ${paymentStatus} no admite nuevos pagos`);
  }
}
