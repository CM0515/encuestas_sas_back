import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../src/auth/auth.service';
import { FirebaseService } from '../../src/shared/firebase/firebase.service';
import { LoginDto } from '../../src/auth/dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let firebaseService: jest.Mocked<FirebaseService>;

  const mockDecodedToken: any = {
    uid: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    email_verified: true,
    picture: 'https://example.com/photo.jpg',
  };

  const mockUser = {
    uid: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    emailVerified: true,
    photoURL: 'https://example.com/photo.jpg',
  };

  beforeEach(async () => {
    const mockUserDoc = {
      exists: true,
      id: 'user-123',
      data: () => mockUser,
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'user-123',
        data: () => mockUser,
      }),
      update: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: FirebaseService,
          useValue: {
            verifyIdToken: jest.fn(),
            serverTimestamp: jest.fn().mockReturnValue('2024-01-01T00:00:00Z'),
            firestore: {
              collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue(mockUserDoc),
              }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
    firebaseService = module.get(FirebaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should login successfully and return access token', async () => {
      const loginDto: LoginDto = { idToken: 'valid-firebase-token' };
      const mockAccessToken = 'jwt-access-token';

      firebaseService.verifyIdToken.mockResolvedValue(mockDecodedToken);
      jwtService.sign.mockReturnValue(mockAccessToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        user: {
          uid: mockUser.uid,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        },
      });
      expect(firebaseService.verifyIdToken).toHaveBeenCalledWith(loginDto.idToken);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.uid,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException on invalid token', async () => {
      const loginDto: LoginDto = { idToken: 'invalid-token' };
      firebaseService.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(firebaseService.verifyIdToken).toHaveBeenCalledWith(loginDto.idToken);
    });

    it('should create new user if not exists', async () => {
      const loginDto: LoginDto = { idToken: 'valid-firebase-token' };
      const mockGetFunc = jest.fn()
        .mockResolvedValueOnce({
          exists: false,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: 'user-123',
          data: () => mockUser,
        });

      const mockUserDoc = {
        exists: false,
        id: 'user-123',
        data: () => mockUser,
        get: mockGetFunc,
        set: jest.fn().mockResolvedValue(undefined),
      };

      firebaseService.verifyIdToken.mockResolvedValue(mockDecodedToken);
      (firebaseService.firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockUserDoc),
      });
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(result.user.uid).toBe(mockUser.uid);
      expect(mockUserDoc.set).toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should return user if exists', async () => {
      const result = await service.validateUser('user-123');

      expect(result).toHaveProperty('uid', 'user-123');
      expect(result).toHaveProperty('email', mockUser.email);
    });

    it('should return null if user does not exist', async () => {
      const mockUserDoc = {
        exists: false,
      };

      (firebaseService.firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUserDoc),
        }),
      });

      const result = await service.validateUser('non-existent-user');

      expect(result).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const result = await service.getProfile('user-123');

      expect(result).toHaveProperty('uid', 'user-123');
      expect(result).toHaveProperty('email', mockUser.email);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const mockUserDoc = {
        exists: false,
      };

      (firebaseService.firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUserDoc),
        }),
      });

      await expect(service.getProfile('non-existent-user')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
