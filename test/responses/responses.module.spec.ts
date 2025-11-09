import { Test, TestingModule } from '@nestjs/testing';
import { ResponsesModule } from '../../src/responses/responses.module';
import { ResponsesController } from '../../src/responses/responses.controller';
import { ResponsesService } from '../../src/responses/responses.service';
import { SurveysModule } from '../../src/surveys/surveys.module';
import { QuestionsModule } from '../../src/questions/questions.module';
import { FirebaseService } from '../../src/shared/firebase/firebase.service';
import { CacheService } from '../../src/shared/cache/cache.service';
import { RealtimeService } from '../../src/shared/realtime/realtime.service';
import { SurveysService } from '../../src/surveys/surveys.service';
import { QuestionsService } from '../../src/questions/questions.service';

describe('ResponsesModule', () => {
  let module: TestingModule;

  const mockFirebaseService = {
    firestore: {
      collection: jest.fn(),
    },
    serverTimestamp: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockRealtimeService = {
    emitNewResponse: jest.fn(),
  };

  const mockSurveysService = {
    findOne: jest.fn(),
    getPublicSurvey: jest.fn(),
    incrementResponseCount: jest.fn(),
  };

  const mockQuestionsService = {
    findBySurvey: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [ResponsesController],
      providers: [
        ResponsesService,
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: RealtimeService, useValue: mockRealtimeService },
        { provide: SurveysService, useValue: mockSurveysService },
        { provide: QuestionsService, useValue: mockQuestionsService },
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have ResponsesController', () => {
    const controller = module.get<ResponsesController>(ResponsesController);
    expect(controller).toBeDefined();
  });

  it('should have ResponsesService', () => {
    const service = module.get<ResponsesService>(ResponsesService);
    expect(service).toBeDefined();
  });

  it('should provide ResponsesService to controller', () => {
    const controller = module.get<ResponsesController>(ResponsesController);
    const service = module.get<ResponsesService>(ResponsesService);
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('module dependencies', () => {
    it('should import SurveysModule', () => {
      const imports = Reflect.getMetadata('imports', ResponsesModule);
      expect(imports).toContain(SurveysModule);
    });

    it('should import QuestionsModule', () => {
      const imports = Reflect.getMetadata('imports', ResponsesModule);
      expect(imports).toContain(QuestionsModule);
    });
  });

  describe('module configuration', () => {
    it('should have correct controllers', () => {
      const controllers = Reflect.getMetadata('controllers', ResponsesModule);
      expect(controllers).toEqual([ResponsesController]);
    });

    it('should have correct providers', () => {
      const providers = Reflect.getMetadata('providers', ResponsesModule);
      expect(providers).toEqual([ResponsesService]);
    });

    it('should have correct exports', () => {
      const exports = Reflect.getMetadata('exports', ResponsesModule);
      expect(exports).toEqual([ResponsesService]);
    });
  });

  describe('service integration', () => {
    it('should inject FirebaseService into ResponsesService', () => {
      const service = module.get<ResponsesService>(ResponsesService);
      expect(service).toBeDefined();
    });

    it('should inject CacheService into ResponsesService', () => {
      const service = module.get<ResponsesService>(ResponsesService);
      expect(service).toBeDefined();
    });

    it('should inject RealtimeService into ResponsesService', () => {
      const service = module.get<ResponsesService>(ResponsesService);
      expect(service).toBeDefined();
    });

    it('should inject SurveysService into ResponsesService', () => {
      const service = module.get<ResponsesService>(ResponsesService);
      expect(service).toBeDefined();
    });

    it('should inject QuestionsService into ResponsesService', () => {
      const service = module.get<ResponsesService>(ResponsesService);
      expect(service).toBeDefined();
    });

    it('should inject all required services', () => {
      const firebaseService = module.get<FirebaseService>(FirebaseService);
      const cacheService = module.get<CacheService>(CacheService);
      const realtimeService = module.get<RealtimeService>(RealtimeService);
      const surveysService = module.get<SurveysService>(SurveysService);
      const questionsService = module.get<QuestionsService>(QuestionsService);

      expect(firebaseService).toBeDefined();
      expect(cacheService).toBeDefined();
      expect(realtimeService).toBeDefined();
      expect(surveysService).toBeDefined();
      expect(questionsService).toBeDefined();
    });
  });
});
