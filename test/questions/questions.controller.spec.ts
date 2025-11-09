import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsController } from '../../src/questions/questions.controller';
import { QuestionsService } from '../../src/questions/questions.service';
import { CreateQuestionDto } from '../../src/questions/dto/create-question.dto';
import { UpdateQuestionDto } from '../../src/questions/dto/update-question.dto';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('QuestionsController', () => {
  let controller: QuestionsController;
  let service: jest.Mocked<QuestionsService>;

  const mockUserId = 'user-123';
  const mockSurveyId = 'survey-123';
  const mockQuestionId = 'question-123';

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
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionsController],
      providers: [
        {
          provide: QuestionsService,
          useValue: {
            create: jest.fn(),
            findBySurvey: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<QuestionsController>(QuestionsController);
    service = module.get(QuestionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new question', async () => {
      const createQuestionDto: CreateQuestionDto = {
        surveyId: mockSurveyId,
        text: 'What is your age?',
        type: 'scale' as any,
        required: true,
        order: 1,
        validation: { min: 1, max: 100 },
      };

      service.create.mockResolvedValue({
        ...mockQuestion,
        ...createQuestionDto,
      });

      const result = await controller.create(createQuestionDto, mockUserId);

      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(createQuestionDto, mockUserId);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid question', async () => {
      const invalidDto: CreateQuestionDto = {
        surveyId: mockSurveyId,
        text: 'Choose one',
        type: 'multiple_choice' as any,
        required: true,
        order: 1,
        options: ['Only One'],
      };

      service.create.mockRejectedValue(
        new BadRequestException(
          'Multiple choice questions must have at least 2 options',
        ),
      );

      await expect(controller.create(invalidDto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if user does not own survey', async () => {
      const createQuestionDto: CreateQuestionDto = {
        surveyId: mockSurveyId,
        text: 'Test',
        type: 'text' as any,
        required: true,
        order: 1,
      };

      service.create.mockRejectedValue(
        new ForbiddenException('You do not own this survey'),
      );

      await expect(
        controller.create(createQuestionDto, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findBySurvey', () => {
    it('should return all questions for a survey', async () => {
      const questions = [mockQuestion];
      service.findBySurvey.mockResolvedValue(questions);

      const result = await controller.findBySurvey(mockSurveyId);

      expect(result).toEqual(questions);
      expect(service.findBySurvey).toHaveBeenCalledWith(mockSurveyId);
      expect(service.findBySurvey).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when survey has no questions', async () => {
      service.findBySurvey.mockResolvedValue([]);

      const result = await controller.findBySurvey(mockSurveyId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return questions sorted by order', async () => {
      const questions = [
        { ...mockQuestion, id: 'q1', order: 1 },
        { ...mockQuestion, id: 'q2', order: 2 },
        { ...mockQuestion, id: 'q3', order: 3 },
      ];
      service.findBySurvey.mockResolvedValue(questions);

      const result = await controller.findBySurvey(mockSurveyId);

      expect(result[0].order).toBe(1);
      expect(result[1].order).toBe(2);
      expect(result[2].order).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should return a question by id', async () => {
      service.findOne.mockResolvedValue(mockQuestion);

      const result = await controller.findOne(mockQuestionId);

      expect(result).toEqual(mockQuestion);
      expect(service.findOne).toHaveBeenCalledWith(mockQuestionId);
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when question not found', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Question with ID non-existent not found'),
      );

      await expect(controller.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a question', async () => {
      const updateDto: UpdateQuestionDto = {
        text: 'Updated Question Text',
      };

      const updatedQuestion = {
        ...mockQuestion,
        ...updateDto,
        updatedAt: new Date(),
      };

      service.update.mockResolvedValue(updatedQuestion);

      const result = await controller.update(
        mockQuestionId,
        updateDto,
        mockUserId,
      );

      expect(result).toEqual(updatedQuestion);
      expect(service.update).toHaveBeenCalledWith(
        mockQuestionId,
        updateDto,
        mockUserId,
      );
      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when question not found', async () => {
      service.update.mockRejectedValue(
        new NotFoundException('Question with ID non-existent not found'),
      );

      await expect(
        controller.update('non-existent', {}, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own survey', async () => {
      service.update.mockRejectedValue(
        new ForbiddenException('You do not own this survey'),
      );

      await expect(
        controller.update(mockQuestionId, {}, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid updates', async () => {
      const invalidUpdate: UpdateQuestionDto = {
        type: 'scale' as any,
        validation: { min: 10, max: 5 },
      };

      service.update.mockRejectedValue(
        new BadRequestException('Min value must be less than max value'),
      );

      await expect(
        controller.update(mockQuestionId, invalidUpdate, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a question', async () => {
      const deleteResult = { message: 'Question deleted successfully' };
      service.remove.mockResolvedValue(deleteResult);

      const result = await controller.remove(mockQuestionId, mockUserId);

      expect(result).toEqual(deleteResult);
      expect(service.remove).toHaveBeenCalledWith(mockQuestionId, mockUserId);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when question not found', async () => {
      service.remove.mockRejectedValue(
        new NotFoundException('Question with ID non-existent not found'),
      );

      await expect(
        controller.remove('non-existent', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own survey', async () => {
      service.remove.mockRejectedValue(
        new ForbiddenException('You do not own this survey'),
      );

      await expect(
        controller.remove(mockQuestionId, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('controller configuration', () => {
    it('should have proper route handlers', () => {
      expect(controller.create).toBeDefined();
      expect(controller.findBySurvey).toBeDefined();
      expect(controller.findOne).toBeDefined();
      expect(controller.update).toBeDefined();
      expect(controller.remove).toBeDefined();
    });

    it('should inject QuestionsService correctly', () => {
      expect(service).toBeDefined();
    });
  });
});
