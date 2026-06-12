import { Entity } from '@mitama/core';

interface __Name__ItemProps {
  name: string;
  createdAt: Date;
}

/** Entidad de ejemplo del módulo. Renómbrala según tu dominio real. */
export class __Name__Item extends Entity<__Name__ItemProps> {
  static create(props: { name: string }): __Name__Item {
    return new __Name__Item(crypto.randomUUID(), { ...props, createdAt: new Date() });
  }

  get name(): string {
    return this.props.name;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
