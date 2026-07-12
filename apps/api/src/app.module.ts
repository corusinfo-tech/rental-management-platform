import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from './common/database.module';
import { AuthModule } from './auth/auth.module';
import { InvoicesModule } from './invoices/invoices.module';
import { AgreementsModule } from './agreements/agreements.module';
import { HealthController } from './health.controller';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, validate: env => { for (const k of ['DATABASE_URL','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET']) if (!env[k]) throw new Error(`${k} is required`); return env; } }), ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]), LoggerModule.forRoot({ pinoHttp: { level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'), transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' }, redact: ['req.headers.authorization','req.body.password','req.body.refreshToken'] } }), DatabaseModule, AuthModule, AgreementsModule, InvoicesModule], controllers: [HealthController] })
export class AppModule {}
