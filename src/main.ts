import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import express from 'express';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Express instance for Vercel
const server = express();

export const createNestServer = async (expressInstance: express.Express) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3000/',
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      // Allow all Vercel preview and production deployments
      const isVercelDomain = origin.includes('.vercel.app');
      const isAllowedOrigin = allowedOrigins.some(allowed => origin.startsWith(allowed));

      if (isVercelDomain || isAllowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Survey SaaS API')
    .setDescription('API documentation for Survey SaaS Platform')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('surveys', 'Survey management endpoints')
    .addTag('questions', 'Question management endpoints')
    .addTag('responses', 'Response management endpoints')
    .addTag('analytics', 'Analytics and reporting endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Survey SaaS API Docs',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  await app.init();
  return app;
};

// Initialize for Vercel
if (process.env.NODE_ENV !== 'production') {
  // Local development
  createNestServer(server)
    .then(() => {
      const port = process.env.PORT || 3001;
      server.listen(port, () => {
        console.log(`🚀 Server running on http://localhost:${port}/api`);
      });
    })
    .catch((err) => {
      console.error('Error starting server:', err);
    });
} else {
  // Vercel serverless
  createNestServer(server);
}

// Export for Vercel
export default server;
