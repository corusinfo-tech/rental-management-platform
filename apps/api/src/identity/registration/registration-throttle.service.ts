import { HttpException, HttpStatus, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHmac } from 'node:crypto';
import type { Request } from 'express';
import type { Environment } from '../../config/environment';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from '../dto/auth.dto';
import { normalizeEmail, normalizeMobile } from './normalization';

type CounterResult = { count: number; ttlSeconds: number };

@Injectable()
export class RegistrationThrottleService implements OnModuleInit, OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly prisma: PrismaService,
  ) {
    this.redis = new Redis(this.config.getOrThrow('redisUrl'), { lazyConnect: true, maxRetriesPerRequest: 1 });
  }

  async onModuleInit(): Promise<void> {
    await this.redis.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async enforce(input: RegisterDto, request: Request): Promise<void> {
    const registration = this.config.getOrThrow('registration');
    const ipFingerprint = this.fingerprint(request.ip || request.socket.remoteAddress || 'unknown');
    const identifierFingerprint = this.fingerprint(`${normalizeEmail(input.email)}:${normalizeMobile(input.countryCode, input.mobile)}`);
    const [ipCounter, identifierCounter] = await Promise.all([
      this.increment(`registration:ip:${ipFingerprint}`, registration.windowSeconds),
      this.increment(`registration:identifier:${identifierFingerprint}`, registration.windowSeconds),
    ]);

    if (ipCounter.count <= registration.ipLimit && identifierCounter.count <= registration.identifierLimit) {
      return;
    }

    await this.prisma.identityAuditEvent.create({
      data: {
        action: 'identity.registration.throttled',
        metadata: {
          ipFingerprint,
          identifierFingerprint,
          retryAfterSeconds: Math.max(ipCounter.ttlSeconds, identifierCounter.ttlSeconds),
        },
      },
    });
    throw new HttpException('Too many registration attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
  }

  private async increment(key: string, windowSeconds: number): Promise<CounterResult> {
    const result = await this.redis.eval(
      "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return { count, redis.call('TTL', KEYS[1]) };",
      1,
      key,
      windowSeconds,
    ) as [number, number];
    return { count: Number(result[0]), ttlSeconds: Math.max(0, Number(result[1])) };
  }

  private fingerprint(value: string): string {
    return createHmac('sha256', this.config.getOrThrow('registration').throttleHashSecret).update(value).digest('base64url');
  }
}
