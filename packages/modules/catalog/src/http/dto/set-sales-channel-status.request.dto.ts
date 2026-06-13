import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetSalesChannelStatusRequestDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive!: boolean;
}
