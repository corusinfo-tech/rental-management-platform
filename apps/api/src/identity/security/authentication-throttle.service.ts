import { HttpException, HttpStatus, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import Redis from 'ioredis';
import type { Request } from 'express';
import type { Environment } from '../../config/environment';

/** Fail closed: authentication traffic is rejected if Redis cannot enforce its privacy-safe limits. */
@Injectable()
export class AuthenticationThrottleService implements OnModuleInit, OnModuleDestroy {
  private readonly redis: Redis;
  constructor(private readonly config: ConfigService<Environment, true>) { this.redis = new Redis(config.getOrThrow('redisUrl'), { lazyConnect: true, maxRetriesPerRequest: 1 }); }
  async onModuleInit(): Promise<void> { await this.redis.connect(); }
  async onModuleDestroy(): Promise<void> { await this.redis.quit(); }
  async enforce(scope: string, identifier: string, request: Request): Promise<void> {
    const settings = this.config.getOrThrow('authentication'); const ip = this.fingerprint(request.ip || request.socket.remoteAddress || 'unknown'); const subject = this.fingerprint(identifier.trim().toLowerCase());
    try {
      const [ipCount, subjectCount] = await Promise.all([this.increment(`auth:${scope}:ip:${ip}`, settings.windowSeconds), this.increment(`auth:${scope}:subject:${subject}`, settings.windowSeconds)]);
      if (ipCount <= settings.requestIpLimit && subjectCount <= settings.requestIdentifierLimit) return;
    } catch { throw new HttpException('Authentication service temporarily unavailable.', HttpStatus.SERVICE_UNAVAILABLE); }
    throw new HttpException('Too many authentication attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
  }
  private async increment(key: string, ttl: number): Promise<number> { return Number(await this.redis.eval("local c=redis.call('INCR',KEYS[1]);if c==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end;return c", 1, key, ttl)); }
  private fingerprint(value: string) { return createHmac('sha256', this.config.getOrThrow('registration').throttleHashSecret).update(value).digest('base64url'); }
}
