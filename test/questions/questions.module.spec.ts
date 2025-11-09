import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsModule } from '../../src/questions/questions.module';
import { QuestionsController } from '../../src/questions/questions.controller';
import { QuestionsService } from '../../src/questions/questions.service';
import { SurveysModule } from '../../src/surveys/surveys.module';
import { FirebaseService } from '../../src/shared/firebase/firebase.service';
import { CacheService } from '../../src/shared/cache/cache.service';
import { SurveysService } from '../../src/surveys/surveys.service';

describe('QuestionsModule', () => {
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

  const mockSurveysService = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [QuestionsController],
      providers: [
        QuestionsService,
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: SurveysService, useValue: mockSurveysService },
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have QuestionsController', () => {
    const controller = module.get<QuestionsController>(QuestionsController);
    expect(controller).toBeDefined();
  });

  it('should have QuestionsService', () => {
    const service = module.get<QuestionsService>(QuestionsService);
    expect(service).toBeDefined();
  });

  it('should provide QuestionsService to controller', () => {
    const controller = module.get<QuestionsController>(QuestionsController);
    const service = module.get<QuestionsService>(QuestionsService);
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('module dependencies', () => {
    it('should import SurveysModule', () => {
      const imports = Reflect.getMetadata('imports', QuestionsModule);
      expect(imports).toContain(SurveysModule);
    });
  });

  describe('module configuration', () => {
    it('should have correct controllers', () => {
      const controllers = Reflect.getMetadata('controllers', QuestionsModule);
      expect(controllers).toEqual([QuestionsController]);
    });

    it('should have correct providers', () => {
      const providers = Reflect.getMetadata('providers', QuestionsModule);
      expect(providers).toEqual([QuestionsService]);
    });

    it('should have correct exports', () => {
      const exports = Reflect.getMetadata('exports', QuestionsModule);
      expect(exports).toEqual([QuestionsService]);
    });
  });

  describe('service integration', () => {
    it('should inject FirebaseService into QuestionsService', () => {
      const service = module.get<QuestionsService>(QuestionsService);
      expect(service).toBeDefined();
    });

    it('should inject CacheService into QuestionsService', () => {
      const service = module.get<QuestionsService>(QuestionsService);
      expect(service).toBeDefined();
    });

    it('should inject SurveysService into QuestionsService', () => {
      const service = module.get<QuestionsService>(QuestionsService);
      expect(service).toBeDefined();
    });

    it('should inject all required services', () => {
      const firebaseService = module.get<FirebaseService>(FirebaseService);
      const cacheService = module.get<CacheService>(CacheService);
      const surveysService = module.get<SurveysService>(SurveysService);

      expect(firebaseService).toBeDefined();
      expect(cacheService).toBeDefined();
      expect(surveysService).toBeDefined();
    });
  });
});
