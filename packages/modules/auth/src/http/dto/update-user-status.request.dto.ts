import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { UserStatus } from '../../domain/user.entity';

const USER_STATUSES: UserStatus[] = ['invited', 'active', 'locked', 'disabled'];

export class UpdateUserStatusRequestDto {
  @ApiProperty({ enum: USER_STATUSES, example: 'disabled' })
  @IsIn(USER_STATUSES)
  status!: UserStatus;
}
