import { Global, Module } from '@nestjs/common';
import { StudentGuard } from './guards/student.guard';
import { TeacherGuard } from './guards/teacher.guard';

/** Guards compartidos. Los repositorios que necesitan llegan del PersistenceModule. */
@Global()
@Module({
  providers: [StudentGuard, TeacherGuard],
  exports: [StudentGuard, TeacherGuard],
})
export class CommonModule {}
