import { AuthService } from '@cruzjs/core/auth/auth.service';
import { buildContainerWithProviders } from '@cruzjs/core/framework/application.server';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetTestDatabase } from '../utils/test-db';

describe('AuthService', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe('validatePasswordStrength', () => {
    it('should accept valid password', async () => {
      const container = await buildContainerWithProviders([]);
      const authService = container.get<AuthService>(AuthService);
      expect(authService.validatePasswordStrength('Password123')).toBe(true);
    });

    it('should reject password shorter than 8 characters', async () => {
      const container = await buildContainerWithProviders([]);
      const authService = container.get<AuthService>(AuthService);
      expect(authService.validatePasswordStrength('Pass1')).toBe(false);
    });

    it('should reject password without uppercase', async () => {
      const container = await buildContainerWithProviders([]);
      const authService = container.get<AuthService>(AuthService);
      expect(authService.validatePasswordStrength('password123')).toBe(false);
    });

    it('should reject password without lowercase', async () => {
      const container = await buildContainerWithProviders([]);
      const authService = container.get<AuthService>(AuthService);
      expect(authService.validatePasswordStrength('PASSWORD123')).toBe(false);
    });

    it('should reject password without number', async () => {
      const container = await buildContainerWithProviders([]);
      const authService = container.get<AuthService>(AuthService);
      expect(authService.validatePasswordStrength('Password')).toBe(false);
    });
  });

  describe('hashPassword', () => {
    it('should hash password', async () => {
      const container = await buildContainerWithProviders([]);
      const authService = container.get<AuthService>(AuthService);
      const hash = await authService.hashPassword('TestPassword123');
      expect(hash).toBeDefined();
      expect(hash).not.toBe('TestPassword123');
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should produce different hashes for same password', async () => {
      const container = await buildContainerWithProviders([]);
      const authService = container.get<AuthService>(AuthService);
      const hash1 = await authService.hashPassword('TestPassword123');
      const hash2 = await authService.hashPassword('TestPassword123');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const container = await buildContainerWithProviders([]);
      const authService = container.get<AuthService>(AuthService);
      const hash = await authService.hashPassword('TestPassword123');
      const isValid = await authService.verifyPassword('TestPassword123', hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const container = await buildContainerWithProviders([]);
      const authService = container.get<AuthService>(AuthService);
      const hash = await authService.hashPassword('TestPassword123');
      const isValid = await authService.verifyPassword('WrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });
});
