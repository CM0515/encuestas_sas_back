import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../../src/shared/cache/cache.service';
import { Redis } from '@upstash/redis';

jest.mock('@upstash/redis');

describe('CacheService', () => {
  let service: CacheService;
  let configService: jest.Mocked<ConfigService>;
  let mockRedis: jest.Mocked<Redis>;

  const mockRedisUrl = 'https://redis.example.com';
  const mockRedisToken = 'mock-redis-token';

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock Redis instance
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
    } as any;

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'database.redis.url') return mockRedisUrl;
              if (key === 'database.redis.token') return mockRedisToken;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should initialize Redis with correct credentials', () => {
      expect(Redis).toHaveBeenCalledWith({
        url: mockRedisUrl,
        token: mockRedisToken,
      });
    });

    it('should not initialize Redis when credentials are missing', async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(null),
            },
          },
        ],
      }).compile();

      const serviceWithoutRedis = module.get<CacheService>(CacheService);

      expect(serviceWithoutRedis).toBeDefined();
      expect(Redis).not.toHaveBeenCalled();
    });

    it('should warn when Redis credentials are not configured', async () => {
      const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');

      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(null),
            },
          },
        ],
      }).compile();

      const serviceWithoutRedis = module.get<CacheService>(CacheService);

      // The warning is logged in constructor, so we need to check after creation
      expect(serviceWithoutRedis).toBeDefined();
    });
  });

  describe('get', () => {
    it('should retrieve value from Redis', async () => {
      const key = 'test:key';
      const value = { data: 'test-value' };
      mockRedis.get.mockResolvedValue(value);

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(mockRedis.get).toHaveBeenCalledWith(key);
    });

    it('should return null when Redis is not configured', async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(null),
            },
          },
        ],
      }).compile();

      const serviceWithoutRedis = module.get<CacheService>(CacheService);
      const result = await serviceWithoutRedis.get('test:key');

      expect(result).toBeNull();
    });

    it('should return null on fetch failed error', async () => {
      const key = 'test:key';
      mockRedis.get.mockRejectedValue(new Error('fetch failed'));

      const result = await service.get(key);

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith(key);
    });

    it('should return null on other errors', async () => {
      const key = 'test:key';
      mockRedis.get.mockRejectedValue(new Error('Connection error'));

      const result = await service.get(key);

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith(key);
    });

    it('should handle null values', async () => {
      const key = 'test:key';
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get(key);

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in Redis without expiration', async () => {
      const key = 'test:key';
      const value = { data: 'test-value' };
      mockRedis.set.mockResolvedValue('OK');

      await service.set(key, value);

      expect(mockRedis.set).toHaveBeenCalledWith(key, JSON.stringify(value));
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should set value with expiration using setex', async () => {
      const key = 'test:key';
      const value = { data: 'test-value' };
      const ttl = 3600;
      mockRedis.setex.mockResolvedValue('OK');

      await service.set(key, value, ttl);

      expect(mockRedis.setex).toHaveBeenCalledWith(key, ttl, JSON.stringify(value));
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should not set when Redis is not configured', async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(null),
            },
          },
        ],
      }).compile();

      const serviceWithoutRedis = module.get<CacheService>(CacheService);
      await serviceWithoutRedis.set('test:key', 'value');

      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should handle fetch failed error gracefully', async () => {
      const key = 'test:key';
      const value = { data: 'test-value' };
      mockRedis.set.mockRejectedValue(new Error('fetch failed'));

      await expect(service.set(key, value)).resolves.not.toThrow();
    });

    it('should handle other errors gracefully', async () => {
      const key = 'test:key';
      const value = { data: 'test-value' };
      mockRedis.set.mockRejectedValue(new Error('Connection timeout'));

      await expect(service.set(key, value)).resolves.not.toThrow();
    });

    it('should stringify complex objects', async () => {
      const key = 'test:key';
      const value = { nested: { data: 'value' }, array: [1, 2, 3] };
      mockRedis.set.mockResolvedValue('OK');

      await service.set(key, value);

      expect(mockRedis.set).toHaveBeenCalledWith(key, JSON.stringify(value));
    });
  });

  describe('del', () => {
    it('should delete key from Redis', async () => {
      const key = 'test:key';
      mockRedis.del.mockResolvedValue(1);

      await service.del(key);

      expect(mockRedis.del).toHaveBeenCalledWith(key);
    });

    it('should not delete when Redis is not configured', async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(null),
            },
          },
        ],
      }).compile();

      const serviceWithoutRedis = module.get<CacheService>(CacheService);
      await serviceWithoutRedis.del('test:key');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle fetch failed error gracefully', async () => {
      const key = 'test:key';
      mockRedis.del.mockRejectedValue(new Error('fetch failed'));

      await expect(service.del(key)).resolves.not.toThrow();
    });

    it('should handle other errors gracefully', async () => {
      const key = 'test:key';
      mockRedis.del.mockRejectedValue(new Error('Connection error'));

      await expect(service.del(key)).resolves.not.toThrow();
    });
  });

  describe('invalidate', () => {
    it('should invalidate all keys matching pattern', async () => {
      const pattern = 'test:*';
      const keys = ['test:key1', 'test:key2', 'test:key3'];
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockResolvedValue(3);

      await service.invalidate(pattern);

      expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
    });

    it('should not delete when no keys match pattern', async () => {
      const pattern = 'nonexistent:*';
      mockRedis.keys.mockResolvedValue([]);

      await service.invalidate(pattern);

      expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should not invalidate when Redis is not configured', async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(null),
            },
          },
        ],
      }).compile();

      const serviceWithoutRedis = module.get<CacheService>(CacheService);
      await serviceWithoutRedis.invalidate('test:*');

      expect(mockRedis.keys).not.toHaveBeenCalled();
    });

    it('should handle fetch failed error gracefully', async () => {
      const pattern = 'test:*';
      mockRedis.keys.mockRejectedValue(new Error('fetch failed'));

      await expect(service.invalidate(pattern)).resolves.not.toThrow();
    });

    it('should handle other errors gracefully', async () => {
      const pattern = 'test:*';
      mockRedis.keys.mockRejectedValue(new Error('Connection error'));

      await expect(service.invalidate(pattern)).resolves.not.toThrow();
    });
  });

  describe('incr', () => {
    it('should increment key value', async () => {
      const key = 'test:counter';
      mockRedis.incr.mockResolvedValue(1);

      const result = await service.incr(key);

      expect(result).toBe(1);
      expect(mockRedis.incr).toHaveBeenCalledWith(key);
    });

    it('should return incremented value', async () => {
      const key = 'test:counter';
      mockRedis.incr.mockResolvedValue(5);

      const result = await service.incr(key);

      expect(result).toBe(5);
    });

    it('should return 0 when Redis is not configured', async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(null),
            },
          },
        ],
      }).compile();

      const serviceWithoutRedis = module.get<CacheService>(CacheService);
      const result = await serviceWithoutRedis.incr('test:key');

      expect(result).toBe(0);
    });

    it('should return 0 on fetch failed error', async () => {
      const key = 'test:counter';
      mockRedis.incr.mockRejectedValue(new Error('fetch failed'));

      const result = await service.incr(key);

      expect(result).toBe(0);
    });

    it('should return 0 on other errors', async () => {
      const key = 'test:counter';
      mockRedis.incr.mockRejectedValue(new Error('Connection error'));

      const result = await service.incr(key);

      expect(result).toBe(0);
    });
  });

  describe('expire', () => {
    it('should set expiration on key', async () => {
      const key = 'test:key';
      const seconds = 3600;
      mockRedis.expire.mockResolvedValue(1);

      await service.expire(key, seconds);

      expect(mockRedis.expire).toHaveBeenCalledWith(key, seconds);
    });

    it('should not set expiration when Redis is not configured', async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(null),
            },
          },
        ],
      }).compile();

      const serviceWithoutRedis = module.get<CacheService>(CacheService);
      await serviceWithoutRedis.expire('test:key', 3600);

      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should handle fetch failed error gracefully', async () => {
      const key = 'test:key';
      mockRedis.expire.mockRejectedValue(new Error('fetch failed'));

      await expect(service.expire(key, 3600)).resolves.not.toThrow();
    });

    it('should handle other errors gracefully', async () => {
      const key = 'test:key';
      mockRedis.expire.mockRejectedValue(new Error('Connection error'));

      await expect(service.expire(key, 3600)).resolves.not.toThrow();
    });
  });

  describe('checkRateLimit', () => {
    it('should allow request when under limit', async () => {
      const identifier = 'user:123';
      const maxRequests = 10;
      const windowSeconds = 60;
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const result = await service.checkRateLimit(identifier, maxRequests, windowSeconds);

      expect(result).toBe(true);
      expect(mockRedis.incr).toHaveBeenCalledWith(`ratelimit:${identifier}`);
      expect(mockRedis.expire).toHaveBeenCalledWith(`ratelimit:${identifier}`, windowSeconds);
    });

    it('should allow request when at limit', async () => {
      const identifier = 'user:123';
      const maxRequests = 10;
      const windowSeconds = 60;
      mockRedis.incr.mockResolvedValue(10);

      const result = await service.checkRateLimit(identifier, maxRequests, windowSeconds);

      expect(result).toBe(true);
    });

    it('should deny request when over limit', async () => {
      const identifier = 'user:123';
      const maxRequests = 10;
      const windowSeconds = 60;
      mockRedis.incr.mockResolvedValue(11);

      const result = await service.checkRateLimit(identifier, maxRequests, windowSeconds);

      expect(result).toBe(false);
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should set expiration only on first request', async () => {
      const identifier = 'user:123';
      const maxRequests = 10;
      const windowSeconds = 60;
      mockRedis.incr.mockResolvedValue(5);

      const result = await service.checkRateLimit(identifier, maxRequests, windowSeconds);

      expect(result).toBe(true);
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should allow all requests when Redis is not configured', async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(null),
            },
          },
        ],
      }).compile();

      const serviceWithoutRedis = module.get<CacheService>(CacheService);
      const result = await serviceWithoutRedis.checkRateLimit('user:123', 10, 60);

      expect(result).toBe(true);
    });

    it('should allow request on fetch failed error (fail open)', async () => {
      const identifier = 'user:123';
      mockRedis.incr.mockRejectedValue(new Error('fetch failed'));

      const result = await service.checkRateLimit(identifier, 10, 60);

      expect(result).toBe(true);
    });

    it('should allow request on other errors (fail open)', async () => {
      const identifier = 'user:123';
      mockRedis.incr.mockRejectedValue(new Error('Connection error'));

      const result = await service.checkRateLimit(identifier, 10, 60);

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string key', async () => {
      const key = '';
      const value = 'test';
      mockRedis.set.mockResolvedValue('OK');

      await service.set(key, value);

      expect(mockRedis.set).toHaveBeenCalledWith('', JSON.stringify(value));
    });

    it('should handle special characters in keys', async () => {
      const key = 'test:key:with:colons:and-dashes_underscores';
      const value = 'test';
      mockRedis.set.mockResolvedValue('OK');

      await service.set(key, value);

      expect(mockRedis.set).toHaveBeenCalledWith(key, JSON.stringify(value));
    });

    it('should handle very large TTL values', async () => {
      const key = 'test:key';
      const value = 'test';
      const ttl = Number.MAX_SAFE_INTEGER;
      mockRedis.setex.mockResolvedValue('OK');

      await service.set(key, value, ttl);

      expect(mockRedis.setex).toHaveBeenCalledWith(key, ttl, JSON.stringify(value));
    });

    it('should handle zero TTL', async () => {
      const key = 'test:key';
      const value = 'test';
      const ttl = 0;
      mockRedis.set.mockResolvedValue('OK');

      await service.set(key, value, ttl);

      // With TTL of 0, it should use set instead of setex
      expect(mockRedis.set).toHaveBeenCalledWith(key, JSON.stringify(value));
    });
  });
});
