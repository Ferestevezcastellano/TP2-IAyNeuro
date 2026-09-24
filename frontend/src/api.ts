/**
 * Por defecto la API se pide al mismo origen que la app, bajo `/api`, y Vite la
 * reenvía al backend (ver `vite.config.ts`). Así, abriendo la app desde el
 * teléfono por la IP de la compu o por un túnel https, la API viaja por el mismo
 * camino sin configurar nada. `VITE_API_URL` la apunta a otro lado.
 */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

/** Un pedido que no contesta en este tiempo se da por fallido, en vez de dejar la pantalla esperando. */
const REQUEST_TIMEOUT_MS = 12000;

export type PetSpecies = 'LION' | 'POLAR_BEAR' | 'RHINOCEROS' | 'KOALA';

export type CardKind = 'LETTER_INTRO' | 'SOUND_RECOGNITION' | 'WORD_BUILDING' | 'SENTENCE_BUILDING';

export interface Tile {
  id: string;
  label: string;
  kind: 'LETTER' | 'SYLLABLE' | 'WORD' | 'IMAGE';
  audioKey?: string;
  imageKey?: string;
  spokenAs?: string;
}

export interface Card {
  id: string;
  levelId: string;
  position: number;
  group: string;
  kind: CardKind;
  prompt: string;
  targetWord?: string;
  targetPhoneme?: string;
  targetSentence?: string;
  imageKey?: string;
  audioKey: string;
  spokenAs: string;
  tiles: Tile[];
  expectedLength: number;
  voiceCheckRequired: boolean;
  voiceTarget?: string;
}

export interface Feedback {
  tone: 'CELEBRATE' | 'ENCOURAGE' | 'GUIDE';
  valoro: string;
  mePregunto: string | null;
  sugiero: string;
}

export interface SessionState {
  sessionId: string;
  levelId: string;
  levelOrder: number;
  status: string;
  cardIndex: number;
  cardsTotal: number;
  card: Card | null;
}

export interface AttemptResult {
  correct: boolean;
  firstWrongIndex: number | null;
  matchedPrefixLength: number;
  expectedLength: number;
  attemptNumber: number;
  feedback: Feedback;
  voiceCheckRequired: boolean;
  session: SessionState;
}

/** Lo que se manda a verificar: texto ya reconocido, audio grabado, o nada. */
export type EntradaVoz = string | { audioBase64: string } | null;

export interface VoiceResult {
  accepted: boolean;
  /** Si todavía puede volver a intentar la pronunciación de esta misma tarjeta. */
  canRetry: boolean;
  /** Si hubo voz para juzgar. En false no cuenta como intento: se pide repetir. */
  heard?: boolean;
  /** Si la pronunciación se llegó a comparar de verdad contra lo esperado. */
  verified: boolean;
  transcript: string;
  expected: string;
  similarity: number;
  feedback: Feedback;
  session: SessionState;
}

export type LevelStatus = 'MASTERED' | 'IN_PROGRESS' | 'AVAILABLE' | 'LOCKED_BY_PROGRESS' | 'LOCKED_BY_TEACHER';

export interface Level {
  id: string;
  order: number;
  title: string;
  newLetters: string[];
  cumulativeLetters: string[];
  status: LevelStatus;
  playable: boolean;
  lockedReason: string | null;
  /** Accesorio que se gana al dominar el nivel. */
  accessoryId: string;
  stars: number;
  masteryAverage: number;
  sessionsCompleted: number;
}

export interface Accessory {
  id: string;
  label: string;
  slot: string;
  unlockedByLevelOrder: number;
  owned: boolean;
  equipped: boolean;
}

export interface Pet {
  species: PetSpecies;
  label: string;
  accessories: Accessory[];
}

export interface Profile {
  studentId: string;
  className: string;
  stars: number;
  pet: Pet;
  currentLevel: Level | null;
  masteredLevels: number;
}

export interface SessionSummary {
  sessionId: string;
  levelId: string;
  accuracy: number;
  cardsSolved: number;
  cardsTotal: number;
  masteryAverage: number;
  sessionsCompleted: number;
  sessionsRemaining: number;
  mastered: boolean;
  masteredNow: boolean;
  starsAwarded: number;
  totalStars: number;
  accessoryUnlocked: { id: string; label: string } | null;
  nextLevel: Level | null;
  feedback: Feedback;
}

export interface ReviewSound {
  letter: string;
  audioKey: string;
  spokenAs: string;
  levelOrder: number;
}

const TOKEN_KEY = 'ami.studentToken';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // sin almacenamiento, la sesión dura lo que dura la pestaña
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['x-ami-student-token'] = token;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('NO SE PUDO HABLAR CON EL SERVIDOR.', 0);
  } finally {
    window.clearTimeout(timer);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message
      ? Array.isArray(data.message)
        ? data.message.join(' · ')
        : data.message
      : `${response.status} ${response.statusText}`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export const api = {
  verifyClassCode: (classCode: string) =>
    request<{ valid: boolean; className?: string }>('POST', '/onboarding/class-code/verify', { classCode }),
  register: (classCode: string, petSpecies: PetSpecies) =>
    request<{ studentToken: string }>('POST', '/onboarding/students', { classCode, petSpecies }),
  profile: () => request<Profile>('GET', '/me'),
  levels: () => request<Level[]>('GET', '/me/levels'),
  pet: () => request<Pet>('GET', '/me/pet'),
  equip: (equippedAccessoryIds: string[]) => request<Pet>('PATCH', '/me/pet', { equippedAccessoryIds }),
  startSession: (levelId?: string) => request<SessionState>('POST', '/practice/sessions', levelId ? { levelId } : {}),
  attempt: (sessionId: string, cardId: string, sequence: string[]) =>
    request<AttemptResult>('POST', `/practice/sessions/${sessionId}/cards/${cardId}/attempt`, { sequence }),
  /**
   * Verifica la pronunciación: lo que entendió el navegador, o el audio grabado
   * para que lo reconozca el servidor. `null` significa "no se pudo escuchar":
   * el chico avanza igual, pero el intento queda registrado sin verificar y no
   * cuenta como acierto de voz.
   */
  voiceCheck: (sessionId: string, cardId: string, voz: EntradaVoz) =>
    request<VoiceResult>(
      'POST',
      `/practice/sessions/${sessionId}/cards/${cardId}/voice-check`,
      voz === null ? { unverified: true } : typeof voz === 'string' ? { transcript: voz } : { audioBase64: voz.audioBase64 },
    ),
  /**
   * Despierta al servidor. En el plan gratis de Render se apaga tras 15 minutos
   * sin uso y tarda hasta un minuto en volver: se espera acá, con la pantalla de
   * carga, y no en medio de una tarjeta.
   */
  despertar: () => request<{ provider: string }>('GET', '/catalog/speech', undefined, 90000),
  speechProvider: () => request<{ provider: string }>('GET', '/catalog/speech'),
  complete: (sessionId: string) => request<SessionSummary>('POST', `/practice/sessions/${sessionId}/complete`, {}),
  reviewSounds: () => request<ReviewSound[]>('GET', '/review/sounds'),
  reviewCards: (limit: number) => request<{ cards: Card[]; available: number }>('GET', `/review/cards?limit=${limit}`),
  reviewAttempt: (cardId: string, sequence: string[]) =>
    request<{ correct: boolean; firstWrongIndex: number | null; feedback: Feedback }>('POST', '/review/attempts', { cardId, sequence }),
};
