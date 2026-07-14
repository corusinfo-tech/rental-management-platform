"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirePermissions = exports.REQUIRED_PERMISSIONS = void 0;
const common_1 = require("@nestjs/common");
exports.REQUIRED_PERMISSIONS = 'identity:required-permissions';
const RequirePermissions = (...permissions) => (0, common_1.SetMetadata)(exports.REQUIRED_PERMISSIONS, permissions);
exports.RequirePermissions = RequirePermissions;
