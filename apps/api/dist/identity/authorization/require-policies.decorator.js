"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirePolicies = exports.REQUIRED_POLICIES = void 0;
const common_1 = require("@nestjs/common");
exports.REQUIRED_POLICIES = 'identity:required-policies';
const RequirePolicies = (...policies) => (0, common_1.SetMetadata)(exports.REQUIRED_POLICIES, policies);
exports.RequirePolicies = RequirePolicies;
