import { ok, type Result, type UseCase } from '@mitama/core';
import type { CustomerRepository, ListCustomersFilter } from '../../domain/customer.repository';
import { toCustomerOutput, type CustomerOutput } from '../customer.dto';

export interface PaginatedCustomersOutput {
  items: CustomerOutput[];
  total: number;
  page: number;
  pageSize: number;
}

/** Listado paginado de compradores (r23 · sprint1_cierre). */
export class ListCustomersUseCase implements UseCase<ListCustomersFilter, Result<PaginatedCustomersOutput, never>> {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(filter: ListCustomersFilter): Promise<Result<PaginatedCustomersOutput, never>> {
    const result = await this.customers.findAll(filter);
    return ok({ ...result, items: result.items.map(toCustomerOutput) });
  }
}
