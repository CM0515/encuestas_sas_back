import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';

export class SurveySettingsDto {
  @IsBoolean()
  @IsOptional()
  allowAnonymous?: boolean;

  @IsBoolean()
  @IsOptional()
  allowMultipleResponses?: boolean;

  @IsBoolean()
  @IsOptional()
  showResults?: boolean;

  @IsBoolean()
  @IsOptional()
  requireLogin?: boolean;

  @IsOptional()
  expiresAt?: Date;
}

export class CreateSurveyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsObject()
  @IsOptional()
  settings?: SurveySettingsDto;
}
