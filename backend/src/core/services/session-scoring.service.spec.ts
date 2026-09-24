import { Card, CardKind, PracticeSession, SessionMode, SessionStatus, TileKind } from '../domain';
import { SessionScoringService } from './session-scoring.service';

function card(id: string, voiceTarget?: string): Card {
  return {
    id,
    levelId: 'level-03-m-s',
    position: 1,
    group: 'PALABRA',
    kind: CardKind.WORD_BUILDING,
    prompt: 'ARMA LA PALABRA',
    targetWord: 'MESA',
    audioKey: 'audio/palabra/mesa',
    spokenAs: 'mesa',
    tiles: [{ id: 't0', label: 'M', kind: TileKind.LETTER }],
    solution: ['t0'],
    voiceTarget,
  };
}

function session(cards: Card[], partial: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 'sesion-1',
    studentId: 'alumno-1',
    levelId: 'level-03-m-s',
    levelOrder: 3,
    mode: SessionMode.LEVEL,
    status: SessionStatus.IN_PROGRESS,
    cardQueue: cards.map((item) => item.id),
    currentCardIndex: 0,
    attempts: [],
    voiceChecks: [],
    startedAt: new Date(),
    ...partial,
  };
}

const attempt = (cardId: string, correct: boolean, attemptNumber: number) => ({
  cardId,
  sequence: ['t0'],
  correct,
  firstWrongIndex: correct ? null : 0,
  attemptNumber,
  at: new Date(),
});

describe('SessionScoringService', () => {
  const scoring = new SessionScoringService();

  it('una tarjeta resuelta al primer intento vale 1', () => {
    const cards = [card('c1')];
    const score = scoring.score(session(cards, { attempts: [attempt('c1', true, 1)] }), cards);

    expect(score.accuracy).toBe(1);
    expect(score.cardsSolved).toBe(1);
  });

  it('cada reintento degrada el puntaje en lugar de anularlo', () => {
    const cards = [card('c1')];
    const score = scoring.score(
      session(cards, { attempts: [attempt('c1', false, 1), attempt('c1', true, 2)] }),
      cards,
    );

    expect(score.accuracy).toBe(0.5);
    expect(score.cardsSolved).toBe(1);
  });

  it('una tarjeta nunca resuelta vale 0', () => {
    const cards = [card('c1')];
    const score = scoring.score(session(cards, { attempts: [attempt('c1', false, 1)] }), cards);

    expect(score.accuracy).toBe(0);
    expect(score.cardsSolved).toBe(0);
  });

  it('una tarjeta ni intentada cuenta como 0 y no se saltea del total', () => {
    const cards = [card('c1'), card('c2')];
    const score = scoring.score(session(cards, { attempts: [attempt('c1', true, 1)] }), cards);

    expect(score.cardsTotal).toBe(2);
    expect(score.accuracy).toBe(0.5);
  });

  it('la voz pesa solo una parte del puntaje de la tarjeta', () => {
    const cards = [card('c1', 'MESA')];
    const withRejectedVoice = scoring.score(
      session(cards, {
        attempts: [attempt('c1', true, 1)],
        voiceChecks: [
          {
            cardId: 'c1',
            transcript: 'ME',
            expected: 'MESA',
            confidence: 0.4,
            similarity: 0.5,
            accepted: false,
            verified: true,
            provider: 'stub',
            at: new Date(),
          },
        ],
      }),
      cards,
    );

    // Armado perfecto (1) y voz rechazada (0): queda el peso del armado.
    expect(withRejectedVoice.accuracy).toBe(0.6);
  });

  it('una voz que no se pudo verificar no suma ni resta: la tarjeta vale por el armado', () => {
    const cards = [card('c1', 'MESA')];
    const score = scoring.score(
      session(cards, {
        attempts: [attempt('c1', true, 1)],
        voiceChecks: [
          {
            cardId: 'c1',
            transcript: '',
            expected: 'MESA',
            confidence: 0,
            similarity: 0,
            // El chico pasa igual, pero nadie lo escucho.
            accepted: true,
            verified: false,
            provider: 'none',
            at: new Date(),
          },
        ],
      }),
      cards,
    );

    // Vale 1 por el armado, no 1 por haber "dicho bien" una palabra que nadie
    // escucho: si contara como acierto de voz, un microfono roto inflaria la
    // metrica de dominio, que es lo unico que el TP tiene que medir bien.
    expect(score.accuracy).toBe(1);
    expect(score.cards[0].voiceScore).toBeNull();
  });

  it('armado perfecto mas voz aceptada da 1', () => {
    const cards = [card('c1', 'MESA')];
    const score = scoring.score(
      session(cards, {
        attempts: [attempt('c1', true, 1)],
        voiceChecks: [
          {
            cardId: 'c1',
            transcript: 'MESA',
            expected: 'MESA',
            confidence: 0.9,
            similarity: 1,
            accepted: true,
            verified: true,
            provider: 'stub',
            at: new Date(),
          },
        ],
      }),
      cards,
    );

    expect(score.accuracy).toBe(1);
  });
});
