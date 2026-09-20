import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Card, CardKind, CardTile, TileKind } from '../../core/domain';

export class CardTileDto {
  @ApiProperty({ example: 'level-03-m-s-w-mesa-t0' })
  id!: string;

  @ApiProperty({ description: 'Lo que se ve en el boton, siempre en mayuscula.', example: 'M' })
  label!: string;

  @ApiProperty({ enum: TileKind })
  kind!: TileKind;

  @ApiPropertyOptional({ description: 'Clave del audio del boton.', example: 'audio/fonema/m' })
  audioKey?: string;

  @ApiPropertyOptional({ description: 'Clave de la imagen del boton.', example: 'img/palabra/mesa' })
  imageKey?: string;
}

/**
 * Tarjeta lista para dibujar.
 *
 * No incluye la solucion: el orden correcto se valida en el servidor, si no
 * cualquiera que abra las herramientas del navegador resuelve el nivel entero.
 */
export class CardDto {
  @ApiProperty({ example: 'level-03-m-s-w-mesa' })
  id!: string;

  @ApiProperty({ example: 'level-03-m-s' })
  levelId!: string;

  @ApiProperty({ description: 'Posicion de la tarjeta dentro de la sesion, arrancando en 1.' })
  position!: number;

  @ApiProperty({ enum: CardKind })
  kind!: CardKind;

  @ApiProperty({ description: 'Consigna en mayuscula.', example: 'ARMÁ LA PALABRA TOCANDO LOS SONIDOS EN ORDEN.' })
  prompt!: string;

  @ApiPropertyOptional({ example: 'MESA' })
  targetWord?: string;

  @ApiPropertyOptional({ example: 'MA' })
  targetPhoneme?: string;

  @ApiPropertyOptional({ example: 'LA LUNA SALE' })
  targetSentence?: string;

  @ApiPropertyOptional({ description: 'Clave de la ilustracion principal.', example: 'img/palabra/mesa' })
  imageKey?: string;

  @ApiProperty({ description: 'Clave del audio principal de la tarjeta.', example: 'audio/palabra/mesa' })
  audioKey!: string;

  @ApiProperty({ type: [CardTileDto], description: 'Botones tocables, en el orden en que se muestran.' })
  tiles!: CardTileDto[];

  @ApiProperty({ description: 'Cuantos botones hay que tocar para completar el casillero.' })
  expectedLength!: number;

  @ApiProperty({ description: 'Si esta tarjeta cierra con verificacion por voz.' })
  voiceCheckRequired!: boolean;

  @ApiPropertyOptional({ description: 'Que tiene que decir el chico. Solo si hay verificacion por voz.', example: 'MESA' })
  voiceTarget?: string;

  static from(card: Card): CardDto {
    return {
      id: card.id,
      levelId: card.levelId,
      position: card.position,
      kind: card.kind,
      prompt: card.prompt,
      targetWord: card.targetWord,
      targetPhoneme: card.targetPhoneme,
      targetSentence: card.targetSentence,
      imageKey: card.imageKey,
      audioKey: card.audioKey,
      tiles: card.tiles.map((tile: CardTile) => ({
        id: tile.id,
        label: tile.label,
        kind: tile.kind,
        audioKey: tile.audioKey,
        imageKey: tile.imageKey,
      })),
      expectedLength: card.solution.length,
      voiceCheckRequired: Boolean(card.voiceTarget),
      voiceTarget: card.voiceTarget,
    };
  }
}
