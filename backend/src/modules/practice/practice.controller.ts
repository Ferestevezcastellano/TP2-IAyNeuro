import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { StudentAuth } from '../../common/decorators/auth.decorators';
import { CurrentStudent } from '../../common/decorators/current-student.decorator';
import { CardDto } from '../../common/dto/card.dto';
import { FeedbackDto } from '../../common/dto/feedback.dto';
import { LevelWithStatusDto } from '../../common/dto/level.dto';
import { AccessoryDto } from '../../common/dto/pet.dto';
import { Student } from '../../core/domain';
import {
  AttemptResultDto,
  SessionStateDto,
  SessionSummaryDto,
  StartSessionDto,
  SubmitAttemptDto,
  VoiceCheckRequestDto,
  VoiceCheckResultDto,
} from './dto/practice.dto';
import { PracticeService, SessionView } from './practice.service';

@ApiTags('Sesion de practica')
@Controller('practice')
@StudentAuth()
export class PracticeController {
  constructor(private readonly practice: PracticeService) {}

  @Post('sessions')
  @ApiOperation({
    summary: 'Abre una sesion del nivel actual o del nivel pedido.',
    description:
      'Valida que la docente haya habilitado el nivel y que el anterior este dominado. Una sesion previa sin cerrar queda abandonada y no suma al progreso.',
  })
  @ApiCreatedResponse({ type: SessionStateDto })
  @ApiForbiddenResponse({ description: 'El nivel esta cerrado por la docente o por falta de dominio del anterior.' })
  @ApiNotFoundResponse({ description: 'El nivel no existe o no hay ninguno disponible.' })
  async start(@CurrentStudent() student: Student, @Body() body: StartSessionDto): Promise<SessionStateDto> {
    return this.toState(await this.practice.start(student, body.levelId));
  }

  @Get('sessions/:sessionId/current-card')
  @ApiOperation({ summary: 'La tarjeta que toca ahora en la sesion.' })
  @ApiOkResponse({ type: SessionStateDto })
  @ApiNotFoundResponse({ description: 'La sesion no existe o no es de este alumno.' })
  async currentCard(
    @CurrentStudent() student: Student,
    @Param('sessionId') sessionId: string,
  ): Promise<SessionStateDto> {
    return this.toState(await this.practice.state(student, sessionId));
  }

  @Post('sessions/:sessionId/cards/:cardId/attempt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Valida el armado por botones.',
    description:
      'Devuelve el indice del primer boton equivocado en lugar de un simple error, para poder marcar ese casillero sin borrar lo que el chico ya armo.',
  })
  @ApiOkResponse({ type: AttemptResultDto })
  @ApiBadRequestResponse({ description: 'La tarjeta no es la actual de la sesion, o la sesion ya esta cerrada.' })
  async attempt(
    @CurrentStudent() student: Student,
    @Param('sessionId') sessionId: string,
    @Param('cardId') cardId: string,
    @Body() body: SubmitAttemptDto,
  ): Promise<AttemptResultDto> {
    const result = await this.practice.attempt(student, sessionId, cardId, body.sequence, body.elapsedMs);
    return {
      correct: result.correct,
      firstWrongIndex: result.firstWrongIndex,
      matchedPrefixLength: result.matchedPrefixLength,
      expectedLength: result.expectedLength,
      attemptNumber: result.attemptNumber,
      voiceCheckRequired: result.voiceCheckRequired,
      feedback: FeedbackDto.from(result.feedback),
      session: this.toState(result),
    };
  }

  @Post('sessions/:sessionId/cards/:cardId/voice-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificacion final por voz de la tarjeta.',
    description:
      'Acepta audio en base64 o una transcripcion ya resuelta por el cliente. La comparacion es fonetica y tolerante: BACA vale por VACA. Un rechazo no traba la sesion.',
  })
  @ApiOkResponse({ type: VoiceCheckResultDto })
  @ApiBadRequestResponse({ description: 'La tarjeta no pide voz, todavia no se armo la palabra, o falta el audio.' })
  async voiceCheck(
    @CurrentStudent() student: Student,
    @Param('sessionId') sessionId: string,
    @Param('cardId') cardId: string,
    @Body() body: VoiceCheckRequestDto,
  ): Promise<VoiceCheckResultDto> {
    const result = await this.practice.voiceCheck(student, sessionId, cardId, body);
    return {
      accepted: result.accepted,
      verified: result.verified,
      canRetry: result.canRetry,
      transcript: result.transcript,
      expected: result.expected,
      similarity: result.similarity,
      confidence: result.confidence,
      provider: result.provider,
      feedback: FeedbackDto.from(result.feedback),
      session: this.toState(result),
    };
  }

  @Post('sessions/:sessionId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cierra la sesion y devuelve la pantalla de cierre.',
    description:
      'Actualiza el promedio movil del nivel. Si con esta sesion se alcanza el dominio, paga 3 estrellas y un accesorio, una sola vez por nivel.',
  })
  @ApiOkResponse({ type: SessionSummaryDto })
  @ApiBadRequestResponse({ description: 'La sesion ya estaba cerrada.' })
  async complete(
    @CurrentStudent() student: Student,
    @Param('sessionId') sessionId: string,
  ): Promise<SessionSummaryDto> {
    const result = await this.practice.complete(student, sessionId);
    return {
      sessionId: result.session.id,
      levelId: result.session.levelId,
      accuracy: result.outcome.accuracy,
      cardsSolved: result.cardsSolved,
      cardsTotal: result.cardsTotal,
      masteryAverage: result.outcome.masteryAverage,
      sessionsCompleted: result.sessionsCompleted,
      sessionsRemaining: result.sessionsRemaining,
      mastered: result.outcome.mastered,
      masteredNow: result.outcome.masteredNow,
      starsAwarded: result.outcome.starsAwarded,
      totalStars: result.totalStars,
      accessoryUnlocked: result.accessory ? AccessoryDto.from(result.accessory) : null,
      nextLevel: result.nextLevel ? LevelWithStatusDto.fromAccess(result.nextLevel) : null,
      feedback: FeedbackDto.from(result.feedback),
    };
  }

  private toState(view: SessionView): SessionStateDto {
    return {
      sessionId: view.session.id,
      levelId: view.session.levelId,
      levelOrder: view.session.levelOrder,
      status: view.session.status,
      cardIndex: view.session.currentCardIndex,
      cardsTotal: view.session.cardQueue.length,
      card: view.card ? CardDto.from(view.card) : null,
    };
  }
}
