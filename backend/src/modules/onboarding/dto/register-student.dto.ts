import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PetSpeciesId } from '../../../core/domain';
import { PetSpeciesDto } from '../../../common/dto/pet.dto';

export class RegisterStudentDto {
  @ApiProperty({ example: 'PRIMERO-A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  classCode!: string;

  @ApiProperty({ enum: PetSpeciesId, description: 'La mascota que el chico toco en la grilla.' })
  @IsEnum(PetSpeciesId)
  petSpecies!: PetSpeciesId;
}

export class StudentSessionDto {
  @ApiProperty({ example: '9f1c0a3e-4c7d-4f2b-9d6a-1f0b2c3d4e5f' })
  studentId!: string;

  @ApiProperty({
    description: 'Token opaco. El cliente lo guarda y lo manda en el header x-ami-student-token.',
    example: 'stu_9f1c0a3e-4c7d-4f2b-9d6a-1f0b2c3d4e5f',
  })
  studentToken!: string;

  @ApiProperty({ example: 'class-primero-a' })
  classId!: string;

  @ApiProperty({ example: '1er grado A' })
  className!: string;

  @ApiProperty({ type: PetSpeciesDto })
  pet!: PetSpeciesDto;
}
