import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RealtimeService } from './realtime.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
