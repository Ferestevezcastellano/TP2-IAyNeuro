import { Injectable } from '@nestjs/common';
import { Card, PracticeSession } from '../domain';
import { ATTEMPT_SCORES, ATTEMPT_SCORE_FLOOR, VOICE_WEIGHT } from '../config/mastery.config';

export interface CardScore {
  cardId: string;
  attempts: number;
  solved: boolean;
  assemblyScore: number;
  voiceScore: number | null;
  score: number;
}

export interface SessionScore {
  accuracy: number;
  cards: CardScore[];
  cardsSolved: number;
  cardsTotal: number;
}

/**
 * Convierte lo que paso en una sesion en un numero entre 0 y 1.
 *
 * Una tarjeta resuelta al primer intento vale 1 y cada reintento la degrada, en
 * lugar de contarla como error: el chico que se corrige solo aprendio algo, y
 * puntuarlo igual que a quien nunca llego seria falso.
 */
@Injectable()
export class SessionScoringService {
  score(session: PracticeSession, cards: Card[]): SessionScore {
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    const scores: CardScore[] = session.cardQueue.map((cardId) => {
      const card = cardsById.get(cardId);
      const attempts = session.attempts.filter((attempt) => attempt.cardId === cardId);
      const solvedAt = attempts.findIndex((attempt) => attempt.correct);
      const solved = solvedAt >= 0;
      const assemblyScore = solved ? this.attemptScore(solvedAt + 1) : 0;

      const voiceRequired = Boolean(card?.voiceTarget);
      const voiceChecks = session.voiceChecks.filter((check) => check.cardId === cardId);
      const voiceScore = voiceRequired
        ? voiceChecks.some((check) => check.accepted)
          ? 1
          : 0
        : null;

      const score =
        voiceScore === null ? assemblyScore : assemblyScore * (1 - VOICE_WEIGHT) + voiceScore * VOICE_WEIGHT;

      return {
        cardId,
        attempts: attempts.length,
        solved,
        assemblyScore,
        voiceScore,
        score: Number(score.toFixed(4)),
      };
    });

    const cardsTotal = scores.length;
    const accuracy =
      cardsTotal === 0 ? 0 : Number((scores.reduce((acc, card) => acc + card.score, 0) / cardsTotal).toFixed(4));

    return {
      accuracy,
      cards: scores,
      cardsSolved: scores.filter((card) => card.solved).length,
      cardsTotal,
    };
  }

  private attemptScore(attemptNumber: number): number {
    return ATTEMPT_SCORES[attemptNumber] ?? ATTEMPT_SCORE_FLOOR;
  }
}
