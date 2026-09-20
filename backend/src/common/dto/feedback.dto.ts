import { ApiProperty } from '@nestjs/swagger';
import { Feedback, FeedbackTone } from '../../core/services';

/**
 * Feedback de la mascota, con la estructura Valoro / Me pregunto / Sugiero.
 * Viene partido en tres campos y no en un texto unico para que la interfaz pueda
 * darle a cada parte su propio tiempo y su propia animacion.
 */
export class FeedbackDto {
  @ApiProperty({ enum: FeedbackTone, description: 'Con que gesto lo dice la mascota.' })
  tone!: FeedbackTone;

  @ApiProperty({ description: 'Lo que salio bien.', example: '¡LO ARMASTE DE UNA! MESA.' })
  valoro!: string;

  @ApiProperty({
    description: 'El error, en forma de pregunta. Null cuando no hubo nada que corregir.',
    nullable: true,
    example: '¿ESCUCHAMOS OTRA VEZ EL SONIDO QUE SIGUE?',
  })
  mePregunto!: string | null;

  @ApiProperty({ description: 'Que conviene intentar ahora.', example: 'AHORA DECILO EN VOZ ALTA.' })
  sugiero!: string;

  static from(feedback: Feedback): FeedbackDto {
    return { tone: feedback.tone, valoro: feedback.valoro, mePregunto: feedback.mePregunto, sugiero: feedback.sugiero };
  }
}
