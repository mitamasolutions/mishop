/**
 * API pública del módulo cart. Otros paquetes SOLO pueden importar de aquí
 * (regla 3 de arquitectura). Los eventos compartidos viven en @mitama/contracts.
 */
export { CartModule } from './cart.module';
export { CART_TOKENS } from './cart.tokens';
export { Cart } from './domain/cart.entity';
export type { CartAddressSnapshot, CartChannel, CartLineProps, CartPaymentMethodSnapshot, CartShippingMethodSnapshot, CheckoutStep } from './domain/cart.entity';
export type { CartRepository } from './domain/cart.repository';
export type { CartOutput } from './application/cart.dto';
