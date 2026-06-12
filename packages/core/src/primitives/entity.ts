/**
 * Entidad base: identidad por id, no por estructura.
 */
export abstract class Entity<TProps> {
  protected constructor(
    readonly id: string,
    protected readonly props: TProps,
  ) {}

  equals(other?: Entity<TProps>): boolean {
    if (other === undefined || other === null) {
      return false;
    }
    return this.id === other.id;
  }
}
