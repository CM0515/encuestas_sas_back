import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('questions')
@ApiBearerAuth()
@Controller('questions')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva pregunta' })
  @ApiResponse({
    status: 201,
    description: 'Pregunta creada correctamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o campos faltantes.',
  })
  create(
    @Body() createQuestionDto: CreateQuestionDto,
    @CurrentUser('uid') userId: string,
  ) {
    return this.questionsService.create(createQuestionDto, userId);
  }

  @Public()
  @Get('survey/:surveyId')
  @ApiOperation({ summary: 'Obtener todas las preguntas de una encuesta' })
  @ApiParam({ name: 'surveyId', description: 'ID de la encuesta' })
  @ApiResponse({
    status: 200,
    description: 'Preguntas obtenidas correctamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Encuesta no encontrada.',
  })
  findBySurvey(@Param('surveyId') surveyId: string) {
    return this.questionsService.findBySurvey(surveyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una pregunta por su ID' })
  @ApiParam({ name: 'id', description: 'ID de la pregunta' })
  @ApiResponse({
    status: 200,
    description: 'Pregunta encontrada correctamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Pregunta no encontrada.',
  })
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una pregunta existente' })
  @ApiParam({ name: 'id', description: 'ID de la pregunta a actualizar' })
  @ApiResponse({
    status: 200,
    description: 'Pregunta actualizada correctamente.',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado para modificar esta pregunta.',
  })
  update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @CurrentUser('uid') userId: string,
  ) {
    return this.questionsService.update(id, updateQuestionDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una pregunta' })
  @ApiParam({ name: 'id', description: 'ID de la pregunta a eliminar' })
  @ApiResponse({
    status: 200,
    description: 'Pregunta eliminada correctamente.',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado para eliminar esta pregunta.',
  })
  remove(@Param('id') id: string, @CurrentUser('uid') userId: string) {
    return this.questionsService.remove(id, userId);
  }
}
