import { EnvParser } from '../../core/parser';
import {
  validEnvFile,
  invalidEnvFile,
  envFileWithQuotes,
  envFileWithComments,
} from '../fixtures/test-env-files.fixtures';

describe('EnvParser', () => {
  describe('parseContent', () => {
    it('should parse valid .env content correctly', () => {
      const result = EnvParser.parseContent(validEnvFile);

      expect(result.parseErrors).toHaveLength(0);
      expect(result.variables).toHaveLength(8);

      const nodeEnvVar = result.variables.find(v => v.key === 'NODE_ENV');
      expect(nodeEnvVar).toEqual({
        key: 'NODE_ENV',
        value: 'development',
        lineNumber: 2,
        isQuoted: false,
        hasComment: undefined,
      });

      const portVar = result.variables.find(v => v.key === 'PORT');
      expect(portVar).toEqual({
        key: 'PORT',
        value: '3000',
        lineNumber: 3,
        isQuoted: false,
        hasComment: undefined,
      });
    });

    it('should handle quoted values correctly', () => {
      const result = EnvParser.parseContent(envFileWithQuotes);

      expect(result.parseErrors).toHaveLength(0);

      const singleQuoted = result.variables.find(v => v.key === 'SINGLE_QUOTED');
      expect(singleQuoted).toEqual({
        key: 'SINGLE_QUOTED',
        value: 'single quoted value',
        lineNumber: 2,
        isQuoted: true,
        hasComment: undefined,
      });

      const doubleQuoted = result.variables.find(v => v.key === 'DOUBLE_QUOTED');
      expect(doubleQuoted).toEqual({
        key: 'DOUBLE_QUOTED',
        value: 'double quoted value',
        lineNumber: 3,
        isQuoted: true,
        hasComment: undefined,
      });

      const unquoted = result.variables.find(v => v.key === 'UNQUOTED');
      expect(unquoted).toEqual({
        key: 'UNQUOTED',
        value: 'unquoted value',
        lineNumber: 4,
        isQuoted: false,
        hasComment: undefined,
      });
    });

    it('should handle comments correctly', () => {
      const result = EnvParser.parseContent(envFileWithComments);

      expect(result.parseErrors).toHaveLength(0);
      expect(result.comments).toContain('Main configuration');
      expect(result.comments).toContain('Database configuration');

      const nodeEnvVar = result.variables.find(v => v.key === 'NODE_ENV');
      expect(nodeEnvVar?.hasComment).toBe('Environment setting');

      const portVar = result.variables.find(v => v.key === 'PORT');
      expect(portVar?.hasComment).toBe('Server port');
    });

    it('should handle empty lines correctly', () => {
      const contentWithEmptyLines = `NODE_ENV=development

PORT=3000

DATABASE_URL=test`;

      const result = EnvParser.parseContent(contentWithEmptyLines);

      expect(result.emptyLines).toEqual([2, 4]);
      expect(result.variables).toHaveLength(3);
    });

    it('should detect parse errors in invalid content', () => {
      const result = EnvParser.parseContent(invalidEnvFile);

      expect(result.parseErrors.length).toBeGreaterThan(0);
      
      const invalidLineError = result.parseErrors.find(
        error => error.message === 'Invalid variable assignment format'
      );
      expect(invalidLineError).toBeDefined();
    });

    it('should handle empty values correctly', () => {
      const contentWithEmptyValues = `VAR1=
VAR2=""
VAR3=''
VAR4=value`;

      const result = EnvParser.parseContent(contentWithEmptyValues);

      expect(result.parseErrors).toHaveLength(0);
      expect(result.variables).toHaveLength(4);

      const var1 = result.variables.find(v => v.key === 'VAR1');
      expect(var1?.value).toBe('');
      expect(var1?.isQuoted).toBe(false);

      const var2 = result.variables.find(v => v.key === 'VAR2');
      expect(var2?.value).toBe('');
      expect(var2?.isQuoted).toBe(true);

      const var3 = result.variables.find(v => v.key === 'VAR3');
      expect(var3?.value).toBe('');
      expect(var3?.isQuoted).toBe(true);
    });

    it('should handle escape sequences in double quotes', () => {
      const contentWithEscapes = `VAR1="line1\\nline2"
VAR2="tab\\there"
VAR3="quote\\""
VAR4="backslash\\\\"`;

      const result = EnvParser.parseContent(contentWithEscapes);

      expect(result.parseErrors).toHaveLength(0);

      const var1 = result.variables.find(v => v.key === 'VAR1');
      expect(var1?.value).toBe('line1\nline2');

      const var2 = result.variables.find(v => v.key === 'VAR2');
      expect(var2?.value).toBe('tab\there');

      const var3 = result.variables.find(v => v.key === 'VAR3');
      expect(var3?.value).toBe('quote"');

      const var4 = result.variables.find(v => v.key === 'VAR4');
      expect(var4?.value).toBe('backslash\\');
    });
  });

  describe('stringify', () => {
    it('should convert variables back to .env format', () => {
      const variables = [
        {
          key: 'NODE_ENV',
          value: 'development',
          lineNumber: 1,
          isQuoted: false,
        },
        {
          key: 'PORT',
          value: '3000',
          lineNumber: 2,
          isQuoted: false,
        },
        {
          key: 'QUOTED_VAR',
          value: 'quoted value',
          lineNumber: 3,
          isQuoted: true,
        },
        {
          key: 'VAR_WITH_COMMENT',
          value: 'value',
          lineNumber: 4,
          isQuoted: false,
          hasComment: 'This is a comment',
        },
      ];

      const result = EnvParser.stringify(variables);
      const lines = result.split('\n');

      expect(lines[0]).toBe('NODE_ENV=development');
      expect(lines[1]).toBe('PORT=3000');
      expect(lines[2]).toBe('QUOTED_VAR="quoted value"');
      expect(lines[3]).toBe('VAR_WITH_COMMENT=value # This is a comment');
    });
  });
});
