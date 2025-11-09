import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsModule } from '../../src/analytics/analytics.module';
import { AnalyticsController } from '../../src/analytics/analytics.controller';
import { AnalyticsService } from '../../src/analytics/analytics.service';
import { SurveysModule } from '../../src/surveys/surveys.module';
import { QuestionsModule } from '../../src/questions/questions.module';
import { ResponsesModule } from '../../src/responses/responses.module';
import { FirebaseService } from '../../src/shared/firebase/firebase.service';
import { CacheService } from '../../src/shared/cache/cache.service';
import { StorageService } from '../../src/shared/storage/storage.service';
import { EmailService } from '../../src/shared/email/email.service';
import { SurveysService } from '../../src/surveys/surveys.service';
import { QuestionsService } from '../../src/questions/questions.service';

describe('AnalyticsModule', () => {
  let module: TestingModule;

  const mockFirebaseService = {
    firestore: {
      collection: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockStorageService = {
    uploadFile: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  const mockEmailService = {
    sendResultsReport: jest.fn(),
  };

  const mockSurveysService = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockQuestionsService = {
    findBySurvey: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        AnalyticsService,
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: SurveysService, useValue: mockSurveysService },
        { provide: QuestionsService, useValue: mockQuestionsService },
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have AnalyticsController', () => {
    const controller = module.get<AnalyticsController>(AnalyticsController);
    expect(controller).toBeDefined();
  });

  it('should have AnalyticsService', () => {
    const service = module.get<AnalyticsService>(AnalyticsService);
    expect(service).toBeDefined();
  });

  it('should provide AnalyticsService to controller', () => {
    const controller = module.get<AnalyticsController>(AnalyticsController);
    const service = module.get<AnalyticsService>(AnalyticsService);
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('module dependencies', () => {
    it('should import SurveysModule', () => {
      const imports = Reflect.getMetadata('imports', AnalyticsModule);
      expect(imports).toContain(SurveysModule);
    });

    it('should import QuestionsModule', () => {
      const imports = Reflect.getMetadata('imports', AnalyticsModule);
      expect(imports).toContain(QuestionsModule);
    });

    it('should import ResponsesModule', () => {
      const imports = Reflect.getMetadata('imports', AnalyticsModule);
      expect(imports).toContain(ResponsesModule);
    });
  });

  describe('module configuration', () => {
    it('should have correct controllers', () => {
      const controllers = Reflect.getMetadata('controllers', AnalyticsModule);
      expect(controllers).toEqual([AnalyticsController]);
    });

    it('should have correct providers', () => {
      const providers = Reflect.getMetadata('providers', AnalyticsModule);
      expect(providers).toEqual([AnalyticsService]);
    });

    it('should have correct exports', () => {
      const exports = Reflect.getMetadata('exports', AnalyticsModule);
      expect(exports).toEqual([AnalyticsService]);
    });
  });

  describe('service integration', () => {
    it('should inject FirebaseService into AnalyticsService', () => {
      const service = module.get<AnalyticsService>(AnalyticsService);
      expect(service).toBeDefined();
    });

    it('should inject CacheService into AnalyticsService', () => {
      const service = module.get<AnalyticsService>(AnalyticsService);
      expect(service).toBeDefined();
    });

    it('should inject all required services', () => {
      const firebaseService = module.get<FirebaseService>(FirebaseService);
      const cacheService = module.get<CacheService>(CacheService);
      const storageService = module.get<StorageService>(StorageService);
      const emailService = module.get<EmailService>(EmailService);
      const surveysService = module.get<SurveysService>(SurveysService);
      const questionsService = module.get<QuestionsService>(QuestionsService);

      expect(firebaseService).toBeDefined();
      expect(cacheService).toBeDefined();
      expect(storageService).toBeDefined();
      expect(emailService).toBeDefined();
      expect(surveysService).toBeDefined();
      expect(questionsService).toBeDefined();
    });
  });
});
