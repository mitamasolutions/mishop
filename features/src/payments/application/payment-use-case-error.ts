import type {
  InvalidPaymentTransitionError,
  OrderForPaymentNotFoundError,
  OrderNotPayableError,
  PaymentAmountExceedsOrderError,
  PaymentCurrencyMismatchError,
  PaymentMethodUnavailableError,
  PaymentNotFoundError,
  PaymentNotRefundableError,
  PaymentProviderNotFoundError,
  PaymentStoreMismatchError,
  RefundAmountExceededError,
} from '../domain/errors';

export type PaymentUseCaseError =
  | PaymentNotFoundError
  | PaymentProviderNotFoundError
  | PaymentMethodUnavailableError
  | InvalidPaymentTransitionError
  | RefundAmountExceededError
  | PaymentNotRefundableError
  | OrderForPaymentNotFoundError
  | OrderNotPayableError
  | PaymentStoreMismatchError
  | PaymentCurrencyMismatchError
  | PaymentAmountExceedsOrderError
  | Error;
