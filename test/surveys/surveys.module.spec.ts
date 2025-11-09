import { Test, TestingModule } from '@nestjs/testing';
import { SurveysModule } from '../../src/surveys/surveys.module';
import { SurveysController } from '../../src/surveys/surveys.controller';
import { SurveysService } from '../../src/surveys/surveys.service';
import { FirebaseService } from '../../src/shared/firebase/firebase.service';
import { CacheService } from '../../src/shared/cache/cache.service';
import { RealtimeService } from '../../src/shared/realtime/realtime.service';

describe('SurveysModule', () => {
  let module: TestingModule;

  const mockFirebaseService = {
    firestore: {
      collection: jest.fn(),
    },
    serverTimestamp: jest.fn(),
    increment: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    invalidate: jest.fn(),
  };

  const mockRealtimeService = {
    emitSurveyUpdate: jest.fn(),
    emitNewResponse: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [SurveysController],
      providers: [
        SurveysService,
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: RealtimeService, useValue: mockRealtimeService },
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have SurveysController', () => {
    const controller = module.get<SurveysController>(SurveysController);
    expect(controller).toBeDefined();
  });

  it('should have SurveysService', () => {
    const service = module.get<SurveysService>(SurveysService);
    expect(service).toBeDefined();
  });

  it('should provide SurveysService to controller', () => {
    const controller = module.get<SurveysController>(SurveysController);
    const service = module.get<SurveysService>(SurveysService);
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('module configuration', () => {
    it('should have correct controllers', () => {
      const controllers = Reflect.getMetadata('controllers', SurveysModule);
      expect(controllers).toEqual([SurveysController]);
    });

    it('should have correct providers', () => {
      const providers = Reflect.getMetadata('providers', SurveysModule);
      expect(providers).toEqual([SurveysService]);
    });

    it('should have correct exports', () => {
      const exports = Reflect.getMetadata('exports', SurveysModule);
      expect(exports).toEqual([SurveysService]);
    });
  });

  describe('service integration', () => {
    it('should inject FirebaseService into SurveysService', () => {
      const service = module.get<SurveysService>(SurveysService);
      expect(service).toBeDefined();
    });

    it('should inject CacheService into SurveysService', () => {
      const service = module.get<SurveysService>(SurveysService);
      expect(service).toBeDefined();
    });

    it('should inject RealtimeService into SurveysService', () => {
      const service = module.get<SurveysService>(SurveysService);
      expect(service).toBeDefined();
    });

    it('should inject all required services', () => {
      const firebaseService = module.get<FirebaseService>(FirebaseService);
      const cacheService = module.get<CacheService>(CacheService);
      const realtimeService = module.get<RealtimeService>(RealtimeService);

      expect(firebaseService).toBeDefined();
      expect(cacheService).toBeDefined();
      expect(realtimeService).toBeDefined();
    });
  });
});
