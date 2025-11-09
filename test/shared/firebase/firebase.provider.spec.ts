import { ConfigService } from '@nestjs/config';
import { FactoryProvider } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  firebaseProvider,
  firestoreProvider,
  firebaseAuthProvider,
  firebaseStorageProvider,
} from '../../../src/shared/firebase/firebase.provider';

// Mock firebase-admin
jest.mock('firebase-admin', () => {
  const mockApp = {
    name: '[DEFAULT]',
  };

  const mockFirestore = jest.fn();
  const mockAuth = jest.fn();
  const mockStorage = jest.fn();

  let appsArray: any[] = [];

  return {
    get apps() {
      return appsArray;
    },
    __setApps: (apps: any[]) => {
      appsArray = apps;
    },
    initializeApp: jest.fn().mockReturnValue(mockApp),
    credential: {
      cert: jest.fn().mockReturnValue({}),
    },
    firestore: mockFirestore,
    auth: mockAuth,
    storage: mockStorage,
  };
});

describe('Firebase Providers', () => {
  let configService: ConfigService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    (admin as any).__setApps([]);

    configService = {
      get: jest.fn((key: string) => {
        const config = {
          'firebase.projectId': 'test-project-id',
          'firebase.clientEmail': 'test@test-project.iam.gserviceaccount.com',
          'firebase.privateKey': '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
          'firebase.storageBucket': 'test-project.appspot.com',
        };
        return config[key];
      }),
    } as any;
  });

  describe('firebaseProvider', () => {
    it('should be defined', () => {
      expect(firebaseProvider).toBeDefined();
      expect((firebaseProvider as FactoryProvider).provide).toBe('FIREBASE_ADMIN');
      expect((firebaseProvider as FactoryProvider).inject).toEqual([ConfigService]);
    });

    it('should initialize Firebase Admin with correct configuration', () => {
      const useFactory = (firebaseProvider as FactoryProvider).useFactory as Function;
      const result = useFactory(configService);

      expect(admin.initializeApp).toHaveBeenCalledWith({
        credential: expect.anything(),
        storageBucket: 'test-project.appspot.com',
      });

      expect(admin.credential.cert).toHaveBeenCalledWith({
        projectId: 'test-project-id',
        clientEmail: 'test@test-project.iam.gserviceaccount.com',
        privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
      });

      expect(result).toEqual(admin);
    });

    it('should throw error if projectId is missing', () => {
      configService.get = jest.fn((key: string) => {
        const config = {
          'firebase.clientEmail': 'test@test-project.iam.gserviceaccount.com',
          'firebase.privateKey': '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
        };
        return config[key];
      }) as any;

      const useFactory = (firebaseProvider as FactoryProvider).useFactory as Function;

      expect(() => useFactory(configService)).toThrow(
        'Firebase credentials are not configured',
      );
    });

    it('should throw error if clientEmail is missing', () => {
      configService.get = jest.fn((key: string) => {
        const config = {
          'firebase.projectId': 'test-project-id',
          'firebase.privateKey': '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
        };
        return config[key];
      }) as any;

      const useFactory = (firebaseProvider as FactoryProvider).useFactory as Function;

      expect(() => useFactory(configService)).toThrow(
        'Firebase credentials are not configured',
      );
    });

    it('should throw error if privateKey is missing', () => {
      configService.get = jest.fn((key: string) => {
        const config = {
          'firebase.projectId': 'test-project-id',
          'firebase.clientEmail': 'test@test-project.iam.gserviceaccount.com',
        };
        return config[key];
      }) as any;

      const useFactory = (firebaseProvider as FactoryProvider).useFactory as Function;

      expect(() => useFactory(configService)).toThrow(
        'Firebase credentials are not configured',
      );
    });

    it('should not initialize Firebase Admin if already initialized', () => {
      // Simulate Firebase Admin already initialized
      (admin as any).__setApps([{ name: '[DEFAULT]' }]);

      const useFactory = (firebaseProvider as FactoryProvider).useFactory as Function;
      const result = useFactory(configService);

      expect(admin.initializeApp).not.toHaveBeenCalled();
      expect(result).toEqual(admin);
    });

    it('should handle empty string credentials as missing', () => {
      configService.get = jest.fn((key: string) => {
        const config = {
          'firebase.projectId': '',
          'firebase.clientEmail': 'test@test-project.iam.gserviceaccount.com',
          'firebase.privateKey': '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
        };
        return config[key];
      }) as any;

      const useFactory = (firebaseProvider as FactoryProvider).useFactory as Function;

      expect(() => useFactory(configService)).toThrow(
        'Firebase credentials are not configured',
      );
    });

    it('should handle null credentials as missing', () => {
      configService.get = jest.fn((key: string) => {
        const config = {
          'firebase.projectId': 'test-project-id',
          'firebase.clientEmail': null,
          'firebase.privateKey': '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
        };
        return config[key];
      }) as any;

      const useFactory = (firebaseProvider as FactoryProvider).useFactory as Function;

      expect(() => useFactory(configService)).toThrow(
        'Firebase credentials are not configured',
      );
    });

    it('should handle undefined credentials as missing', () => {
      configService.get = jest.fn(() => undefined) as any;

      const useFactory = (firebaseProvider as FactoryProvider).useFactory as Function;

      expect(() => useFactory(configService)).toThrow(
        'Firebase credentials are not configured',
      );
    });

    it('should initialize with all credentials present', () => {
      const useFactory = (firebaseProvider as FactoryProvider).useFactory as Function;

      expect(() => useFactory(configService)).not.toThrow();
      expect(admin.initializeApp).toHaveBeenCalledTimes(1);
    });
  });

  describe('firestoreProvider', () => {
    it('should be defined', () => {
      expect(firestoreProvider).toBeDefined();
      expect((firestoreProvider as FactoryProvider).provide).toBe('FIRESTORE');
    });

    it('should call admin.firestore() when useFactory is invoked', () => {
      const mockFirestore = { collection: jest.fn() };
      (admin.firestore as unknown as jest.Mock).mockReturnValue(mockFirestore);

      const useFactory = (firestoreProvider as FactoryProvider).useFactory as Function;
      const result = useFactory();

      expect(admin.firestore).toHaveBeenCalled();
      expect(result).toBe(mockFirestore);
    });

    it('should return Firestore instance', () => {
      const mockFirestore = {
        collection: jest.fn(),
        doc: jest.fn(),
        batch: jest.fn(),
      };
      (admin.firestore as unknown as jest.Mock).mockReturnValue(mockFirestore);

      const useFactory = (firestoreProvider as FactoryProvider).useFactory as Function;
      const result = useFactory();

      expect(result).toHaveProperty('collection');
      expect(result).toHaveProperty('doc');
      expect(result).toHaveProperty('batch');
    });
  });

  describe('firebaseAuthProvider', () => {
    it('should be defined', () => {
      expect(firebaseAuthProvider).toBeDefined();
      expect((firebaseAuthProvider as FactoryProvider).provide).toBe('FIREBASE_AUTH');
    });

    it('should call admin.auth() when useFactory is invoked', () => {
      const mockAuth = { verifyIdToken: jest.fn() };
      (admin.auth as jest.Mock).mockReturnValue(mockAuth);

      const useFactory = (firebaseAuthProvider as FactoryProvider).useFactory as Function;
      const result = useFactory();

      expect(admin.auth).toHaveBeenCalled();
      expect(result).toBe(mockAuth);
    });

    it('should return Auth instance', () => {
      const mockAuth = {
        verifyIdToken: jest.fn(),
        createUser: jest.fn(),
        getUserByEmail: jest.fn(),
      };
      (admin.auth as jest.Mock).mockReturnValue(mockAuth);

      const useFactory = (firebaseAuthProvider as FactoryProvider).useFactory as Function;
      const result = useFactory();

      expect(result).toHaveProperty('verifyIdToken');
      expect(result).toHaveProperty('createUser');
      expect(result).toHaveProperty('getUserByEmail');
    });
  });

  describe('firebaseStorageProvider', () => {
    it('should be defined', () => {
      expect(firebaseStorageProvider).toBeDefined();
      expect((firebaseStorageProvider as FactoryProvider).provide).toBe('FIREBASE_STORAGE');
    });

    it('should call admin.storage() when useFactory is invoked', () => {
      const mockStorage = { bucket: jest.fn() };
      (admin.storage as jest.Mock).mockReturnValue(mockStorage);

      const useFactory = (firebaseStorageProvider as FactoryProvider).useFactory as Function;
      const result = useFactory();

      expect(admin.storage).toHaveBeenCalled();
      expect(result).toBe(mockStorage);
    });

    it('should return Storage instance', () => {
      const mockStorage = {
        bucket: jest.fn(),
        getBucket: jest.fn(),
      };
      (admin.storage as jest.Mock).mockReturnValue(mockStorage);

      const useFactory = (firebaseStorageProvider as FactoryProvider).useFactory as Function;
      const result = useFactory();

      expect(result).toHaveProperty('bucket');
      expect(result).toHaveProperty('getBucket');
    });
  });

  describe('Provider exports', () => {
    it('should export all provider tokens', () => {
      expect((firebaseProvider as FactoryProvider).provide).toBe('FIREBASE_ADMIN');
      expect((firestoreProvider as FactoryProvider).provide).toBe('FIRESTORE');
      expect((firebaseAuthProvider as FactoryProvider).provide).toBe('FIREBASE_AUTH');
      expect((firebaseStorageProvider as FactoryProvider).provide).toBe('FIREBASE_STORAGE');
    });

    it('should have correct injection dependencies', () => {
      expect((firebaseProvider as FactoryProvider).inject).toEqual([ConfigService]);
      expect((firestoreProvider as FactoryProvider).inject).toBeUndefined();
      expect((firebaseAuthProvider as FactoryProvider).inject).toBeUndefined();
      expect((firebaseStorageProvider as FactoryProvider).inject).toBeUndefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should initialize Firebase Admin once and reuse for other providers', () => {
      (admin as any).__setApps([]);

      // Initialize Firebase Admin
      const firebaseFactory = (firebaseProvider as FactoryProvider).useFactory as Function;
      firebaseFactory(configService);

      expect(admin.initializeApp).toHaveBeenCalledTimes(1);

      // Now the apps array has one app
      (admin as any).__setApps([{ name: '[DEFAULT]' }]);

      // Initialize again - should not call initializeApp
      firebaseFactory(configService);
      expect(admin.initializeApp).toHaveBeenCalledTimes(1); // Still 1

      // Other providers should work without re-initializing
      const firestoreFactory = (firestoreProvider as FactoryProvider).useFactory as Function;
      const authFactory = (firebaseAuthProvider as FactoryProvider).useFactory as Function;
      const storageFactory = (firebaseStorageProvider as FactoryProvider).useFactory as Function;

      firestoreFactory();
      authFactory();
      storageFactory();

      expect(admin.firestore).toHaveBeenCalled();
      expect(admin.auth).toHaveBeenCalled();
      expect(admin.storage).toHaveBeenCalled();
    });

    it('should handle multiple provider instantiations', () => {
      const mockFirestore = { collection: jest.fn() };
      const mockAuth = { verifyIdToken: jest.fn() };
      const mockStorage = { bucket: jest.fn() };

      (admin.firestore as unknown as jest.Mock).mockReturnValue(mockFirestore);
      (admin.auth as jest.Mock).mockReturnValue(mockAuth);
      (admin.storage as jest.Mock).mockReturnValue(mockStorage);

      const firestoreFactory = (firestoreProvider as FactoryProvider).useFactory as Function;
      const authFactory = (firebaseAuthProvider as FactoryProvider).useFactory as Function;
      const storageFactory = (firebaseStorageProvider as FactoryProvider).useFactory as Function;

      const firestore1 = firestoreFactory();
      const firestore2 = firestoreFactory();
      const auth1 = authFactory();
      const auth2 = authFactory();
      const storage1 = storageFactory();
      const storage2 = storageFactory();

      expect(firestore1).toBe(mockFirestore);
      expect(firestore2).toBe(mockFirestore);
      expect(auth1).toBe(mockAuth);
      expect(auth2).toBe(mockAuth);
      expect(storage1).toBe(mockStorage);
      expect(storage2).toBe(mockStorage);
    });
  });
});
