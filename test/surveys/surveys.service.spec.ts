import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SurveysService } from '../../src/surveys/surveys.service';
import { FirebaseService } from '../../src/shared/firebase/firebase.service';
import { CacheService } from '../../src/shared/cache/cache.service';
import { RealtimeService } from '../../src/shared/realtime/realtime.service';
import { CreateSurveyDto } from '../../src/surveys/dto/create-survey.dto';
import { UpdateSurveyDto } from '../../src/surveys/dto/update-survey.dto';

describe('SurveysService', () => {
  let service: SurveysService;
  let firebaseService: jest.Mocked<FirebaseService>;
  let cacheService: jest.Mocked<CacheService>;
  let realtimeService: jest.Mocked<RealtimeService>;

  const mockUserId = 'user-123';
  const mockSurveyId = 'survey-123';

  const mockSurvey = {
    id: mockSurveyId,
    title: 'Test Survey',
    description: 'Test Description',
    createdBy: mockUserId,
    isActive: true,
    responseCount: 0,
    createdAt: new Date(),
    settings: {
      allowAnonymous: true,
      allowMultipleResponses: false,
      showResults: false,
      requireLogin: false,
      expiresAt: null,
    },
  };

  beforeEach(async () => {
    const mockDocRef = {
      id: mockSurveyId,
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: mockSurveyId,
        data: () => mockSurvey,
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
            id: mockSurveyId,
            data: () => mockSurvey,
          },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SurveysService,
        {
          provide: FirebaseService,
          useValue: {
            firestore: {
              collection: jest.fn().mockReturnValue(mockCollection),
            },
            serverTimestamp: jest.fn().mockReturnValue('2024-01-01T00:00:00Z'),
            increment: jest.fn().mockReturnValue(1),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            invalidate: jest.fn(),
          },
        },
        {
          provide: RealtimeService,
          useValue: {
            emitSurveyUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SurveysService>(SurveysService);
    firebaseService = module.get(FirebaseService);
    cacheService = module.get(CacheService);
    realtimeService = module.get(RealtimeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new survey successfully', async () => {
      const createSurveyDto: CreateSurveyDto = {
        title: 'New Survey',
        description: 'Survey Description',
      };

      const result = await service.create(createSurveyDto, mockUserId);

      expect(result).toHaveProperty('id', mockSurveyId);
      expect(result).toHaveProperty('title', createSurveyDto.title);
      expect(result).toHaveProperty('createdBy', mockUserId);
      expect(result).toHaveProperty('isActive', true);
      expect(result).toHaveProperty('responseCount', 0);
      expect(cacheService.invalidate).toHaveBeenCalledWith(`surveys:${mockUserId}*`);
    });

    it('should create survey with custom settings', async () => {
      const createSurveyDto: CreateSurveyDto = {
        title: 'Survey with Settings',
        description: 'Test',
        settings: {
          allowAnonymous: false,
          requireLogin: true,
        },
      };

      const result = await service.create(createSurveyDto, mockUserId);

      expect(result.settings).toMatchObject({
        allowAnonymous: false,
        requireLogin: true,
      });
    });

    it('should merge default settings with provided settings', async () => {
      const createSurveyDto: CreateSurveyDto = {
        title: 'Test Survey',
        settings: {
          allowMultipleResponses: true,
        },
      };

      const result = await service.create(createSurveyDto, mockUserId);

      expect(result.settings).toMatchObject({
        allowAnonymous: true,
        allowMultipleResponses: true,
        showResults: false,
        requireLogin: false,
        expiresAt: null,
      });
    });
  });

  describe('findAll', () => {
    it('should return cached surveys if available', async () => {
      const cachedSurveys = [mockSurvey];
      cacheService.get.mockResolvedValue(cachedSurveys);

      const result = await service.findAll(mockUserId);

      expect(result).toEqual(cachedSurveys);
      expect(cacheService.get).toHaveBeenCalledWith(
        `surveys:${mockUserId}:{}`,
      );
      expect(firebaseService.firestore.collection).not.toHaveBeenCalled();
    });

    it('should fetch surveys from Firestore if not cached', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.findAll(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', mockSurveyId);
      expect(cacheService.set).toHaveBeenCalledWith(
        `surveys:${mockUserId}:{}`,
        expect.any(Array),
        300,
      );
    });

    it('should filter surveys by isActive', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.findAll(mockUserId, { isActive: true });

      expect(result).toBeDefined();
      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('isActive'),
      );
    });

    it('should handle errors when fetching surveys', async () => {
      cacheService.get.mockResolvedValue(null);
      const mockError = new Error('Firestore error');
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockRejectedValue(mockError),
      });

      await expect(service.findAll(mockUserId)).rejects.toThrow(mockError);
    });
  });

  describe('findOne', () => {
    it('should return cached survey if available', async () => {
      cacheService.get.mockResolvedValue(mockSurvey);

      const result = await service.findOne(mockSurveyId);

      expect(result).toEqual(mockSurvey);
      expect(cacheService.get).toHaveBeenCalledWith(`survey:${mockSurveyId}`);
      expect(firebaseService.firestore.collection).not.toHaveBeenCalled();
    });

    it('should fetch survey from Firestore if not cached', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.findOne(mockSurveyId);

      expect(result).toHaveProperty('id', mockSurveyId);
      expect(cacheService.set).toHaveBeenCalledWith(
        `survey:${mockSurveyId}`,
        expect.any(Object),
        120,
      );
    });

    it('should throw NotFoundException if survey does not exist', async () => {
      cacheService.get.mockResolvedValue(null);
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
    it('should update survey successfully', async () => {
      cacheService.get.mockResolvedValue(null);
      const updateDto: UpdateSurveyDto = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const result = await service.update(mockSurveyId, updateDto, mockUserId);

      expect(result).toHaveProperty('title', updateDto.title);
      expect(result).toHaveProperty('description', updateDto.description);
      expect(cacheService.del).toHaveBeenCalledWith(`survey:${mockSurveyId}`);
      expect(cacheService.invalidate).toHaveBeenCalledWith(
        `surveys:${mockUserId}*`,
      );
      expect(realtimeService.emitSurveyUpdate).toHaveBeenCalled();
    });

    it('should throw NotFoundException if survey does not exist', async () => {
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        }),
      });

      await expect(
        service.update(mockSurveyId, {}, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own survey', async () => {
      const otherUserSurvey = { ...mockSurvey, createdBy: 'other-user' };
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => otherUserSurvey,
          }),
        }),
      });

      await expect(
        service.update(mockSurveyId, {}, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete survey successfully', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.remove(mockSurveyId, mockUserId);

      expect(result).toHaveProperty('message', 'Survey deleted successfully');
      expect(cacheService.del).toHaveBeenCalledWith(`survey:${mockSurveyId}`);
      expect(cacheService.invalidate).toHaveBeenCalledWith(
        `surveys:${mockUserId}*`,
      );
    });

    it('should throw NotFoundException if survey does not exist', async () => {
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        }),
      });

      await expect(service.remove(mockSurveyId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own survey', async () => {
      const otherUserSurvey = { ...mockSurvey, createdBy: 'other-user' };
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => otherUserSurvey,
          }),
        }),
      });

      await expect(service.remove(mockSurveyId, mockUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('incrementResponseCount', () => {
    it('should increment response count successfully', async () => {
      await service.incrementResponseCount(mockSurveyId);

      expect(firebaseService.increment).toHaveBeenCalledWith(1);
      expect(cacheService.del).toHaveBeenCalledWith(`survey:${mockSurveyId}`);
    });
  });

  describe('getPublicSurvey', () => {
    it('should return public survey information', async () => {
      cacheService.get.mockResolvedValue(mockSurvey);

      const result = await service.getPublicSurvey(mockSurveyId);

      expect(result).toHaveProperty('id', mockSurveyId);
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('settings');
      expect(result).toHaveProperty('isActive');
      expect(result).not.toHaveProperty('createdBy');
    });

    it('should throw NotFoundException if survey is not active', async () => {
      const inactiveSurvey = { ...mockSurvey, isActive: false };
      cacheService.get.mockResolvedValue(inactiveSurvey);

      await expect(service.getPublicSurvey(mockSurveyId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if survey has expired', async () => {
      const expiredSurvey = {
        ...mockSurvey,
        settings: {
          ...mockSurvey.settings,
          expiresAt: new Date('2020-01-01'),
        },
      };
      cacheService.get.mockResolvedValue(expiredSurvey);

      await expect(service.getPublicSurvey(mockSurveyId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return survey if not expired', async () => {
      const validSurvey = {
        ...mockSurvey,
        settings: {
          ...mockSurvey.settings,
          expiresAt: new Date('2099-12-31'),
        },
      };
      cacheService.get.mockResolvedValue(validSurvey);

      const result = await service.getPublicSurvey(mockSurveyId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockSurveyId);
    });
  });
});
