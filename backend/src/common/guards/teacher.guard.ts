import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AccessSubjectType, SchoolClass } from '../../core/domain';
import { AccessTokenRepository, ClassRepository } from '../../core/ports';
import { TEACHER_TOKEN_HEADER } from '../auth.constants';

export interface RequestWithTeacher extends Request {
  schoolClass?: SchoolClass;
}

/**
 * Resuelve el token de la docente. El sujeto del token es el curso: la docente
 * no es un usuario del sistema sino quien tiene el codigo de su propio curso.
 */
@Injectable()
export class TeacherGuard implements CanActivate {
  constructor(
    private readonly tokens: AccessTokenRepository,
    private readonly classes: ClassRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTeacher>();
    const raw = request.headers[TEACHER_TOKEN_HEADER];
    const token = Array.isArray(raw) ? raw[0] : raw;

    if (!token) {
      throw new UnauthorizedException(`Falta el header ${TEACHER_TOKEN_HEADER}.`);
    }

    const access = await this.tokens.resolve(token);
    if (!access || access.subjectType !== AccessSubjectType.TEACHER) {
      throw new UnauthorizedException('Token de docente invalido.');
    }

    const schoolClass = await this.classes.findById(access.subjectId);
    if (!schoolClass) {
      throw new UnauthorizedException('El curso del token ya no existe.');
    }

    request.schoolClass = schoolClass;
    return true;
  }
}
