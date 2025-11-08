import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  redis: {
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN,
  },
}));
