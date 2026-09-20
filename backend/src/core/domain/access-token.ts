export enum AccessSubjectType {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
}

/**
 * Token opaco. Reemplaza al login: no hay usuario ni contrasena, solo un
 * identificador que el cliente guarda y devuelve en un header.
 */
export interface AccessToken {
  token: string;
  subjectType: AccessSubjectType;
  subjectId: string;
  issuedAt: Date;
}
