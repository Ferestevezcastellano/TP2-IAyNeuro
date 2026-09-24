import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyClassCodeDto {
  @ApiProperty({ description: 'El codigo que la docente escribio en el pizarron.', example: 'PRIMERO-A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  classCode!: string;
}

export class ClassCodeCheckDto {
  @ApiProperty({ description: 'Si el codigo corresponde a un curso existente.' })
  valid!: boolean;

  @ApiProperty({ nullable: true, example: '1er grado A' })
  className!: string | null;

  @ApiProperty({ nullable: true, example: 'Escuela Modelo' })
  schoolName!: string | null;
}
