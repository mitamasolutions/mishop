import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetStockLocationStatusRequestDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive!: boolean;
}
