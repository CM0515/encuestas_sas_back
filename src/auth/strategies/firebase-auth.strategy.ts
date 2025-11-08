import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { FirebaseService } from '../../shared/firebase/firebase.service';

@Injectable()
export class FirebaseAuthStrategy extends PassportStrategy(
  Strategy,
  'firebase',
) {
  constructor(private firebaseService: FirebaseService) {
    super();
  }

  async validate(req: Request): Promise<any> {
    const idToken = this.extractTokenFromHeader(req);

    if (!idToken) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const decodedToken = await this.firebaseService.verifyIdToken(idToken);

      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email,
        emailVerified: decodedToken.email_verified,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(req: any): string | null {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
