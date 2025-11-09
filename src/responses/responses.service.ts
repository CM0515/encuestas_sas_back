import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { FirebaseService } from '../shared/firebase/firebase.service';
import { CacheService } from '../shared/cache/cache.service';
import { RealtimeService } from '../shared/realtime/realtime.service';
import { SurveysService } from '../surveys/surveys.service';
import { QuestionsService } from '../questions/questions.service';
import { CreateResponseDto } from './dto/create-response.dto';

@Injectable()
export class ResponsesService {
  private readonly logger = new Logger(ResponsesService.name);
  private readonly collection = 'responses';

  constructor(
    private firebaseService: FirebaseService,
    private cacheService: CacheService,
    private realtimeService: RealtimeService,
    private surveysService: SurveysService,
    private questionsService: QuestionsService,
  ) {}

  async create(createResponseDto: CreateResponseDto, userId?: string) {
    // Validate survey is active and accessible
    const survey = await this.surveysService.getPublicSurvey(
      createResponseDto.surveyId,
    );

    // Validate response
    await this.validateResponse(createResponseDto);

    const response = {
      surveyId: createResponseDto.surveyId,
      userId: userId || null,
      answers: createResponseDto.answers,
      submittedAt: this.firebaseService.serverTimestamp(),
      metadata: {
        userAgent: createResponseDto.userAgent,
        ip: createResponseDto.ip,
      },
    };

    const docRef = await this.firebaseService.firestore
      .collection(this.collection)
      .add(response);

    this.logger.log(`Response created: ${docRef.id} for survey ${createResponseDto.surveyId}`);

    // Increment survey response count
    await this.surveysService.incrementResponseCount(createResponseDto.surveyId);

    // Invalidate analytics cache
    await this.cacheService.del(`analytics:${createResponseDto.surveyId}`);
    await this.cacheService.del(`responses:${createResponseDto.surveyId}`);

    // Emit real-time event
    await this.realtimeService.emitNewResponse(createResponseDto.surveyId, {
      id: docRef.id,
      ...response,
      submittedAt: new Date(),
    });

    return {
      id: docRef.id,
      message: 'Response submitted successfully',
    };
  }

  async findBySurvey(surveyId: string, userId: string) {
    // Verify user owns the survey
    const survey: any = await this.surveysService.findOne(surveyId);
    if (survey.createdBy !== userId) {
      throw new ForbiddenException('You do not own this survey');
    }

    const cacheKey = `responses:${surveyId}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      this.logger.log(`Cache hit for responses: ${surveyId}`);
      return cached;
    }

    const snapshot = await this.firebaseService.firestore
      .collection(this.collection)
      .where('surveyId', '==', surveyId)
      .get();

    let responses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by submittedAt in memory to avoid index requirement (descending)
    responses.sort((a: any, b: any) => {
      const aDate = a.submittedAt?.toDate?.() || a.submittedAt || new Date(0);
      const bDate = b.submittedAt?.toDate?.() || b.submittedAt || new Date(0);
      return bDate.getTime() - aDate.getTime();
    });

    // Cache for 2 minutes
    await this.cacheService.set(cacheKey, responses, 120);

    return responses;
  }

  async findOne(id: string, userId: string) {
    const docRef = this.firebaseService.firestore
      .collection(this.collection)
      .doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Response with ID ${id} not found`);
    }

    const response: any = doc.data();

    // Verify user owns the survey
    const survey: any = await this.surveysService.findOne(response.surveyId);
    if (survey.createdBy !== userId) {
      throw new ForbiddenException('You do not own this survey');
    }

    return {
      id: doc.id,
      ...response,
    };
  }

  private async validateResponse(responseDto: CreateResponseDto) {
    const questions = await this.questionsService.findBySurvey(
      responseDto.surveyId,
    ) as any[];

    const questionMap = new Map(questions.map((q: any) => [q.id, q]));

    for (const [questionId, answer] of Object.entries(responseDto.answers)) {
      const question: any = questionMap.get(questionId);

      if (!question) {
        throw new BadRequestException(`Question ${questionId} not found`);
      }

      if (question.required && !answer) {
        throw new BadRequestException(`Question "${question.text}" is required`);
      }

      // Type-specific validation
      switch (question.type) {
        case 'multiple_choice':
          if (!question.options.includes(answer)) {
            throw new BadRequestException(
              `Invalid option for question "${question.text}"`,
            );
          }
          break;
        case 'scale':
          const numAnswer = Number(answer);
          if (
            isNaN(numAnswer) ||
            numAnswer < question.validation.min ||
            numAnswer > question.validation.max
          ) {
            throw new BadRequestException(
              `Answer must be between ${question.validation.min} and ${question.validation.max}`,
            );
          }
          break;
      }
    }

    // Check all required questions are answered
    const requiredQuestions = questions.filter((q: any) => q.required);
    for (const question of requiredQuestions) {
      if (!responseDto.answers[question.id]) {
        throw new BadRequestException(
          `Required question "${question.text}" not answered`,
        );
      }
    }
  }
}
