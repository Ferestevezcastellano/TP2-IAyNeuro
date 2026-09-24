import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { CardDto } from '../../../common/dto/card.dto';
import { FeedbackDto } from '../../../common/dto/feedback.dto';

/** Un sonido ya dominado, para la grilla de la pantalla de Repaso. */
export class ReviewSoundDto {
  @ApiProperty({ example: 'M' })
  letter!: string;

  @ApiProperty({ example: 'audio/fonema/m' })
  audioKey!: string;

  @ApiProperty({ description: 'Como suena la letra, para un sintetizador de voz.', example: 'mmm' })
  spokenAs!: string;

  @ApiProperty({ description: 'Nivel donde se aprendio.', example: 3 })
  levelOrder!: number;

  @ApiProperty({ example: 'M, S' })
  levelTitle!: string;
}

export class ReviewAttemptDto {
  @ApiProperty({ example: 'level-03-m-s-w-mesa' })
  @IsString()
  cardId!: string;

  @ApiProperty({ type: [String], description: 'Ids de los botones tocados, en orden.' })
  @IsArray()
  @IsString({ each: true })
  sequence!: string[];
}

export class ReviewAttemptResultDto {
  @ApiProperty()
  correct!: boolean;

  @ApiProperty({ nullable: true, example: 2 })
  firstWrongIndex!: number | null;

  @ApiProperty({ example: 4 })
  expectedLength!: number;

  @ApiProperty({ type: FeedbackDto })
  feedback!: FeedbackDto;

  @ApiProperty({
    description: 'Siempre false: el repaso no toca la progresion de niveles.',
    example: false,
  })
  affectsProgress!: boolean;
}

export class ReviewCardsDto {
  @ApiProperty({ type: [CardDto] })
  cards!: CardDto[];

  @ApiProperty({ description: 'Cuantas tarjetas hay disponibles en total para repasar.', example: 14 })
  available!: number;
}
