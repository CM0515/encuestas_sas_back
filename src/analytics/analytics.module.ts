import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { SurveysModule } from '../surveys/surveys.module';
import { QuestionsModule } from '../questions/questions.module';
import { ResponsesModule } from '../responses/responses.module';

@Module({
  imports: [SurveysModule, QuestionsModule, ResponsesModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
