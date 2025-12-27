# Albert

An autonomous AI assistant that moves with you. Albert understands your context, anticipates your needs, and takes action on your behalf — learning and adapting over time.

## Vision

Albert aims to be a proactive companion that doesn't wait to be asked. By understanding who you are, what you're working on, and what you need, Albert can step in at the right moment with the right help.

## Features

- **Context-Aware** — Understands your current situation and adapts its assistance accordingly
- **Proactive Assistance** — Anticipates needs and takes initiative without requiring explicit prompts
- **Persistent Knowledge** — Builds a growing understanding of you across sessions, stored locally in SQLite
- **Autonomous Action** — Executes tasks on your behalf through a modular, event-driven architecture
- **Local-First** — Powered by Ollama for private, on-device AI processing

## Prerequisites

- [Node.js](https://nodejs.org/) (see `.tool-versions` for recommended version)
- [Ollama](https://ollama.ai/) installed and running locally

## Installation

```bash
npm install
```

## Usage

Start the assistant:

```bash
npm start
```

For development with hot-reload:

```bash
npm run start:watch
```

### Commands

While chatting with Albert:

| Command          | Description              |
|------------------|--------------------------|
| `exit` or `quit` | End the session          |
| `clear`          | Clear conversation memory |
| `Ctrl+C`         | Graceful shutdown        |

## Project Structure

```
albert/
├── src/
│   ├── app.ts              # Application entry point
│   ├── logger.ts           # Logging utilities
│   ├── ollama.ts           # Ollama client setup
│   └── core/
│       ├── brain.ts        # Event-driven core
│       ├── events.ts       # Event definitions
│       ├── modules/        # Pluggable modules
│       │   ├── executive.ts    # Orchestrates AI responses
│       │   ├── memory.ts       # Conversation history
│       │   ├── knowledge.ts    # Persistent fact storage
│       │   └── personality.ts  # Personality traits
│       ├── inputs/         # Input adapters
│       └── outputs/        # Output adapters
└── test/                   # Test suite
```

## Configuration

Environment variables can be set in `.env`:

```
APP_TITLE=Albert
```

## Development

### Running Tests

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

### Code Quality

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
npm run prettier    # Format code
```

## How It Works

Albert is built on an event-driven architecture where the `Brain` serves as the central coordinator:

1. **Observe** — Inputs are received through pluggable adapters (text, and eventually other sources)
2. **Understand** — Context is gathered from memory and the knowledge base to understand the current situation
3. **Decide** — The executive module determines what action to take, proactively or in response to input
4. **Act** — Albert executes the appropriate action, whether responding, performing a task, or storing new knowledge
5. **Learn** — Facts and context are extracted and persisted for future use

## License

MIT
