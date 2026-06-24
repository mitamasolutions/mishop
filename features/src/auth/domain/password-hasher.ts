/** Puerto de hashing de contraseñas. infra/ lo implementa con bcrypt. */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hashed: string): Promise<boolean>;
}
