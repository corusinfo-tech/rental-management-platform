"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_ALGORITHM = void 0;
exports.validateEnvironment = validateEnvironment;
exports.JWT_ALGORITHM = 'HS256';
function requiredString(environment, key) {
    const value = environment[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value.trim();
}
function positiveInteger(environment, key, fallback) {
    const raw = environment[key] ?? fallback;
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error(`Environment variable ${key} must be a positive integer`);
    }
    return value;
}
function nonNegativeInteger(environment, key, fallback) {
    const raw = environment[key] ?? fallback;
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(`Environment variable ${key} must be a non-negative integer`);
    }
    return value;
}
function postgresqlUrl(environment) {
    const value = requiredString(environment, 'DATABASE_URL');
    try {
        const url = new URL(value);
        if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
            throw new Error('invalid protocol');
        }
    }
    catch {
        throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
    }
    return value;
}
function redisUrl(environment) {
    const value = requiredString(environment, 'REDIS_URL');
    try {
        const url = new URL(value);
        if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
            throw new Error('invalid protocol');
        }
    }
    catch {
        throw new Error('REDIS_URL must be a Redis connection URL');
    }
    return value;
}
function verificationEncryptionKey(environment) {
    const encoded = requiredString(environment, 'VERIFICATION_ENCRYPTION_KEY');
    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32 || key.toString('base64') !== encoded) {
        throw new Error('VERIFICATION_ENCRYPTION_KEY must be a canonical base64-encoded 32-byte AES-256 key');
    }
    return key;
}
function validateEnvironment(environment) {
    const accessSecret = requiredString(environment, 'JWT_ACCESS_SECRET');
    const refreshSecret = requiredString(environment, 'JWT_REFRESH_SECRET');
    if (accessSecret.length < 32 || refreshSecret.length < 32) {
        throw new Error('JWT access and refresh secrets must each be at least 32 characters');
    }
    if (accessSecret === refreshSecret) {
        throw new Error('JWT access and refresh secrets must be different');
    }
    const algorithm = requiredString(environment, 'JWT_ALGORITHM');
    if (algorithm !== exports.JWT_ALGORITHM) {
        throw new Error(`JWT_ALGORITHM must be ${exports.JWT_ALGORITHM}`);
    }
    const throttleHashSecret = requiredString(environment, 'REGISTRATION_THROTTLE_HASH_SECRET');
    if (throttleHashSecret.length < 32) {
        throw new Error('REGISTRATION_THROTTLE_HASH_SECRET must be at least 32 characters');
    }
    const verificationKey = verificationEncryptionKey(environment);
    return {
        port: positiveInteger(environment, 'PORT', 3001),
        databaseUrl: postgresqlUrl(environment),
        redisUrl: redisUrl(environment),
        jwt: {
            accessSecret,
            refreshSecret,
            issuer: requiredString(environment, 'JWT_ISSUER'),
            audience: requiredString(environment, 'JWT_AUDIENCE'),
            accessTtlSeconds: positiveInteger(environment, 'JWT_ACCESS_TTL_SECONDS', 900),
            refreshTtlSeconds: positiveInteger(environment, 'JWT_REFRESH_TTL_SECONDS', 2_592_000),
            algorithm: exports.JWT_ALGORITHM,
        },
        registration: {
            ipLimit: positiveInteger(environment, 'REGISTRATION_IP_LIMIT', 5),
            identifierLimit: positiveInteger(environment, 'REGISTRATION_IDENTIFIER_LIMIT', 3),
            windowSeconds: positiveInteger(environment, 'REGISTRATION_THROTTLE_WINDOW_SECONDS', 3_600),
            bodyLimitBytes: positiveInteger(environment, 'REGISTRATION_BODY_LIMIT_BYTES', 16_384),
            throttleHashSecret,
            trustedProxyHops: nonNegativeInteger(environment, 'TRUST_PROXY_HOPS', 1),
        },
        verification: {
            email: {
                expirySeconds: positiveInteger(environment, 'EMAIL_VERIFICATION_TTL_SECONDS', 86_400),
                cooldownSeconds: positiveInteger(environment, 'EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS', 60),
                maximumAttempts: positiveInteger(environment, 'EMAIL_VERIFICATION_MAX_ATTEMPTS', 5),
                maximumResends: positiveInteger(environment, 'EMAIL_VERIFICATION_MAX_RESENDS', 5),
            },
            requestIpLimit: positiveInteger(environment, 'EMAIL_VERIFICATION_REQUEST_IP_LIMIT', 5),
            requestEmailLimit: positiveInteger(environment, 'EMAIL_VERIFICATION_REQUEST_EMAIL_LIMIT', 3),
            requestWindowSeconds: positiveInteger(environment, 'EMAIL_VERIFICATION_REQUEST_WINDOW_SECONDS', 3_600),
        },
        authentication: {
            requestIpLimit: positiveInteger(environment, 'AUTH_REQUEST_IP_LIMIT', 10),
            requestIdentifierLimit: positiveInteger(environment, 'AUTH_REQUEST_IDENTIFIER_LIMIT', 5),
            windowSeconds: positiveInteger(environment, 'AUTH_REQUEST_WINDOW_SECONDS', 60),
        },
        encryption: {
            verificationKey,
            verificationKeyVersion: requiredString(environment, 'VERIFICATION_KEY_VERSION'),
        },
    };
}
