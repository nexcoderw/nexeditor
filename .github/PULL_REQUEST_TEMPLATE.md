## Description

<!-- What does this PR do? Why is it needed? -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing behavior to change)
- [ ] Security fix
- [ ] Documentation update
- [ ] Refactor (no functional change)
- [ ] CI/build change

## Checklist

### Code quality
- [ ] Code follows the project conventions in `CLAUDE.md`
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Code is formatted with Prettier (`npm run format:check`)

### Tests
- [ ] Unit tests added or updated for all changed logic
- [ ] All existing tests pass (`npm test`)
- [ ] E2E tests pass if UI was changed (`npm run test:e2e`)
- [ ] Coverage thresholds still met

### Security (required for any PR touching security-sensitive code)
- [ ] HTML sanitizer not weakened
- [ ] No new external network requests without security review
- [ ] No new direct DOM manipulation bypassing ProseMirror
- [ ] Input validation added for any new user-facing inputs
- [ ] CSP helpers updated if new external domains are required

### Changeset
- [ ] Changeset file added (`npm run changeset`)
  - `patch` for bug fixes
  - `minor` for new features
  - `major` for breaking changes

### Documentation
- [ ] README updated if public API changed
- [ ] SECURITY.md updated if security model changed
- [ ] JSDoc comments added for new public functions

## Testing instructions

<!-- How should a reviewer test this PR? Step by step. -->

## Security considerations

<!-- Does this PR have any security implications? -->
<!-- If it touches sanitization, validation, or external requests — explain. -->

## Screenshots (if UI changed)

<!-- Before / after screenshots for visual changes -->