import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseService } from '../../../src/shared/firebase/firebase.service';
import * as admin from 'firebase-admin';

describe('FirebaseService', () => {
  let service: FirebaseService;
  let mockFirebaseAdmin: jest.Mocked<typeof admin>;
  let mockAuth: jest.Mocked<admin.auth.Auth>;
  let mockFirestore: jest.Mocked<admin.firestore.Firestore>;
  let mockStorage: jest.Mocked<admin.storage.Storage>;

  beforeEach(async () => {
    // Create mock instances
    mockAuth = {
      verifyIdToken: jest.fn(),
      getUser: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
    } as any;

    mockFirestore = {
      collection: jest.fn(),
      doc: jest.fn(),
      batch: jest.fn(),
      runTransaction: jest.fn(),
    } as any;

    mockStorage = {
      bucket: jest.fn(),
    } as any;

    // Create mock Firebase Admin
    mockFirebaseAdmin = {
      auth: jest.fn().mockReturnValue(mockAuth),
      firestore: jest.fn().mockReturnValue(mockFirestore),
      storage: jest.fn().mockReturnValue(mockStorage),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseService,
        {
          provide: 'FIREBASE_ADMIN',
          useValue: mockFirebaseAdmin,
        },
      ],
    }).compile();

    service = module.get<FirebaseService>(FirebaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('firestore getter', () => {
    it('should return Firestore instance', () => {
      const result = service.firestore;

      expect(result).toBe(mockFirestore);
      expect(mockFirebaseAdmin.firestore).toHaveBeenCalled();
    });

    it('should call firestore() method on each access', () => {
      mockFirebaseAdmin.firestore.mockClear();

      const first = service.firestore;
      const second = service.firestore;

      expect(mockFirebaseAdmin.firestore).toHaveBeenCalledTimes(2);
    });
  });

  describe('auth getter', () => {
    it('should return Auth instance', () => {
      const result = service.auth;

      expect(result).toBe(mockAuth);
      expect(mockFirebaseAdmin.auth).toHaveBeenCalled();
    });

    it('should call auth() method on each access', () => {
      mockFirebaseAdmin.auth.mockClear();

      const first = service.auth;
      const second = service.auth;

      expect(mockFirebaseAdmin.auth).toHaveBeenCalledTimes(2);
    });
  });

  describe('storage getter', () => {
    it('should return Storage instance', () => {
      const result = service.storage;

      expect(result).toBe(mockStorage);
      expect(mockFirebaseAdmin.storage).toHaveBeenCalled();
    });

    it('should call storage() method on each access', () => {
      mockFirebaseAdmin.storage.mockClear();

      const first = service.storage;
      const second = service.storage;

      expect(mockFirebaseAdmin.storage).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyIdToken', () => {
    const mockIdToken = 'mock-firebase-id-token';
    const mockDecodedToken: admin.auth.DecodedIdToken = {
      uid: 'user-123',
      email: 'user@example.com',
      email_verified: true,
      name: 'Test User',
      picture: 'https://example.com/photo.jpg',
      aud: 'mock-audience',
      auth_time: 1234567890,
      exp: 1234571490,
      firebase: {
        identities: {
          email: ['user@example.com'],
        },
        sign_in_provider: 'password',
      },
      iat: 1234567890,
      iss: 'https://securetoken.google.com/mock-project',
      sub: 'user-123',
    };

    it('should verify ID token successfully', async () => {
      mockAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      const result = await service.verifyIdToken(mockIdToken);

      expect(result).toEqual(mockDecodedToken);
      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith(mockIdToken);
    });

    it('should return decoded token with correct uid', async () => {
      mockAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      const result = await service.verifyIdToken(mockIdToken);

      expect(result.uid).toBe('user-123');
      expect(result.email).toBe('user@example.com');
    });

    it('should throw error for invalid token', async () => {
      const error = new Error('Invalid token');
      mockAuth.verifyIdToken.mockRejectedValue(error);

      await expect(service.verifyIdToken('invalid-token')).rejects.toThrow('Invalid token');
      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('invalid-token');
    });

    it('should throw error for expired token', async () => {
      const error = new Error('Token expired');
      mockAuth.verifyIdToken.mockRejectedValue(error);

      await expect(service.verifyIdToken(mockIdToken)).rejects.toThrow('Token expired');
    });

    it('should throw error for revoked token', async () => {
      const error = new Error('Token has been revoked');
      mockAuth.verifyIdToken.mockRejectedValue(error);

      await expect(service.verifyIdToken(mockIdToken)).rejects.toThrow('Token has been revoked');
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      mockAuth.verifyIdToken.mockRejectedValue(error);

      await expect(service.verifyIdToken(mockIdToken)).rejects.toThrow('Network error');
    });

    it('should handle empty token', async () => {
      const error = new Error('The provided token is empty');
      mockAuth.verifyIdToken.mockRejectedValue(error);

      await expect(service.verifyIdToken('')).rejects.toThrow('The provided token is empty');
    });

    it('should handle malformed token', async () => {
      const error = new Error('Decoding Firebase ID token failed');
      mockAuth.verifyIdToken.mockRejectedValue(error);

      await expect(service.verifyIdToken('malformed.token')).rejects.toThrow('Decoding Firebase ID token failed');
    });
  });

  describe('serverTimestamp', () => {
    it('should return FieldValue.serverTimestamp()', () => {
      const mockTimestamp = { _methodName: 'FieldValue.serverTimestamp' } as any;
      const spy = jest.spyOn(admin.firestore.FieldValue, 'serverTimestamp').mockReturnValue(mockTimestamp);

      const result = service.serverTimestamp();

      expect(result).toBe(mockTimestamp);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should call serverTimestamp on each access', () => {
      const mockTimestamp = { _methodName: 'FieldValue.serverTimestamp' } as any;
      const spy = jest.spyOn(admin.firestore.FieldValue, 'serverTimestamp').mockReturnValue(mockTimestamp);

      service.serverTimestamp();
      service.serverTimestamp();

      expect(spy).toHaveBeenCalledTimes(2);
      spy.mockRestore();
    });
  });

  describe('increment', () => {
    it('should return FieldValue.increment with default value of 1', () => {
      const mockIncrement = { _methodName: 'FieldValue.increment', _operand: 1 } as any;
      jest.spyOn(admin.firestore.FieldValue, 'increment').mockReturnValue(mockIncrement);

      const result = service.increment();

      expect(result).toBe(mockIncrement);
      expect(admin.firestore.FieldValue.increment).toHaveBeenCalledWith(1);
    });

    it('should return FieldValue.increment with custom positive value', () => {
      const mockIncrement = { _methodName: 'FieldValue.increment', _operand: 5 } as any;
      jest.spyOn(admin.firestore.FieldValue, 'increment').mockReturnValue(mockIncrement);

      const result = service.increment(5);

      expect(result).toBe(mockIncrement);
      expect(admin.firestore.FieldValue.increment).toHaveBeenCalledWith(5);
    });

    it('should return FieldValue.increment with negative value', () => {
      const mockIncrement = { _methodName: 'FieldValue.increment', _operand: -3 } as any;
      jest.spyOn(admin.firestore.FieldValue, 'increment').mockReturnValue(mockIncrement);

      const result = service.increment(-3);

      expect(result).toBe(mockIncrement);
      expect(admin.firestore.FieldValue.increment).toHaveBeenCalledWith(-3);
    });

    it('should handle zero increment', () => {
      const mockIncrement = { _methodName: 'FieldValue.increment', _operand: 0 } as any;
      jest.spyOn(admin.firestore.FieldValue, 'increment').mockReturnValue(mockIncrement);

      const result = service.increment(0);

      expect(result).toBe(mockIncrement);
      expect(admin.firestore.FieldValue.increment).toHaveBeenCalledWith(0);
    });

    it('should handle large increment values', () => {
      const mockIncrement = { _methodName: 'FieldValue.increment', _operand: 1000000 } as any;
      jest.spyOn(admin.firestore.FieldValue, 'increment').mockReturnValue(mockIncrement);

      const result = service.increment(1000000);

      expect(result).toBe(mockIncrement);
      expect(admin.firestore.FieldValue.increment).toHaveBeenCalledWith(1000000);
    });

    it('should handle decimal values', () => {
      const mockIncrement = { _methodName: 'FieldValue.increment', _operand: 1.5 } as any;
      jest.spyOn(admin.firestore.FieldValue, 'increment').mockReturnValue(mockIncrement);

      const result = service.increment(1.5);

      expect(result).toBe(mockIncrement);
      expect(admin.firestore.FieldValue.increment).toHaveBeenCalledWith(1.5);
    });
  });

  describe('arrayUnion', () => {
    it('should return FieldValue.arrayUnion with single element', () => {
      const mockArrayUnion = { _methodName: 'FieldValue.arrayUnion', _elements: ['item1'] } as any;
      jest.spyOn(admin.firestore.FieldValue, 'arrayUnion').mockReturnValue(mockArrayUnion);

      const result = service.arrayUnion('item1');

      expect(result).toBe(mockArrayUnion);
      expect(admin.firestore.FieldValue.arrayUnion).toHaveBeenCalledWith('item1');
    });

    it('should return FieldValue.arrayUnion with multiple elements', () => {
      const mockArrayUnion = { _methodName: 'FieldValue.arrayUnion', _elements: ['item1', 'item2', 'item3'] } as any;
      jest.spyOn(admin.firestore.FieldValue, 'arrayUnion').mockReturnValue(mockArrayUnion);

      const result = service.arrayUnion('item1', 'item2', 'item3');

      expect(result).toBe(mockArrayUnion);
      expect(admin.firestore.FieldValue.arrayUnion).toHaveBeenCalledWith('item1', 'item2', 'item3');
    });

    it('should handle object elements', () => {
      const obj1 = { id: 1, name: 'Object 1' };
      const obj2 = { id: 2, name: 'Object 2' };
      const mockArrayUnion = { _methodName: 'FieldValue.arrayUnion', _elements: [obj1, obj2] } as any;
      jest.spyOn(admin.firestore.FieldValue, 'arrayUnion').mockReturnValue(mockArrayUnion);

      const result = service.arrayUnion(obj1, obj2);

      expect(result).toBe(mockArrayUnion);
      expect(admin.firestore.FieldValue.arrayUnion).toHaveBeenCalledWith(obj1, obj2);
    });

    it('should handle mixed type elements', () => {
      const mockArrayUnion = { _methodName: 'FieldValue.arrayUnion', _elements: ['string', 123, true] } as any;
      jest.spyOn(admin.firestore.FieldValue, 'arrayUnion').mockReturnValue(mockArrayUnion);

      const result = service.arrayUnion('string', 123, true);

      expect(result).toBe(mockArrayUnion);
      expect(admin.firestore.FieldValue.arrayUnion).toHaveBeenCalledWith('string', 123, true);
    });

    it('should handle empty array', () => {
      const mockArrayUnion = { _methodName: 'FieldValue.arrayUnion', _elements: [] } as any;
      jest.spyOn(admin.firestore.FieldValue, 'arrayUnion').mockReturnValue(mockArrayUnion);

      const result = service.arrayUnion();

      expect(result).toBe(mockArrayUnion);
      expect(admin.firestore.FieldValue.arrayUnion).toHaveBeenCalledWith();
    });
  });

  describe('arrayRemove', () => {
    it('should return FieldValue.arrayRemove with single element', () => {
      const mockArrayRemove = { _methodName: 'FieldValue.arrayRemove', _elements: ['item1'] } as any;
      jest.spyOn(admin.firestore.FieldValue, 'arrayRemove').mockReturnValue(mockArrayRemove);

      const result = service.arrayRemove('item1');

      expect(result).toBe(mockArrayRemove);
      expect(admin.firestore.FieldValue.arrayRemove).toHaveBeenCalledWith('item1');
    });

    it('should return FieldValue.arrayRemove with multiple elements', () => {
      const mockArrayRemove = { _methodName: 'FieldValue.arrayRemove', _elements: ['item1', 'item2', 'item3'] } as any;
      jest.spyOn(admin.firestore.FieldValue, 'arrayRemove').mockReturnValue(mockArrayRemove);

      const result = service.arrayRemove('item1', 'item2', 'item3');

      expect(result).toBe(mockArrayRemove);
      expect(admin.firestore.FieldValue.arrayRemove).toHaveBeenCalledWith('item1', 'item2', 'item3');
    });

    it('should handle object elements', () => {
      const obj1 = { id: 1, name: 'Object 1' };
      const obj2 = { id: 2, name: 'Object 2' };
      const mockArrayRemove = { _methodName: 'FieldValue.arrayRemove', _elements: [obj1, obj2] } as any;
      jest.spyOn(admin.firestore.FieldValue, 'arrayRemove').mockReturnValue(mockArrayRemove);

      const result = service.arrayRemove(obj1, obj2);

      expect(result).toBe(mockArrayRemove);
      expect(admin.firestore.FieldValue.arrayRemove).toHaveBeenCalledWith(obj1, obj2);
    });

    it('should handle mixed type elements', () => {
      const mockArrayRemove = { _methodName: 'FieldValue.arrayRemove', _elements: ['string', 123, false] } as any;
      jest.spyOn(admin.firestore.FieldValue, 'arrayRemove').mockReturnValue(mockArrayRemove);

      const result = service.arrayRemove('string', 123, false);

      expect(result).toBe(mockArrayRemove);
      expect(admin.firestore.FieldValue.arrayRemove).toHaveBeenCalledWith('string', 123, false);
    });

    it('should handle empty array', () => {
      const mockArrayRemove = { _methodName: 'FieldValue.arrayRemove', _elements: [] } as any;
      jest.spyOn(admin.firestore.FieldValue, 'arrayRemove').mockReturnValue(mockArrayRemove);

      const result = service.arrayRemove();

      expect(result).toBe(mockArrayRemove);
      expect(admin.firestore.FieldValue.arrayRemove).toHaveBeenCalledWith();
    });
  });

  describe('integration with services', () => {
    it('should provide access to Firestore for database operations', () => {
      const mockCollection = jest.fn();
      mockFirestore.collection = mockCollection;

      service.firestore.collection('users');

      expect(mockCollection).toHaveBeenCalledWith('users');
    });

    it('should provide access to Auth for authentication operations', () => {
      const mockGetUser = jest.fn();
      mockAuth.getUser = mockGetUser;

      service.auth.getUser('user-123');

      expect(mockGetUser).toHaveBeenCalledWith('user-123');
    });

    it('should provide access to Storage for file operations', () => {
      const mockBucket = jest.fn();
      mockStorage.bucket = mockBucket;

      service.storage.bucket();

      expect(mockBucket).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle very long ID tokens', async () => {
      const longToken = 'a'.repeat(10000);
      const mockDecodedToken: admin.auth.DecodedIdToken = {
        uid: 'user-123',
        aud: 'mock',
        auth_time: 1234567890,
        exp: 1234571490,
        firebase: {
          identities: {},
          sign_in_provider: 'password',
        },
        iat: 1234567890,
        iss: 'mock',
        sub: 'user-123',
      };
      mockAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      const result = await service.verifyIdToken(longToken);

      expect(result).toEqual(mockDecodedToken);
    });

    it('should handle special characters in tokens', async () => {
      const specialToken = 'token.with.special-chars_123';
      const mockDecodedToken: admin.auth.DecodedIdToken = {
        uid: 'user-123',
        aud: 'mock',
        auth_time: 1234567890,
        exp: 1234571490,
        firebase: {
          identities: {},
          sign_in_provider: 'password',
        },
        iat: 1234567890,
        iss: 'mock',
        sub: 'user-123',
      };
      mockAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      const result = await service.verifyIdToken(specialToken);

      expect(result).toEqual(mockDecodedToken);
    });

    it('should handle very large increment values', () => {
      const mockIncrement = { _methodName: 'FieldValue.increment', _operand: Number.MAX_SAFE_INTEGER } as any;
      jest.spyOn(admin.firestore.FieldValue, 'increment').mockReturnValue(mockIncrement);

      const result = service.increment(Number.MAX_SAFE_INTEGER);

      expect(admin.firestore.FieldValue.increment).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
    });

    it('should handle very small (negative) increment values', () => {
      const mockIncrement = { _methodName: 'FieldValue.increment', _operand: Number.MIN_SAFE_INTEGER } as any;
      jest.spyOn(admin.firestore.FieldValue, 'increment').mockReturnValue(mockIncrement);

      const result = service.increment(Number.MIN_SAFE_INTEGER);

      expect(admin.firestore.FieldValue.increment).toHaveBeenCalledWith(Number.MIN_SAFE_INTEGER);
    });
  });
});
