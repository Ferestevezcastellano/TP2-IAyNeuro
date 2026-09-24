import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Level, LevelKind, LevelStatus } from '../../core/domain';
import { LevelAccess } from '../../core/services';

export class LevelDto {
  @ApiProperty({ example: 'level-03-m-s' })
  id!: string;

  @ApiProperty({ description: 'Posicion en la secuencia del cuadernillo.', example: 3 })
  order!: number;

  @ApiProperty({ example: 'M, S' })
  title!: string;

  @ApiProperty({ example: 'Capítulo 2 — Sonidos y letras bajo la lupa 1' })
  block!: string;

  @ApiProperty({ example: 'JUNTAR CONSONANTE Y VOCAL PARA ARMAR SÍLABAS Y PALABRAS.' })
  goal!: string;

  @ApiProperty({ type: [String], example: ['M', 'S'] })
  newLetters!: string[];

  @ApiProperty({ type: [String], description: 'Todas las letras disponibles hasta este nivel.' })
  cumulativeLetters!: string[];

  @ApiProperty({ enum: LevelKind })
  kind!: LevelKind;

  @ApiProperty({ description: 'Falso en los niveles donde no hay nada que pronunciar.' })
  voiceCheckEnabled!: boolean;

  @ApiProperty({ description: 'Accesorio que paga este nivel al dominarlo.', example: 'acc-bufanda' })
  accessoryId!: string;

  static from(level: Level): LevelDto {
    return {
      id: level.id,
      order: level.order,
      title: level.title,
      block: level.block,
      goal: level.goal,
      newLetters: level.newLetters,
      cumulativeLetters: level.cumulativeLetters,
      kind: level.kind,
      voiceCheckEnabled: level.voiceCheckEnabled,
      accessoryId: level.accessoryId,
    };
  }
}

/** Nivel con el estado que tiene para un alumno concreto. */
export class LevelWithStatusDto extends LevelDto {
  @ApiProperty({ enum: LevelStatus })
  status!: LevelStatus;

  @ApiProperty({ description: 'Si el alumno puede abrir una sesion de este nivel ahora.' })
  playable!: boolean;

  @ApiProperty({ nullable: true, description: 'Por que esta cerrado, en texto listo para mostrar.' })
  lockedReason!: string | null;

  @ApiProperty({ description: 'Estrellas ya ganadas en este nivel.', example: 3 })
  stars!: number;

  @ApiProperty({ description: 'Promedio movil de las ultimas sesiones, entre 0 y 1.', example: 0.87 })
  masteryAverage!: number;

  @ApiProperty({ description: 'Sesiones completadas en este nivel.', example: 3 })
  sessionsCompleted!: number;

  @ApiPropertyOptional({ description: 'Cuando quedo dominado.', type: String, format: 'date-time' })
  masteredAt?: string;

  static fromAccess(access: LevelAccess): LevelWithStatusDto {
    return {
      ...LevelDto.from(access.level),
      status: access.status,
      playable: access.playable,
      lockedReason: access.lockedReason,
      stars: access.progress?.starsAwarded ?? 0,
      masteryAverage: access.progress?.masteryAverage ?? 0,
      sessionsCompleted: access.progress?.sessionsCompleted ?? 0,
      masteredAt: access.progress?.masteredAt?.toISOString(),
    };
  }
}
