import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  UseGuards 
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('analytics')
@ApiBearerAuth() // Indica que usa autenticación JWT (Bearer token)
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('surveys/:surveyId/results')
  @ApiOperation({
    summary: 'Obtener resultados de una encuesta',
    description: 'Devuelve los resultados analíticos de una encuesta específica perteneciente al usuario autenticado.',
  })
  @ApiParam({
    name: 'surveyId',
    description: 'ID de la encuesta cuyos resultados se desean obtener',
    type: String,
    example: 'abc123xyz',
  })
  @ApiResponse({ status: 200, description: 'Resultados obtenidos correctamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado. Token inválido o ausente.' })
  @ApiResponse({ status: 404, description: 'Encuesta no encontrada o sin resultados.' })
  getResults(
    @Param('surveyId') surveyId: string,
    @CurrentUser('uid') userId: string,
  ) {
    return this.analyticsService.getResults(surveyId, userId);
  }

  @Post('surveys/:surveyId/export')
  @ApiOperation({
    summary: 'Exportar resultados a CSV',
    description: 'Exporta los resultados de una encuesta a un archivo CSV y lo envía al correo del usuario.',
  })
  @ApiParam({
    name: 'surveyId',
    description: 'ID de la encuesta que se desea exportar a CSV',
    type: String,
    example: 'abc123xyz',
  })
  @ApiResponse({ status: 201, description: 'Exportación iniciada correctamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado. Token inválido o ausente.' })
  @ApiResponse({ status: 404, description: 'Encuesta no encontrada o sin permisos.' })
  exportToCSV(
    @Param('surveyId') surveyId: string,
    @CurrentUser('uid') userId: string,
    @CurrentUser('email') userEmail: string,
  ) {
    return this.analyticsService.exportToCSV(surveyId, userId, userEmail);
  }
}
