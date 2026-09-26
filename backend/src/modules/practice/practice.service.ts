import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Card, LevelStatus, PracticeSession, SessionMode, SessionStatus, Student } from '../../core/domain';
import { CardRepository, SessionRepository, VerificadorDeVozPort, VoiceInput } from '../../core/ports';
import { Feedback, FeedbackService, SessionDeckService, WordAssemblyValidator } from '../../core/services';
import { MAX_VOICE_ATTEMPTS } from '../../core/config/mastery.config';
import { StudentService } from '../student/student.service';
import { CierreDeSesionService, SessionResult } from './cierre-de-sesion.service';

export interface SessionView {
  session: PracticeSession;
  card: Card | null;
}

export interface AttemptOutcome extends SessionView {
  correct: boolean;
  firstWrongIndex: number | null;
  matchedPrefixLength: number;
  expectedLength: number;
  attemptNumber: number;
  feedback: Feedback;
  voiceCheckRequired: boolean;
}

export interface VoiceOutcome extends SessionView {
  accepted: boolean;
  /** Si todavia puede volver a intentar la pronunciacion de esta misma tarjeta. */
  canRetry: boolean;
  /** Si hubo voz para juzgar. Si no, no cuenta como intento: se le pide que lo repita. */
  heard: boolean;
  transcript: string;
  expected: string;
  similarity: number;
  confidence: number;
  /** Si la pronunciacion se llego a comparar de verdad contra lo esperado. */
  verified: boolean;
  provider: string;
  feedback: Feedback;
}

/**
 * El flujo central de la app: abrir la sesion de un nivel, validar cada armado
 * y conducir la verificacion por voz tarjeta por tarjeta. Si el chico lo dijo
 * bien lo decide `VerificadorDeVozPort`, y el cierre lo liquida
 * `CierreDeSesionService`.
 */
