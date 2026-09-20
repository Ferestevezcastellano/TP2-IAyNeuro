import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { STUDENT_AUTH, STUDENT_TOKEN_HEADER, TEACHER_AUTH, TEACHER_TOKEN_HEADER } from './common/auth.constants';

/**
 * Documenta el contrato en /docs. Los dos esquemas de seguridad quedan
 * declarados para que el boton Authorize alcance para recorrer toda la demo
 * desde el navegador, sin curl y sin frontend.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('AMI — API')
    .setDescription(
      [
        'Backend de AMI, practica diaria de conciencia fonologica para primer grado.',
        '',
        '**Como se identifica cada uno.** No hay usuario ni contrasena. El chico canjea',
        'codigo de clase mas mascota por un token en `POST /onboarding/students` y lo manda',
        `en el header \`${STUDENT_TOKEN_HEADER}\`. La docente canjea el codigo de su curso en`,
        `\`POST /teacher/session\` y usa \`${TEACHER_TOKEN_HEADER}\`.`,
        '',
        'Los dos tokens se emiten en el momento, asi que no hay ninguno valido de antemano:',
        'para probar desde aca hay que ejecutar primero el endpoint que lo emite, copiar el token',
        'de la respuesta y recien despues pegarlo en **Authorize**. Los valores de ejemplo que',
        'muestran los esquemas son ilustrativos y devuelven 401.',
        '',
        '**Como se avanza.** Un nivel queda dominado por el promedio movil de las ultimas',
        'sesiones, no por acertar una vez (ver `GET /catalog/mastery-rules`). El nivel',
        'siguiente ademas necesita que la docente lo haya habilitado para el curso.',
        '',
        '**Estado en memoria.** Se reinicia con el servidor y el contenido se recarga solo.',
      ].join('\n'),
    )
    .setVersion('0.1.0')
    .addApiKey({ type: 'apiKey', name: STUDENT_TOKEN_HEADER, in: 'header' }, STUDENT_AUTH)
    .addApiKey({ type: 'apiKey', name: TEACHER_TOKEN_HEADER, in: 'header' }, TEACHER_AUTH)
    .addTag('Catalogo', 'Contenido que no depende de ningun alumno.')
    .addTag('Onboarding', 'Codigo de clase y eleccion de mascota.')
    .addTag('Alumno', 'Pantalla inicial, niveles y personalizacion de la mascota.')
    .addTag('Sesion de practica', 'Tarjetas, armado por botones y verificacion por voz.')
    .addTag('Repaso', 'Practica libre sobre lo ya dominado.')
    .addTag('Panel docente', 'Progreso del curso y habilitacion de niveles.')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha' },
    customSiteTitle: 'AMI — API',
  });
}
