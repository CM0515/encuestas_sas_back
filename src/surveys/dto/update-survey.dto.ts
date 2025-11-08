import { PartialType } from '@nestjs/mapped-types';
import { CreateSurveyDto } from './create-survey.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSurveyDto extends PartialType(CreateSurveyDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
