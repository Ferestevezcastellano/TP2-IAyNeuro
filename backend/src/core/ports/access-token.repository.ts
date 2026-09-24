import { AccessSubjectType, AccessToken } from '../domain';

/**
 * Sustituto del login. Emite y resuelve tokens opacos para alumnos y docentes.
 */
export abstract class AccessTokenRepository {
  abstract issue(subjectType: AccessSubjectType, subjectId: string): Promise<AccessToken>;
  abstract resolve(token: string): Promise<AccessToken | null>;
}
