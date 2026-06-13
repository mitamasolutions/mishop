import type { Permission } from '@mitama/contracts';

export interface RoleOutput {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}
