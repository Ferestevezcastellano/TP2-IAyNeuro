import { Injectable, NotFoundException } from '@nestjs/common';
import { Card, LevelStatus, Student } from '../../core/domain';
import { CardRepository } from '../../core/ports';
import { Feedback, FeedbackService, WordAssemblyValidator } from '../../core/services';
import { AssemblyResult } from '../../core/services/word-assembly.validator';
import { StudentService } from '../student/student.service';

export interface ReviewSound {
  letter: string;
  audioKey: string;
  levelOrder: number;
  levelTitle: string;
}

export interface ReviewAttemptOutcome {
  result: AssemblyResult;
  feedback: Feedback;
}

/**
 * Zona de Repaso: practica libre sobre lo ya dominado.
 *
 * No abre sesion ni escribe progreso a proposito. Si repasar pudiera bajar el
 * promedio movil, el chico aprenderia a no repasar, que es lo contrario de lo
 * que la practica intercalada busca.
 */
@Injectable()
export class ReviewService {
  constructor(
    private readonly cards: CardRepository,
    private readonly students: StudentService,
    private readonly validator: WordAssemblyValidator,
    private readonly feedback: FeedbackService,
  ) {}

  /** Letras de los niveles ya dominados, para la grilla de la pantalla. */
  async sounds(student: Student): Promise<ReviewSound[]> {
    const context = await this.students.context(student);

    return context.accesses
      .filter((access) => access.status === LevelStatus.MASTERED)
      .flatMap((access) =>
        access.level.newLetters.map((letter) => ({
          letter,
          audioKey: `audio/fonema/${letter.toLowerCase()}`,
          levelOrder: access.level.order,
          levelTitle: access.level.title,
        })),
      );
  }

  /** Tarjetas de niveles dominados, barajadas. */
  async cardsFor(student: Student, limit: number): Promise<{ cards: Card[]; available: number }> {
    const context = await this.students.context(student);
    const masteredLevelIds = context.accesses
      .filter((access) => access.status === LevelStatus.MASTERED)
      .map((access) => access.level.id);

    if (masteredLevelIds.length === 0) {
      return { cards: [], available: 0 };
    }

    const all = await this.cards.findByLevelIds(masteredLevelIds);
    const shuffled = [...all].sort(() => Math.random() - 0.5);

    return { cards: shuffled.slice(0, limit), available: all.length };
  }

  /** Valida un armado de repaso. Devuelve feedback y nada mas. */
  async attempt(student: Student, cardId: string, sequence: string[]): Promise<ReviewAttemptOutcome> {
    const card = await this.cards.findById(cardId);
    if (!card) {
      throw new NotFoundException(`No existe la tarjeta ${cardId}.`);
    }

    const context = await this.students.context(student);
    const access = context.accesses.find((item) => item.level.id === card.levelId);
    if (!access || access.status !== LevelStatus.MASTERED) {
      throw new NotFoundException('Esa tarjeta pertenece a un nivel que todavia no esta dominado.');
    }

    const result = this.validator.validate(card, sequence);
    return { result, feedback: this.feedback.forAssembly(card, result, 1) };
  }
}
