import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class AssignUserStoreRoleRequestDto {
  @ApiProperty({ description: 'Id del usuario' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Id del rol a asignar' })
  @IsUUID()
  roleId!: string;

  @ApiPropertyOptional({ description: 'Id de la tienda; omitir solo para el rol Super Admin' })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}
