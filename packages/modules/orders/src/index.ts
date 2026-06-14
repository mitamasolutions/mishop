/**
 * API pública del módulo orders. Otros paquetes SOLO pueden importar de aquí
 * (regla 3 de arquitectura). Los eventos compartidos viven en @mitama/contracts.
 */
export { OrdersModule } from './orders.module';
export { ORDERS_TOKENS } from './orders.tokens';
export { Order } from './domain/order.entity';
export type { OrderLineProps, OrderPaymentStatus, OrderStatus } from './domain/order.entity';
export type { OrderRepository } from './domain/order.repository';
export type { OrderOutput } from './application/order.dto';
export type { StockReservationService } from './domain/stock-reservation';
