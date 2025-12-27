# Project Guidelines

## Systematic Problem-Solving Framework

### DECOMPOSE Method
1. **Define**: State the problem precisely. What is the expected vs actual behavior?
2. **Explore**: Gather context. Read relevant code, understand existing patterns.
3. **Constrain**: Identify boundaries, limitations, and acceptance criteria.
4. **Options**: Generate multiple solution approaches.
5. **Measure**: Evaluate options against criteria (simplicity, maintainability, performance).
6. **Plan**: Break the chosen solution into ordered, testable steps.
7. **Observe**: Execute incrementally, verify each step.
8. **Synthesize**: Integrate, refactor, ensure cohesion.
9. **Evaluate**: Validate against original requirements. Does it solve the root cause?

### Before Writing Code
- [ ] Can I articulate the problem in one sentence?
- [ ] Have I identified the root cause, not just symptoms?
- [ ] Is there existing code that solves this or similar problems?
- [ ] What's the simplest solution that could work?

---

## Clean Architecture

### The Dependency Rule
Dependencies point inward. Inner layers know nothing of outer layers.

```
┌─────────────────────────────────────────┐
│           Infrastructure                │  Frameworks, DB, UI, External APIs
├─────────────────────────────────────────┤
│             Application                 │  Use Cases, Orchestration
├─────────────────────────────────────────┤
│               Domain                    │  Entities, Business Rules, Interfaces
└─────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer              | Contains                                                        | Depends On          |
|--------------------|-----------------------------------------------------------------|---------------------|
| **Domain**         | Entities, Value Objects, Domain Services, Repository Interfaces | Nothing             |
| **Application**    | Use Cases, DTOs, Application Services                           | Domain              |
| **Infrastructure** | Repository Implementations, External APIs, Frameworks           | Application, Domain |
| **Presentation**   | Controllers, Views, API Endpoints                               | Application         |

### Key Rules
- Domain has **zero** framework dependencies
- Use Cases orchestrate domain objects to fulfill requirements
- Infrastructure implements interfaces defined in inner layers
- Cross-cutting concerns (logging, auth) via decorators or middleware

---

## Clean Code Principles

### Naming
- **Intention-revealing**: `usersByStatus` not `list2`
- **Searchable**: avoid magic numbers/strings
- **Consistent**: one word per concept (`fetch` vs `get` vs `retrieve` — pick one)
- Classes: nouns (`OrderProcessor`)
- Methods: verbs (`calculateDiscount`)
- Booleans: predicates (`isValid`, `hasAccess`, `canExecute`)

### Functions
- Do **one thing** at **one level of abstraction**
- Max 3 parameters; use objects for more
- No side effects — same input = same output
- Command-Query Separation: functions either do something or answer something, not both

### Error Handling
- Fail fast with meaningful errors
- Use exceptions for exceptional cases, not control flow
- Provide context: what failed, why, and recovery options
- Never swallow exceptions silently

### Code Smells to Eliminate
- Long methods (>20 lines is suspicious)
- Deep nesting (>2 levels)
- Comments explaining "what" (refactor instead)
- Duplicate code (extract)
- Dead code (delete)
- Feature envy (method uses another class's data excessively)

### Post-Change Checklist (MANDATORY)
After every code change, verify:

- [ ] No decorative comments or separators added
- [ ] No obvious/redundant comments (code is self-documenting)
- [ ] No unnecessary type annotations (let inference work)
- [ ] No console.log/debug statements left behind
- [ ] No commented-out code (delete it)
- [ ] No unused variables renamed to `_` (delete them)
- [ ] No backwards-compat shims (just change the code)
- [ ] No new abstractions for single-use cases
- [ ] Every new file is necessary (prefer editing existing)

---

## SOLID Principles

| Principle                 | Rule                       | Violation Sign                        |
|---------------------------|----------------------------|---------------------------------------|
| **S**ingle Responsibility | One reason to change       | Class does unrelated things           |
| **O**pen/Closed           | Extend without modifying   | Switch statements on type             |
| **L**iskov Substitution   | Subtypes are substitutable | Overrides throw/break contract        |
| **I**nterface Segregation | Clients use what they need | Forced to depend on unused methods    |
| **D**ependency Inversion  | Depend on abstractions     | High-level imports low-level directly |

---

## Test-Driven Development

### Philosophy: Tests as Design, Not Verification
TDD is **not about testing**—it's about **design**. Tests are executable specifications that drive architecture decisions. Writing tests first forces you to:
- Define clear interfaces before implementation
- Think from the consumer's perspective
- Build only what's needed (YAGNI enforced)
- Create inherently testable, loosely-coupled code

> "If it's hard to test, the design is wrong." — Listen to your tests.

### Red-Green-Refactor
1. **Red**: Write a failing test that defines desired behavior
2. **Green**: Write minimal code to pass (no more)
3. **Refactor**: Improve design while tests stay green

**Critical**: Never skip refactor. Green is permission to clean up.

### TDD Approaches

| Approach       | Direction                               | Best For                  |
|----------------|-----------------------------------------|---------------------------|
| **Outside-In** | Start at boundaries, mock collaborators | Features, user stories    |
| **Inside-Out** | Start at core logic, build outward      | Algorithms, domain models |

**Default to Outside-In**: Start from how the system is used, then discover internal design.

### Test Principles (FIRST)
- **Fast**: Milliseconds, not seconds
- **Isolated**: No shared state, no ordering dependencies
- **Repeatable**: Same result every run
- **Self-validating**: Pass or fail, no interpretation
- **Timely**: Written before or with production code

### Test Structure (AAA)
```
Arrange → Set up preconditions
Act     → Execute the behavior
Assert  → Verify the outcome
```

### Test Naming
`should_[expectedBehavior]_when_[condition]`

Example: `should_returnNotFound_when_userDoesNotExist`

### Test Pyramid
```
        /\      E2E (few) — verify system works together
       /  \     Integration (some) — verify boundaries
      /____\    Unit (many) — verify logic
