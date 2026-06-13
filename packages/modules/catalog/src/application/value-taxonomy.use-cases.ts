import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { ValueTaxonomy } from '../domain/value-taxonomy.entity';
import { ValueAlreadyInUseError, ValueTaxonomyNotFoundError } from '../domain/errors';
import type { ValueTaxonomyRepository } from '../domain/value-taxonomy.repository';
import { toValueTaxonomyOutput, type ValueTaxonomyOutput } from './value-taxonomy.dto';

/** Config que distingue una taxonomía concreta (tipos, etiquetas) del genérico. */
export interface ValueTaxonomyConfig {
  /** Prefijo de código de error, ej. "PRODUCT_TYPE". */
  entityCode: string;
  /** Nombre legible para mensajes de error, ej. "El tipo de producto". */
  entityLabel: string;
  /** Prefijo de acción de actividad, ej. "product-type". */
  actionPrefix: string;
  /** Tipo de entidad para el log de actividad, ej. "product_type". */
  entityType: string;
}

export interface CreateValueTaxonomyInput {
  value: string;
  actorUserId: string | null;
}

export type ValueTaxonomyError = ValidationError | ValueAlreadyInUseError;

export class CreateValueTaxonomyUseCase
  implements UseCase<CreateValueTaxonomyInput, Result<ValueTaxonomyOutput, ValueTaxonomyError>>
{
  constructor(
    private readonly repo: ValueTaxonomyRepository,
    private readonly config: ValueTaxonomyConfig,
  ) {}

  async execute(input: CreateValueTaxonomyInput): Promise<Result<ValueTaxonomyOutput, ValueTaxonomyError>> {
    const value = input.value.trim();
    if (!value) {
      return err(new ValidationError(`${this.config.entityLabel} no puede estar vacío`));
    }

    const existing = await this.repo.findByValue(value);
    if (existing) {
      return err(new ValueAlreadyInUseError(this.config.entityCode, this.config.entityLabel, value));
    }

    const entity = ValueTaxonomy.create(value);
    await this.repo.create(entity, {
      userId: input.actorUserId,
      storeId: null,
      action: `${this.config.actionPrefix}.created`,
      entityType: this.config.entityType,
      entityId: entity.id,
      diff: { value: entity.value },
    });

    return ok(toValueTaxonomyOutput(entity));
  }
}

export interface UpdateValueTaxonomyInput {
  id: string;
  value: string;
  actorUserId: string | null;
}

export type UpdateValueTaxonomyError = ValidationError | ValueAlreadyInUseError | ValueTaxonomyNotFoundError;

export class UpdateValueTaxonomyUseCase
  implements UseCase<UpdateValueTaxonomyInput, Result<ValueTaxonomyOutput, UpdateValueTaxonomyError>>
{
  constructor(
    private readonly repo: ValueTaxonomyRepository,
    private readonly config: ValueTaxonomyConfig,
  ) {}

  async execute(input: UpdateValueTaxonomyInput): Promise<Result<ValueTaxonomyOutput, UpdateValueTaxonomyError>> {
    const entity = await this.repo.findById(input.id);
    if (!entity) {
      return err(new ValueTaxonomyNotFoundError(this.config.entityLabel, input.id));
    }

    const value = input.value.trim();
    if (!value) {
      return err(new ValidationError(`${this.config.entityLabel} no puede estar vacío`));
    }

    if (value !== entity.value) {
      const clash = await this.repo.findByValue(value);
      if (clash && clash.id !== entity.id) {
        return err(new ValueAlreadyInUseError(this.config.entityCode, this.config.entityLabel, value));
      }
    }

    entity.rename(value);
    await this.repo.update(entity, {
      userId: input.actorUserId,
      storeId: null,
      action: `${this.config.actionPrefix}.updated`,
      entityType: this.config.entityType,
      entityId: entity.id,
      diff: { value: entity.value },
    });

    return ok(toValueTaxonomyOutput(entity));
  }
}

export interface DeleteValueTaxonomyInput {
  id: string;
  actorUserId: string | null;
}

export class DeleteValueTaxonomyUseCase
  implements UseCase<DeleteValueTaxonomyInput, Result<void, ValueTaxonomyNotFoundError>>
{
  constructor(
    private readonly repo: ValueTaxonomyRepository,
    private readonly config: ValueTaxonomyConfig,
  ) {}

  async execute(input: DeleteValueTaxonomyInput): Promise<Result<void, ValueTaxonomyNotFoundError>> {
    const entity = await this.repo.findById(input.id);
    if (!entity) {
      return err(new ValueTaxonomyNotFoundError(this.config.entityLabel, input.id));
    }

    await this.repo.delete(entity.id, {
      userId: input.actorUserId,
      storeId: null,
      action: `${this.config.actionPrefix}.deleted`,
      entityType: this.config.entityType,
      entityId: entity.id,
      diff: { value: entity.value },
    });

    return ok(undefined);
  }
}

export class ListValueTaxonomyUseCase implements UseCase<void, Result<ValueTaxonomyOutput[], never>> {
  constructor(private readonly repo: ValueTaxonomyRepository) {}

  async execute(): Promise<Result<ValueTaxonomyOutput[], never>> {
    const entities = await this.repo.findAll();
    return ok(entities.map(toValueTaxonomyOutput));
  }
}

export class GetValueTaxonomyUseCase
  implements UseCase<string, Result<ValueTaxonomyOutput, ValueTaxonomyNotFoundError>>
{
  constructor(
    private readonly repo: ValueTaxonomyRepository,
    private readonly config: ValueTaxonomyConfig,
  ) {}

  async execute(id: string): Promise<Result<ValueTaxonomyOutput, ValueTaxonomyNotFoundError>> {
    const entity = await this.repo.findById(id);
    if (!entity) {
      return err(new ValueTaxonomyNotFoundError(this.config.entityLabel, id));
    }
    return ok(toValueTaxonomyOutput(entity));
  }
}
