import { Global, Module } from '@nestjs/common';
import { MASTERY_CONFIG, MASTERY_CONFIG_TOKEN } from './config/mastery.config';
import {
  FeedbackService,
  LevelAccessService,
  MasteryService,
  PhoneticNormalizerService,
  RewardService,
  SessionDeckService,
  SessionScoringService,
  WordAssemblyValidator,
} from './services';

const services = [
  FeedbackService,
  LevelAccessService,
  MasteryService,
  PhoneticNormalizerService,
  RewardService,
  SessionDeckService,
  SessionScoringService,
  WordAssemblyValidator,
];

/**
 * Servicios de dominio. No conocen HTTP ni el almacenamiento: reciben entidades
 * y devuelven entidades, que es lo que los hace testeables sin levantar nada.
 */
/** La regla de dominio, una sola para todo el sistema. Los tests la reemplazan aca. */
const masteryConfig = { provide: MASTERY_CONFIG_TOKEN, useValue: MASTERY_CONFIG };

@Global()
@Module({
  providers: [...services, masteryConfig],
  exports: [...services, masteryConfig],
})
export class CoreModule {}
