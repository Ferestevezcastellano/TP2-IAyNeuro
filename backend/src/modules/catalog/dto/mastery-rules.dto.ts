import { ApiProperty } from '@nestjs/swagger';

/**
 * Las reglas de dominio, expuestas para que la interfaz pueda explicarle al
 * chico cuanto le falta sin tener esos numeros escritos a mano en el frontend.
 */
export class MasteryRulesDto {
  @ApiProperty({ description: 'Cuantas sesiones entran en el promedio movil.', example: 3 })
  windowSize!: number;

  @ApiProperty({ description: 'Minimo de sesiones antes de poder dominar un nivel.', example: 3 })
  minSessions!: number;

  @ApiProperty({ description: 'Promedio requerido, entre 0 y 1.', example: 0.8 })
  threshold!: number;

  @ApiProperty({ description: 'Estrellas que paga dominar un nivel.', example: 3 })
  starsPerMasteredLevel!: number;
}
