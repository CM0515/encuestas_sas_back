import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ResponsesService } from './responses.service';
import { CreateResponseDto } from './dto/create-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('responses')
@Controller('responses')
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Crear una nueva respuesta a una encuesta' })
  @ApiResponse({ status: 201, description: 'Respuesta creada correctamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  create(@Body() createResponseDto: CreateResponseDto, @Req() req: any) {
    createResponseDto.userAgent = req.headers['user-agent'];
    createResponseDto.ip = req.ip;
    return this.responsesService.create(createResponseDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('survey/:surveyId')
  @ApiOperation({ summary: 'Obtener respuestas por encuesta' })
  @ApiParam({ name: 'surveyId', description: 'ID de la encuesta' })
  @ApiResponse({ status: 200, description: 'Lista de respuestas obtenida.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  findBySurvey(
    @Param('surveyId') surveyId: string,
    @CurrentUser('uid') userId: string,
  ) {
    return this.responsesService.findBySurvey(surveyId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una respuesta específica por ID' })
  @ApiParam({ name: 'id', description: 'ID de la respuesta' })
  @ApiResponse({ status: 200, description: 'Respuesta encontrada.' })
  @ApiResponse({ status: 404, description: 'Respuesta no encontrada.' })
  findOne(@Param('id') id: string, @CurrentUser('uid') userId: string) {
    return this.responsesService.findOne(id, userId);
  }
}
