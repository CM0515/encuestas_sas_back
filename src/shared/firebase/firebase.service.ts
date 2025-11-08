import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
  ) {}

  get firestore(): admin.firestore.Firestore {
    return this.firebaseAdmin.firestore();
  }

  get auth(): admin.auth.Auth {
    return this.firebaseAdmin.auth();
  }

  get storage(): admin.storage.Storage {
    return this.firebaseAdmin.storage();
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    return this.auth.verifyIdToken(idToken);
  }

  serverTimestamp() {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  increment(n: number = 1) {
    return admin.firestore.FieldValue.increment(n);
  }

  arrayUnion(...elements: any[]) {
    return admin.firestore.FieldValue.arrayUnion(...elements);
  }

  arrayRemove(...elements: any[]) {
    return admin.firestore.FieldValue.arrayRemove(...elements);
  }
}
