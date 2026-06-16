import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';

export class UpdateSettingRequestDto {
  @ApiProperty({
    description: 'Nuevo valor de la configuración; el tipo debe coincidir con el catálogo',
    example: true,
  })
  @IsDefined()
  value!: unknown;
}
