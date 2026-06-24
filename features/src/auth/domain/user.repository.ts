import type { RecordActivityInput } from '../../activity-log';
import { Email } from './email.vo';
import { User } from './user.entity';

/** Puerto de persistencia de usuarios administrativos. infra/ lo implementa con Prisma. */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(user: User, activity: RecordActivityInput): Promise<void>;
  update(user: User, activity: RecordActivityInput): Promise<void>;
}
