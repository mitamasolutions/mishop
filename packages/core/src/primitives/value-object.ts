/**
 * Value Object base: igualdad estructural, inmutable.
 */
export abstract class ValueObject<TProps> {
  protected constructor(protected readonly props: Readonly<TProps>) {}

  equals(other?: ValueObject<TProps>): boolean {
    if (other === undefined || other === null) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
