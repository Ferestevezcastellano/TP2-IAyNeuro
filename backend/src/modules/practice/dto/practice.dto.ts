import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBase64, IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { CardDto } from '../../../common/dto/card.dto';
import { FeedbackDto } from '../../../common/dto/feedback.dto';
import { LevelWithStatusDto } from '../../../common/dto/level.dto';
import { AccessoryDto } from '../../../common/dto/pet.dto';
import { SessionStatus } from '../../../core/domain';

export class StartSessionDto {
  @ApiPropertyOptional({
    description: 'Nivel a practicar. Si se omite, se abre el nivel actual del alumno.',
    example: 'level-03-m-s',
  })
  @IsOptional()
  @IsString()
  levelId?: string;
}

/** Estado de la sesion mas la tarjeta que toca ahora. */
export class SessionStateDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ example: 'level-03-m-s' })
  levelId!: string;

  @ApiProperty({ example: 3 })
  levelOrder!: number;

  @ApiProperty({ enum: SessionStatus })
  status!: SessionStatus;

  @ApiProperty({ description: 'Indice de la tarjeta actual, arrancando en 0.', example: 0 })
  cardIndex!: number;

  @ApiProperty({ description: 'Tarjetas de la sesion.', example: 5 })
  cardsTotal!: number;

  @ApiProperty({
    type: CardDto,
    nullable: true,
    description: 'Tarjeta a mostrar. Null cuando ya no quedan y corresponde cerrar la sesion.',
  })
  card!: CardDto | null;
}

export class SubmitAttemptDto {
  @ApiProperty({
    type: [String],
    description: 'Ids de los botones tocados, en el orden en que el chico los toco.',
    example: ['level-03-m-s-w-mesa-t0', 'level-03-m-s-w-mesa-t1'],
  })
  @IsArray()
  @IsString({ each: true })
  sequence!: string[];

  @ApiPropertyOptional({ description: 'Milisegundos desde que se mostro la tarjeta. Queda registrado para investigacion.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  elapsedMs?: number;
}

export class AttemptResultDto {
  @ApiProperty()
  correct!: boolean;

  @ApiProperty({
    nullable: true,
    description: 'Indice del primer boton equivocado, para marcar ese casillero y no borrar todo.',
    example: 2,
  })
  firstWrongIndex!: number | null;

  @ApiProperty({ description: 'Cuantos botones desde el principio estan bien.', example: 2 })
  matchedPrefixLength!: number;

  @ApiProperty({ example: 4 })
  expectedLength!: number;

  @ApiProperty({ description: 'Numero de intento sobre esta tarjeta.', example: 1 })
  attemptNumber!: number;

  @ApiProperty({ type: FeedbackDto })
  feedback!: FeedbackDto;

  @ApiProperty({ description: 'Si ahora corresponde pedir la verificacion por voz.' })
  voiceCheckRequired!: boolean;

  @ApiProperty({ type: SessionStateDto, description: 'Estado de la sesion despues del intento.' })
  session!: SessionStateDto;
}

export class VoiceCheckRequestDto {
  @ApiPropertyOptional({
    description:
      'Audio del chico en base64. Formato recomendado: WAV PCM 16 bits mono 16 kHz. Se ignora si viene transcript.',
  })
  @IsOptional()
  @IsBase64()
  audioBase64?: string;

  @ApiPropertyOptional({
    description:
      'Transcripcion ya resuelta por el cliente. Pensado para frontends que usan el reconocimiento del navegador.',
    example: 'MESA',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  transcript?: string;

  @ApiPropertyOptional({
    description:
      'El cliente no pudo escuchar (el navegador no tiene reconocimiento, el microfono no respondio, o no se entendio nada). ' +
      'El intento se registra sin verificar: el chico avanza, pero no cuenta como acierto de voz.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  unverified?: boolean;
}

export class VoiceCheckResultDto {
  @ApiProperty({ description: 'Si la pronunciacion se da por buena.' })
  accepted!: boolean;

  @ApiProperty({ description: 'Lo que se escucho.', example: 'MESA' })
  transcript!: string;

  @ApiProperty({ description: 'Lo que se esperaba escuchar.', example: 'MESA' })
  expected!: string;

  @ApiProperty({ description: 'Parecido fonetico entre 0 y 1, ya normalizado al rioplatense.', example: 1 })
  similarity!: number;

  @ApiProperty({ description: 'Confianza que reporta el reconocedor.', example: 0.82 })
  confidence!: number;

  @ApiProperty({
    description:
      'Si la pronunciacion se comparo de verdad. En false el chico avanza igual, pero el intento no cuenta como acierto de voz.',
    example: true,
  })
  verified!: boolean;

  @ApiProperty({
    description:
      'Si todavia puede volver a intentar la pronunciacion de esta misma tarjeta. Un rechazo no saltea la tarjeta.',
    example: false,
  })
  canRetry!: boolean;

  @ApiProperty({
    description:
      'Si hubo voz para juzgar. En false no se escucho nada util: no cuenta como intento y el chico lo vuelve a decir.',
    example: true,
  })
  heard!: boolean;

  @ApiProperty({ description: 'Que reconocedor resolvio el audio.', example: 'stub' })
  provider!: string;

  @ApiProperty({ type: FeedbackDto })
  feedback!: FeedbackDto;

  @ApiProperty({ type: SessionStateDto })
  session!: SessionStateDto;
}

export class SessionSummaryDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ example: 'level-03-m-s' })
  levelId!: string;

  @ApiProperty({ description: 'Precision de esta sesion, entre 0 y 1.', example: 0.9 })
  accuracy!: number;

  @ApiProperty({ example: 5 })
  cardsSolved!: number;

  @ApiProperty({ example: 5 })
  cardsTotal!: number;

  @ApiProperty({ description: 'Promedio movil de las ultimas sesiones de este nivel.', example: 0.87 })
  masteryAverage!: number;

  @ApiProperty({ description: 'Sesiones completadas en este nivel.', example: 3 })
  sessionsCompleted!: number;

  @ApiProperty({ description: 'Sesiones minimas que faltan para poder dominar.', example: 0 })
  sessionsRemaining!: number;

  @ApiProperty({ description: 'Si el nivel esta dominado.' })
  mastered!: boolean;

  @ApiProperty({ description: 'Si el dominio se logro justo en esta sesion.' })
  masteredNow!: boolean;

  @ApiProperty({ description: 'Estrellas pagadas por esta sesion.', example: 3 })
  starsAwarded!: number;

  @ApiProperty({ description: 'Estrellas totales del alumno.', example: 9 })
  totalStars!: number;

  @ApiProperty({ type: AccessoryDto, nullable: true, description: 'Accesorio desbloqueado, si hubo.' })
  accessoryUnlocked!: AccessoryDto | null;

  @ApiProperty({
    type: LevelWithStatusDto,
    nullable: true,
    description: 'El nivel que sigue, con su estado ya recalculado.',
  })
  nextLevel!: LevelWithStatusDto | null;

  @ApiProperty({ type: FeedbackDto, description: 'Lo que dice la mascota en la pantalla de cierre.' })
  feedback!: FeedbackDto;
}
