import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeService } from '../../../src/shared/realtime/realtime.service';
import Pusher from 'pusher';

jest.mock('pusher');

describe('RealtimeService', () => {
  let service: RealtimeService;
  let mockPusher: jest.Mocked<Pusher>;

  const mockPusherConfig = {
    appId: 'mock-app-id',
    key: 'mock-pusher-key',
    secret: 'mock-pusher-secret',
    cluster: 'us2',
  };

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Set environment variables
    process.env.PUSHER_APP_ID = mockPusherConfig.appId;
    process.env.PUSHER_KEY = mockPusherConfig.key;
    process.env.PUSHER_SECRET = mockPusherConfig.secret;
    process.env.PUSHER_CLUSTER = mockPusherConfig.cluster;

    // Create mock Pusher instance
    mockPusher = {
      trigger: jest.fn(),
      triggerBatch: jest.fn(),
    } as any;

    // Mock Pusher constructor
    (Pusher as jest.MockedClass<typeof Pusher>).mockImplementation(() => mockPusher);

    const module: TestingModule = await Test.createTestingModule({
      providers: [RealtimeService],
    }).compile();

    service = module.get<RealtimeService>(RealtimeService);
  });

  afterEach(() => {
    delete process.env.PUSHER_APP_ID;
    delete process.env.PUSHER_KEY;
    delete process.env.PUSHER_SECRET;
    delete process.env.PUSHER_CLUSTER;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should initialize Pusher with correct credentials', () => {
      expect(Pusher).toHaveBeenCalledWith({
        appId: mockPusherConfig.appId,
        key: mockPusherConfig.key,
        secret: mockPusherConfig.secret,
        cluster: mockPusherConfig.cluster,
        useTLS: true,
      });
    });

    it('should use default cluster when not provided', async () => {
      delete process.env.PUSHER_CLUSTER;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [RealtimeService],
      }).compile();

      const serviceWithDefaultCluster = module.get<RealtimeService>(RealtimeService);

      expect(Pusher).toHaveBeenCalledWith({
        appId: mockPusherConfig.appId,
        key: mockPusherConfig.key,
        secret: mockPusherConfig.secret,
        cluster: 'mt1',
        useTLS: true,
      });
    });

    it('should not initialize Pusher when credentials are missing', async () => {
      delete process.env.PUSHER_APP_ID;
      delete process.env.PUSHER_KEY;
      delete process.env.PUSHER_SECRET;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [RealtimeService],
      }).compile();

      const serviceWithoutPusher = module.get<RealtimeService>(RealtimeService);

      expect(serviceWithoutPusher).toBeDefined();
      expect(Pusher).not.toHaveBeenCalled();
    });

    it('should not initialize when only appId is missing', async () => {
      delete process.env.PUSHER_APP_ID;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [RealtimeService],
      }).compile();

      expect(Pusher).not.toHaveBeenCalled();
    });

    it('should not initialize when only key is missing', async () => {
      delete process.env.PUSHER_KEY;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [RealtimeService],
      }).compile();

      expect(Pusher).not.toHaveBeenCalled();
    });

    it('should not initialize when only secret is missing', async () => {
      delete process.env.PUSHER_SECRET;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [RealtimeService],
      }).compile();

      expect(Pusher).not.toHaveBeenCalled();
    });

    it('should enable TLS by default', () => {
      expect(Pusher).toHaveBeenCalledWith(
        expect.objectContaining({ useTLS: true }),
      );
    });
  });

  describe('trigger', () => {
    const channel = 'test-channel';
    const event = 'test-event';
    const data = { message: 'Hello, World!' };

    it('should trigger event successfully', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.trigger(channel, event, data);

      expect(mockPusher.trigger).toHaveBeenCalledWith(channel, event, data);
    });

    it('should not trigger when Pusher is not configured', async () => {
      delete process.env.PUSHER_APP_ID;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [RealtimeService],
      }).compile();

      const serviceWithoutPusher = module.get<RealtimeService>(RealtimeService);
      await serviceWithoutPusher.trigger(channel, event, data);

      expect(mockPusher.trigger).not.toHaveBeenCalled();
    });

    it('should throw error when triggering fails', async () => {
      const error = new Error('Pusher trigger failed');
      mockPusher.trigger.mockRejectedValue(error);

      await expect(service.trigger(channel, event, data)).rejects.toThrow('Pusher trigger failed');
    });

    it('should handle complex data objects', async () => {
      const complexData = {
        nested: {
          data: 'value',
          array: [1, 2, 3],
        },
        boolean: true,
        number: 42,
      };
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.trigger(channel, event, complexData);

      expect(mockPusher.trigger).toHaveBeenCalledWith(channel, event, complexData);
    });

    it('should handle null data', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.trigger(channel, event, null);

      expect(mockPusher.trigger).toHaveBeenCalledWith(channel, event, null);
    });

    it('should handle empty string channel', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.trigger('', event, data);

      expect(mockPusher.trigger).toHaveBeenCalledWith('', event, data);
    });

    it('should handle empty string event', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.trigger(channel, '', data);

      expect(mockPusher.trigger).toHaveBeenCalledWith(channel, '', data);
    });

    it('should handle network errors', async () => {
      mockPusher.trigger.mockRejectedValue(new Error('Network error'));

      await expect(service.trigger(channel, event, data)).rejects.toThrow('Network error');
    });

    it('should handle authentication errors', async () => {
      mockPusher.trigger.mockRejectedValue(new Error('Authentication failed'));

      await expect(service.trigger(channel, event, data)).rejects.toThrow('Authentication failed');
    });
  });

  describe('triggerBatch', () => {
    const batch = [
      { channel: 'channel-1', event: 'event-1', data: { value: 1 } },
      { channel: 'channel-2', event: 'event-2', data: { value: 2 } },
      { channel: 'channel-3', event: 'event-3', data: { value: 3 } },
    ];

    it('should trigger batch events successfully', async () => {
      mockPusher.triggerBatch.mockResolvedValue({} as any);

      await service.triggerBatch(batch);

      expect(mockPusher.triggerBatch).toHaveBeenCalledWith([
        { channel: 'channel-1', name: 'event-1', data: { value: 1 } },
        { channel: 'channel-2', name: 'event-2', data: { value: 2 } },
        { channel: 'channel-3', name: 'event-3', data: { value: 3 } },
      ]);
    });

    it('should transform event to name in batch items', async () => {
      mockPusher.triggerBatch.mockResolvedValue({} as any);

      await service.triggerBatch(batch);

      const call = mockPusher.triggerBatch.mock.calls[0][0];
      call.forEach((item: any) => {
        expect(item).toHaveProperty('name');
        expect(item).not.toHaveProperty('event');
      });
    });

    it('should not trigger batch when Pusher is not configured', async () => {
      delete process.env.PUSHER_APP_ID;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [RealtimeService],
      }).compile();

      const serviceWithoutPusher = module.get<RealtimeService>(RealtimeService);
      await serviceWithoutPusher.triggerBatch(batch);

      expect(mockPusher.triggerBatch).not.toHaveBeenCalled();
    });

    it('should throw error when batch triggering fails', async () => {
      const error = new Error('Batch trigger failed');
      mockPusher.triggerBatch.mockRejectedValue(error);

      await expect(service.triggerBatch(batch)).rejects.toThrow('Batch trigger failed');
    });

    it('should handle empty batch array', async () => {
      mockPusher.triggerBatch.mockResolvedValue({} as any);

      await service.triggerBatch([]);

      expect(mockPusher.triggerBatch).toHaveBeenCalledWith([]);
    });

    it('should handle single item batch', async () => {
      const singleBatch = [{ channel: 'channel-1', event: 'event-1', data: { value: 1 } }];
      mockPusher.triggerBatch.mockResolvedValue({} as any);

      await service.triggerBatch(singleBatch);

      expect(mockPusher.triggerBatch).toHaveBeenCalledWith([
        { channel: 'channel-1', name: 'event-1', data: { value: 1 } },
      ]);
    });

    it('should handle large batch arrays', async () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        channel: `channel-${i}`,
        event: `event-${i}`,
        data: { index: i },
      }));
      mockPusher.triggerBatch.mockResolvedValue({} as any);

      await service.triggerBatch(largeBatch);

      expect(mockPusher.triggerBatch).toHaveBeenCalled();
      const call = mockPusher.triggerBatch.mock.calls[0][0];
      expect(call).toHaveLength(100);
    });
  });

  describe('emitNewResponse', () => {
    const surveyId = 'survey-123';
    const response = {
      id: 'response-456',
      surveyId,
      answers: { q1: 'answer1' },
      submittedAt: '2024-01-01T00:00:00Z',
    };

    it('should emit new-response event to survey channel', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.emitNewResponse(surveyId, response);

      expect(mockPusher.trigger).toHaveBeenCalledWith(
        `survey-${surveyId}`,
        'new-response',
        response,
      );
    });

    it('should format channel name correctly', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.emitNewResponse(surveyId, response);

      const call = mockPusher.trigger.mock.calls[0];
      expect(call[0]).toBe('survey-survey-123');
    });

    it('should pass response data unchanged', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.emitNewResponse(surveyId, response);

      const call = mockPusher.trigger.mock.calls[0];
      expect(call[2]).toEqual(response);
    });

    it('should handle errors from trigger', async () => {
      mockPusher.trigger.mockRejectedValue(new Error('Trigger failed'));

      await expect(service.emitNewResponse(surveyId, response)).rejects.toThrow('Trigger failed');
    });
  });

  describe('emitStatsUpdate', () => {
    const surveyId = 'survey-123';
    const stats = {
      totalResponses: 42,
      completionRate: 0.85,
      averageTime: 120,
    };

    it('should emit stats-update event to survey channel', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.emitStatsUpdate(surveyId, stats);

      expect(mockPusher.trigger).toHaveBeenCalledWith(
        `survey-${surveyId}`,
        'stats-update',
        stats,
      );
    });

    it('should format channel name correctly', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.emitStatsUpdate(surveyId, stats);

      const call = mockPusher.trigger.mock.calls[0];
      expect(call[0]).toBe('survey-survey-123');
    });

    it('should pass stats data unchanged', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.emitStatsUpdate(surveyId, stats);

      const call = mockPusher.trigger.mock.calls[0];
      expect(call[2]).toEqual(stats);
    });

    it('should handle errors from trigger', async () => {
      mockPusher.trigger.mockRejectedValue(new Error('Trigger failed'));

      await expect(service.emitStatsUpdate(surveyId, stats)).rejects.toThrow('Trigger failed');
    });
  });

  describe('emitSurveyUpdate', () => {
    const surveyId = 'survey-123';
    const survey = {
      id: surveyId,
      title: 'Updated Survey',
      description: 'Updated description',
      status: 'active',
    };

    it('should emit survey-update event to survey channel', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.emitSurveyUpdate(surveyId, survey);

      expect(mockPusher.trigger).toHaveBeenCalledWith(
        `survey-${surveyId}`,
        'survey-update',
        survey,
      );
    });

    it('should format channel name correctly', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.emitSurveyUpdate(surveyId, survey);

      const call = mockPusher.trigger.mock.calls[0];
      expect(call[0]).toBe('survey-survey-123');
    });

    it('should pass survey data unchanged', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.emitSurveyUpdate(surveyId, survey);

      const call = mockPusher.trigger.mock.calls[0];
      expect(call[2]).toEqual(survey);
    });

    it('should handle errors from trigger', async () => {
      mockPusher.trigger.mockRejectedValue(new Error('Trigger failed'));

      await expect(service.emitSurveyUpdate(surveyId, survey)).rejects.toThrow('Trigger failed');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in channel names', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.trigger('channel-with-special_chars', 'event', {});

      expect(mockPusher.trigger).toHaveBeenCalledWith(
        'channel-with-special_chars',
        'event',
        {},
      );
    });

    it('should handle special characters in event names', async () => {
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.trigger('channel', 'event-with-special_chars', {});

      expect(mockPusher.trigger).toHaveBeenCalledWith(
        'channel',
        'event-with-special_chars',
        {},
      );
    });

    it('should handle very large data payloads', async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: `item-${i}`,
        })),
      };
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.trigger('channel', 'event', largeData);

      expect(mockPusher.trigger).toHaveBeenCalledWith('channel', 'event', largeData);
    });

    it('should handle unicode characters in data', async () => {
      const unicodeData = {
        message: '你好世界 🌍',
        emoji: '😀😃😄',
      };
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.trigger('channel', 'event', unicodeData);

      expect(mockPusher.trigger).toHaveBeenCalledWith('channel', 'event', unicodeData);
    });

    it('should handle timeout errors', async () => {
      mockPusher.trigger.mockRejectedValue(new Error('Request timeout'));

      await expect(service.trigger('channel', 'event', {})).rejects.toThrow('Request timeout');
    });

    it('should handle rate limiting errors', async () => {
      mockPusher.trigger.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(service.trigger('channel', 'event', {})).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle channel not found errors', async () => {
      mockPusher.trigger.mockRejectedValue(new Error('Channel not found'));

      await expect(service.trigger('nonexistent-channel', 'event', {})).rejects.toThrow('Channel not found');
    });

    it('should handle surveyId with special characters in emit methods', async () => {
      const specialSurveyId = 'survey-with-special_chars-123';
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.emitNewResponse(specialSurveyId, {});

      expect(mockPusher.trigger).toHaveBeenCalledWith(
        `survey-${specialSurveyId}`,
        'new-response',
        {},
      );
    });
  });

  describe('logging', () => {
    it('should log when event is triggered successfully', async () => {
      const loggerLogSpy = jest.spyOn((service as any).logger, 'log');
      mockPusher.trigger.mockResolvedValue({} as any);

      await service.trigger('test-channel', 'test-event', {});

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Event test-event triggered on channel test-channel',
      );
    });

    it('should log when batch is triggered successfully', async () => {
      const loggerLogSpy = jest.spyOn((service as any).logger, 'log');
      mockPusher.triggerBatch.mockResolvedValue({} as any);

      await service.triggerBatch([
        { channel: 'ch1', event: 'ev1', data: {} },
        { channel: 'ch2', event: 'ev2', data: {} },
      ]);

      expect(loggerLogSpy).toHaveBeenCalledWith('Batch of 2 events triggered');
    });

    it('should log error when trigger fails', async () => {
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');
      mockPusher.trigger.mockRejectedValue(new Error('Test error'));

      await expect(service.trigger('channel', 'event', {})).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith('Error triggering Pusher event:', expect.any(Error));
    });

    it('should log error when batch trigger fails', async () => {
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');
      mockPusher.triggerBatch.mockRejectedValue(new Error('Test error'));

      await expect(service.triggerBatch([{ channel: 'ch', event: 'ev', data: {} }])).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith('Error triggering Pusher batch:', expect.any(Error));
    });
  });
});
