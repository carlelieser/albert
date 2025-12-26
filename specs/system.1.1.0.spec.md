# Albert System Specification v1.1.0

## Status: ✅ COMPLETE

| Metric | Value |
|--------|-------|
| Tests | 180 passing |
| Test Files | 19 |
| Coverage | All requirements |

## Overview

Albert v1.1.0 extends the terminal-based assistant with system prompts and persistent learning capabilities. The assistant can now remember information about users across sessions and use this knowledge to provide more personalized responses.

## New Features in v1.1.0

### 1. System Prompt Configuration

The system shall support customizable system prompts via:

- [x] Environment variable `ALBERT_SYSTEM_PROMPT`
- [x] Configuration file `~/.albertrc` (JSON format)
- [x] Default prompt if not configured

**Default System Prompt:**
```
You are Albert, a helpful AI assistant running in a terminal. You provide clear, concise, and accurate responses. You are friendly but professional, and you adapt your communication style to match the user's needs.
```

### 2. Persistent Learning Storage

The system shall persist learnings about the user:

- [x] Store learnings in `~/.albert/learnings.json`
- [x] Support configurable data directory via `ALBERT_DATA_DIR` environment variable
- [x] Persist learnings across sessions
- [x] Load learnings on startup

**Learning Data Format:**
```json
{
  "version": 1,
  "learnings": [
    {
      "id": "unique-id",
      "content": "User prefers TypeScript",
      "category": "preference",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

**Learning Categories:**
- `preference` - User preferences (default)
- `fact` - Facts about the user
- `style` - Communication style preferences
- `correction` - Corrections to assistant behavior

### 3. Learning Commands

The system shall provide commands for managing learnings:

#### `/learn <content>`
- [x] Add a new learning about the user
- [x] Display confirmation with learned content
- [x] Require non-empty content

**Example:**
```
> /learn User prefers TypeScript over JavaScript
Learned: "User prefers TypeScript over JavaScript"
```

#### `/forget <id>` or `/forget all`
- [x] Remove a specific learning by ID
- [x] Remove all learnings with `/forget all`
- [x] Display confirmation or error message

**Example:**
```
> /forget 1704000000000-abc123
Forgotten learning with id "1704000000000-abc123".

> /forget all
Forgotten all learnings.
```

#### `/learnings`
- [x] List all current learnings
- [x] Display count and content
- [x] Show helpful message when empty

**Example:**
```
> /learnings
Learnings (2):

  [1704000000000-abc123] User prefers TypeScript
  [1704000001000-def456] User works at Acme Corp
```

### 4. Autonomous Learning Extraction

The system shall automatically learn from conversations:

- [x] After each assistant response, analyze conversation for learnable information
- [x] Use the model itself to extract learnings (no user commands required)
- [x] Categorize learnings automatically (preference, fact, style, correction)
- [x] Save extracted learnings transparently
- [x] Handle extraction errors gracefully (never break the chat)

**Extraction Prompt:**
```
Based on this conversation, extract any facts, preferences, or information
about the user that would be useful to remember. Return as JSON array:
[{"content": "...", "category": "preference|fact|style|correction"}]
Return empty array [] if nothing to learn.
```

**Learning Flow:**
```
User sends message -> Albert responds -> LearningExtractor analyzes -> Saves learnings
                                                                    |
                                                                    v
                                              Next message includes learnings in system prompt
```

### 5. System Prompt with Learnings

The system shall dynamically build system prompts:

- [x] Start with base system prompt
- [x] Append learnings section when learnings exist
- [x] Rebuild prompt for each message (to include new learnings)

**System Prompt Format (with learnings):**
```
You are Albert, a helpful AI assistant...

[What I've learned about you]:
- User prefers TypeScript
- User works at Acme Corp
```

## Configuration

### Environment Variables

| Setting | Default | Description |
|---------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `ALBERT_MODEL` | `llama3.2:3b` | Model to load |
| `ALBERT_SYSTEM_PROMPT` | (default prompt) | Custom system prompt |
| `ALBERT_DATA_DIR` | `~/.albert` | Data storage directory |

### Configuration File (~/.albertrc)

```json
{
  "ollamaHost": "http://localhost:11434",
  "modelName": "llama3.2",
  "systemPrompt": "You are a custom assistant.",
  "dataDirectory": "~/.albert"
}
```

## Interface

```
$ albert
Loading model llama3.2:3b...
Model ready.

> /learn User prefers concise responses
Learned: "User prefers concise responses"

> What is TypeScript?
TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.

> /learnings
Learnings (1):

  [1704000000000-abc123] User prefers concise responses

> /forget all
Forgotten all learnings.

> exit
Unloading model...
Goodbye.
```

## Architecture

### Layers

```
Presentation Layer
  - Repl (with CommandRouter)
  - CommandRouter
  - Commands (LearnCommand, ForgetCommand, ListLearningsCommand)

Application Layer
  - ChatSession (with SystemPromptBuilder, LearningExtractor)
  - LearningService
  - SystemPromptBuilder
  - LearningExtractor
  - Configuration

Domain Layer
  - Learning model
  - Message model
  - Conversation model
  - Ports (FileSystem, LearningRepository)

Infrastructure Layer
  - NodeFileSystem
  - JsonLearningRepository
  - OllamaClient
  - ConsoleInterface
```

### Data Flow

1. User enters `/learn` command
2. CommandRouter routes to LearnCommand
3. LearnCommand calls LearningService.addLearning()
4. LearningService creates Learning and saves via LearningRepository
5. JsonLearningRepository persists to ~/.albert/learnings.json

On each message:
1. ChatSession calls SystemPromptBuilder.build()
2. SystemPromptBuilder fetches learnings via LearningService
3. SystemPromptBuilder appends learnings to base prompt
4. ChatSession sends messages with system prompt to model
5. After response, LearningExtractor.extract() analyzes conversation
6. Extracted learnings are saved via LearningService
7. Next message will include new learnings in system prompt

## Dependencies

- Ollama (running locally)
- Node.js runtime
- File system access for persistence

## Migration from v1.0.0

No migration required. v1.1.0 is backwards compatible:
- New features are opt-in
- Default behavior unchanged
- Learning storage is created on first use
