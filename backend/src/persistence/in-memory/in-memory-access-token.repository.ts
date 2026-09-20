import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessSubjectType, AccessToken } from '../../core/domain';
import { AccessTokenRepository } from '../../core/ports';
import { detach, InMemoryStore } from './in-memory.store';

@Injectable()
export class InMemoryAccessTokenRepository extends AccessTokenRepository {
  constructor(private readonly store: InMemoryStore) {
    super();
  }

  async issue(subjectType: AccessSubjectType, subjectId: string): Promise<AccessToken> {
    const token: AccessToken = {
      token: `${subjectType === AccessSubjectType.STUDENT ? 'stu' : 'tea'}_${randomUUID()}`,
      subjectType,
      subjectId,
      issuedAt: new Date(),
    };
    this.store.tokens.set(token.token, detach(token));
    return detach(token);
  }

  async resolve(token: string): Promise<AccessToken | null> {
    const found = this.store.tokens.get(token.trim());
    return found ? detach(found) : null;
  }
}
