import type { RecordActivityInput } from '@mitama/activity-log';
import { Role } from './role.entity';

/** Puerto de persistencia del catálogo de roles. */
export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  /** El rol Super Admin (`isSystem: true`), único en el catálogo. */
  findSystemRole(): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  create(role: Role, activity: RecordActivityInput): Promise<void>;
  update(role: Role, activity: RecordActivityInput): Promise<void>;
  delete(id: string, activity: RecordActivityInput): Promise<void>;
}
