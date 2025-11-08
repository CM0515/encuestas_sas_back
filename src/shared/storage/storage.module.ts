import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Global()
@Module({
  imports: [FirebaseModule],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
