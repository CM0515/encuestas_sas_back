import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('surveys/:surveyId/results')
  getResults(
    @Param('surveyId') surveyId: string,
    @CurrentUser('uid') userId: string,
  ) {
    return this.analyticsService.getResults(surveyId, userId);
  }

  @Post('surveys/:surveyId/export')
  exportToCSV(
    @Param('surveyId') surveyId: string,
    @CurrentUser('uid') userId: string,
    @CurrentUser('email') userEmail: string,
  ) {
    return this.analyticsService.exportToCSV(surveyId, userId, userEmail);
  }
}
