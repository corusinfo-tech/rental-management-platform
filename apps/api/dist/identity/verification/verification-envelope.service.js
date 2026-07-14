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
exports.VerificationEnvelopeService = exports.VERIFICATION_ENVELOPE_ALGORITHM = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_crypto_1 = require("node:crypto");
exports.VERIFICATION_ENVELOPE_ALGORITHM = 'AES-256-GCM';
let VerificationEnvelopeService = class VerificationEnvelopeService {
    config;
    constructor(config) {
        this.config = config;
    }
    encrypt(token, binding) {
        const nonce = (0, node_crypto_1.randomBytes)(12);
        const aad = this.serializeAad(binding);
        const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', this.encryption.verificationKey, nonce);
        cipher.setAAD(aad);
        const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
        return {
            ciphertext,
            nonce,
            authenticationTag: cipher.getAuthTag(),
            keyVersion: this.encryption.verificationKeyVersion,
            algorithm: exports.VERIFICATION_ENVELOPE_ALGORITHM,
            aad,
        };
    }
    decrypt(envelope, binding) {
        this.validateExpiry(envelope);
        if (envelope.status !== 'PENDING')
            throw new Error('Verification delivery envelope is unavailable');
        if (envelope.algorithm !== exports.VERIFICATION_ENVELOPE_ALGORITHM)
            throw new Error('Unsupported verification envelope algorithm');
        if (envelope.keyVersion !== this.encryption.verificationKeyVersion)
            throw new Error('Verification envelope key version is unavailable');
        if (!envelope.ciphertext || !envelope.nonce || !envelope.authenticationTag || !envelope.aad) {
            throw new Error('Verification delivery envelope has been destroyed');
        }
        const expectedAad = this.serializeAad(binding);
        if (expectedAad.length !== envelope.aad.length || !(0, node_crypto_1.timingSafeEqual)(expectedAad, envelope.aad)) {
            throw new Error('Verification delivery envelope binding is invalid');
        }
        const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', this.encryption.verificationKey, envelope.nonce);
        decipher.setAAD(envelope.aad);
        decipher.setAuthTag(envelope.authenticationTag);
        return Buffer.concat([decipher.update(envelope.ciphertext), decipher.final()]).toString('utf8');
    }
    validateExpiry(envelope) {
        if (envelope.expiresAt <= new Date())
            throw new Error('Verification delivery envelope has expired');
    }
    /** Returns the persistence state that irreversibly removes recoverable delivery material. */
    destroy() {
        return { ciphertext: null, nonce: null, authenticationTag: null, aad: null, status: 'DESTROYED', destroyedAt: new Date() };
    }
    get encryption() {
        return this.config.getOrThrow('encryption');
    }
    serializeAad(binding) {
        // Fixed key order makes binding deterministic and protects all ADR-required identifiers.
        return Buffer.from(JSON.stringify({
            verificationId: binding.verificationId,
            organizationId: binding.organizationId,
            userId: binding.userId,
            correlationId: binding.correlationId,
        }), 'utf8');
    }
};
exports.VerificationEnvelopeService = VerificationEnvelopeService;
exports.VerificationEnvelopeService = VerificationEnvelopeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], VerificationEnvelopeService);
