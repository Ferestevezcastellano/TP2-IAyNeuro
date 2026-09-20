import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AccessSubjectType, Student } from '../../core/domain';
import { AccessTokenRepository, StudentRepository } from '../../core/ports';
import { STUDENT_TOKEN_HEADER } from '../auth.constants';

export interface RequestWithStudent extends Request {
  student?: Student;
}

/**
 * Resuelve el token opaco del alumno. Reemplaza al login: no hay contrasena que
 * un chico de seis anos deba recordar, solo un token que el dispositivo guarda.
 */
@Injectable()
export class StudentGuard implements CanActivate {
  constructor(
    private readonly tokens: AccessTokenRepository,
    private readonly students: StudentRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithStudent>();
    const raw = request.headers[STUDENT_TOKEN_HEADER];
    const token = Array.isArray(raw) ? raw[0] : raw;

    if (!token) {
      throw new UnauthorizedException(`Falta el header ${STUDENT_TOKEN_HEADER}.`);
    }

    const access = await this.tokens.resolve(token);
    if (!access || access.subjectType !== AccessSubjectType.STUDENT) {
      throw new UnauthorizedException('Token de alumno invalido.');
    }

    const student = await this.students.findById(access.subjectId);
    if (!student) {
      throw new UnauthorizedException('El alumno del token ya no existe.');
    }

    request.student = student;
    return true;
  }
}
