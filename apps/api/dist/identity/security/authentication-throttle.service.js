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
exports.AuthenticationThrottleService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_crypto_1 = require("node:crypto");
const ioredis_1 = __importDefault(require("ioredis"));
/** Fail closed: authentication traffic is rejected if Redis cannot enforce its privacy-safe limits. */
let AuthenticationThrottleService = class AuthenticationThrottleService {
    config;
    redis;
    constructor(config) {
        this.config = config;
        this.redis = new ioredis_1.default(config.getOrThrow('redisUrl'), { lazyConnect: true, maxRetriesPerRequest: 1 });
    }
    async onModuleInit() { await this.redis.connect(); }
    async onModuleDestroy() { await this.redis.quit(); }
    async enforce(scope, identifier, request) {
        const settings = this.config.getOrThrow('authentication');
        const ip = this.fingerprint(request.ip || request.socket.remoteAddress || 'unknown');
        const subject = this.fingerprint(identifier.trim().toLowerCase());
        try {
            const [ipCount, subjectCount] = await Promise.all([this.increment(`auth:${scope}:ip:${ip}`, settings.windowSeconds), this.increment(`auth:${scope}:subject:${subject}`, settings.windowSeconds)]);
            if (ipCount <= settings.requestIpLimit && subjectCount <= settings.requestIdentifierLimit)
                return;
        }
        catch {
            throw new common_1.HttpException('Authentication service temporarily unavailable.', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        throw new common_1.HttpException('Too many authentication attempts. Please try again later.', common_1.HttpStatus.TOO_MANY_REQUESTS);
    }
    async increment(key, ttl) { return Number(await this.redis.eval("local c=redis.call('INCR',KEYS[1]);if c==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end;return c", 1, key, ttl)); }
    fingerprint(value) { return (0, node_crypto_1.createHmac)('sha256', this.config.getOrThrow('registration').throttleHashSecret).update(value).digest('base64url'); }
};
exports.AuthenticationThrottleService = AuthenticationThrottleService;
exports.AuthenticationThrottleService = AuthenticationThrottleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AuthenticationThrottleService);
