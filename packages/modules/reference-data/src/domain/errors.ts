import { DomainError } from '@mitama/core';

export class RegionNotFoundError extends DomainError {
  readonly code = 'REGION_NOT_FOUND';
  constructor(id: string) {
    super(`Región '${id}' no encontrada`);
  }
}

export class TerritoryNotFoundError extends DomainError {
  readonly code = 'TERRITORY_NOT_FOUND';
  constructor(id: string) {
    super(`Territorio '${id}' no encontrado`);
  }
}

export class ZoneNotFoundError extends DomainError {
  readonly code = 'ZONE_NOT_FOUND';
  constructor(id: string) {
    super(`Zona '${id}' no encontrada`);
  }
}

export class DuplicateTerritoryCodeError extends DomainError {
  readonly code = 'DUPLICATE_TERRITORY_CODE';
  constructor(codeValue: string) {
    super(`Ya existe un territorio con el código '${codeValue}' en esta región`);
  }
}

export class DuplicateZoneCodeError extends DomainError {
  readonly code = 'DUPLICATE_ZONE_CODE';
  constructor(codeValue: string) {
    super(`Ya existe una zona con el código '${codeValue}' en este territorio`);
  }
}

export class RegionHasActiveDependenciesError extends DomainError {
  readonly code = 'REGION_HAS_ACTIVE_DEPENDENCIES';
  constructor() {
    super(
      'No se puede desactivar la región porque tiene territorios o tiendas activos. ' +
        'Desactiva primero todos sus territorios y tiendas.',
    );
  }
}

export class TerritoryHasActiveZonesError extends DomainError {
  readonly code = 'TERRITORY_HAS_ACTIVE_ZONES';
  constructor() {
    super('No se puede desactivar el territorio porque tiene zonas activas. Desactiva primero todas sus zonas.');
  }
}
