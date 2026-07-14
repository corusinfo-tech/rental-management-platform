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
exports.CurrentMembershipResolver = void 0;
const common_1 = require("@nestjs/common");
const identity_repository_1 = require("../repositories/identity.repository");
const organization_resolver_1 = require("./organization.resolver");
let CurrentMembershipResolver = class CurrentMembershipResolver {
    repository;
    organizations;
    constructor(repository, organizations) {
        this.repository = repository;
        this.organizations = organizations;
    }
    async resolve(request) {
        const userId = request.identity?.sub;
        if (!userId) {
            throw new common_1.UnauthorizedException('Access token is required');
        }
        const organizationId = this.organizations.resolve(request);
        if (!organizationId) {
            throw new common_1.ForbiddenException('Organization context is required');
        }
        const membership = await this.repository.findActiveMembershipForUser(userId, organizationId);
        if (!membership) {
            throw new common_1.ForbiddenException('Active organization membership is required');
        }
        const context = {
            id: membership.id,
            organizationId: membership.organizationId,
            permissionCodes: membership.roles.flatMap((membershipRole) => membershipRole.role.permissions.map((rolePermission) => rolePermission.permission.code)),
        };
        request.membership = context;
        return context;
    }
};
exports.CurrentMembershipResolver = CurrentMembershipResolver;
exports.CurrentMembershipResolver = CurrentMembershipResolver = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [identity_repository_1.IdentityRepository,
        organization_resolver_1.OrganizationResolver])
], CurrentMembershipResolver);
