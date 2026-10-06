import { Test } from '@nestjs/testing';
import { MASTERY_CONFIG, MASTERY_CONFIG_TOKEN } from '../../core/config/mastery.config';
import { CoreModule } from '../../core/core.module';
import { FeedbackService, FeedbackTone, MasteryService } from '../../core/services';
import { PersistenceModule } from '../../persistence/persistence.module';
import { SpeechModule } from '../speech/speech.module';
import { CatalogModule } from './catalog.module';
import { CatalogService } from './catalog.service';

/**
 * El umbral de dominio es uno solo: lo que el catálogo le informa al cliente es
 * lo que aplican el dominio y la mascota al cerrar la sesión. Antes la mascota
 * tenía su propio 0.8 escrito y el catálogo leía la constante, así que cambiar
 * la regla dejaba a cada uno con un número distinto.
 */
describe('regla de dominio', () => {
  async function conUmbral(threshold: number) {
    const app = await Test.createTestingModule({ imports: [PersistenceModule, CoreModule, SpeechModule, CatalogModule] })
      .overrideProvider(MASTERY_CONFIG_TOKEN)
      .useValue({ ...MASTERY_CONFIG, threshold })
      .compile();
    return {
      catalogo: app.get(CatalogService),
      dominio: app.get(MasteryService),
      mascota: app.get(FeedbackService),
    };
  }

  it('el catálogo informa la regla que está en uso, no la constante', async () => {
    const { catalogo } = await conUmbral(0.9);
    expect(catalogo.masteryRules().threshold).toBe(0.9);
  });

  it('el dominio y la mascota usan el mismo umbral que informa el catálogo', async () => {
    const { dominio, mascota } = await conUmbral(0.9);

    // 85 % no llega a 0.9: ni domina el nivel ni la mascota lo festeja como "muy bien".
    const { masteredNow } = dominio.register(dominio.empty('alumno', 'nivel', 1), 0.85);
    expect(masteredNow).toBe(false);
    expect(mascota.forSessionEnd(0.85, false, false, 1).tone).toBe(FeedbackTone.ENCOURAGE);

    expect(mascota.forSessionEnd(0.95, false, false, 1).tone).toBe(FeedbackTone.CELEBRATE);
  });
});
