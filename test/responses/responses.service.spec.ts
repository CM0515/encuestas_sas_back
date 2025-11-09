import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ResponsesService } from '../../src/responses/responses.service';
import { FirebaseService } from '../../src/shared/firebase/firebase.service';
import { CacheService } from '../../src/shared/cache/cache.service';
import { RealtimeService } from '../../src/shared/realtime/realtime.service';
import { SurveysService } from '../../src/surveys/surveys.service';
import { QuestionsService } from '../../src/questions/questions.service';
import { CreateResponseDto } from '../../src/responses/dto/create-response.dto';

describe('ResponsesService', () => {
  let service: ResponsesService;
  let firebaseService: jest.Mocked<FirebaseService>;
  let cacheService: jest.Mocked<CacheService>;
  let realtimeService: jest.Mocked<RealtimeService>;
  let surveysService: jest.Mocked<SurveysService>;
  let questionsService: jest.Mocked<QuestionsService>;

  const mockUserId = 'user-123';
  const mockSurveyId = 'survey-123';
  const mockResponseId = 'response-123';

  const mockPublicSurvey = {
    id: mockSurveyId,
    title: 'Test Survey',
    description: 'Test Description',
    isActive: true,
    settings: {
      allowAnonymous: true,
    },
  };

  const mockQuestions = [
    {
      id: 'q1',
      text: 'What is your favorite color?',
      type: 'multiple_choice',
      options: ['Red', 'Blue', 'Green'],
      required: true,
    },
    {
      id: 'q2',
      text: 'Rate our service',
      type: 'scale',
      validation: { min: 1, max: 5 },
      required: false,
    },
    {
      id: 'q3',
      text: 'Any comments?',
      type: 'text',
      required: false,
    },
  ];

  const mockResponse = {
    id: mockResponseId,
    surveyId: mockSurveyId,
    userId: mockUserId,
    answers: {
      q1: 'Red',
      q2: 5,
      q3: 'Great!',
    },
    submittedAt: new Date(),
    metadata: {
      userAgent: 'Mozilla/5.0',
      ip: '127.0.0.1',
    },
  };

  beforeEach(async () => {
    const mockDocRef = {
      id: mockResponseId,
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: mockResponseId,
        data: () => mockResponse,
      }),
    };

    const mockCollection = {
      add: jest.fn().mockResolvedValue(mockDocRef),
      doc: jest.fn().mockReturnValue(mockDocRef),
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: mockResponseId,
            data: () => mockResponse,
          },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponsesService,
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
          provide: RealtimeService,
          useValue: {
            emitNewResponse: jest.fn(),
          },
        },
        {
          provide: SurveysService,
          useValue: {
            getPublicSurvey: jest.fn().mockResolvedValue(mockPublicSurvey),
            incrementResponseCount: jest.fn(),
            findOne: jest.fn().mockResolvedValue({
              ...mockPublicSurvey,
              createdBy: mockUserId,
            }),
          },
        },
        {
          provide: QuestionsService,
          useValue: {
            findBySurvey: jest.fn().mockResolvedValue(mockQuestions),
          },
        },
      ],
    }).compile();

    service = module.get<ResponsesService>(ResponsesService);
    firebaseService = module.get(FirebaseService);
    cacheService = module.get(CacheService);
    realtimeService = module.get(RealtimeService);
    surveysService = module.get(SurveysService);
    questionsService = module.get(QuestionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new response successfully', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: {
          q1: 'Red',
          q2: 5,
          q3: 'Great!',
        },
      };

      const result = await service.create(createResponseDto, mockUserId);

      expect(result).toHaveProperty('id', mockResponseId);
      expect(result).toHaveProperty('message', 'Response submitted successfully');
      expect(surveysService.getPublicSurvey).toHaveBeenCalledWith(mockSurveyId);
      expect(surveysService.incrementResponseCount).toHaveBeenCalledWith(
        mockSurveyId,
      );
      expect(cacheService.del).toHaveBeenCalledWith(`analytics:${mockSurveyId}`);
      expect(cacheService.del).toHaveBeenCalledWith(`responses:${mockSurveyId}`);
      expect(realtimeService.emitNewResponse).toHaveBeenCalled();
    });

    it('should create anonymous response when userId is not provided', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: {
          q1: 'Blue',
        },
      };

      const result = await service.create(createResponseDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockResponseId);
    });

    it('should validate survey is active before creating response', async () => {
      surveysService.getPublicSurvey.mockRejectedValue(
        new NotFoundException('This survey is no longer active'),
      );

      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: { q1: 'Red' },
      };

      await expect(service.create(createResponseDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid multiple choice option', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: {
          q1: 'Yellow', // Not in options
        },
      };

      await expect(service.create(createResponseDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for scale value out of range', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: {
          q1: 'Red',
          q2: 10, // Max is 5
        },
      };

      await expect(service.create(createResponseDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when required question is not answered', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: {
          // q1 is required but missing
          q2: 5,
        },
      };

      await expect(service.create(createResponseDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for non-existent question', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: {
          q1: 'Red',
          q999: 'Invalid', // Question does not exist
        },
      };

      await expect(service.create(createResponseDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow optional questions to be unanswered', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: {
          q1: 'Red', // Only required question
        },
      };

      const result = await service.create(createResponseDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockResponseId);
    });

    it('should validate scale values are numeric', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: {
          q1: 'Red',
          q2: 'not-a-number',
        },
      };

      await expect(service.create(createResponseDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findBySurvey', () => {
    it('should return cached responses if available', async () => {
      const cachedResponses = [mockResponse];
      cacheService.get.mockResolvedValue(cachedResponses);

      const result = await service.findBySurvey(mockSurveyId, mockUserId);

      expect(result).toEqual(cachedResponses);
      expect(cacheService.get).toHaveBeenCalledWith(`responses:${mockSurveyId}`);
      expect(firebaseService.firestore.collection).not.toHaveBeenCalled();
    });

    it('should fetch responses from Firestore if not cached', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.findBySurvey(mockSurveyId, mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', mockResponseId);
      expect(cacheService.set).toHaveBeenCalledWith(
        `responses:${mockSurveyId}`,
        expect.any(Array),
        120,
      );
    });

    it('should throw ForbiddenException if user does not own survey', async () => {
      surveysService.findOne.mockResolvedValue({
        ...mockPublicSurvey,
        createdBy: 'other-user',
      });

      await expect(
        service.findBySurvey(mockSurveyId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should sort responses by submittedAt descending', async () => {
      const responses = [
        { ...mockResponse, id: 'r1', submittedAt: new Date('2024-01-01') },
        { ...mockResponse, id: 'r2', submittedAt: new Date('2024-01-03') },
        { ...mockResponse, id: 'r3', submittedAt: new Date('2024-01-02') },
      ];

      cacheService.get.mockResolvedValue(null);
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: responses.map((r) => ({
            id: r.id,
            data: () => r,
          })),
        }),
      });

      const result = await service.findBySurvey(mockSurveyId, mockUserId);

      expect(result[0].id).toBe('r2'); // Most recent
      expect(result[1].id).toBe('r3');
      expect(result[2].id).toBe('r1'); // Oldest
    });
  });

  describe('findOne', () => {
    it('should return a response by id', async () => {
      const result = await service.findOne(mockResponseId, mockUserId);

      expect(result).toHaveProperty('id', mockResponseId);
      expect(result).toHaveProperty('answers');
    });

    it('should throw NotFoundException if response does not exist', async () => {
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        }),
      });

      await expect(service.findOne('non-existent', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own survey', async () => {
      surveysService.findOne.mockResolvedValue({
        ...mockPublicSurvey,
        createdBy: 'other-user',
      });

      await expect(service.findOne(mockResponseId, mockUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('validateResponse edge cases', () => {
    it('should handle empty answers object', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: {},
      };

      await expect(service.create(createResponseDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow all optional questions to be unanswered', async () => {
      questionsService.findBySurvey.mockResolvedValue([
        { ...mockQuestions[1], required: false },
        { ...mockQuestions[2], required: false },
      ]);

      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: {},
      };

      const result = await service.create(createResponseDto);

      expect(result).toBeDefined();
    });

    it('should accept valid text response', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: {
          q1: 'Red',
          q3: 'This is a long text response with multiple words.',
        },
      };

      const result = await service.create(createResponseDto);

      expect(result).toBeDefined();
    });

    it('should include metadata in response', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: { q1: 'Red' },
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
      };

      await service.create(createResponseDto);

      const collectionCall = (
        firebaseService.firestore.collection as jest.Mock
      ).mock.results[0].value.add.mock.calls[0][0];

      expect(collectionCall.metadata).toEqual({
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
      });
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate both analytics and responses cache on create', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: { q1: 'Red' },
      };

      await service.create(createResponseDto);

      expect(cacheService.del).toHaveBeenCalledWith(`analytics:${mockSurveyId}`);
      expect(cacheService.del).toHaveBeenCalledWith(`responses:${mockSurveyId}`);
    });
  });
});
