import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // El frontend se desarrolla aparte y se sirve desde otro origen.
  app.enableCors({ origin: true });

  // El audio en base64 pesa mas que un JSON tipico.
  app.use(require('express').json({ limit: '10mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  setupSwagger(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  const logger = new Logger('AMI');
  logger.log(`API escuchando en http://localhost:${port}`);
  logger.log(`Documentacion en http://localhost:${port}/docs`);
  logger.log(`Reconocedor de voz: ${process.env.AMI_SPEECH_PROVIDER ?? 'stub'}`);
}

void bootstrap();
