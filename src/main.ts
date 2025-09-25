import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { LoggingInterceptor } from 'src/core/observability/logging.interceptor';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { ConfigService } from 'src/core/config/config.service';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from 'src/core/errors/error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Validation across the app
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const appLogger = app.get(AppLogger);
  app.useLogger(appLogger);
  app.useGlobalInterceptors(new LoggingInterceptor(appLogger));

  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Version Control System Repository Scorer')
    .setDescription(
      'API documentation for Version Control System Repository Scorer',
    )
    .setVersion('1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
    useGlobalPrefix: false, // serve at /docs even with global prefix
  });

  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = config.get<number>('server.port');
  await app.listen(port);
  appLogger.log(`🚀 Server listening on ${port}`);
}

bootstrap();
