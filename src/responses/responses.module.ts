import { Module } from '@nestjs/common';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';
import { SurveysModule } from '../surveys/surveys.module';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [SurveysModule, QuestionsModule],
  controllers: [ResponsesController],
  providers: [ResponsesService],
  exports: [ResponsesService],
})
export class ResponsesModule {}
