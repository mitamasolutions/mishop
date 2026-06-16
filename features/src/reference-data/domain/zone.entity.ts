import { Entity } from '@mitama/core';
import { randomUUID } from 'crypto';

interface ZoneProps {
  territoryId: string;
  name: string;
  code: string;
  isActive: boolean;
  description: string | null;
}

export class Zone extends Entity<ZoneProps> {
  static rehydrate(id: string, props: ZoneProps): Zone {
    return new Zone(id, props);
  }

  static create(props: {
    territoryId: string;
    name: string;
    code: string;
    description?: string | null;
  }): Zone {
    return new Zone(randomUUID(), {
      territoryId: props.territoryId,
      name: props.name,
      code: props.code,
      isActive: true,
      description: props.description ?? null,
    });
  }

  get territoryId(): string {
    return this.props.territoryId;
  }

  get name(): string {
    return this.props.name;
  }

  get code(): string {
    return this.props.code;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get description(): string | null {
    return this.props.description;
  }

  update(changes: Partial<Pick<ZoneProps, 'name' | 'code' | 'isActive' | 'description'>>): Zone {
    return new Zone(this.id, { ...this.props, ...changes });
  }

  deactivate(): Zone {
    return new Zone(this.id, { ...this.props, isActive: false });
  }
}
