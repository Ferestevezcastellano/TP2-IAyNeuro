import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { CoreModule } from './core/core.module';
import { PersistenceModule } from './persistence/persistence.module';
import { SeedModule } from './seed/seed.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PracticeModule } from './modules/practice/practice.module';
import { ReviewModule } from './modules/review/review.module';
import { SpeechModule } from './modules/speech/speech.module';
import { StudentModule } from './modules/student/student.module';
import { TeacherModule } from './modules/teacher/teacher.module';

@Module({
  imports: [
    // Infraestructura: almacenamiento, servicios de dominio, guards, reconocedor de voz.
    PersistenceModule,
    CoreModule,
    CommonModule,
    SpeechModule,
    SeedModule,
    // Funcionalidad, un modulo por seccion de la app.
    CatalogModule,
    OnboardingModule,
    StudentModule,
    PracticeModule,
    ReviewModule,
    TeacherModule,
  ],
})
export class AppModule {}
