# CLAUDE.md - AI Assistant Guidelines for Podcast Project

> This file provides context and guidelines for AI assistants working with this codebase.

## Project Overview

**Project Name:** Podcast
**Repository:** podcast
**Status:** Initial Setup

This repository is for a podcast-related application. The specific functionality and architecture will be documented here as the project develops.

---

## Quick Reference

### Common Commands

```bash
# Development
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Code Quality
npm run lint         # Run linter
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
npm run typecheck    # Run TypeScript type checking
```

### Key File Locations

| Purpose | Location |
|---------|----------|
| Source code | `src/` |
| Tests | `src/**/*.test.ts` or `tests/` |
| Configuration | Root directory (`*.config.*`) |
| Documentation | `docs/` |
| Static assets | `public/` or `assets/` |

---

## Project Structure

```
podcast/
├── src/                    # Source code
│   ├── components/         # UI components (if applicable)
│   ├── services/           # Business logic and services
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   └── index.ts            # Entry point
├── tests/                  # Test files
├── docs/                   # Documentation
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── .eslintrc.*             # ESLint configuration
├── .prettierrc             # Prettier configuration
└── CLAUDE.md               # This file
```

> **Note:** Update this structure as the project evolves.

---

## Development Workflow

### Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy environment file: `cp .env.example .env` (if applicable)
4. Start development: `npm run dev`

### Branch Naming Conventions

- `main` or `master` - Production-ready code
- `develop` - Integration branch for features
- `feature/<description>` - New features
- `fix/<description>` - Bug fixes
- `refactor/<description>` - Code refactoring
- `docs/<description>` - Documentation updates
- `claude/<session-id>` - AI assistant working branches

### Commit Message Format

Use conventional commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```
feat(player): add playback speed control
fix(api): handle null response from podcast feed
docs(readme): update installation instructions
```

---

## Code Conventions

### TypeScript Guidelines

- Use TypeScript strict mode
- Define explicit types for function parameters and return values
- Prefer interfaces over type aliases for object shapes
- Use enums for fixed sets of values
- Avoid `any` type; use `unknown` when type is truly unknown

```typescript
// Good
interface PodcastEpisode {
  id: string;
  title: string;
  duration: number;
  publishedAt: Date;
}

function getEpisode(id: string): Promise<PodcastEpisode> {
  // implementation
}

// Avoid
function getEpisode(id): any {
  // implementation
}
```

### Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Files (components) | PascalCase | `PodcastPlayer.tsx` |
| Files (utilities) | camelCase | `formatDuration.ts` |
| Files (tests) | Match source + `.test` | `formatDuration.test.ts` |
| Variables | camelCase | `episodeCount` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Functions | camelCase | `fetchPodcastFeed` |
| Classes | PascalCase | `AudioPlayer` |
| Interfaces | PascalCase (I-prefix optional) | `PodcastEpisode` |
| Types | PascalCase | `PlaybackState` |
| Enums | PascalCase | `PlaybackStatus` |

### Error Handling

- Use try-catch blocks for async operations
- Create custom error classes for domain-specific errors
- Log errors with context for debugging
- Return user-friendly error messages

```typescript
class PodcastFetchError extends Error {
  constructor(
    message: string,
    public readonly feedUrl: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PodcastFetchError';
  }
}
```

### Testing Conventions

- Write unit tests for utility functions
- Write integration tests for API endpoints
- Use descriptive test names that explain the expected behavior
- Follow the Arrange-Act-Assert pattern

```typescript
describe('formatDuration', () => {
  it('should format seconds into MM:SS format', () => {
    // Arrange
    const seconds = 125;

    // Act
    const result = formatDuration(seconds);

    // Assert
    expect(result).toBe('2:05');
  });
});
```

---

## Architecture Guidelines

### Separation of Concerns

- **Components**: Handle UI rendering and user interactions
- **Services**: Contain business logic and external API calls
- **Utils**: Provide pure helper functions
- **Types**: Define TypeScript interfaces and types

### API Design

When creating APIs or services:

- Use RESTful conventions for HTTP endpoints
- Return consistent response structures
- Include proper error codes and messages
- Document endpoints with JSDoc or OpenAPI

### State Management

- Keep state as close to where it's used as possible
- Lift state up only when necessary
- Use context or state management libraries for truly global state
- Avoid prop drilling by more than 2-3 levels

---

## AI Assistant Guidelines

### When Working on This Codebase

1. **Read before writing**: Always read existing code to understand patterns before making changes
2. **Follow existing conventions**: Match the style and patterns already in the codebase
3. **Keep changes focused**: Make minimal changes needed to accomplish the task
4. **Run tests**: Always run tests after making changes
5. **Update documentation**: Update this file or other docs when adding new patterns

### Code Review Checklist

Before committing, verify:

- [ ] Code follows project conventions
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Linter passes (`npm run lint`)
- [ ] Tests pass (`npm test`)
- [ ] No hardcoded secrets or credentials
- [ ] No console.log statements left in code
- [ ] Changes are minimal and focused

### Security Considerations

- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Validate and sanitize user inputs
- Use parameterized queries for database operations
- Keep dependencies updated for security patches

### Performance Guidelines

- Optimize expensive operations (network, disk, computation)
- Use pagination for large data sets
- Implement caching where appropriate
- Lazy load non-critical resources
- Profile before optimizing

---

## Dependencies

### Core Dependencies

| Package | Purpose |
|---------|---------|
| (To be documented) | |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| TypeScript | Type checking |
| ESLint | Code linting |
| Prettier | Code formatting |
| Jest/Vitest | Testing |

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| (To be documented) | | |

> Create a `.env.example` file with placeholder values for all required environment variables.

---

## Troubleshooting

### Common Issues

**Issue**: Dependencies fail to install
**Solution**: Delete `node_modules` and `package-lock.json`, then run `npm install`

**Issue**: TypeScript compilation errors
**Solution**: Run `npm run typecheck` to see detailed errors

**Issue**: Tests failing unexpectedly
**Solution**: Clear test cache with `npm test -- --clearCache`

---

## Resources

- [Project Documentation](./docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

## Changelog

| Date | Changes |
|------|---------|
| 2026-01-27 | Initial CLAUDE.md created |

---

*This file should be updated as the project evolves. When adding new patterns, tools, or conventions, document them here for future reference.*
