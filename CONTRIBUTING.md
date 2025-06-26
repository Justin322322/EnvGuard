# Contributing to EnvGuard

Thank you for your interest in contributing to EnvGuard! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Git

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/EnvGuard.git
   cd EnvGuard
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Run tests:
   ```bash
   npm test
   ```

## Development Workflow

### Code Style
- We use ESLint and Prettier for code formatting
- Run `npm run lint` to check for linting issues
- Run `npm run format` to auto-format code

### Testing
- Write tests for all new features
- Maintain 100% test coverage
- Run `npm test` to execute the test suite
- Run `npm run test:watch` for development

### Commit Messages
Follow conventional commit format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for test changes
- `refactor:` for code refactoring

### Pull Request Process

1. Create a feature branch from `master`
2. Make your changes with appropriate tests
3. Ensure all tests pass and linting is clean
4. Update documentation if needed
5. Submit a pull request with a clear description

## Types of Contributions

### Bug Reports
- Use the issue template
- Include reproduction steps
- Provide environment details

### Feature Requests
- Describe the use case
- Explain the expected behavior
- Consider backward compatibility

### Code Contributions
- Follow the coding standards
- Include comprehensive tests
- Update documentation
- Consider performance implications

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a release PR
4. Tag the release after merge

## Questions?

Feel free to open an issue for questions or join our discussions!
