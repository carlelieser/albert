# Project Guidelines

## Test-Driven Development (TDD)

Follow the Red-Green-Refactor cycle:
1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Clean up while keeping tests green

### TDD Rules
- Never write production code without a failing test
- Write only enough test code to fail (compilation failures count)
- Write only enough production code to pass the current test
- Keep tests fast, isolated, and deterministic

## Clean Code Principles

### Naming
- Use intention-revealing names
- Avoid abbreviations and single-letter variables (except loop counters)
- Classes: nouns (e.g., `UserRepository`)
- Methods: verbs (e.g., `calculateTotal`, `fetchUser`)
- Booleans: question form (e.g., `isValid`, `hasPermission`)

### Functions
- Small and focused (do one thing)
- Maximum 3 parameters preferred
- No side effects
- Single level of abstraction per function

### Comments
- Code should be self-documenting
- Only comment "why", never "what"
- Delete commented-out code

## SOLID Principles

- **S**ingle Responsibility: One reason to change per class
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable for base types
- **I**nterface Segregation: Many specific interfaces over one general
- **D**ependency Inversion: Depend on abstractions, not concretions

## Architecture Guidelines

### Layer Separation
- **Domain**: Business logic (no framework dependencies)
- **Application**: Use cases and orchestration
- **Infrastructure**: External systems (DB, APIs, frameworks)
- **Presentation**: UI and API controllers

### Dependencies
- Dependencies point inward (infrastructure depends on domain, never reverse)
- Use dependency injection
- Program to interfaces, not implementations

### Code Organization
- Group by feature/module, not by type
- Keep related code close together
- Separate what changes from what stays the same

## Testing Practices

### Test Structure (AAA Pattern)
```
Arrange: Set up test data and conditions
Act: Execute the code under test
Assert: Verify the expected outcome
```

### Test Naming
Use descriptive names: `should_returnError_when_userNotFound`

### Test Types
- **Unit**: Fast, isolated, test single units
- **Integration**: Test component interactions
- **E2E**: Test complete user flows (fewer of these)

### Test Pyramid
Many unit tests > Some integration tests > Few E2E tests

## Code Review Checklist

- [ ] Tests written first and passing
- [ ] Code is readable without comments
- [ ] No duplication (DRY)
- [ ] Single responsibility maintained
- [ ] Dependencies injected
- [ ] Error handling is appropriate
- [ ] No premature optimization
