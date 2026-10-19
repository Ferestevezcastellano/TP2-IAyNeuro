import { Injectable, NotFoundException } from '@nestjs/common';
import { Accessory, Level, PracticeSession, SessionOutcome, SessionStatus, Student } from '../../core/domain';
import {
  AccessoryRepository,
  CardRepository,
  LevelRepository,
  ProgressRepository,
  SessionRepository,
  StudentRepository,
} from '../../core/ports';
import {
  Feedback,
  FeedbackService,
  LevelAccess,
  MasteryService,
  RewardService,
  SessionScoringService,
} from '../../core/services';
import { StudentService } from '../student/student.service';

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
 * Cierra una sesion: la puntua, actualiza el promedio movil del nivel y paga
 * lo que corresponda. Es la liquidacion de lo que paso en la sesion, separada
 * de conducirla tarjeta por tarjeta, que es lo que hace `PracticeService`.
 */
@Injectable()
export class CierreDeSesionService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly levels: LevelRepository,
    private readonly cards: CardRepository,
    private readonly progressRepo: ProgressRepository,
    private readonly studentsRepo: StudentRepository,
    private readonly accessories: AccessoryRepository,
    private readonly students: StudentService,
    private readonly scoring: SessionScoringService,
    private readonly mastery: MasteryService,
    private readonly rewards: RewardService,
    private readonly feedback: FeedbackService,
  ) {}

  /** Recibe una sesion abierta y ya validada como del alumno. */
  async cerrar(student: Student, session: PracticeSession): Promise<SessionResult> {
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

  private async requireLevel(levelId: string): Promise<Level> {
    const level = await this.levels.findById(levelId);
    if (!level) {
      throw new NotFoundException(`No existe el nivel ${levelId}.`);
    }
    return level;
  }
}
