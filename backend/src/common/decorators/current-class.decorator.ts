import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SchoolClass } from '../../core/domain';
import { RequestWithTeacher } from '../guards/teacher.guard';

/** Curso resuelto por TeacherGuard. */
export const CurrentClass = createParamDecorator((_data: unknown, context: ExecutionContext): SchoolClass => {
  const request = context.switchToHttp().getRequest<RequestWithTeacher>();
  return request.schoolClass as SchoolClass;
});
