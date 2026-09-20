import { Module } from '@nestjs/common';
import { StudentModule } from '../student/student.module';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';

@Module({
  imports: [StudentModule],
  controllers: [PracticeController],
  providers: [PracticeService],
})
export class PracticeModule {}
