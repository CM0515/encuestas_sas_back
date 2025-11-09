import { Test, TestingModule } from '@nestjs/testing';
import { ResponsesController } from '../../src/responses/responses.controller';
import { ResponsesService } from '../../src/responses/responses.service';
import { CreateResponseDto } from '../../src/responses/dto/create-response.dto';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

describe('ResponsesController', () => {
  let controller: ResponsesController;
  let service: jest.Mocked<ResponsesService>;

  const mockUserId = 'user-123';
  const mockSurveyId = 'survey-123';
  const mockResponseId = 'response-123';

  const mockResponse = {
    id: mockResponseId,
    surveyId: mockSurveyId,
    userId: mockUserId,
    answers: {
      q1: 'Red',
      q2: 5,
    },
    submittedAt: new Date(),
    metadata: {
      userAgent: 'Mozilla/5.0',
      ip: '127.0.0.1',
    },
  };

  const mockRequest = {
    headers: {
      'user-agent': 'Mozilla/5.0',
    },
    ip: '127.0.0.1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResponsesController],
      providers: [
        {
          provide: ResponsesService,
          useValue: {
            create: jest.fn(),
            findBySurvey: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ResponsesController>(ResponsesController);
    service = module.get(ResponsesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new response', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: {
          q1: 'Red',
          q2: 5,
        },
      };

      const createResult = {
        id: mockResponseId,
        message: 'Response submitted successfully',
      };

      service.create.mockResolvedValue(createResult);

      const result = await controller.create(createResponseDto, mockRequest);

      expect(result).toEqual(createResult);
      expect(createResponseDto.userAgent).toBe('Mozilla/5.0');
      expect(createResponseDto.ip).toBe('127.0.0.1');
      expect(service.create).toHaveBeenCalledWith(createResponseDto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should extract user-agent and ip from request', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: { q1: 'Blue' },
      };

      service.create.mockResolvedValue({
        id: mockResponseId,
        message: 'Response submitted successfully',
      });

      await controller.create(createResponseDto, mockRequest);

      expect(createResponseDto.userAgent).toBe('Mozilla/5.0');
      expect(createResponseDto.ip).toBe('127.0.0.1');
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: {
          q1: 'InvalidOption',
        },
      };

      service.create.mockRejectedValue(
        new BadRequestException('Invalid option for question'),
      );

      await expect(controller.create(invalidDto, mockRequest)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when survey is not active', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: { q1: 'Red' },
      };

      service.create.mockRejectedValue(
        new NotFoundException('This survey is no longer active'),
      );

      await expect(
        controller.create(createResponseDto, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle missing required fields', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: {},
      };

      service.create.mockRejectedValue(
        new BadRequestException('Required question not answered'),
      );

      await expect(
        controller.create(createResponseDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findBySurvey', () => {
    it('should return all responses for a survey', async () => {
      const responses = [mockResponse];
      service.findBySurvey.mockResolvedValue(responses);

      const result = await controller.findBySurvey(mockSurveyId, mockUserId);

      expect(result).toEqual(responses);
      expect(service.findBySurvey).toHaveBeenCalledWith(
        mockSurveyId,
        mockUserId,
      );
      expect(service.findBySurvey).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException if user does not own survey', async () => {
      service.findBySurvey.mockRejectedValue(
        new ForbiddenException('You do not own this survey'),
      );

      await expect(
        controller.findBySurvey(mockSurveyId, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return empty array when no responses exist', async () => {
      service.findBySurvey.mockResolvedValue([]);

      const result = await controller.findBySurvey(mockSurveyId, mockUserId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return responses sorted by submission date', async () => {
      const responses = [
        { ...mockResponse, id: 'r1', submittedAt: new Date('2024-01-03') },
        { ...mockResponse, id: 'r2', submittedAt: new Date('2024-01-02') },
        { ...mockResponse, id: 'r3', submittedAt: new Date('2024-01-01') },
      ];
      service.findBySurvey.mockResolvedValue(responses);

      const result = await controller.findBySurvey(mockSurveyId, mockUserId);

      expect(result[0].submittedAt).toEqual(new Date('2024-01-03'));
    });
  });

  describe('findOne', () => {
    it('should return a response by id', async () => {
      service.findOne.mockResolvedValue(mockResponse);

      const result = await controller.findOne(mockResponseId, mockUserId);

      expect(result).toEqual(mockResponse);
      expect(service.findOne).toHaveBeenCalledWith(mockResponseId, mockUserId);
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when response not found', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Response with ID non-existent not found'),
      );

      await expect(
        controller.findOne('non-existent', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own survey', async () => {
      service.findOne.mockRejectedValue(
        new ForbiddenException('You do not own this survey'),
      );

      await expect(
        controller.findOne(mockResponseId, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('controller configuration', () => {
    it('should have proper route handlers', () => {
      expect(controller.create).toBeDefined();
      expect(controller.findBySurvey).toBeDefined();
      expect(controller.findOne).toBeDefined();
    });

    it('should inject ResponsesService correctly', () => {
      expect(service).toBeDefined();
    });
  });

  describe('request metadata handling', () => {
    it('should handle missing user-agent header', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: { q1: 'Red' },
      };

      const requestWithoutUserAgent = {
        headers: {},
        ip: '127.0.0.1',
      };

      service.create.mockResolvedValue({
        id: mockResponseId,
        message: 'Response submitted successfully',
      });

      await controller.create(createResponseDto, requestWithoutUserAgent);

      expect(createResponseDto.userAgent).toBeUndefined();
      expect(createResponseDto.ip).toBe('127.0.0.1');
    });

    it('should handle missing ip', async () => {
      const createResponseDto: CreateResponseDto = {
        surveyId: mockSurveyId,
        answers: { q1: 'Red' },
      };

      const requestWithoutIp = {
        headers: { 'user-agent': 'Mozilla/5.0' },
      };

      service.create.mockResolvedValue({
        id: mockResponseId,
        message: 'Response submitted successfully',
      });

      await controller.create(createResponseDto, requestWithoutIp as any);

      expect(createResponseDto.userAgent).toBe('Mozilla/5.0');
    });
  });
});
