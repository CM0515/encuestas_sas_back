import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsObject,
} from 'class-validator';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  MULTIPLE_SELECTION = 'multiple_selection',
  YES_NO = 'yes_no',
  TEXT = 'text',
  SCALE = 'scale',
  DATE = 'date',
}

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  surveyId: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsArray()
  @IsOptional()
  options?: string[];

  @IsBoolean()
  required: boolean;

  @IsNumber()
  order: number;

  @IsObject()
  @IsOptional()
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}
