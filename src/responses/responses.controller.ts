import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ResponsesService } from './responses.service';
import { CreateResponseDto } from './dto/create-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('responses')
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  @Public()
  @Post()
  create(@Body() createResponseDto: CreateResponseDto, @Req() req: any) {
    // Add metadata
    createResponseDto.userAgent = req.headers['user-agent'];
    createResponseDto.ip = req.ip;
    
    return this.responsesService.create(createResponseDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('survey/:surveyId')
  findBySurvey(
    @Param('surveyId') surveyId: string,
    @CurrentUser('uid') userId: string,
  ) {
    return this.responsesService.findBySurvey(surveyId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('uid') userId: string) {
    return this.responsesService.findOne(id, userId);
  }
}
