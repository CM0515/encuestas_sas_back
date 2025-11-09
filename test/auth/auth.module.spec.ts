import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { AuthModule } from '../../src/auth/auth.module';
import { FirebaseService } from '../../src/shared/firebase/firebase.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthModule', () => {
  let module: TestingModule;

  const mockFirebaseService = {
    verifyIdToken: jest.fn(),
    serverTimestamp: jest.fn(),
    firestore: {
      collection: jest.fn(),
    },
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: FirebaseService, useValue: mockFirebaseService },
        JwtService,
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have AuthController', () => {
    const controller = module.get<AuthController>(AuthController);
    expect(controller).toBeDefined();
  });

  it('should have AuthService', () => {
    const service = module.get<AuthService>(AuthService);
    expect(service).toBeDefined();
  });

  describe('module configuration', () => {
    it('should have correct controllers', () => {
      const controllers = Reflect.getMetadata('controllers', AuthModule);
      expect(controllers).toEqual([AuthController]);
    });

    it('should have correct providers', () => {
      const providers = Reflect.getMetadata('providers', AuthModule);
      expect(providers).toContain(AuthService);
    });
  });
});
