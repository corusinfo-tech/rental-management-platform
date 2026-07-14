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
exports.PermissionGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const current_membership_resolver_1 = require("./current-membership.resolver");
const require_permissions_decorator_1 = require("./require-permissions.decorator");
let PermissionGuard = class PermissionGuard {
    reflector;
    memberships;
    constructor(reflector, memberships) {
        this.reflector = reflector;
        this.memberships = memberships;
    }
    async canActivate(context) {
        const required = this.reflector.getAllAndOverride(require_permissions_decorator_1.REQUIRED_PERMISSIONS, [
            context.getHandler(),
            context.getClass(),
        ]) ?? [];
        if (required.length === 0) {
            return true;
        }
        const membership = await this.memberships.resolve(context.switchToHttp().getRequest());
        if (!required.every((permission) => membership.permissionCodes.includes(permission))) {
            throw new common_1.ForbiddenException('Required permission is missing');
        }
        return true;
    }
};
exports.PermissionGuard = PermissionGuard;
exports.PermissionGuard = PermissionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        current_membership_resolver_1.CurrentMembershipResolver])
], PermissionGuard);
