import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Student } from '../../core/domain';
import { RequestWithStudent } from '../guards/student.guard';

/** Alumno resuelto por StudentGuard. */
export const CurrentStudent = createParamDecorator((_data: unknown, context: ExecutionContext): Student => {
  const request = context.switchToHttp().getRequest<RequestWithStudent>();
  return request.student as Student;
});
