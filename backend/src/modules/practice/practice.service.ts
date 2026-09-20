import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  Accessory,
  Card,
  Level,
  LevelStatus,
  PracticeSession,
  SessionMode,
  SessionOutcome,
  SessionStatus,
  Student,
} from '../../core/domain';
import {
  AccessoryRepository,
  CardRepository,
  LevelRepository,
  ProgressRepository,
  SessionRepository,
  SpeechRecognitionPort,
  StudentRepository,
} from '../../core/ports';
import {
  Feedback,
  FeedbackService,
  LevelAccess,
  MasteryService,
  PhoneticNormalizerService,
  RewardService,
  SessionScoringService,
  WordAssemblyValidator,
} from '../../core/services';
import { VOICE_SIMILARITY_THRESHOLD } from '../../core/config/mastery.config';
import { StudentService } from '../student/student.service';

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
  transcript: string;
  expected: string;
  similarity: number;
  confidence: number;
  provider: string;
  feedback: Feedback;
}

export interface SessionResult {
  session: PracticeSession;
  outcome: SessionOutcome;
  cardsSolved: number;
  cardsTotal: number;
  sessionsCompleted: number;
  sessionsRemaining: number;
  totalStars: number;
  accessory: Accessory | null;
  nextLevel: LevelAccess | null;
  feedback: Feedback;
}

/**
 * El flujo central de la app: abrir la sesion de un nivel, validar cada armado,
 * escuchar la verificacion por voz y cerrar pagando lo que corresponda.
 */
@Injectable()
export class PracticeService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly levels: LevelRepository,
    private readonly cards: CardRepository,
    private readonly progressRepo: ProgressRepository,
    private readonly studentsRepo: StudentRepository,
    private readonly accessories: AccessoryRepository,
    private readonly speech: SpeechRecognitionPort,
    private readonly students: StudentService,
    private readonly validator: WordAssemblyValidator,
    private readonly scoring: SessionScoringService,
    private readonly mastery: MasteryService,
    private readonly rewards: RewardService,
    private readonly feedback: FeedbackService,
    private readonly phonetics: PhoneticNormalizerService,
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

    const cards = await this.cards.findByLevelId(access.level.id);
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
  async voiceCheck(
    student: Student,
    sessionId: string,
    cardId: string,
    input: { audioBase64?: string; transcript?: string },
  ): Promise<VoiceOutcome> {
    const session = await this.requireOpenSession(student, sessionId);
    const card = await this.requireCurrentCard(session, cardId);

    const expected = card.voiceTarget;
    if (!expected) {
      throw new BadRequestException(`La tarjeta ${cardId} no pide verificacion por voz.`);
    }

    if (!this.isSolved(session, cardId)) {
      throw new BadRequestException('Primero hay que armar la palabra y recien despues decirla.');
    }

    let transcript: string;
    let confidence: number;
    let provider: string;

    if (input.transcript !== undefined) {
      transcript = input.transcript;
      confidence = 1;
      provider = 'client';
    } else if (input.audioBase64) {
      const recognized = await this.speech.transcribe(Buffer.from(input.audioBase64, 'base64'), expected);
      transcript = recognized.transcript;
      confidence = recognized.confidence;
      provider = recognized.provider;
    } else {
      throw new BadRequestException('Hace falta audioBase64 o transcript.');
    }

    const similarity = this.phonetics.similarity(transcript, expected);
    const accepted = similarity >= VOICE_SIMILARITY_THRESHOLD;

    const updated: PracticeSession = {
      ...session,
      voiceChecks: [
        ...session.voiceChecks,
        { cardId, transcript, expected, confidence, similarity, accepted, provider, at: new Date() },
      ],
      currentCardIndex: session.currentCardIndex + 1,
    };

    const saved = await this.sessions.save(updated);

    return {
      session: saved,
      card: await this.currentCard(saved),
      accepted,
      transcript,
      expected,
      similarity: Number(similarity.toFixed(4)),
      confidence: Number(confidence.toFixed(4)),
      provider,
      feedback: this.feedback.forVoice(card, accepted, similarity),
    };
  }

  /** Cierra la sesion, actualiza el promedio movil y paga lo que corresponda. */
  async complete(student: Student, sessionId: string): Promise<SessionResult> {
    const session = await this.requireOpenSession(student, sessionId);
    const level = await this.requireLevel(session.levelId);
    const cards = await this.cards.findByLevelId(level.id);

    const score = this.scoring.score(session, cards);
    const existing =
      (await this.progressRepo.find(student.id, level.id)) ?? this.mastery.empty(student.id, level.id, level.order);
    const { progress, masteredNow } = this.mastery.register(existing, score.accuracy);

    const accessory = masteredNow ? await this.accessories.findByLevelOrder(level.order) : null;
    const grant = this.rewards.grant(student, progress, accessory);

    await this.progressRepo.save(grant.progress);
    const savedStudent = await this.studentsRepo.save(grant.student);

    const context = await this.students.context(savedStudent);
    const nextLevel = context.accesses.find((access) => access.level.order === level.order + 1) ?? null;

    const outcome: SessionOutcome = {
      accuracy: score.accuracy,
      masteryAverage: grant.progress.masteryAverage,
      mastered: grant.progress.mastered,
      masteredNow,
      starsAwarded: grant.starsAwarded,
      accessoryUnlockedId: grant.accessoryUnlockedId,
      nextLevelOrder: nextLevel?.level.order ?? null,
      nextLevelUnlocked: nextLevel?.playable ?? false,
    };

    const saved = await this.sessions.save({
      ...session,
      status: SessionStatus.COMPLETED,
      completedAt: new Date(),
      outcome,
    });

    const sessionsRemaining = this.mastery.sessionsRemaining(grant.progress);

    return {
      session: saved,
      outcome,
      cardsSolved: score.cardsSolved,
      cardsTotal: score.cardsTotal,
      sessionsCompleted: grant.progress.sessionsCompleted,
      sessionsRemaining,
      totalStars: savedStudent.stars,
      accessory: grant.accessoryUnlockedId ? accessory : null,
      nextLevel,
      feedback: this.feedback.forSessionEnd(score.accuracy, grant.progress.mastered, masteredNow, sessionsRemaining),
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

  private async requireLevel(levelId: string): Promise<Level> {
    const level = await this.levels.findById(levelId);
    if (!level) {
      throw new NotFoundException(`No existe el nivel ${levelId}.`);
    }
    return level;
  }
}
