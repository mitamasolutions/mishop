export function buildIdempotencyKey(operation: string, key: string): string {
  return `${operation}:${key}`;
}
