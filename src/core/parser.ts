import { readFileSync } from 'fs';
import { EnvVariable, ParsedEnvFile, ParseError } from '../types';

/**
 * Parser for .env files with comprehensive error handling and metadata extraction
 */
export class EnvParser {
  /**
   * Parse a .env file from file path
   */
  public static parseFile(filePath: string): ParsedEnvFile {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return this.parseContent(content);
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Parse .env content from string
   */
  public static parseContent(content: string): ParsedEnvFile {
    const lines = content.split(/\r?\n/);
    const variables: EnvVariable[] = [];
    const comments: string[] = [];
    const emptyLines: number[] = [];
    const parseErrors: ParseError[] = [];

    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i];
      if (line === undefined) continue;
      const trimmedLine = line.trim();

      // Track empty lines
      if (trimmedLine === '') {
        emptyLines.push(lineNumber);
        continue;
      }

      // Handle comments
      if (trimmedLine.startsWith('#')) {
        comments.push(trimmedLine.substring(1).trim());
        continue;
      }

      // Parse variable assignment
      const result = this.parseVariableLine(line, lineNumber);
      if (result.error) {
        parseErrors.push(result.error);
      } else if (result.variable) {
        variables.push(result.variable);
      }
    }

    return {
      variables,
      comments,
      emptyLines,
      parseErrors,
    };
  }

  /**
   * Parse a single variable line
   */
  private static parseVariableLine(
    line: string,
    lineNumber: number
  ): { variable?: EnvVariable; error?: ParseError } {
    const trimmedLine = line.trim();

    // Check for variable assignment pattern
    const assignmentMatch = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!assignmentMatch) {
      return {
        error: {
          lineNumber,
          message: 'Invalid variable assignment format',
          line: trimmedLine,
        },
      };
    }

    const key = assignmentMatch[1];
    const valueWithComment = assignmentMatch[2];

    if (!key || valueWithComment === undefined) {
      return {
        error: {
          lineNumber,
          message: 'Invalid variable assignment format',
          line: trimmedLine,
        },
      };
    }

    // Extract value and inline comment
    const { value, comment } = this.extractValueAndComment(valueWithComment);
    const { cleanValue, isQuoted } = this.processQuotes(value);

    return {
      variable: {
        key,
        value: cleanValue,
        lineNumber,
        isQuoted,
        hasComment: comment,
      },
    };
  }

  /**
   * Extract value and inline comment from the right side of assignment
   */
  private static extractValueAndComment(valueWithComment: string): {
    value: string;
    comment?: string | undefined;
  } {
    // Handle quoted values that might contain # characters
    const quotedMatch = valueWithComment.match(/^(['"])(.*?)\1(\s*#.*)?$/);
    if (quotedMatch) {
      const [, , quotedValue, commentPart] = quotedMatch;
      return {
        value: `${quotedMatch[1]}${quotedValue}${quotedMatch[1]}`,
        comment: commentPart?.trim().substring(1).trim(),
      };
    }

    // Handle unquoted values
    const commentIndex = valueWithComment.indexOf('#');
    if (commentIndex === -1) {
      return { value: valueWithComment.trim() };
    }

    return {
      value: valueWithComment.substring(0, commentIndex).trim(),
      comment: valueWithComment.substring(commentIndex + 1).trim(),
    };
  }

  /**
   * Process quotes and extract clean value
   */
  private static processQuotes(value: string): { cleanValue: string; isQuoted: boolean } {
    const trimmedValue = value.trim();

    // Check for single quotes
    if (trimmedValue.startsWith("'") && trimmedValue.endsWith("'") && trimmedValue.length >= 2) {
      return {
        cleanValue: trimmedValue.slice(1, -1),
        isQuoted: true,
      };
    }

    // Check for double quotes
    if (trimmedValue.startsWith('"') && trimmedValue.endsWith('"') && trimmedValue.length >= 2) {
      // Handle escape sequences in double quotes
      const unescaped = trimmedValue
        .slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"');

      return {
        cleanValue: unescaped,
        isQuoted: true,
      };
    }

    return {
      cleanValue: trimmedValue,
      isQuoted: false,
    };
  }

  /**
   * Convert parsed variables back to .env format
   */
  public static stringify(variables: EnvVariable[]): string {
    return variables
      .map(variable => {
        const value = variable.isQuoted ? `"${variable.value}"` : variable.value;
        const comment = variable.hasComment ? ` # ${variable.hasComment}` : '';
        return `${variable.key}=${value}${comment}`;
      })
      .join('\n');
  }
}
