import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export const firebaseProvider: Provider = {
  provide: 'FIREBASE_ADMIN',
  useFactory: (configService: ConfigService) => {
    const projectId = configService.get<string>('firebase.projectId');
    const clientEmail = configService.get<string>('firebase.clientEmail');
    const privateKey = configService.get<string>('firebase.privateKey');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase credentials are not configured');
    }

    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: configService.get<string>('firebase.storageBucket'),
      });
    }

    return admin;
  },
  inject: [ConfigService],
};

export const FIRESTORE = 'FIRESTORE';
export const FIREBASE_AUTH = 'FIREBASE_AUTH';
export const FIREBASE_STORAGE = 'FIREBASE_STORAGE';

export const firestoreProvider: Provider = {
  provide: FIRESTORE,
  useFactory: () => admin.firestore(),
};

export const firebaseAuthProvider: Provider = {
  provide: FIREBASE_AUTH,
  useFactory: () => admin.auth(),
};

export const firebaseStorageProvider: Provider = {
  provide: FIREBASE_STORAGE,
  useFactory: () => admin.storage(),
};
