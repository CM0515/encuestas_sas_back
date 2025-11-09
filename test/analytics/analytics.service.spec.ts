import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AnalyticsService } from '../../src/analytics/analytics.service';
import { FirebaseService } from '../../src/shared/firebase/firebase.service';
import { CacheService } from '../../src/shared/cache/cache.service';
import { StorageService } from '../../src/shared/storage/storage.service';
import { EmailService } from '../../src/shared/email/email.service';
import { SurveysService } from '../../src/surveys/surveys.service';
import { QuestionsService } from '../../src/questions/questions.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let firebaseService: jest.Mocked<FirebaseService>;
  let cacheService: jest.Mocked<CacheService>;
  let storageService: jest.Mocked<StorageService>;
  let emailService: jest.Mocked<EmailService>;
  let surveysService: jest.Mocked<SurveysService>;
  let questionsService: jest.Mocked<QuestionsService>;

  const mockSurveyId = 'survey-123';
  const mockUserId = 'user-123';
  const mockUserEmail = 'user@test.com';

  const mockSurvey = {
    id: mockSurveyId,
    title: 'Test Survey',
    createdBy: mockUserId,
  };

  const mockQuestions = [
    {
      id: 'q1',
      text: 'What is your favorite color?',
      type: 'multiple_choice',
      options: ['Red', 'Blue', 'Green'],
    },
    {
      id: 'q2',
      text: 'Rate our service',
      type: 'scale',
      validation: { min: 1, max: 5 },
    },
    {
      id: 'q3',
      text: 'Any comments?',
      type: 'text',
    },
    {
      id: 'q4',
      text: 'When did you join?',
      type: 'date',
    },
  ];

  const mockResponses = [
    {
      id: 'r1',
      surveyId: mockSurveyId,
      submittedAt: '2024-01-01T10:00:00Z',
      answers: {
        q1: 'Red',
        q2: 5,
        q3: 'Great service!',
        q4: '2024-01-01',
      },
    },
    {
      id: 'r2',
      surveyId: mockSurveyId,
      submittedAt: '2024-01-02T10:00:00Z',
      answers: {
        q1: 'Blue',
        q2: 4,
        q3: 'Good experience',
        q4: '2024-01-02',
      },
    },
    {
      id: 'r3',
      surveyId: mockSurveyId,
      submittedAt: '2024-01-03T10:00:00Z',
      answers: {
        q1: 'Red',
        q2: 5,
        q3: 'Excellent!',
        q4: '2024-01-03',
      },
    },
  ];

  beforeEach(async () => {
    const mockFirestoreCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: mockResponses.map((resp) => ({
          id: resp.id,
          data: () => ({ ...resp }),
        })),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: FirebaseService,
          useValue: {
            firestore: {
              collection: jest.fn().mockReturnValue(mockFirestoreCollection),
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            getSignedUrl: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendResultsReport: jest.fn(),
          },
        },
        {
          provide: SurveysService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: QuestionsService,
          useValue: {
            findBySurvey: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    firebaseService = module.get(FirebaseService);
    cacheService = module.get(CacheService);
    storageService = module.get(StorageService);
    emailService = module.get(EmailService);
    surveysService = module.get(SurveysService);
    questionsService = module.get(QuestionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getResults', () => {
    it('should throw ForbiddenException if user does not own the survey', async () => {
      surveysService.findOne.mockResolvedValue({
        ...mockSurvey,
        createdBy: 'other-user',
      });

      await expect(
        service.getResults(mockSurveyId, mockUserId),
      ).rejects.toThrow(ForbiddenException);

      expect(surveysService.findOne).toHaveBeenCalledWith(mockSurveyId);
    });

    it('should return cached results if available', async () => {
      const cachedResults = { totalResponses: 3, questions: {} };
      surveysService.findOne.mockResolvedValue(mockSurvey);
      cacheService.get.mockResolvedValue(cachedResults);

      const result = await service.getResults(mockSurveyId, mockUserId);

      expect(result).toEqual(cachedResults);
      expect(cacheService.get).toHaveBeenCalledWith(`analytics:${mockSurveyId}`);
      expect(questionsService.findBySurvey).not.toHaveBeenCalled();
    });

    it('should calculate and cache results if not in cache', async () => {
      surveysService.findOne.mockResolvedValue(mockSurvey);
      cacheService.get.mockResolvedValue(null);
      questionsService.findBySurvey.mockResolvedValue(mockQuestions);

      const result = await service.getResults(mockSurveyId, mockUserId);

      expect(result).toHaveProperty('totalResponses', 3);
      expect(result).toHaveProperty('questions');
      expect(cacheService.set).toHaveBeenCalledWith(
        `analytics:${mockSurveyId}`,
        result,
        60,
      );
    });

    it('should calculate multiple choice statistics correctly', async () => {
      surveysService.findOne.mockResolvedValue(mockSurvey);
      cacheService.get.mockResolvedValue(null);
      questionsService.findBySurvey.mockResolvedValue([mockQuestions[0]]);

      const result: any = await service.getResults(mockSurveyId, mockUserId);

      const multipleChoiceStats = result.questions.q1;
      expect(multipleChoiceStats.type).toBe('multiple_choice');
      expect(multipleChoiceStats.data.counts).toEqual({
        Red: 2,
        Blue: 1,
        Green: 0,
      });
      expect(multipleChoiceStats.data.total).toBe(3);
      expect(multipleChoiceStats.data.percentages.Red).toBe('66.67');
    });

    it('should calculate scale statistics correctly', async () => {
      surveysService.findOne.mockResolvedValue(mockSurvey);
      cacheService.get.mockResolvedValue(null);
      questionsService.findBySurvey.mockResolvedValue([mockQuestions[1]]);

      const result: any = await service.getResults(mockSurveyId, mockUserId);

      const scaleStats = result.questions.q2;
      expect(scaleStats.type).toBe('scale');
      expect(scaleStats.data.average).toBe('4.67');
      expect(scaleStats.data.min).toBe(4);
      expect(scaleStats.data.max).toBe(5);
      expect(scaleStats.data.count).toBe(3);
      expect(scaleStats.data.distribution).toHaveProperty('4', 1);
      expect(scaleStats.data.distribution).toHaveProperty('5', 2);
    });

    it('should handle scale questions with no responses', async () => {
      surveysService.findOne.mockResolvedValue(mockSurvey);
      cacheService.get.mockResolvedValue(null);
      questionsService.findBySurvey.mockResolvedValue([mockQuestions[1]]);

      // Mock empty responses
      const mockFirestoreCollection = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: [] }),
      };
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue(
        mockFirestoreCollection as any,
      );

      const result: any = await service.getResults(mockSurveyId, mockUserId);

      const scaleStats = result.questions.q2;
      expect(scaleStats.data).toEqual({
        average: 0,
        min: 0,
        max: 0,
        count: 0,
      });
    });

    it('should collect text responses correctly', async () => {
      surveysService.findOne.mockResolvedValue(mockSurvey);
      cacheService.get.mockResolvedValue(null);
      questionsService.findBySurvey.mockResolvedValue([mockQuestions[2]]);

      const result: any = await service.getResults(mockSurveyId, mockUserId);

      const textStats = result.questions.q3;
      expect(textStats.type).toBe('text');
      expect(textStats.data.count).toBe(3);
      expect(textStats.data.answers).toHaveLength(3);
      expect(textStats.data.answers[0].text).toBe('Great service!');
    });

    it('should collect date responses correctly', async () => {
      surveysService.findOne.mockResolvedValue(mockSurvey);
      cacheService.get.mockResolvedValue(null);
      questionsService.findBySurvey.mockResolvedValue([mockQuestions[3]]);

      const result: any = await service.getResults(mockSurveyId, mockUserId);

      const dateStats = result.questions.q4;
      expect(dateStats.type).toBe('date');
      expect(dateStats.data.count).toBe(3);
      expect(dateStats.data.dates).toEqual([
        '2024-01-01',
        '2024-01-02',
        '2024-01-03',
      ]);
    });
  });

  describe('exportToCSV', () => {
    it('should throw ForbiddenException if user does not own the survey', async () => {
      surveysService.findOne.mockResolvedValue({
        ...mockSurvey,
        createdBy: 'other-user',
      });

      await expect(
        service.exportToCSV(mockSurveyId, mockUserId, mockUserEmail),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should export CSV and send email successfully', async () => {
      const mockUrl = 'https://storage.example.com/file.csv';
      surveysService.findOne.mockResolvedValue(mockSurvey);
      cacheService.get.mockResolvedValue(null);
      questionsService.findBySurvey.mockResolvedValue(mockQuestions);
      storageService.uploadFile.mockResolvedValue("undefined");
      storageService.getSignedUrl.mockResolvedValue(mockUrl);
      emailService.sendResultsReport.mockResolvedValue(undefined);

      const result = await service.exportToCSV(
        mockSurveyId,
        mockUserId,
        mockUserEmail,
      );

      expect(result).toHaveProperty('url', mockUrl);
      expect(result).toHaveProperty('filename');
      expect(result.filename).toMatch(/^exports\/survey-123-\d+\.csv$/);

      expect(storageService.uploadFile).toHaveBeenCalledWith(
        expect.stringMatching(/^exports\/survey-123-\d+\.csv$/),
        expect.any(String),
        'text/csv',
      );

      expect(storageService.getSignedUrl).toHaveBeenCalledWith(
        expect.stringMatching(/^exports\/survey-123-\d+\.csv$/),
        1,
      );

      expect(emailService.sendResultsReport).toHaveBeenCalledWith(
        mockUserEmail,
        mockSurvey.title,
        mockUrl,
      );
    });

    it('should generate CSV with correct headers', async () => {
      surveysService.findOne.mockResolvedValue(mockSurvey);
      cacheService.get.mockResolvedValue(null);
      questionsService.findBySurvey.mockResolvedValue(mockQuestions);
      let capturedContent = '';
      storageService.uploadFile.mockImplementation(
        async (filename, content) => {
          capturedContent = content as string;
          return '' as any;
        },
      );
      storageService.getSignedUrl.mockResolvedValue('https://example.com/file');
      emailService.sendResultsReport.mockResolvedValue(undefined);

      await service.exportToCSV(mockSurveyId, mockUserId, mockUserEmail);

      expect(storageService.uploadFile).toHaveBeenCalled();
      expect(capturedContent).toContain('Response ID,Submitted At');
      expect(capturedContent).toContain('What is your favorite color?');
    });
  });

  describe('edge cases', () => {
    it('should handle responses with missing answers', async () => {
      const incompleteResponses = [
        {
          id: 'r1',
          surveyId: mockSurveyId,
          submittedAt: '2024-01-01T10:00:00Z',
          answers: {
            q1: 'Red',
            // q2 is missing
          },
        },
      ];

      surveysService.findOne.mockResolvedValue(mockSurvey);
      cacheService.get.mockResolvedValue(null);
      questionsService.findBySurvey.mockResolvedValue(mockQuestions);

      const mockFirestoreCollection = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: incompleteResponses.map((resp) => ({
            id: resp.id,
            data: () => ({ ...resp }),
          })),
        }),
      };
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue(
        mockFirestoreCollection as any,
      );

      const result: any = await service.getResults(mockSurveyId, mockUserId);

      expect(result.totalResponses).toBe(1);
      expect(result.questions.q2.data.count).toBe(0);
    });

    it('should handle multiple choice with invalid option', async () => {
      const responsesWithInvalidOption = [
        {
          id: 'r1',
          surveyId: mockSurveyId,
          submittedAt: '2024-01-01T10:00:00Z',
          answers: {
            q1: 'Yellow', // Not in options
          },
        },
      ];

      surveysService.findOne.mockResolvedValue(mockSurvey);
      cacheService.get.mockResolvedValue(null);
      questionsService.findBySurvey.mockResolvedValue([mockQuestions[0]]);

      const mockFirestoreCollection = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: responsesWithInvalidOption.map((resp) => ({
            id: resp.id,
            data: () => ({ ...resp }),
          })),
        }),
      };
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue(
        mockFirestoreCollection as any,
      );

      const result: any = await service.getResults(mockSurveyId, mockUserId);

      const multipleChoiceStats = result.questions.q1;
      expect(multipleChoiceStats.data.counts.Yellow).toBeUndefined();
      expect(multipleChoiceStats.data.total).toBe(0);
    });

    it('should handle empty responses array', async () => {
      surveysService.findOne.mockResolvedValue(mockSurvey);
      cacheService.get.mockResolvedValue(null);
      questionsService.findBySurvey.mockResolvedValue(mockQuestions);

      const mockFirestoreCollection = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: [] }),
      };
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue(
        mockFirestoreCollection as any,
      );

      const result: any = await service.getResults(mockSurveyId, mockUserId);

      expect(result.totalResponses).toBe(0);
      expect(result.questions.q1.totalResponses).toBe(0);
    });
  });
});
