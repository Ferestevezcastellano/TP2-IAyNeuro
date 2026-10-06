import { Module } from '@nestjs/common';
import { StudentModule } from '../student/student.module';
import { CierreDeSesionService } from './cierre-de-sesion.service';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';

@Module({
  imports: [StudentModule],
  controllers: [PracticeController],
  providers: [PracticeService, CierreDeSesionService],
})
export class PracticeModule {}
