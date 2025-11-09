import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from '../../src/analytics/analytics.controller';
import { AnalyticsService } from '../../src/analytics/analytics.service';
import { ForbiddenException } from '@nestjs/common';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: jest.Mocked<AnalyticsService>;

  const mockSurveyId = 'survey-123';
  const mockUserId = 'user-123';
  const mockUserEmail = 'user@test.com';

  const mockResults = {
    totalResponses: 10,
    questions: {
      q1: {
        question: 'What is your favorite color?',
        type: 'multiple_choice',
        totalResponses: 10,
        data: {
          counts: { Red: 5, Blue: 3, Green: 2 },
          percentages: { Red: '50.00', Blue: '30.00', Green: '20.00' },
          total: 10,
        },
      },
    },
  };

  const mockExportResult = {
    url: 'https://storage.example.com/file.csv',
    filename: 'exports/survey-123-1234567890.csv',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: {
            getResults: jest.fn(),
            exportToCSV: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get(AnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getResults', () => {
    it('should return analytics results for a survey', async () => {
      service.getResults.mockResolvedValue(mockResults);

      const result = await controller.getResults(mockSurveyId, mockUserId);

      expect(result).toEqual(mockResults);
      expect(service.getResults).toHaveBeenCalledWith(mockSurveyId, mockUserId);
      expect(service.getResults).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when user does not own the survey', async () => {
      service.getResults.mockRejectedValue(
        new ForbiddenException('You do not own this survey'),
      );

      await expect(
        controller.getResults(mockSurveyId, mockUserId),
      ).rejects.toThrow(ForbiddenException);

      expect(service.getResults).toHaveBeenCalledWith(mockSurveyId, mockUserId);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      service.getResults.mockRejectedValue(error);

      await expect(
        controller.getResults(mockSurveyId, mockUserId),
      ).rejects.toThrow(error);
    });

    it('should pass correct parameters from decorators', async () => {
      service.getResults.mockResolvedValue(mockResults);

      await controller.getResults('custom-survey-id', 'custom-user-id');

      expect(service.getResults).toHaveBeenCalledWith(
        'custom-survey-id',
        'custom-user-id',
      );
    });
  });

  describe('exportToCSV', () => {
    it('should export survey results to CSV', async () => {
      service.exportToCSV.mockResolvedValue(mockExportResult);

      const result = await controller.exportToCSV(
        mockSurveyId,
        mockUserId,
        mockUserEmail,
      );

      expect(result).toEqual(mockExportResult);
      expect(service.exportToCSV).toHaveBeenCalledWith(
        mockSurveyId,
        mockUserId,
        mockUserEmail,
      );
      expect(service.exportToCSV).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when user does not own the survey', async () => {
      service.exportToCSV.mockRejectedValue(
        new ForbiddenException('You do not own this survey'),
      );

      await expect(
        controller.exportToCSV(mockSurveyId, mockUserId, mockUserEmail),
      ).rejects.toThrow(ForbiddenException);

      expect(service.exportToCSV).toHaveBeenCalledWith(
        mockSurveyId,
        mockUserId,
        mockUserEmail,
      );
    });

    it('should handle service errors during export', async () => {
      const error = new Error('Export failed');
      service.exportToCSV.mockRejectedValue(error);

      await expect(
        controller.exportToCSV(mockSurveyId, mockUserId, mockUserEmail),
      ).rejects.toThrow(error);
    });

    it('should pass correct parameters including email from decorators', async () => {
      service.exportToCSV.mockResolvedValue(mockExportResult);

      await controller.exportToCSV(
        'custom-survey-id',
        'custom-user-id',
        'custom@email.com',
      );

      expect(service.exportToCSV).toHaveBeenCalledWith(
        'custom-survey-id',
        'custom-user-id',
        'custom@email.com',
      );
    });

    it('should return export details with URL and filename', async () => {
      service.exportToCSV.mockResolvedValue(mockExportResult);

      const result = await controller.exportToCSV(
        mockSurveyId,
        mockUserId,
        mockUserEmail,
      );

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('filename');
      expect(result.url).toBe('https://storage.example.com/file.csv');
      expect(result.filename).toMatch(/^exports\/survey-123-\d+\.csv$/);
    });
  });

  describe('controller configuration', () => {
    it('should have proper route handlers', () => {
      expect(controller.getResults).toBeDefined();
      expect(controller.exportToCSV).toBeDefined();
    });

    it('should inject AnalyticsService correctly', () => {
      expect(service).toBeDefined();
    });
  });
});
