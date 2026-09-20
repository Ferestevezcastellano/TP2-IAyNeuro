import { Injectable } from '@nestjs/common';
import {
  AccessToken,
  Accessory,
  Card,
  Level,
  LevelProgress,
  PetSpecies,
  PracticeSession,
  SchoolClass,
  Student,
} from '../../core/domain';

/**
 * Todo el estado del MVP, en Maps.
 *
 * Se pierde al reiniciar el proceso, y eso es aceptable para la demo. Lo que no
 * era aceptable era que la logica de negocio supiera de estos Maps: por eso
 * nadie fuera de `persistence/in-memory` toca esta clase.
 */
@Injectable()
export class InMemoryStore {
  readonly classes = new Map<string, SchoolClass>();
  readonly students = new Map<string, Student>();
  readonly levels = new Map<string, Level>();
  readonly cards = new Map<string, Card>();
  readonly sessions = new Map<string, PracticeSession>();
  readonly progress = new Map<string, LevelProgress>();
  readonly accessories = new Map<string, Accessory>();
  readonly pets = new Map<string, PetSpecies>();
  readonly tokens = new Map<string, AccessToken>();

  progressKey(studentId: string, levelId: string): string {
    return `${studentId}::${levelId}`;
  }

  clear(): void {
    this.classes.clear();
    this.students.clear();
    this.levels.clear();
    this.cards.clear();
    this.sessions.clear();
    this.progress.clear();
    this.accessories.clear();
    this.pets.clear();
    this.tokens.clear();
  }
}

/**
 * Copia profunda al entrar y al salir del store, para que un objeto devuelto no
 * sea el mismo que quedo guardado. Sin esto, mutar la respuesta de un repositorio
 * modificaria el "disco" y el codigo funcionaria en memoria pero no contra una base.
 */
export function detach<T>(value: T): T {
  return structuredClone(value);
}
