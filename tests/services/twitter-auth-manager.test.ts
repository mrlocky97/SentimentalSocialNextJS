/**
 * Tests críticos para TwitterAuthManager
 * Verifica que la autenticación de Twitter funciona correctamente
 */

import { TwitterAuthManager } from '../../src/services/twitter-auth-manager.service';

describe('TwitterAuthManager - CRÍTICO', () => {
  let authManager: TwitterAuthManager;

  beforeEach(() => {
    authManager = TwitterAuthManager.getInstance();
  });

  afterEach(() => {
    // Limpiar estado después de cada test
    authManager.clearSession();
  });

  describe('Validación de Sesión', () => {
    it('debe devolver false para sesiones no válidas por defecto', () => {
      const hasValidSession = authManager.hasValidSession();

      expect(hasValidSession).toBe(false);
    });

    it('debe proporcionar información de sesión', () => {
      const sessionInfo = authManager.getSessionInfo();

      expect(sessionInfo).toBeDefined();
      expect(sessionInfo).toHaveProperty('authenticated');
      expect(sessionInfo).toHaveProperty('cookieCount');
      expect(typeof sessionInfo.authenticated).toBe('boolean');
      expect(typeof sessionInfo.cookieCount).toBe('number');
    });
  });

  describe('Gestión de Sesión', () => {
    it('debe limpiar la sesión correctamente', () => {
      expect(() => {
        authManager.clearSession();
      }).not.toThrow();

      expect(authManager.hasValidSession()).toBe(false);
    });

    it('debe manejar múltiples llamadas getInstance', () => {
      const instance1 = TwitterAuthManager.getInstance();
      const instance2 = TwitterAuthManager.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(TwitterAuthManager);
    });
  });

  describe('Información de Estado', () => {
    it('debe proporcionar información consistente de sesión', () => {
      const sessionInfo1 = authManager.getSessionInfo();
      const sessionInfo2 = authManager.getSessionInfo();

      expect(sessionInfo1.authenticated).toBe(sessionInfo2.authenticated);
      expect(sessionInfo1.cookieCount).toBe(sessionInfo2.cookieCount);
    });

    it('debe mantener estado después de clearSession', () => {
      authManager.clearSession();
      const sessionInfo = authManager.getSessionInfo();

      expect(sessionInfo.authenticated).toBe(false);
      expect(sessionInfo.cookieCount).toBe(0);
    });
  });

  describe('Manejo de Errores', () => {
    it('debe manejar llamadas múltiples a clearSession', () => {
      expect(() => {
        authManager.clearSession();
        authManager.clearSession();
        authManager.clearSession();
      }).not.toThrow();
    });

    it('debe manejar verificaciones de sesión repetidas', () => {
      expect(() => {
        for (let i = 0; i < 10; i++) {
          authManager.hasValidSession();
        }
      }).not.toThrow();
    });
  });
});
