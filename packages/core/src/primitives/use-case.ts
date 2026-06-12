/**
 * Caso de uso: una operación de aplicación con una sola responsabilidad.
 * TOutput normalmente es un Result<T, E>.
 */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
