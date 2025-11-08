import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateResponseDto {
  @IsString()
  @IsNotEmpty()
  surveyId: string;

  @IsObject()
  @IsNotEmpty()
  answers: Record<string, any>;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  ip?: string;
}
