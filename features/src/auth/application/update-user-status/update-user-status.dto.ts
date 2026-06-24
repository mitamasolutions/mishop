import type { UserStatus } from '../../domain/user.entity';

export interface UpdateUserStatusInput {
  actorUserId: string;
  userId: string;
  status: UserStatus;
}
