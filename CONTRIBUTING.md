# Contributing to Epic Tabs

Thank you for your interest in contributing to Epic Tabs! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Keep discussions professional

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Chrome browser
- Git
- Code editor (VS Code recommended)

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/chrome-epic-tabs.git
   cd chrome-epic-tabs
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/original/chrome-epic-tabs.git
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Build the CSS:
   ```bash
   npm run build:css
   ```

## Development Workflow

### Branch Strategy

- `main` - Stable release branch
- `develop` - Active development branch
- Feature branches: `feature/description`
- Bug fixes: `fix/description`

### Making Changes

1. Create a new branch from `develop`:
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/your-feature-name
   ```

2. Make your changes
3. Write/update tests
4. Run validation checks:
   ```bash
   npm run validate
   ```

5. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add awesome feature"
   ```

### Commit Message Format

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(popup): add quick restore button
fix(db): handle IndexedDB quota exceeded error
docs(readme): update installation instructions
test(background): add tests for tab restoration
```

### Code Standards

#### JavaScript

- Use ES6+ features
- Follow ESLint rules (run `npm run lint`)
- Use `const` by default, `let` when reassignment is needed
- Avoid `var`
- Use async/await instead of callbacks
- Add JSDoc comments for complex functions

**Example:**
```javascript
/**
 * Saves multiple tabs to the database
 * @param {Array} tabs - Array of tab objects to save
 * @param {string} sessionName - Name for the session
 * @returns {Promise<Object>} Result with sessionId and count
 */
async function saveTabs(tabs, sessionName) {
  // Implementation
}
```

#### CSS/Styling

- Use Tailwind CSS utility classes
- Add custom utilities in `src/styles/input.css`
- Avoid inline styles
- Use semantic class names for custom components

#### HTML

- Use semantic HTML5 elements
- Include proper ARIA labels for accessibility
- Keep structure clean and readable

### Testing

Write tests for all new features:

```bash
# Run tests
npm test

# Watch mode during development
npm run test:watch

# Check coverage
npm run test:coverage
```

**Test Guidelines:**
- Write unit tests for all functions
- Mock Chrome APIs using jest-chrome
- Aim for >70% code coverage
- Test edge cases and error handling

**Example Test:**
```javascript
describe('saveTab', () => {
  test('should save tab successfully', async () => {
    const tab = { url: 'https://example.com', title: 'Example' };
    const result = await saveTab(tab);

    expect(result.success).toBe(true);
    expect(result.tabId).toBeDefined();
  });

  test('should reject chrome:// URLs', async () => {
    const tab = { url: 'chrome://extensions', title: 'Extensions' };
    const result = await saveTab(tab);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot save');
  });
});
```

### Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass: `npm run validate`
3. Build CSS: `npm run build:css`
4. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

5. Create a Pull Request on GitHub
6. Fill out the PR template completely
7. Link related issues
8. Wait for review

**PR Checklist:**
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] All checks passing (lint, format, tests)
- [ ] No console errors
- [ ] Tested in Chrome extension

### Review Process

- PRs require at least one approval
- Address review feedback promptly
- Keep PRs focused and reasonably sized
- Update your branch if `develop` has moved forward

## Project Architecture

### Key Components

**db.js** - IndexedDB wrapper
- Manages all database operations
- Provides clean API for tabs and sessions
- Handles indexing and queries

**background.js** - Service worker
- Captures and restores tabs
- Handles context menus
- Manages extension lifecycle

**popup.js** - Extension popup
- Quick action interface
- Displays statistics
- Handles user preferences

**manager.js** - Full manager page
- Browse sessions and tabs
- Search and filter
- Import/export data

### Adding Features

#### New Database Methods

1. Add method to `TabDatabase` class in `db.js`
2. Write unit tests in `tests/db.test.js`
3. Update JSDoc comments
4. Export if needed by other modules

#### New Background Actions

1. Add case to message handler in `background.js`
2. Implement the action function
3. Write tests in `tests/background.test.js`
4. Update documentation

#### New UI Features

1. Update HTML in `popup.html` or `manager.html`
2. Add event handlers in corresponding JS file
3. Use Tailwind classes for styling
4. Test across different screen sizes

## Reporting Issues

### Bug Reports

Include:
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Chrome version
- Extension version
- Screenshots if applicable
- Console errors

### Feature Requests

Include:
- Clear description of the feature
- Use case and motivation
- Proposed implementation (optional)
- Mockups or examples (optional)

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

## Questions?

- Open a discussion on GitHub
- Check existing issues and PRs
- Read the documentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

---

Thank you for contributing to Epic Tabs! Your help makes this project better for everyone.
