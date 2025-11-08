import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FirebaseService } from '../shared/firebase/firebase.service';
import { CacheService } from '../shared/cache/cache.service';
import { SurveysService } from '../surveys/surveys.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);
  private readonly collection = 'questions';

  constructor(
    private firebaseService: FirebaseService,
    private cacheService: CacheService,
    private surveysService: SurveysService,
  ) {}

  async create(createQuestionDto: CreateQuestionDto, userId: string) {
    // Verify survey exists and user owns it
    const survey: any = await this.surveysService.findOne(createQuestionDto.surveyId);
    if (survey.createdBy !== userId) {
      throw new ForbiddenException('You do not own this survey');
    }

    // Validate question based on type
    this.validateQuestion(createQuestionDto);

    const question = {
      ...createQuestionDto,
      createdAt: this.firebaseService.serverTimestamp(),
    };

    const docRef = await this.firebaseService.firestore
      .collection(this.collection)
      .add(question);

    this.logger.log(`Question created: ${docRef.id} for survey ${createQuestionDto.surveyId}`);

    // Invalidate cache
    await this.cacheService.del(`questions:${createQuestionDto.surveyId}`);

    return {
      id: docRef.id,
      ...question,
      createdAt: new Date(),
    };
  }

  async findBySurvey(surveyId: string) {
    const cacheKey = `questions:${surveyId}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      this.logger.log(`Cache hit for questions: ${surveyId}`);
      return cached;
    }

    const snapshot = await this.firebaseService.firestore
      .collection(this.collection)
      .where('surveyId', '==', surveyId)
      .get();

    let questions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by order in memory to avoid index requirement
    questions.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, questions, 300);

    return questions;
  }

  async findOne(id: string) {
    const docRef = this.firebaseService.firestore
      .collection(this.collection)
      .doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  }

  async update(id: string, updateQuestionDto: UpdateQuestionDto, userId: string) {
    const question: any = await this.findOne(id);

    // Verify user owns the survey
    const survey: any = await this.surveysService.findOne(question.surveyId);
    if (survey.createdBy !== userId) {
      throw new ForbiddenException('You do not own this survey');
    }

    // Validate if updating type or options
    if (updateQuestionDto.type || updateQuestionDto.options) {
      this.validateQuestion({ ...question, ...updateQuestionDto } as any);
    }

    const docRef = this.firebaseService.firestore
      .collection(this.collection)
      .doc(id);

    const updateData = {
      ...updateQuestionDto,
      updatedAt: this.firebaseService.serverTimestamp(),
    };

    await docRef.update(updateData);

    this.logger.log(`Question updated: ${id}`);

    // Invalidate cache
    await this.cacheService.del(`questions:${question.surveyId}`);

    return {
      id,
      ...question,
      ...updateData,
      updatedAt: new Date(),
    };
  }

  async remove(id: string, userId: string) {
    const question: any = await this.findOne(id);

    // Verify user owns the survey
    const survey: any = await this.surveysService.findOne(question.surveyId);
    if (survey.createdBy !== userId) {
      throw new ForbiddenException('You do not own this survey');
    }

    await this.firebaseService.firestore
      .collection(this.collection)
      .doc(id)
      .delete();

    this.logger.log(`Question deleted: ${id}`);

    // Invalidate cache
    await this.cacheService.del(`questions:${question.surveyId}`);

    return { message: 'Question deleted successfully' };
  }

  private validateQuestion(question: CreateQuestionDto) {
    switch (question.type) {
      case 'multiple_choice':
        if (!question.options || question.options.length < 2) {
          throw new BadRequestException(
            'Multiple choice questions must have at least 2 options',
          );
        }
        break;
      case 'scale':
        if (!question.validation?.min || !question.validation?.max) {
          throw new BadRequestException(
            'Scale questions must have min and max values',
          );
        }
        if (question.validation.min >= question.validation.max) {
          throw new BadRequestException(
            'Min value must be less than max value',
          );
        }
        break;
    }
  }
}
