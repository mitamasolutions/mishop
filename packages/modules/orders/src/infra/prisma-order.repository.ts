import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/db';
import { Order, type OrderLineProps, type OrderPaymentStatus, type OrderStatus, type OrderNoteProps, type StateTransitionProps } from '../domain/order.entity';
import { IdempotencyConflictError, OrderAlreadyExistsForCartError } from '../domain/errors';
import type { OrderFilter, OrderRepository, SaveOrderOptions, StoredIdempotencyRecord } from '../domain/order.repository';

const ORDER_INCLUDE = { lines: true, transitions: true, notes: true } satisfies Prisma.OrderInclude;
type OrderRow = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Order | null> {
    const row = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    return row ? this.toDomain(row) : null;
  }

  async findAll(filter: OrderFilter): Promise<{ items: Order[]; total: number; page: number; pageSize: number }> {
    const where: Prisma.OrderWhereInput = {
      storeId: filter.storeId,
      status: filter.status,
      paymentStatus: filter.paymentStatus,
      customerId: filter.customerId,
      channel: filter.channel,
      // Búsqueda parcial por número de orden (insensitive) cuando se envía.
      orderNumber: filter.orderNumber ? { contains: filter.orderNumber, mode: 'insensitive' } : undefined,
    };
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const pageSize = filter.pageSize && filter.pageSize > 0 ? filter.pageSize : 20;
    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: rows.map((row) => this.toDomain(row)), total, page, pageSize };
  }

  async findIdempotency(storeId: string, key: string): Promise<StoredIdempotencyRecord | null> {
    const row = await this.prisma.orderIdempotencyKey.findUnique({ where: { storeId_key: { storeId, key } } });
    if (!row || row.expiresAt <= new Date()) return null;
    return { key: row.key, storeId: row.storeId, requestHash: row.requestHash, orderId: row.orderId, expiresAt: row.expiresAt };
  }

  async nextOrderNumber(storeId: string, prefix: string): Promise<string> {
    const sequence = await this.prisma.orderSequence.upsert({
      where: { storeId },
      create: { storeId, prefix, next: 2 },
      update: { next: { increment: 1 } },
    });
    return `${prefix}${String(sequence.next - 1).padStart(6, '0')}`;
  }

  async save(order: Order, options: SaveOrderOptions = {}): Promise<void> {
    const { idempotency, outbox } = options;
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.upsert({ where: { id: order.id }, create: this.toOrderRow(order), update: this.toOrderRow(order) });
        await tx.orderLine.deleteMany({ where: { orderId: order.id } });
        await tx.orderStateTransition.deleteMany({ where: { orderId: order.id } });
        await tx.orderNote.deleteMany({ where: { orderId: order.id } });
        if (order.lines.length > 0) await tx.orderLine.createMany({ data: order.lines.map((line) => this.toLineRow(order.id, line)) });
        if (order.transitions.length > 0) await tx.orderStateTransition.createMany({ data: order.transitions.map((transition) => this.toTransitionRow(order.id, transition)) });
        if (order.notes.length > 0) await tx.orderNote.createMany({ data: order.notes.map((note) => this.toNoteRow(order.id, note)) });
        if (idempotency) {
          await tx.orderIdempotencyKey.create({
            data: { storeId: order.storeId, key: idempotency.key, requestHash: idempotency.requestHash, orderId: order.id, expiresAt: idempotency.expiresAt },
          });
        }
        if (outbox && outbox.length > 0) {
          await tx.outboxEvent.createMany({
            data: outbox.map((event) => ({
              storeId: event.storeId ?? order.storeId,
              eventName: event.name,
              payload: event.payload as Prisma.InputJsonValue,
            })),
          });
        }
      });
    } catch (error) {
      if (isUniqueCartOrderError(error)) throw new OrderAlreadyExistsForCartError();
      if (isUniqueIdempotencyError(error)) throw new IdempotencyConflictError();
      throw error;
    }
  }

  async delete(orderId: string): Promise<void> {
    await this.prisma.order.delete({ where: { id: orderId } });
  }

  private toOrderRow(order: Order): Prisma.OrderUncheckedCreateInput {
    return {
      id: order.id,
      storeId: order.storeId,
      orderNumber: order.orderNumber,
      cartId: order.cartId,
      customerId: order.customerId,
      customerEmail: order.customerEmail,
      channel: order.channel,
      status: order.status,
      paymentStatus: order.paymentStatus,
      currencyCode: order.currencyCode,
      subtotal: order.subtotal,
      shippingTotal: order.shippingTotal,
      taxTotal: order.taxTotal,
      total: order.total,
      shippingAddress: order.shippingAddress as Prisma.InputJsonValue,
      billingAddress: order.billingAddress as Prisma.InputJsonValue,
      shippingMethod: order.shippingMethod as Prisma.InputJsonValue,
      paymentMethod: order.paymentMethod as Prisma.InputJsonValue,
      reservationExpiresAt: order.reservationExpiresAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private toLineRow(orderId: string, line: OrderLineProps): Prisma.OrderLineUncheckedCreateInput {
    return { orderId, ...line };
  }

  private toTransitionRow(orderId: string, transition: StateTransitionProps): Prisma.OrderStateTransitionUncheckedCreateInput {
    return { orderId, ...transition };
  }

  private toNoteRow(orderId: string, note: OrderNoteProps): Prisma.OrderNoteUncheckedCreateInput {
    return { orderId, ...note };
  }

  private toDomain(row: OrderRow): Order {
    return Order.rehydrate(
      {
        storeId: row.storeId,
        orderNumber: row.orderNumber,
        cartId: row.cartId,
        customerId: row.customerId,
        customerEmail: row.customerEmail,
        channel: row.channel as 'web' | 'pos',
        status: row.status as OrderStatus,
        paymentStatus: row.paymentStatus as OrderPaymentStatus,
        currencyCode: row.currencyCode,
        subtotal: Number(row.subtotal),
        shippingTotal: Number(row.shippingTotal),
        taxTotal: Number(row.taxTotal),
        total: Number(row.total),
        shippingAddress: row.shippingAddress as Record<string, unknown>,
        billingAddress: row.billingAddress as Record<string, unknown>,
        shippingMethod: row.shippingMethod as Record<string, unknown>,
        paymentMethod: row.paymentMethod as Record<string, unknown>,
        reservationExpiresAt: row.reservationExpiresAt,
        lines: row.lines.map((line) => ({
          id: line.id,
          variantId: line.variantId,
          productId: line.productId,
          productTitle: line.productTitle,
          variantTitle: line.variantTitle,
          sku: line.sku,
          quantity: line.quantity,
          currencyCode: line.currencyCode,
          unitPrice: Number(line.unitPrice),
          taxAmount: Number(line.taxAmount),
          total: Number(line.total),
          stockLocationId: line.stockLocationId,
        })),
        transitions: row.transitions.map((transition) => ({
          id: transition.id,
          kind: transition.kind as 'order' | 'payment',
          from: transition.from,
          to: transition.to,
          actorId: transition.actorId,
          reason: transition.reason,
          createdAt: transition.createdAt,
        })),
        notes: row.notes.map((note) => ({ id: note.id, authorId: note.authorId, body: note.body, createdAt: note.createdAt })),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }
}

function isUniqueCartOrderError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === 'P2002'
    && Array.isArray(error.meta?.target)
    && error.meta.target.includes('store_id')
    && error.meta.target.includes('cart_id');
}

function isUniqueIdempotencyError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === 'P2002'
    && Array.isArray(error.meta?.target)
    && error.meta.target.includes('store_id')
    && error.meta.target.includes('key');
}
