import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('questions')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  create(
    @Body() createQuestionDto: CreateQuestionDto,
    @CurrentUser('uid') userId: string,
  ) {
    return this.questionsService.create(createQuestionDto, userId);
  }

  @Public()
  @Get('survey/:surveyId')
  findBySurvey(@Param('surveyId') surveyId: string) {
    return this.questionsService.findBySurvey(surveyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @CurrentUser('uid') userId: string,
  ) {
    return this.questionsService.update(id, updateQuestionDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('uid') userId: string) {
    return this.questionsService.remove(id, userId);
  }
}
