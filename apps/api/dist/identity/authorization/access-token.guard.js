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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessTokenGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const identity_repository_1 = require("../repositories/identity.repository");
let AccessTokenGuard = class AccessTokenGuard {
    jwt;
    config;
    repository;
    constructor(jwt, config, repository) {
        this.jwt = jwt;
        this.config = config;
        this.repository = repository;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authorization = request.header('authorization');
        const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
        if (!token) {
            throw new common_1.UnauthorizedException('Bearer token is required');
        }
        try {
            const jwtConfig = this.config.getOrThrow('jwt');
            const claims = await this.jwt.verifyAsync(token, {
                secret: jwtConfig.accessSecret,
                algorithms: [jwtConfig.algorithm],
                issuer: jwtConfig.issuer,
                audience: jwtConfig.audience,
            });
            const session = await this.repository.findActiveSessionForAccess(claims.sid);
            if (!session || session.userId !== claims.sub)
                throw new Error('session is not active');
            request.identity = claims;
            return true;
        }
        catch {
            throw new common_1.UnauthorizedException('Access token is invalid or expired');
        }
    }
};
exports.AccessTokenGuard = AccessTokenGuard;
exports.AccessTokenGuard = AccessTokenGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        identity_repository_1.IdentityRepository])
], AccessTokenGuard);
