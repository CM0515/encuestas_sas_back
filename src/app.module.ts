import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { SurveysModule } from './surveys/surveys.module';
import { QuestionsModule } from './questions/questions.module';
import { ResponsesModule } from './responses/responses.module';
import { AnalyticsModule } from './analytics/analytics.module';

// Shared modules
import { FirebaseModule } from './shared/firebase/firebase.module';
import { CacheModule } from './shared/cache/cache.module';
import { EmailModule } from './shared/email/email.module';
import { RealtimeModule } from './shared/realtime/realtime.module';
import { StorageModule } from './shared/storage/storage.module';

// Config
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { firebaseConfig } from './config/firebase.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, firebaseConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Shared modules
    FirebaseModule,
    CacheModule,
    EmailModule,
    RealtimeModule,
    StorageModule,

    // Feature modules
    AuthModule,
    SurveysModule,
    QuestionsModule,
    ResponsesModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
