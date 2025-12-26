# Tool Use & Tool Creation Specification

## Overview

Albert needs the ability to execute actions in the real world through tools. This spec defines how Albert discovers, invokes, and creates tools to accomplish tasks.

## Goals

1. Provide Albert with base tools (bash, exec, file operations, etc.)
2. Allow Albert to invoke tools during conversations
3. Enable Albert to create new tools from existing primitives
4. Maintain clean architecture boundaries

---

## Domain Layer

### Models

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
}

interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
}

interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

interface ToolInvocation {
  toolName: string;
  arguments: Record<string, unknown>;
  timestamp: Date;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  implementation: string; // Code or composition of other tools
}
```

### Ports

```typescript
interface ToolRegistry {
  register(tool: Tool): void;
  get(name: string): Tool | undefined;
  list(): Tool[];
  has(name: string): boolean;
}

interface ToolExecutor {
  execute(name: string, args: Record<string, unknown>): Promise<ToolResult>;
}

interface ToolFactory {
  create(definition: ToolDefinition): Tool;
}
```

---

## Base Tools

Albert starts with these primitive tools:

| Tool | Description | Parameters |
|------|-------------|------------|
| `bash` | Execute shell commands | `command: string`, `cwd?: string`, `timeout?: number` |
| `read_file` | Read file contents | `path: string`, `encoding?: string` |
| `write_file` | Write content to file | `path: string`, `content: string` |
| `list_directory` | List directory contents | `path: string`, `recursive?: boolean` |
| `http_request` | Make HTTP requests | `url: string`, `method?: string`, `body?: string`, `headers?: object` |

---

## Application Layer

### ToolService

Orchestrates tool operations:

```typescript
interface ToolService {
  // Invoke an existing tool
  invoke(name: string, args: Record<string, unknown>): Promise<ToolResult>;

  // Create a new tool from definition
  createTool(definition: ToolDefinition): Tool;

  // Get available tools for LLM context
  getToolDescriptions(): ToolDescription[];

  // Validate tool invocation request
  validate(name: string, args: Record<string, unknown>): ValidationResult;
}
```

### ToolInvocationParser

Extracts tool calls from LLM responses:

```typescript
interface ToolInvocationParser {
  parse(response: string): ToolInvocation[];
}
```

Expected LLM output format:
```
<tool_call>
{"name": "bash", "arguments": {"command": "ls -la"}}
</tool_call>
```

---

## Tool Creation

Albert can create composite tools by combining base tools:

```typescript
// Example: Albert creates a "find_and_replace" tool
const definition: ToolDefinition = {
  name: 'find_and_replace',
  description: 'Find and replace text in a file',
  parameters: [
    { name: 'path', type: 'string', description: 'File path', required: true },
    { name: 'find', type: 'string', description: 'Text to find', required: true },
    { name: 'replace', type: 'string', description: 'Replacement text', required: true }
  ],
  implementation: `
    const content = await tools.read_file({ path: args.path });
    const updated = content.output.replace(args.find, args.replace);
    return tools.write_file({ path: args.path, content: updated });
  `
};
```

Created tools are persisted and available in future sessions.

---

## Chat Integration

### System Prompt Addition

```
You have access to the following tools:

{{#each tools}}
- {{name}}: {{description}}
  Parameters: {{parameters}}
{{/each}}

To use a tool, respond with:
<tool_call>
{"name": "tool_name", "arguments": {...}}
</tool_call>

You can use multiple tools in sequence. Wait for each result before proceeding.
```

### Conversation Flow

1. User sends message
2. Albert responds (may include tool calls)
3. System extracts tool calls from response
4. System executes tools
5. System injects tool results back into conversation
6. Albert continues with results
7. Repeat until no more tool calls

---

## Infrastructure Layer

### BashTool

```typescript
const createBashTool = (): Tool => ({
  name: 'bash',
  description: 'Execute a shell command',
  parameters: [
    { name: 'command', type: 'string', description: 'Command to execute', required: true },
    { name: 'cwd', type: 'string', description: 'Working directory', required: false },
    { name: 'timeout', type: 'number', description: 'Timeout in ms', required: false, default: 30000 }
  ],
  execute: async (args) => {
    // Use child_process.exec with safety constraints
  }
});
```

### ToolPersistence

```typescript
interface ToolPersistence {
  save(definition: ToolDefinition): Promise<void>;
  load(): Promise<ToolDefinition[]>;
  delete(name: string): Promise<void>;
}
```

Storage location: `~/.albert/tools/`

---

## Security Constraints

1. **Sandboxing**: Bash commands run with restricted permissions
2. **Timeouts**: All tool executions have maximum timeout (default 30s)
3. **Path restrictions**: File operations limited to allowed directories
4. **Confirmation**: Destructive operations require user confirmation
5. **Rate limiting**: Prevent runaway tool loops

### Confirmation Required For

- File deletion
- Writing outside project directory
- Network requests to new domains
- Commands matching dangerous patterns (`rm -rf`, `sudo`, etc.)

---

## Testing Strategy

### Unit Tests
- ToolRegistry: registration, lookup, listing
- ToolInvocationParser: parsing valid/invalid tool calls
- ToolService: validation, execution orchestration
- Individual tools: each base tool in isolation

### Integration Tests
- End-to-end tool invocation in conversation
- Tool creation and persistence
- Multi-tool sequences

### Test Doubles
- Mock ToolExecutor for testing without side effects
- Fake ToolRegistry for isolated unit tests

---

## Implementation Order

1. Domain models and ports
2. ToolRegistry implementation
3. Base tools (bash, read_file, write_file)
4. ToolInvocationParser
5. ToolService
6. ChatSession integration
7. Tool creation (ToolFactory)
8. Tool persistence
9. Remaining base tools
10. Security constraints

---

## File Structure

```
src/
  domain/
    models/
      Tool.ts
      ToolResult.ts
      ToolInvocation.ts
    ports/
      ToolRegistry.ts
      ToolExecutor.ts
      ToolFactory.ts
  application/
    ToolService.ts
    ToolInvocationParser.ts
  infrastructure/
    tools/
      BashTool.ts
      ReadFileTool.ts
      WriteFileTool.ts
      ListDirectoryTool.ts
      HttpRequestTool.ts
    persistence/
      ToolPersistence.ts
    registry/
      InMemoryToolRegistry.ts
```

---

## Open Questions

1. Should tool creation use a DSL or raw JavaScript?
2. How to handle async tool chains (tool A triggers tool B)?
3. Should Albert explain its tool use reasoning before/after?
4. Maximum nesting depth for composite tools?
