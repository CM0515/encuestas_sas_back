import { Test, TestingModule } from '@nestjs/testing';
import { SurveysController } from '../../src/surveys/surveys.controller';
import { SurveysService } from '../../src/surveys/surveys.service';
import { CreateSurveyDto } from '../../src/surveys/dto/create-survey.dto';
import { UpdateSurveyDto } from '../../src/surveys/dto/update-survey.dto';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('SurveysController', () => {
  let controller: SurveysController;
  let service: jest.Mocked<SurveysService>;

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
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SurveysController],
      providers: [
        {
          provide: SurveysService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getPublicSurvey: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SurveysController>(SurveysController);
    service = module.get(SurveysService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new survey', async () => {
      const createSurveyDto: CreateSurveyDto = {
        title: 'New Survey',
        description: 'Survey Description',
      };

      service.create.mockResolvedValue(mockSurvey);

      const result = await controller.create(createSurveyDto, mockUserId);

      expect(result).toEqual(mockSurvey);
      expect(service.create).toHaveBeenCalledWith(createSurveyDto, mockUserId);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should create survey with custom settings', async () => {
      const createSurveyDto: CreateSurveyDto = {
        title: 'Survey',
        description: 'Description',
        settings: {
          allowAnonymous: false,
          requireLogin: true,
        },
      };

      service.create.mockResolvedValue({
        ...mockSurvey,
        settings: {
          ...mockSurvey.settings,
          ...createSurveyDto.settings,
        },
      });

      const result = await controller.create(createSurveyDto, mockUserId);

      expect(result.settings.allowAnonymous).toBe(false);
      expect(result.settings.requireLogin).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return all surveys for the user', async () => {
      const surveys = [mockSurvey];
      service.findAll.mockResolvedValue(surveys);

      const result = await controller.findAll(mockUserId, {});

      expect(result).toEqual(surveys);
      expect(service.findAll).toHaveBeenCalledWith(mockUserId, {});
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should apply filters when provided', async () => {
      const filters = { isActive: true };
      service.findAll.mockResolvedValue([mockSurvey]);

      await controller.findAll(mockUserId, filters);

      expect(service.findAll).toHaveBeenCalledWith(mockUserId, filters);
    });

    it('should return empty array when no surveys exist', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockUserId, {});

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a survey by id', async () => {
      service.findOne.mockResolvedValue(mockSurvey);

      const result = await controller.findOne(mockSurveyId, mockUserId);

      expect(result).toEqual(mockSurvey);
      expect(service.findOne).toHaveBeenCalledWith(mockSurveyId, mockUserId);
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when survey not found', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Survey with ID non-existent not found'),
      );

      await expect(
        controller.findOne('non-existent', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPublicSurvey', () => {
    it('should return public survey information', async () => {
      const publicSurvey = {
        id: mockSurveyId,
        title: mockSurvey.title,
        description: mockSurvey.description,
        settings: mockSurvey.settings,
        isActive: mockSurvey.isActive,
      };

      service.getPublicSurvey.mockResolvedValue(publicSurvey);

      const result = await controller.getPublicSurvey(mockSurveyId);

      expect(result).toEqual(publicSurvey);
      expect(result).not.toHaveProperty('createdBy');
      expect(service.getPublicSurvey).toHaveBeenCalledWith(mockSurveyId);
    });

    it('should throw NotFoundException if survey is not active', async () => {
      service.getPublicSurvey.mockRejectedValue(
        new NotFoundException('This survey is no longer active'),
      );

      await expect(controller.getPublicSurvey(mockSurveyId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if survey has expired', async () => {
      service.getPublicSurvey.mockRejectedValue(
        new NotFoundException('This survey has expired'),
      );

      await expect(controller.getPublicSurvey(mockSurveyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a survey', async () => {
      const updateDto: UpdateSurveyDto = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const updatedSurvey = {
        ...mockSurvey,
        ...updateDto,
        updatedAt: new Date(),
      };

      service.update.mockResolvedValue(updatedSurvey);

      const result = await controller.update(
        mockSurveyId,
        updateDto,
        mockUserId,
      );

      expect(result).toEqual(updatedSurvey);
      expect(service.update).toHaveBeenCalledWith(
        mockSurveyId,
        updateDto,
        mockUserId,
      );
      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when survey not found', async () => {
      service.update.mockRejectedValue(
        new NotFoundException('Survey with ID non-existent not found'),
      );

      await expect(
        controller.update('non-existent', {}, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own survey', async () => {
      service.update.mockRejectedValue(
        new ForbiddenException('You are not authorized to update this survey'),
      );

      await expect(
        controller.update(mockSurveyId, {}, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete a survey', async () => {
      const deleteResult = { message: 'Survey deleted successfully' };
      service.remove.mockResolvedValue(deleteResult);

      const result = await controller.remove(mockSurveyId, mockUserId);

      expect(result).toEqual(deleteResult);
      expect(service.remove).toHaveBeenCalledWith(mockSurveyId, mockUserId);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when survey not found', async () => {
      service.remove.mockRejectedValue(
        new NotFoundException('Survey with ID non-existent not found'),
      );

      await expect(
        controller.remove('non-existent', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own survey', async () => {
      service.remove.mockRejectedValue(
        new ForbiddenException('You are not authorized to delete this survey'),
      );

      await expect(
        controller.remove(mockSurveyId, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('controller configuration', () => {
    it('should have proper route handlers', () => {
      expect(controller.create).toBeDefined();
      expect(controller.findAll).toBeDefined();
      expect(controller.findOne).toBeDefined();
      expect(controller.getPublicSurvey).toBeDefined();
      expect(controller.update).toBeDefined();
      expect(controller.remove).toBeDefined();
    });

    it('should inject SurveysService correctly', () => {
      expect(service).toBeDefined();
    });
  });
});