```

### When Tests Are Hard to Write
This is a **design smell**. Ask:
- Too many dependencies? → Extract smaller units
- Complex setup? → Object has too many responsibilities
- Testing private methods? → Extract a new class
- Mocking everything? → Design is too coupled

---

## Event-Driven Architecture

### Philosophy: Events as First-Class Citizens
Events represent **facts that have occurred**. They are immutable records of state changes. Event-driven systems are:
- **Decoupled**: Publishers don't know subscribers
- **Extensible**: Add behavior without modifying existing code
- **Auditable**: Events form a complete history
- **Scalable**: Handlers can be distributed and parallelized

### Core Concepts

```
┌─────────────┐     Event     ┌─────────────┐
│   Producer  │──────────────→│  Event Bus  │
└─────────────┘               └──────┬──────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ↓                ↓                ↓
             ┌──────────┐     ┌──────────┐     ┌──────────┐
             │ Handler  │     │ Handler  │     │ Handler  │
             └──────────┘     └──────────┘     └──────────┘
```

| Concept       | Description                                                                       |
|---------------|-----------------------------------------------------------------------------------|
| **Event**     | Immutable fact that something happened (past tense: `UserCreated`, `OrderPlaced`) |
| **Producer**  | Emits events when state changes occur                                             |
| **Handler**   | Reacts to events, may produce new events                                          |
| **Event Bus** | Routes events to interested handlers                                              |

### Event Design Principles

1. **Name in Past Tense**: Events are facts → `OrderShipped`, not `ShipOrder`
2. **Include Context**: Carry enough data for handlers to act independently
3. **Immutable**: Never modify an event after creation
4. **Typed**: Strong typing prevents runtime errors
5. **Versioned**: Plan for schema evolution

### Event Structure
```typescript
interface DomainEvent {
  readonly type: string;           // Event name
  readonly payload: unknown;       // Event data
  readonly metadata: {
    readonly id: string;           // Unique event ID
    readonly timestamp: Date;      // When it occurred
    readonly correlationId: string; // Trace related events
    readonly causationId?: string; // What caused this event
  };
}
```

### Patterns

| Pattern                  | Use When                                                |
|--------------------------|---------------------------------------------------------|
| **Pub/Sub**              | Multiple handlers need to react to the same event       |
| **Event Sourcing**       | You need complete audit history, temporal queries       |
| **CQRS**                 | Read and write models have different optimization needs |
| **Saga/Process Manager** | Coordinating multi-step workflows across services       |

### Event Handler Rules
- **Idempotent**: Handling the same event twice produces the same result
- **Independent**: Don't rely on event ordering (unless explicitly sequenced)
- **Fast**: Defer heavy work to background processes
- **Resilient**: Handle failures gracefully, support retries

### Anti-Patterns to Avoid
- **Event as Command**: Events describe what happened, not what to do
- **Chatty Events**: Too many fine-grained events create noise
- **Missing Events**: Not capturing significant state changes
- **Bidirectional Coupling**: Handlers that emit events their producer listens to
- **Synchronous Thinking**: Don't block waiting for event results

---

## Decision-Making Heuristics

### When Uncertain
1. Choose the **reversible** option
2. Prefer **explicit** over implicit
3. Favor **composition** over inheritance
4. Start **concrete**, extract abstractions when patterns emerge
5. **Delete** code rather than comment it out

### Complexity Budget
- Is this complexity **essential** (inherent to the problem)?
- Or **accidental** (from our solution)?
- If accidental, simplify.

### The Rule of Three
Don't abstract until you see the pattern **three times**.

---

## Code Review Checklist

### Correctness
- [ ] Solves the stated problem
- [ ] Handles edge cases
- [ ] No obvious bugs or regressions

### Design
- [ ] Single responsibility maintained
- [ ] Dependencies point inward
- [ ] No unnecessary coupling

### Quality
- [ ] Tests written first and passing
- [ ] Self-documenting (no explanatory comments needed)
- [ ] No duplication
- [ ] Error handling is appropriate

### Simplicity
- [ ] Could a simpler solution work?
- [ ] No premature optimization
- [ ] No over-engineering for hypothetical futures
