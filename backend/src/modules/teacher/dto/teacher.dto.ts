import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { LevelStatus, PetSpeciesId } from '../../../core/domain';

export class TeacherLoginDto {
  @ApiProperty({ description: 'Codigo propio de la docente para su curso.', example: 'PRIMERO-A-DOC' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  teacherCode!: string;
}

export class TeacherSessionDto {
  @ApiProperty({
    description:
      'Token opaco. Va en el header x-ami-teacher-token. ' +
      'El valor real sale de la respuesta de este mismo endpoint: hay que ejecutarlo y copiarlo de ahi. ' +
      'El ejemplo que se ve abajo es solo ilustrativo y no sirve para autorizarse.',
    example: 'tea_PEGA-ACA-EL-TOKEN-QUE-DEVUELVE-ESTA-RESPUESTA',
  })
  teacherToken!: string;

  @ApiProperty({ example: 'class-primero-a' })
  classId!: string;

  @ApiProperty({ example: '1er grado A' })
  className!: string;
}

export class ClassSummaryDto {
  @ApiProperty({ example: 'class-primero-a' })
  id!: string;

  @ApiProperty({ example: 'PRIMERO-A' })
  code!: string;

  @ApiProperty({ example: '1er grado A' })
  name!: string;

  @ApiProperty({ example: 'Escuela Modelo' })
  schoolName!: string;

  @ApiProperty({ description: 'Hasta que nivel esta habilitado el curso.', example: 3 })
  unlockedLevelOrder!: number;

  @ApiProperty({ description: 'Ultimo nivel que existe en el contenido cargado.', example: 6 })
  lastLevelOrder!: number;

  @ApiProperty({ description: 'Alumnos registrados con este codigo.', example: 18 })
  studentCount!: number;
}

/** Una fila de la tabla de progreso del curso. */
export class StudentProgressRowDto {
  @ApiProperty()
  studentId!: string;

  @ApiProperty({ enum: PetSpeciesId, description: 'La mascota identifica al chico: no hay nombre real.' })
  pet!: PetSpeciesId;

  @ApiProperty({ example: 6 })
  stars!: number;

  @ApiProperty({ description: 'Niveles dominados.', example: 2 })
  masteredLevels!: number;

  @ApiPropertyOptional({ description: 'Nivel en el que esta trabajando ahora.', example: 3, nullable: true })
  currentLevelOrder!: number | null;

  @ApiPropertyOptional({ example: 'M, S', nullable: true })
  currentLevelTitle!: string | null;

  @ApiProperty({ enum: LevelStatus, nullable: true })
  currentLevelStatus!: LevelStatus | null;

  @ApiProperty({ description: 'Promedio movil en el nivel actual, entre 0 y 1.', example: 0.72 })
  currentMasteryAverage!: number;

  @ApiProperty({ description: 'Sesiones hechas en el nivel actual.', example: 2 })
  currentLevelSessions!: number;

  @ApiProperty({ description: 'Sesiones completadas en toda la app.', example: 7 })
  totalSessions!: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastSeenAt!: string | null;
}

/** Una fila de la tabla de niveles del curso. */
export class LevelProgressRowDto {
  @ApiProperty({ example: 'level-03-m-s' })
  levelId!: string;

  @ApiProperty({ example: 3 })
  order!: number;

  @ApiProperty({ example: 'M, S' })
  title!: string;

  @ApiProperty({ description: 'Si el curso ya lo tiene habilitado.' })
  unlocked!: boolean;

  @ApiProperty({ description: 'Cuantos alumnos lo dominaron.', example: 11 })
  masteredCount!: number;

  @ApiProperty({ description: 'Cuantos lo estan trabajando.', example: 5 })
  inProgressCount!: number;

  @ApiProperty({ description: 'Cuantos todavia no lo empezaron.', example: 2 })
  notStartedCount!: number;

  @ApiProperty({ description: 'Promedio movil del curso en este nivel, entre 0 y 1.', example: 0.68 })
  averageMastery!: number;
}

export class UnlockLevelDto {
  @ApiProperty({
    description: 'Habilita todos los niveles hasta este, inclusive, para todo el curso.',
    example: 4,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @Max(21)
  levelOrder!: number;
}
