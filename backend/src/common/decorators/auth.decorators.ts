import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { STUDENT_AUTH, TEACHER_AUTH } from '../auth.constants';
import { StudentGuard } from '../guards/student.guard';
import { TeacherGuard } from '../guards/teacher.guard';

/** Endpoint que exige token de alumno, ya documentado en Swagger. */
export function StudentAuth() {
  return applyDecorators(
    UseGuards(StudentGuard),
    ApiSecurity(STUDENT_AUTH),
    ApiUnauthorizedResponse({ description: 'Token de alumno ausente o invalido.' }),
  );
}

/** Endpoint que exige token de docente, ya documentado en Swagger. */
export function TeacherAuth() {
  return applyDecorators(
    UseGuards(TeacherGuard),
    ApiSecurity(TEACHER_AUTH),
    ApiUnauthorizedResponse({ description: 'Token de docente ausente o invalido.' }),
  );
}
