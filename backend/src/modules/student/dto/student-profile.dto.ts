import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PetDto } from '../../../common/dto/pet.dto';
import { LevelWithStatusDto } from '../../../common/dto/level.dto';

/** Todo lo que la pantalla inicial necesita en una sola llamada. */
export class StudentProfileDto {
  @ApiProperty()
  studentId!: string;

  @ApiProperty({ example: '1er grado A' })
  className!: string;

  @ApiProperty({ description: 'Hasta que nivel libero la docente para el curso.', example: 3 })
  classUnlockedLevelOrder!: number;

  @ApiProperty({ description: 'Estrellas acumuladas en toda la app.', example: 6 })
  stars!: number;

  @ApiProperty({ type: PetDto })
  pet!: PetDto;

  @ApiPropertyOptional({
    type: LevelWithStatusDto,
    description: 'Nivel que abre la pantalla inicial. Null si no queda ninguno jugable.',
    nullable: true,
  })
  currentLevel!: LevelWithStatusDto | null;

  @ApiProperty({ description: 'Cuantos niveles domino, para el contador de la pantalla.', example: 2 })
  masteredLevels!: number;
}
