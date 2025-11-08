import { Injectable, Logger } from '@nestjs/common';
import Pusher from 'pusher';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private pusher: Pusher | null = null;

  constructor() {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER || 'mt1';

    if (appId && key && secret) {
      this.pusher = new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
      });
      this.logger.log('Pusher connection initialized');
    } else {
      this.logger.warn('Pusher credentials not configured, real-time features disabled');
    }
  }

  async trigger(
    channel: string,
    event: string,
    data: any,
  ): Promise<void> {
    if (!this.pusher) {
      this.logger.warn('Pusher not configured, skipping trigger');
      return;
    }

    try {
      await this.pusher.trigger(channel, event, data);
      this.logger.log(`Event ${event} triggered on channel ${channel}`);
    } catch (error) {
      this.logger.error(`Error triggering Pusher event:`, error);
      throw error;
    }
  }

  async triggerBatch(
    batch: Array<{ channel: string; event: string; data: any }>,
  ): Promise<void> {
    if (!this.pusher) {
      this.logger.warn('Pusher not configured, skipping batch trigger');
      return;
    }

    try {
      await this.pusher.triggerBatch(
        batch.map((item) => ({
          channel: item.channel,
          name: item.event,
          data: item.data,
        })),
      );
      this.logger.log(`Batch of ${batch.length} events triggered`);
    } catch (error) {
      this.logger.error(`Error triggering Pusher batch:`, error);
      throw error;
    }
  }

  async emitNewResponse(surveyId: string, response: any): Promise<void> {
    await this.trigger(`survey-${surveyId}`, 'new-response', response);
  }

  async emitStatsUpdate(surveyId: string, stats: any): Promise<void> {
    await this.trigger(`survey-${surveyId}`, 'stats-update', stats);
  }

  async emitSurveyUpdate(surveyId: string, survey: any): Promise<void> {
    await this.trigger(`survey-${surveyId}`, 'survey-update', survey);
  }
}
