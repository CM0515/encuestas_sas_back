import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { LoginDto } from '../../src/auth/dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  const mockLoginResponse = {
    accessToken: 'jwt-token',
    user: {
      uid: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    },
  };

  const mockUserProfile = {
    uid: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            getProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const loginDto: LoginDto = { idToken: 'firebase-token' };
      service.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockLoginResponse);
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });

    it('should handle login errors', async () => {
      const loginDto: LoginDto = { idToken: 'invalid-token' };
      const error = new Error('Invalid credentials');
      service.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow(error);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      service.getProfile.mockResolvedValue(mockUserProfile);

      const result = await controller.getProfile('user-123');

      expect(result).toEqual(mockUserProfile);
      expect(service.getProfile).toHaveBeenCalledWith('user-123');
    });

    it('should handle profile not found', async () => {
      const error = new Error('User not found');
      service.getProfile.mockRejectedValue(error);

      await expect(controller.getProfile('non-existent')).rejects.toThrow(error);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user from decorator', async () => {
      const currentUser = mockUserProfile;

      const result = await controller.getCurrentUser(currentUser);

      expect(result).toEqual(currentUser);
    });
  });
});
