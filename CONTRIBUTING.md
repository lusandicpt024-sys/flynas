# Contributing to Flynas

Thank you for your interest in contributing to Flynas! This document provides guidelines and instructions for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Platform-Specific Guidelines](#platform-specific-guidelines)

## Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, gender, gender identity, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, or nationality.

### Expected Behavior
- Be respectful and considerate
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Accept responsibility for mistakes
- Show empathy towards others

### Unacceptable Behavior
- Harassment, trolling, or discriminatory language
- Personal attacks or insults
- Publishing others' private information
- Spamming or excessive self-promotion

## Getting Started

### Prerequisites
1. Install required tools for your platform:
   - **Desktop/Browser**: Node.js 16+, npm 7+
   - **Android**: Java 17, Android SDK 34, Gradle 8.3+
   
2. Fork the repository on GitHub

3. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/flynas.git
   cd flynas
   ```

4. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/flynas.git
   ```

### Setting Up Development Environment

#### Desktop Applications
```bash
cd desktop/linux  # or desktop/windows
npm install
npm run dev
```

#### Browser Extensions
```bash
cd browser-extension/chrome  # or firefox
# Load unpacked in browser
```

#### Android Application
```bash
cd android
export JAVA_HOME=/path/to/java-17
./gradlew assembleDebug
```

## Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes
- Write clean, readable code
- Follow the coding standards
- Add tests for new features
- Update documentation

### 3. Commit Your Changes
```bash
git add .
git commit -m "feat: add new feature description"
```

#### Commit Message Format
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(android): add file upload progress indicator
fix(browser-ext): resolve drag-drop event conflict
docs(readme): update installation instructions
refactor(shared): optimize encryption performance
```

### 4. Keep Your Branch Updated
```bash
git fetch upstream
git rebase upstream/main
```

### 5. Push Changes
```bash
git push origin feature/your-feature-name
```

### 6. Create Pull Request
- Go to GitHub and create a pull request
- Fill out the PR template completely
- Link related issues
- Request reviews from maintainers

## Coding Standards

### TypeScript/JavaScript

#### Style Guide
- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Max line length: 100 characters
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces

#### Example:
```typescript
// Good
class FileManager {
  private apiUrl: string;
  
  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }
  
  async uploadFile(file: File, path: string): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    
    await fetch(`${this.apiUrl}/upload`, {
      method: 'POST',
      body: formData
    });
  }
}

// Bad
class fileManager {
    private ApiUrl: String
    
    constructor(apiUrl: String) {
        this.ApiUrl = apiUrl
    }
    
    async uploadFile(file,path) {
        var formData = new FormData()
        formData.append("file",file)
        
        await fetch(this.ApiUrl+"/upload",{method:"POST",body:formData})
    }
}
```

### Kotlin (Android)

#### Style Guide
- Follow [Kotlin Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html)
- Use 4 spaces for indentation
- Max line length: 120 characters
- Use camelCase for functions and variables
- Use PascalCase for classes

#### Example:
```kotlin
// Good
class FileManager(private val apiUrl: String) {
    
    suspend fun uploadFile(file: File, path: String): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                val request = MultipartBody.Builder()
                    .addFormDataPart("file", file.name)
                    .build()
                    
                val response = httpClient.post("$apiUrl/upload", request)
                Result.success(Unit)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}

// Bad
class fileManager(val ApiUrl: String) {
    fun uploadFile(file: File,path: String): Unit {
        val request = MultipartBody.Builder().addFormDataPart("file",file.name).build()
        val response = httpClient.post(ApiUrl+"/upload",request)
    }
}
```

### CSS

- Use 2 spaces for indentation
- Use kebab-case for class names
- Group related properties
- Use CSS variables for colors and spacing

```css
/* Good */
.file-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  
  background-color: var(--bg-secondary);
  border-radius: var(--radius-sm);
  
  transition: background-color 0.2s ease;
}

/* Bad */
.fileItem{
    display:flex;align-items:center;padding:12px;
    background-color:#f5f5f5;border-radius:4px;transition:background-color 0.2s ease;
}
```

## Testing

### Unit Tests
- Write tests for all business logic
- Aim for >80% code coverage
- Use descriptive test names

```typescript
// Example test
describe('FileManager', () => {
  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const manager = new FileManager('https://api.test');
      const file = new File(['content'], 'test.txt');
      
      await expect(manager.uploadFile(file, '/path')).resolves.not.toThrow();
    });
    
    it('should throw error on network failure', async () => {
      const manager = new FileManager('https://invalid');
      const file = new File(['content'], 'test.txt');
      
      await expect(manager.uploadFile(file, '/path')).rejects.toThrow();
    });
  });
});
```

### Running Tests

```bash
# Desktop/Browser
npm test

# Android
./gradlew test
```

## Submitting Changes

### Pull Request Checklist
- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] No merge conflicts with main branch
- [ ] PR description is clear and complete

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Screenshots
If applicable, add screenshots

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where needed
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests
- [ ] All tests pass locally
```

## Platform-Specific Guidelines

### Desktop (Electron)
- Use IPC for main ↔ renderer communication
- Enable context isolation
- Implement proper error handling
- Test on both Linux and Windows

### Browser Extensions
- Follow WebExtension standards
- Support both Chrome and Firefox
- Minimize permissions requested
- Handle content security policy

### Android
- Follow Material Design guidelines
- Handle Android lifecycle properly
- Request permissions at runtime
- Test on multiple API levels (24-34)

### Shared Modules
- Keep platform-agnostic
- Use TypeScript for type safety
- Document public APIs
- Avoid platform-specific code

## Review Process

1. **Automated Checks**: CI/CD runs tests and linting
2. **Code Review**: Maintainers review code quality
3. **Testing**: Reviewers test functionality
4. **Approval**: At least one maintainer approval required
5. **Merge**: Maintainers merge approved PRs

## Questions?

- Check existing issues and documentation
- Ask in GitHub Discussions
- Contact maintainers

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for contributing to Flynas! 🚀
