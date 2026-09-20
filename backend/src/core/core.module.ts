import { Global, Module } from '@nestjs/common';
import {
  FeedbackService,
  LevelAccessService,
  MasteryService,
  PhoneticNormalizerService,
  RewardService,
  SessionScoringService,
  WordAssemblyValidator,
} from './services';

const services = [
  FeedbackService,
  LevelAccessService,
  MasteryService,
  PhoneticNormalizerService,
  RewardService,
  SessionScoringService,
  WordAssemblyValidator,
];

/**
 * Servicios de dominio. No conocen HTTP ni el almacenamiento: reciben entidades
 * y devuelven entidades, que es lo que los hace testeables sin levantar nada.
 */
@Global()
@Module({
  providers: services,
  exports: services,
})
export class CoreModule {}
