import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetBrandStatusRequestDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive!: boolean;
}
