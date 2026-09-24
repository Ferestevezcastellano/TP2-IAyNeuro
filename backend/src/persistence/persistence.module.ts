import { Global, Module } from '@nestjs/common';
import {
  AccessTokenRepository,
  AccessoryRepository,
  CardRepository,
  ClassRepository,
  LevelRepository,
  PetRepository,
  ProgressRepository,
  SessionRepository,
  StudentRepository,
} from '../core/ports';
import { InMemoryAccessTokenRepository } from './in-memory/in-memory-access-token.repository';
import { InMemoryAccessoryRepository } from './in-memory/in-memory-accessory.repository';
import { InMemoryCardRepository } from './in-memory/in-memory-card.repository';
import { InMemoryClassRepository } from './in-memory/in-memory-class.repository';
import { InMemoryLevelRepository } from './in-memory/in-memory-level.repository';
import { InMemoryPetRepository } from './in-memory/in-memory-pet.repository';
import { InMemoryProgressRepository } from './in-memory/in-memory-progress.repository';
import { InMemorySessionRepository } from './in-memory/in-memory-session.repository';
import { InMemoryStore } from './in-memory/in-memory.store';
import { InMemoryStudentRepository } from './in-memory/in-memory-student.repository';

/**
 * Unico punto donde se elige el almacenamiento.
 *
 * Migrar a una base real es escribir `persistence/typeorm/` con las mismas nueve
 * clases y cambiar aca los `useClass`. Ningun servicio de negocio se entera,
 * porque todos dependen de las clases abstractas de `core/ports`.
 */
@Global()
@Module({
  providers: [
    InMemoryStore,
    { provide: ClassRepository, useClass: InMemoryClassRepository },
    { provide: StudentRepository, useClass: InMemoryStudentRepository },
    { provide: LevelRepository, useClass: InMemoryLevelRepository },
    { provide: CardRepository, useClass: InMemoryCardRepository },
    { provide: SessionRepository, useClass: InMemorySessionRepository },
    { provide: ProgressRepository, useClass: InMemoryProgressRepository },
    { provide: AccessoryRepository, useClass: InMemoryAccessoryRepository },
    { provide: PetRepository, useClass: InMemoryPetRepository },
    { provide: AccessTokenRepository, useClass: InMemoryAccessTokenRepository },
  ],
  exports: [
    InMemoryStore,
    ClassRepository,
    StudentRepository,
    LevelRepository,
    CardRepository,
    SessionRepository,
    ProgressRepository,
    AccessoryRepository,
    PetRepository,
    AccessTokenRepository,
  ],
})
export class PersistenceModule {}