@Injectable()
export class PracticeService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly cards: CardRepository,
    private readonly students: StudentService,
    private readonly validator: WordAssemblyValidator,
    private readonly deck: SessionDeckService,
    private readonly feedback: FeedbackService,
    private readonly verificador: VerificadorDeVozPort,
    private readonly cierre: CierreDeSesionService,
  ) {}

  /**
   * Abre una sesion del nivel pedido, o del nivel actual si no se pide ninguno.
   * Una sesion anterior sin cerrar queda abandonada y no suma al progreso: el
   * chico que cerro la app a mitad no deberia arrastrar una sesion floja.
   */
  async start(student: Student, levelId?: string): Promise<SessionView> {
    const context = await this.students.context(student);

    const access = levelId
      ? context.accesses.find((item) => item.level.id === levelId)
      : (context.current ?? undefined);

    if (!access) {
      throw new NotFoundException(levelId ? `No existe el nivel ${levelId}.` : 'No hay ningun nivel disponible.');
    }

    if (!access.playable) {
      throw new ForbiddenException(
        access.status === LevelStatus.LOCKED_BY_TEACHER
          ? `El nivel ${access.level.order} todavia no fue habilitado por la docente para este curso.`
          : `El nivel ${access.level.order} necesita que primero se domine el anterior.`,
      );
    }

    const open = await this.sessions.findOpenByStudent(student.id);
    if (open) {
      await this.sessions.save({ ...open, status: SessionStatus.ABANDONED, completedAt: new Date() });
    }

    const cards = this.deck.draw(access.level, await this.cards.findByLevelId(access.level.id));
    if (cards.length === 0) {
      throw new NotFoundException(`El nivel ${access.level.id} no tiene tarjetas cargadas.`);
    }

    const session = await this.sessions.save({
      id: randomUUID(),
      studentId: student.id,
      levelId: access.level.id,
      levelOrder: access.level.order,
      mode: SessionMode.LEVEL,
      status: SessionStatus.IN_PROGRESS,
      cardQueue: cards.map((card) => card.id),
      currentCardIndex: 0,
      attempts: [],
      voiceChecks: [],
      startedAt: new Date(),
    });

    return { session, card: cards[0] };
  }

  async state(student: Student, sessionId: string): Promise<SessionView> {
    const session = await this.requireSession(student, sessionId);
    return { session, card: await this.currentCard(session) };
  }

  /** Valida el armado por botones y avanza la sesion si corresponde. */
  async attempt(
    student: Student,
    sessionId: string,
    cardId: string,
    sequence: string[],
    elapsedMs?: number,
  ): Promise<AttemptOutcome> {
    const session = await this.requireOpenSession(student, sessionId);
    const card = await this.requireCurrentCard(session, cardId);

    const result = this.validator.validate(card, sequence);
    const attemptNumber = session.attempts.filter((attempt) => attempt.cardId === cardId).length + 1;

    const updated: PracticeSession = {
      ...session,
      attempts: [
        ...session.attempts,
        {
          cardId,
          sequence,
          correct: result.correct,
          firstWrongIndex: result.firstWrongIndex,
          attemptNumber,
          elapsedMs,
          at: new Date(),
        },
      ],
    };

    // Con verificacion por voz pendiente la tarjeta no avanza todavia: el cierre
    // del circuito ver-tocar-escuchar-decir es el pico de la sesion.
    const voiceCheckRequired = result.correct && Boolean(card.voiceTarget) && !this.hasVoiceCheck(updated, cardId);
    if (result.correct && !voiceCheckRequired) {
      updated.currentCardIndex = session.currentCardIndex + 1;
    }

    const saved = await this.sessions.save(updated);

    return {
      session: saved,
      card: await this.currentCard(saved),
      correct: result.correct,
      firstWrongIndex: result.firstWrongIndex,
      matchedPrefixLength: result.matchedPrefixLength,
      expectedLength: result.expectedLength,
      attemptNumber,
      voiceCheckRequired,
      feedback: this.feedback.forAssembly(card, result, attemptNumber),
    };
  }

  /**
   * Verificacion final por voz. Acepta audio o una transcripcion ya resuelta por
   * el cliente, para que un frontend que use el reconocimiento del navegador no
   * tenga que mandar el audio crudo.
   *
   * Un rechazo nunca traba la sesion: el chico ya armo la palabra, y dejarlo
   * encerrado porque el microfono del aula es malo seria feedback punitivo.
   */
  async voiceCheck(student: Student, sessionId: string, cardId: string, input: VoiceInput): Promise<VoiceOutcome> {
    const session = await this.requireOpenSession(student, sessionId);
    const card = await this.requireCurrentCard(session, cardId);

    const expected = card.voiceTarget;
    if (!expected) {
      throw new BadRequestException(`La tarjeta ${cardId} no pide verificacion por voz.`);
    }

    if (!this.isSolved(session, cardId)) {
      throw new BadRequestException('Primero hay que armar la palabra y recien despues decirla.');
    }

    if (!input.unverified && input.transcript === undefined && !input.audioBase64) {
      throw new BadRequestException('Hace falta audioBase64 o transcript.');
    }

    const veredicto = await this.verificador.verificar(card, input);
    if (!veredicto.heard) return this.noEscuchado(session, card, expected, veredicto.provider);

    const { accepted, verified, transcript, confidence, similarity, provider } = veredicto;
    const intentos = session.voiceChecks.filter((check) => check.cardId === cardId).length + 1;
    // Un rechazo NO saltea la tarjeta: se puede volver a intentar. Solo se
    // avanza al aceptar, o cuando se agotaron los intentos.
    const avanza = accepted || intentos >= MAX_VOICE_ATTEMPTS;
    const canRetry = !accepted && !avanza;

    const updated: PracticeSession = {
      ...session,
      voiceChecks: [
        ...session.voiceChecks,
        { cardId, transcript, expected, confidence, similarity, accepted, verified, provider, at: new Date() },
      ],
      currentCardIndex: avanza ? session.currentCardIndex + 1 : session.currentCardIndex,
    };

    const saved = await this.sessions.save(updated);

    return {
      session: saved,
      card: await this.currentCard(saved),
      accepted,
      canRetry,
      heard: true,
      transcript,
      expected,
      similarity: Number(similarity.toFixed(4)),
      confidence: Number(confidence.toFixed(4)),
      provider,
      verified,
      feedback: this.feedback.forVoice(card, accepted, similarity),
    };
  }

  /** Cierra la sesion, actualiza el promedio movil y paga lo que corresponda. */
  async complete(student: Student, sessionId: string): Promise<SessionResult> {
    const session = await this.requireOpenSession(student, sessionId);
    return this.cierre.cerrar(student, session);
  }

  /**
   * No se escucho nada util. No se registra como intento ni se juzga: se le
   * pide que lo repita, igual que cuando el microfono del navegador no capta.
   */
  private async noEscuchado(session: PracticeSession, card: Card, expected: string, provider: string): Promise<VoiceOutcome> {
    return {
      session,
      card,
      accepted: false,
      canRetry: true,
      heard: false,
      transcript: '',
      expected,
      similarity: 0,
      confidence: 0,
      provider,
      verified: false,
      feedback: this.feedback.forVoice(card, false, 0),
    };
  }

  private hasVoiceCheck(session: PracticeSession, cardId: string): boolean {
    return session.voiceChecks.some((check) => check.cardId === cardId);
  }

  private isSolved(session: PracticeSession, cardId: string): boolean {
    return session.attempts.some((attempt) => attempt.cardId === cardId && attempt.correct);
  }

  private async currentCard(session: PracticeSession): Promise<Card | null> {
    const cardId = session.cardQueue[session.currentCardIndex];
    return cardId ? this.cards.findById(cardId) : null;
  }

  private async requireCurrentCard(session: PracticeSession, cardId: string): Promise<Card> {
    const expectedId = session.cardQueue[session.currentCardIndex];
    if (expectedId !== cardId) {
      throw new BadRequestException(
        expectedId
          ? `La tarjeta actual de la sesion es ${expectedId}, no ${cardId}.`
          : 'La sesion ya no tiene tarjetas pendientes: corresponde cerrarla.',
      );
    }

    const card = await this.cards.findById(cardId);
    if (!card) {
      throw new NotFoundException(`No existe la tarjeta ${cardId}.`);
    }
    return card;
  }

  private async requireSession(student: Student, sessionId: string): Promise<PracticeSession> {
    const session = await this.sessions.findById(sessionId);
    if (!session || session.studentId !== student.id) {
      throw new NotFoundException(`No existe la sesion ${sessionId} para este alumno.`);
    }
    return session;
  }

  private async requireOpenSession(student: Student, sessionId: string): Promise<PracticeSession> {
    const session = await this.requireSession(student, sessionId);
    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException(`La sesion ${sessionId} ya esta ${session.status}.`);
    }
    return session;
  }
}
