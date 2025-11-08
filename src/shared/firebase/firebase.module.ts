import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseService } from './firebase.service';
import { firebaseProvider } from './firebase.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [firebaseProvider, FirebaseService],
  exports: [firebaseProvider, FirebaseService],
})
export class FirebaseModule {}
