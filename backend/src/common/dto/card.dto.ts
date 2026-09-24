import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Card, CardKind, CardTile, TileKind, VoiceSays } from '../../core/domain';

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

  @ApiPropertyOptional({
    description: 'Como suena el boton al tocarlo, para un sintetizador de voz: el fonema ("mmm"), nunca el nombre de la letra ("eme").',
    example: 'mmm',
  })
  spokenAs?: string;
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

  @ApiProperty({ description: 'Orden pedagogico dentro del banco del nivel. La posicion en la sesion es `cardIndex`.' })
  position!: number;

  @ApiProperty({ description: 'Bolsa del banco de la que salio: LETRA, SILABA, PALABRA, ORACION o una letra.', example: 'PALABRA' })
  group!: string;

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

  @ApiProperty({ description: 'Como suena el audio principal, para un sintetizador de voz.', example: 'mesa' })
  spokenAs!: string;

  @ApiProperty({ type: [CardTileDto], description: 'Botones tocables, en el orden en que se muestran.' })
  tiles!: CardTileDto[];

  @ApiProperty({ description: 'Cuantos botones hay que tocar para completar el casillero.' })
  expectedLength!: number;

  @ApiProperty({ description: 'Si esta tarjeta cierra con verificacion por voz.' })
  voiceCheckRequired!: boolean;

  @ApiPropertyOptional({ description: 'Que tiene que decir el chico. Solo si hay verificacion por voz.', example: 'MESA' })
  voiceTarget?: string;

  @ApiPropertyOptional({
    enum: VoiceSays,
    description: 'Que clase de cosa hay que decir (sonido, silaba, palabra u oracion). Solo si hay verificacion por voz.',
  })
  voiceSays?: VoiceSays;

  @ApiPropertyOptional({ description: 'Lo que hay que decir, escrito para mostrar en pantalla.', example: 'CASA' })
  voiceLabel?: string;

  static from(card: Card): CardDto {
    return {
      id: card.id,
      levelId: card.levelId,
      position: card.position,
      group: card.group,
      kind: card.kind,
      prompt: card.prompt,
      targetWord: card.targetWord,
      targetPhoneme: card.targetPhoneme,
      targetSentence: card.targetSentence,
      imageKey: card.imageKey,
      audioKey: card.audioKey,
      spokenAs: card.spokenAs,
      tiles: card.tiles.map((tile: CardTile) => ({
        id: tile.id,
        label: tile.label,
        kind: tile.kind,
        audioKey: tile.audioKey,
        imageKey: tile.imageKey,
        spokenAs: tile.spokenAs,
      })),
      expectedLength: card.solution.length,
      voiceCheckRequired: Boolean(card.voiceTarget),
      voiceTarget: card.voiceTarget,
      voiceSays: card.voiceSays,
      voiceLabel: card.voiceLabel,
    };
  }
}
