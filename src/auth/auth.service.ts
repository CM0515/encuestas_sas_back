import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from '../shared/firebase/firebase.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private firebaseService: FirebaseService,
  ) {}

  async login(loginDto: LoginDto) {
    try {
      // Verify Firebase ID token
      const decodedToken = await this.firebaseService.verifyIdToken(
        loginDto.idToken,
      );

      // Create or update user in Firestore
      const user: any = await this.createOrUpdateUser(decodedToken);

      // Generate JWT token
      const payload = {
        sub: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async validateUser(uid: string) {
    const userDoc = await this.firebaseService.firestore
      .collection('users')
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      return null;
    }

    return {
      uid: userDoc.id,
      ...userDoc.data(),
    };
  }

  private async createOrUpdateUser(decodedToken: any) {
    const userRef = this.firebaseService.firestore
      .collection('users')
      .doc(decodedToken.uid);

    const userDoc = await userRef.get();

    const userData = {
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email,
      emailVerified: decodedToken.email_verified || false,
      photoURL: decodedToken.picture || null,
      lastLoginAt: this.firebaseService.serverTimestamp(),
    };

    if (userDoc.exists) {
      // Update existing user
      await userRef.update(userData);
    } else {
      // Create new user
      await userRef.set({
        ...userData,
        role: 'user',
        createdAt: this.firebaseService.serverTimestamp(),
      });
    }

    const updatedDoc = await userRef.get();
    return {
      uid: updatedDoc.id,
      ...updatedDoc.data(),
    };
  }

  async getProfile(uid: string) {
    const user = await this.validateUser(uid);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
