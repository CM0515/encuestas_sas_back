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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('surveys')
@Controller('surveys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new survey' })
  @ApiResponse({ status: 201, description: 'Survey created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createSurveyDto: CreateSurveyDto,
    @CurrentUser('uid') userId: string,
  ) {
    return this.surveysService.create(createSurveyDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all surveys for current user' })
  @ApiResponse({ status: 200, description: 'Returns list of surveys' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser('uid') userId: string, @Query() filters: any) {
    return this.surveysService.findAll(userId, filters);
  }

  @Public()
  @Get(':id/public')
  @ApiOperation({ summary: 'Get public survey information (no auth required)' })
  @ApiParam({ name: 'id', description: 'Survey ID' })
  @ApiResponse({ status: 200, description: 'Returns public survey data' })
  @ApiResponse({ status: 404, description: 'Survey not found or inactive' })
  getPublicSurvey(@Param('id') id: string) {
    return this.surveysService.getPublicSurvey(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get survey by ID' })
  @ApiParam({ name: 'id', description: 'Survey ID' })
  @ApiResponse({ status: 200, description: 'Returns survey details' })
  @ApiResponse({ status: 404, description: 'Survey not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string, @CurrentUser('uid') userId: string) {
    return this.surveysService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update survey' })
  @ApiParam({ name: 'id', description: 'Survey ID' })
  @ApiResponse({ status: 200, description: 'Survey updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not survey owner' })
  @ApiResponse({ status: 404, description: 'Survey not found' })
  update(
    @Param('id') id: string,
    @Body() updateSurveyDto: UpdateSurveyDto,
    @CurrentUser('uid') userId: string,
  ) {
    return this.surveysService.update(id, updateSurveyDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete survey (soft delete)' })
  @ApiParam({ name: 'id', description: 'Survey ID' })
  @ApiResponse({ status: 200, description: 'Survey deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not survey owner' })
  @ApiResponse({ status: 404, description: 'Survey not found' })
  remove(@Param('id') id: string, @CurrentUser('uid') userId: string) {
    return this.surveysService.remove(id, userId);
  }
}
