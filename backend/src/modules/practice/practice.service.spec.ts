import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { CommonModule } from '../../common/common.module';
import {
  Card,
  CardKind,
  PetSpeciesId,
  PracticeSession,
  SessionMode,
  SessionStatus,
  Student,
  VoiceSays,
} from '../../core/domain';
import { CoreModule } from '../../core/core.module';
import { CardRepository, LevelRepository, SessionRepository, StudentRepository } from '../../core/ports';
import { PersistenceModule } from '../../persistence/persistence.module';
import { SeedModule } from '../../seed/seed.module';
import { SpeechModule } from '../speech/speech.module';
import { PracticeModule } from './practice.module';
import { PracticeService } from './practice.service';

/**
 * Fija el comportamiento de la verificación por voz y del cierre de sesión tal
 * como los ve quien usa `PracticeService`. Existe para poder reorganizar lo que
 * hay adentro sin cambiar lo que pasa afuera: estos casos tienen que dar lo
 * mismo antes y después.
 *
 * Arma la app con el contenido semilla y el reconocedor de utilería, y crea las
 * sesiones a mano con la tarjeta ya armada, porque el mazo real se sortea.
 */
describe('PracticeService', () => {
  let app: TestingModule;
  let practice: PracticeService;
  let cards: CardRepository;
  let levels: LevelRepository;
  let sessions: SessionRepository;
  let students: StudentRepository;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [PersistenceModule, CoreModule, CommonModule, SpeechModule, SeedModule, PracticeModule],
    }).compile();
    await app.init();

    practice = app.get(PracticeService);
    cards = app.get(CardRepository);
    levels = app.get(LevelRepository);
    sessions = app.get(SessionRepository);
    students = app.get(StudentRepository);
  });

  afterAll(async () => {
    await app.close();
  });

  const alumno = (): Promise<Student> =>
    students.save({
      id: randomUUID(),
      classId: 'class-primero-a',
      pet: { species: PetSpeciesId.LION, accessoriesOwned: [], accessoriesEquipped: [] },
      stars: 0,
      createdAt: new Date(),
      lastSeenAt: new Date(),
    });

  async function tarjeta(condicion: (card: Card) => boolean): Promise<Card> {
    const todas = await cards.findByLevelIds((await levels.findAll()).map((level) => level.id));
    const encontrada = todas.find(condicion);
    if (!encontrada) throw new Error('El contenido semilla no tiene una tarjeta así.');
    return encontrada;
  }

  const palabra = () => tarjeta((c) => c.kind === CardKind.WORD_BUILDING && c.voiceSays === VoiceSays.WORD);
  const oracion = () => tarjeta((c) => c.voiceSays === VoiceSays.SENTENCE);
  const letra = () => tarjeta((c) => c.kind === CardKind.LETTER_INTRO && Boolean(c.voiceTarget));

  /** Sesión abierta con la tarjeta ya armada bien, esperando la verificación por voz. */
  async function sesionArmada(student: Student, card: Card, siguientes: Card[] = []): Promise<PracticeSession> {
    const level = await levels.findById(card.levelId);
    return sessions.save({
      id: randomUUID(),
      studentId: student.id,
      levelId: card.levelId,
      levelOrder: level!.order,
      mode: SessionMode.LEVEL,
      status: SessionStatus.IN_PROGRESS,
      cardQueue: [card.id, ...siguientes.map((c) => c.id)],
      currentCardIndex: 0,
      attempts: [
        { cardId: card.id, sequence: card.solution, correct: true, firstWrongIndex: null, attemptNumber: 1, at: new Date() },
      ],
      voiceChecks: [],
      startedAt: new Date(),
    });
  }

  describe('voiceCheck', () => {
    it('no deja decir la palabra antes de armarla', async () => {
      const student = await alumno();
      const card = await palabra();
      const sesion = await sesionArmada(student, card);
      await sessions.save({ ...sesion, attempts: [] });

      await expect(practice.voiceCheck(student, sesion.id, card.id, { transcript: card.voiceTarget })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('acepta la palabra bien dicha y pasa a la tarjeta siguiente', async () => {
      const student = await alumno();
      const card = await palabra();
      const sesion = await sesionArmada(student, card);

      const r = await practice.voiceCheck(student, sesion.id, card.id, { transcript: card.voiceTarget });

      expect(r).toMatchObject({ accepted: true, verified: true, heard: true, canRetry: false, provider: 'client', similarity: 1 });
      expect(r.session.currentCardIndex).toBe(1);
    });

    it('rechaza otra palabra, deja reintentar y recién al tercer rechazo sigue', async () => {
      const student = await alumno();
      const card = await palabra();
      const sesion = await sesionArmada(student, card);

      const primero = await practice.voiceCheck(student, sesion.id, card.id, { transcript: 'PANTALON' });
      expect(primero).toMatchObject({ accepted: false, verified: true, canRetry: true });
      expect(primero.session.currentCardIndex).toBe(0);

      const segundo = await practice.voiceCheck(student, sesion.id, card.id, { transcript: 'PANTALON' });
      expect(segundo).toMatchObject({ accepted: false, canRetry: true });
      expect(segundo.session.currentCardIndex).toBe(0);

      const tercero = await practice.voiceCheck(student, sesion.id, card.id, { transcript: 'PANTALON' });
      expect(tercero).toMatchObject({ accepted: false, canRetry: false });
      expect(tercero.session.currentCardIndex).toBe(1);
    });

    it('cuando el cliente no pudo escuchar, avanza sin verificar', async () => {
      const student = await alumno();
      const card = await palabra();
      const sesion = await sesionArmada(student, card);

      const r = await practice.voiceCheck(student, sesion.id, card.id, { unverified: true });

      expect(r).toMatchObject({ accepted: true, verified: false, heard: true, provider: 'none', similarity: 0 });
      expect(r.session.currentCardIndex).toBe(1);
    });

    it('en una oración, una palabra cambiada no pasa aunque se parezca en letras', async () => {
      const student = await alumno();
      const card = await oracion();
      const esperada = card.voiceTarget!;
      const larga = [...esperada.split(' ')].sort((a, b) => b.length - a.length)[0];
      const cambiada = esperada.replace(larga, 'PERRO');

      const sesionMal = await sesionArmada(student, card);
      const mal = await practice.voiceCheck(student, sesionMal.id, card.id, { transcript: cambiada });
      expect(mal.accepted).toBe(false);

      const sesionBien = await sesionArmada(student, card);
      const bien = await practice.voiceCheck(student, sesionBien.id, card.id, { transcript: esperada });
      expect(bien.accepted).toBe(true);
    });

    it('un fonema suelto que el navegador no entendió queda sin verificar, no rechazado', async () => {
      const student = await alumno();
      const card = await letra();
      const sesion = await sesionArmada(student, card);

      const r = await practice.voiceCheck(student, sesion.id, card.id, { transcript: 'PANTALON' });

      expect(r).toMatchObject({ accepted: true, verified: false, provider: 'client' });
      expect(r.session.currentCardIndex).toBe(1);
    });

    it('un audio en el que no se oye nada no cuenta como intento', async () => {
      const student = await alumno();
      const card = await palabra();
      const sesion = await sesionArmada(student, card);

      const r = await practice.voiceCheck(student, sesion.id, card.id, {
        audioBase64: Buffer.from('abc').toString('base64'),
      });

      expect(r).toMatchObject({ accepted: false, heard: false, canRetry: true, verified: false });
      expect((await sessions.findById(sesion.id))!.voiceChecks).toHaveLength(0);
    });

    it('un sonido suelto grabado en silencio no se juzga: se pide repetir', async () => {
      const student = await alumno();
      const card = await letra();
      const sesion = await sesionArmada(student, card);
      const silencio = Buffer.alloc(16000 * 2);

      const r = await practice.voiceCheck(student, sesion.id, card.id, { audioBase64: silencio.toString('base64') });

      expect(r).toMatchObject({ accepted: false, heard: false, canRetry: true });
      expect((await sessions.findById(sesion.id))!.voiceChecks).toHaveLength(0);
    });
  });

  describe('complete', () => {
    it('paga estrellas y accesorio al dominar, y no vuelve a pagar el mismo nivel', async () => {
      const student = await alumno();
      const card = await palabra();

      const sesion = await sesionArmada(student, card);
      await practice.voiceCheck(student, sesion.id, card.id, { transcript: card.voiceTarget });
      const primera = await practice.complete(student, sesion.id);

      expect(primera).toMatchObject({ cardsSolved: 1, cardsTotal: 1, sessionsCompleted: 1, totalStars: 3 });
      expect(primera.outcome).toMatchObject({ accuracy: 1, mastered: true, masteredNow: true, starsAwarded: 3 });
      expect(primera.accessory).not.toBeNull();
      expect(primera.session.status).toBe(SessionStatus.COMPLETED);
      expect((await students.findById(student.id))!.stars).toBe(3);

      const actualizado = (await students.findById(student.id))!;
      const otra = await sesionArmada(actualizado, card);
      await practice.voiceCheck(actualizado, otra.id, card.id, { transcript: card.voiceTarget });
      const segunda = await practice.complete(actualizado, otra.id);

      expect(segunda.outcome).toMatchObject({ mastered: true, masteredNow: false, starsAwarded: 0 });
      expect(segunda).toMatchObject({ totalStars: 3, accessory: null, sessionsCompleted: 2 });
    });

    it('no deja cerrar dos veces la misma sesión', async () => {
      const student = await alumno();
      const card = await palabra();
      const sesion = await sesionArmada(student, card);
      await practice.voiceCheck(student, sesion.id, card.id, { transcript: card.voiceTarget });
      await practice.complete(student, sesion.id);

      await expect(practice.complete(student, sesion.id)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
