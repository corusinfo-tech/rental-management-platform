"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationThrottleService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../../database/prisma.service");
const normalization_1 = require("./normalization");
let RegistrationThrottleService = class RegistrationThrottleService {
    config;
    prisma;
    redis;
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.redis = new ioredis_1.default(this.config.getOrThrow('redisUrl'), { lazyConnect: true, maxRetriesPerRequest: 1 });
    }
    async onModuleInit() {
        await this.redis.connect();
    }
    async onModuleDestroy() {
        await this.redis.quit();
    }
    async enforce(input, request) {
        const registration = this.config.getOrThrow('registration');
        const ipFingerprint = this.fingerprint(request.ip || request.socket.remoteAddress || 'unknown');
        const identifierFingerprint = this.fingerprint(`${(0, normalization_1.normalizeEmail)(input.email)}:${(0, normalization_1.normalizeMobile)(input.countryCode, input.mobile)}`);
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
        throw new common_1.HttpException('Too many registration attempts. Please try again later.', common_1.HttpStatus.TOO_MANY_REQUESTS);
    }
    async increment(key, windowSeconds) {
        const result = await this.redis.eval("local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return { count, redis.call('TTL', KEYS[1]) };", 1, key, windowSeconds);
        return { count: Number(result[0]), ttlSeconds: Math.max(0, Number(result[1])) };
    }
    fingerprint(value) {
        return (0, node_crypto_1.createHmac)('sha256', this.config.getOrThrow('registration').throttleHashSecret).update(value).digest('base64url');
    }
};
exports.RegistrationThrottleService = RegistrationThrottleService;
exports.RegistrationThrottleService = RegistrationThrottleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], RegistrationThrottleService);
