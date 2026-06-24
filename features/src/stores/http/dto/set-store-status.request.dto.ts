import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetStoreStatusRequestDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive!: boolean;
}
