import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { QuestionsService } from '../../src/questions/questions.service';
import { FirebaseService } from '../../src/shared/firebase/firebase.service';
import { CacheService } from '../../src/shared/cache/cache.service';
import { SurveysService } from '../../src/surveys/surveys.service';
import { CreateQuestionDto } from '../../src/questions/dto/create-question.dto';
import { UpdateQuestionDto } from '../../src/questions/dto/update-question.dto';

describe('QuestionsService', () => {
  let service: QuestionsService;
  let firebaseService: jest.Mocked<FirebaseService>;
  let cacheService: jest.Mocked<CacheService>;
  let surveysService: jest.Mocked<SurveysService>;

  const mockUserId = 'user-123';
  const mockSurveyId = 'survey-123';
  const mockQuestionId = 'question-123';

  const mockSurvey = {
    id: mockSurveyId,
    title: 'Test Survey',
    createdBy: mockUserId,
  };

  const mockQuestion = {
    id: mockQuestionId,
    surveyId: mockSurveyId,
    text: 'What is your favorite color?',
    type: 'multiple_choice',
    options: ['Red', 'Blue', 'Green'],
    required: true,
    order: 1,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockDocRef = {
      id: mockQuestionId,
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: mockQuestionId,
        data: () => mockQuestion,
      }),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockCollection = {
      add: jest.fn().mockResolvedValue(mockDocRef),
      doc: jest.fn().mockReturnValue(mockDocRef),
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: mockQuestionId,
            data: () => mockQuestion,
          },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        {
          provide: FirebaseService,
          useValue: {
            firestore: {
              collection: jest.fn().mockReturnValue(mockCollection),
            },
            serverTimestamp: jest.fn().mockReturnValue('2024-01-01T00:00:00Z'),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: SurveysService,
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockSurvey),
          },
        },
      ],
    }).compile();

    service = module.get<QuestionsService>(QuestionsService);
    firebaseService = module.get(FirebaseService);
    cacheService = module.get(CacheService);
    surveysService = module.get(SurveysService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new question successfully', async () => {
      const createQuestionDto: CreateQuestionDto = {
        surveyId: mockSurveyId,
        text: 'What is your age?',
        type: 'scale' as any,
        required: true,
        order: 2,
        validation: { min: 1, max: 100 },
      };

      const result = await service.create(createQuestionDto, mockUserId);

      expect(result).toHaveProperty('id', mockQuestionId);
      expect(result).toHaveProperty('text', createQuestionDto.text);
      expect(result).toHaveProperty('surveyId', mockSurveyId);
      expect(surveysService.findOne).toHaveBeenCalledWith(mockSurveyId);
      expect(cacheService.del).toHaveBeenCalledWith(`questions:${mockSurveyId}`);
    });

    it('should throw ForbiddenException if user does not own survey', async () => {
      const createQuestionDto: CreateQuestionDto = {
        surveyId: mockSurveyId,
        text: 'Test Question',
        type: 'text' as any,
        required: false,
        order: 1,
      };

      surveysService.findOne.mockResolvedValue({
        ...mockSurvey,
        createdBy: 'other-user',
      });

      await expect(
        service.create(createQuestionDto, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should validate multiple choice questions have at least 2 options', async () => {
      const createQuestionDto: CreateQuestionDto = {
        surveyId: mockSurveyId,
        text: 'Choose one',
        type: 'multiple_choice' as any,
        required: true,
        order: 1,
        options: ['Only One'],
      };

      await expect(
        service.create(createQuestionDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate scale questions have min and max values', async () => {
      const createQuestionDto: CreateQuestionDto = {
        surveyId: mockSurveyId,
        text: 'Rate us',
        type: 'scale' as any,
        required: true,
        order: 1,
      };

      await expect(
        service.create(createQuestionDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate scale min is less than max', async () => {
      const createQuestionDto: CreateQuestionDto = {
        surveyId: mockSurveyId,
        text: 'Rate us',
        type: 'scale' as any,
        required: true,
        order: 1,
        validation: { min: 10, max: 5 },
      };

      await expect(
        service.create(createQuestionDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create valid multiple choice question', async () => {
      const createQuestionDto: CreateQuestionDto = {
        surveyId: mockSurveyId,
        text: 'Choose color',
        type: 'multiple_choice' as any,
        required: true,
        order: 1,
        options: ['Red', 'Blue', 'Green'],
      };

      const result = await service.create(createQuestionDto, mockUserId);

      expect(result).toBeDefined();
      expect(result.options).toEqual(['Red', 'Blue', 'Green']);
    });
  });

  describe('findBySurvey', () => {
    it('should return cached questions if available', async () => {
      const cachedQuestions = [mockQuestion];
      cacheService.get.mockResolvedValue(cachedQuestions);

      const result = await service.findBySurvey(mockSurveyId);

      expect(result).toEqual(cachedQuestions);
      expect(cacheService.get).toHaveBeenCalledWith(`questions:${mockSurveyId}`);
      expect(firebaseService.firestore.collection).not.toHaveBeenCalled();
    });

    it('should fetch questions from Firestore if not cached', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.findBySurvey(mockSurveyId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', mockQuestionId);
      expect(cacheService.set).toHaveBeenCalledWith(
        `questions:${mockSurveyId}`,
        expect.any(Array),
        300,
      );
    });

    it('should sort questions by order', async () => {
      const questions = [
        { ...mockQuestion, id: 'q1', order: 3 },
        { ...mockQuestion, id: 'q2', order: 1 },
        { ...mockQuestion, id: 'q3', order: 2 },
      ];

      cacheService.get.mockResolvedValue(null);
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: questions.map((q) => ({
            id: q.id,
            data: () => q,
          })),
        }),
      });

      const result = await service.findBySurvey(mockSurveyId);

      expect(result[0].id).toBe('q2');
      expect(result[1].id).toBe('q3');
      expect(result[2].id).toBe('q1');
    });
  });

  describe('findOne', () => {
    it('should return a question by id', async () => {
      const result = await service.findOne(mockQuestionId);

      expect(result).toHaveProperty('id', mockQuestionId);
      expect(result).toHaveProperty('text', mockQuestion.text);
    });

    it('should throw NotFoundException if question does not exist', async () => {
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        }),
      });

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update question successfully', async () => {
      const updateDto: UpdateQuestionDto = {
        text: 'Updated Question Text',
      };

      const result = await service.update(mockQuestionId, updateDto, mockUserId);

      expect(result).toHaveProperty('text', updateDto.text);
      expect(cacheService.del).toHaveBeenCalledWith(`questions:${mockSurveyId}`);
    });

    it('should throw ForbiddenException if user does not own survey', async () => {
      surveysService.findOne.mockResolvedValue({
        ...mockSurvey,
        createdBy: 'other-user',
      });

      await expect(
        service.update(mockQuestionId, {}, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should validate updated question type', async () => {
      const updateDto: UpdateQuestionDto = {
        type: 'multiple_choice' as any,
        options: ['Only One'],
      };

      await expect(
        service.update(mockQuestionId, updateDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid updates', async () => {
      const updateDto: UpdateQuestionDto = {
        text: 'Updated Text',
        options: ['Red', 'Blue', 'Green', 'Yellow'],
      };

      const result = await service.update(mockQuestionId, updateDto, mockUserId);

      expect(result).toBeDefined();
      expect(result.text).toBe('Updated Text');
    });
  });

  describe('remove', () => {
    it('should delete question successfully', async () => {
      const result = await service.remove(mockQuestionId, mockUserId);

      expect(result).toHaveProperty('message', 'Question deleted successfully');
      expect(cacheService.del).toHaveBeenCalledWith(`questions:${mockSurveyId}`);
    });

    it('should throw ForbiddenException if user does not own survey', async () => {
      surveysService.findOne.mockResolvedValue({
        ...mockSurvey,
        createdBy: 'other-user',
      });

      await expect(service.remove(mockQuestionId, mockUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if question does not exist', async () => {
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        }),
      });

      await expect(service.remove('non-existent', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateQuestion', () => {
    it('should accept valid text question', async () => {
      const createQuestionDto: CreateQuestionDto = {
        surveyId: mockSurveyId,
        text: 'What is your name?',
        type: 'text' as any,
        required: true,
        order: 1,
      };

      const result = await service.create(createQuestionDto, mockUserId);

      expect(result).toBeDefined();
    });

    it('should accept valid yes/no question', async () => {
      const createQuestionDto: CreateQuestionDto = {
        surveyId: mockSurveyId,
        text: 'Do you agree?',
        type: 'yes_no' as any,
        required: true,
        order: 1,
      };

      const result = await service.create(createQuestionDto, mockUserId);

      expect(result).toBeDefined();
    });

    it('should accept valid date question', async () => {
      const createQuestionDto: CreateQuestionDto = {
        surveyId: mockSurveyId,
        text: 'When did you join?',
        type: 'date' as any,
        required: false,
        order: 1,
      };

      const result = await service.create(createQuestionDto, mockUserId);

      expect(result).toBeDefined();
    });
  });
});
