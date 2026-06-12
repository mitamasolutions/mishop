import { Email } from './email.vo';
import { User } from './user.entity';

/** Puerto de persistencia de usuarios. infra/ lo implementa con Prisma. */
export interface UserRepository {
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
}
