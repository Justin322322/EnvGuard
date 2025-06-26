import { SecurityAnalyzer } from '../../security/analyzer';
import { EnvVariable } from '../../types';

describe('SecurityAnalyzer', () => {
  let analyzer: SecurityAnalyzer;

  beforeEach(() => {
    analyzer = new SecurityAnalyzer();
  });

  describe('analyze', () => {
    it('should detect weak passwords', () => {
      const variables: EnvVariable[] = [
        {
          key: 'PASSWORD',
          value: 'admin',
          lineNumber: 1,
          isQuoted: false,
        },
        {
          key: 'USER_PASSWORD',
          value: 'password',
          lineNumber: 2,
          isQuoted: false,
        },
        {
          key: 'JWT_SECRET',
          value: 'secret',
          lineNumber: 3,
          isQuoted: false,
        },
      ];

      const result = analyzer.analyze(variables);

      expect(result.errors.length).toBeGreaterThan(0);
      
      const weakSecretError = result.errors.find(
        error => error.variable === 'JWT_SECRET' && error.message.includes('Weak')
      );
      expect(weakSecretError).toBeDefined();
    });

    it('should detect hardcoded API keys', () => {
      const variables: EnvVariable[] = [
        {
          key: 'API_KEY',
          value: 'abcdef1234567890abcdef1234567890',
          lineNumber: 1,
          isQuoted: false,
        },
        {
          key: 'SECRET_KEY',
          value: 'sk_test_1234567890abcdef1234567890abcdef',
          lineNumber: 2,
          isQuoted: false,
        },
      ];

      const result = analyzer.analyze(variables);

      expect(result.warnings.length).toBeGreaterThan(0);
      
      const apiKeyWarning = result.warnings.find(
        warning => warning.variable === 'API_KEY'
      );
      expect(apiKeyWarning).toBeDefined();
    });

    it('should detect potential PII', () => {
      const variables: EnvVariable[] = [
        {
          key: 'USER_EMAIL',
          value: 'john.doe@example.com',
          lineNumber: 1,
          isQuoted: false,
        },
        {
          key: 'CREDIT_CARD',
          value: '4111-1111-1111-1111',
          lineNumber: 2,
          isQuoted: false,
        },
        {
          key: 'SSN',
          value: '123-45-6789',
          lineNumber: 3,
          isQuoted: false,
        },
      ];

      const result = analyzer.analyze(variables);

      expect(result.warnings.length).toBeGreaterThan(0);
      
      const emailWarning = result.warnings.find(
        warning => warning.variable === 'USER_EMAIL' && warning.message.includes('Email')
      );
      expect(emailWarning).toBeDefined();

      const ccWarning = result.warnings.find(
        warning => warning.variable === 'CREDIT_CARD' && warning.message.includes('Credit card')
      );
      expect(ccWarning).toBeDefined();
    });

    it('should detect URLs with embedded credentials', () => {
      const variables: EnvVariable[] = [
        {
          key: 'DATABASE_URL',
          value: 'postgresql://admin:password123@localhost:5432/db',
          lineNumber: 1,
          isQuoted: false,
        },
        {
          key: 'REDIS_URL',
          value: 'redis://user:pass@redis.example.com:6379',
          lineNumber: 2,
          isQuoted: false,
        },
      ];

      const result = analyzer.analyze(variables);

      expect(result.warnings.length).toBeGreaterThan(0);
      
      const dbUrlWarning = result.warnings.find(
        warning => warning.variable === 'DATABASE_URL' && warning.message.includes('embedded credentials')
      );
      expect(dbUrlWarning).toBeDefined();
    });

    it('should detect development/test indicators', () => {
      const variables: EnvVariable[] = [
        {
          key: 'API_URL',
          value: 'http://localhost:3000',
          lineNumber: 1,
          isQuoted: false,
        },
        {
          key: 'DATABASE_URL',
          value: 'postgresql://user:pass@127.0.0.1:5432/testdb',
          lineNumber: 2,
          isQuoted: false,
        },
        {
          key: 'ENVIRONMENT',
          value: 'development',
          lineNumber: 3,
          isQuoted: false,
        },
      ];

      const result = analyzer.analyze(variables);

      expect(result.warnings.length).toBeGreaterThan(0);
      
      const localhostWarning = result.warnings.find(
        warning => warning.variable === 'API_URL' && warning.message.includes('Localhost')
      );
      expect(localhostWarning).toBeDefined();
    });

    it('should detect placeholder values', () => {
      const variables: EnvVariable[] = [
        {
          key: 'JWT_SECRET',
          value: 'your_secret_here',
          lineNumber: 1,
          isQuoted: false,
        },
        {
          key: 'API_KEY',
          value: '<your-api-key>',
          lineNumber: 2,
          isQuoted: false,
        },
        {
          key: 'PASSWORD',
          value: 'changeme',
          lineNumber: 3,
          isQuoted: false,
        },
      ];

      const result = analyzer.analyze(variables);

      expect(result.warnings.length).toBeGreaterThan(0);
      
      const placeholderWarning = result.warnings.find(
        warning => warning.message.includes('Placeholder')
      );
      expect(placeholderWarning).toBeDefined();
    });

    it('should work with custom security rules', () => {
      const customRules = [
        {
          name: 'no-test-keys',
          description: 'Test keys should not be used',
          pattern: /test[_-]?key/i,
          severity: 'warning' as const,
          suggestion: 'Use production keys',
        },
      ];

      const customAnalyzer = new SecurityAnalyzer(customRules);

      const variables: EnvVariable[] = [
        {
          key: 'API_KEY',
          value: 'test_key_12345',
          lineNumber: 1,
          isQuoted: false,
        },
      ];

      const result = customAnalyzer.analyze(variables);

      expect(result.warnings.length).toBeGreaterThan(0);
      
      const customWarning = result.warnings.find(
        warning => warning.message === 'Test keys should not be used'
      );
      expect(customWarning).toBeDefined();
    });

    it('should not flag secure values', () => {
      const variables: EnvVariable[] = [
        {
          key: 'JWT_SECRET',
          value: 'a-very-long-and-secure-jwt-secret-key-that-is-randomly-generated',
          lineNumber: 1,
          isQuoted: false,
        },
        {
          key: 'API_KEY',
          value: 'sk_live_abcdef1234567890abcdef1234567890abcdef1234567890',
          lineNumber: 2,
          isQuoted: false,
        },
        {
          key: 'DATABASE_URL',
          value: 'postgresql://localhost:5432/db',
          lineNumber: 3,
          isQuoted: false,
        },
      ];

      const result = analyzer.analyze(variables);

      // Should have some warnings for localhost, but no errors for weak secrets
      const weakSecretErrors = result.errors.filter(
        error => error.message.includes('Weak') || error.message.includes('weak')
      );
      expect(weakSecretErrors).toHaveLength(0);
    });
  });
});
