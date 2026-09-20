import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class EquipAccessoriesDto {
  @ApiProperty({
    type: [String],
    description: 'Accesorios que la mascota queda usando. Tienen que estar ya ganados.',
    example: ['acc-gorro', 'acc-bufanda'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  equippedAccessoryIds!: string[];
}
