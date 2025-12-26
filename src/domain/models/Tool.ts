export type ParameterType = 'string' | 'number' | 'boolean' | 'array' | 'object'

export interface ToolParameter {
  readonly name: string
  readonly type: ParameterType
  readonly description: string
  readonly required: boolean
  readonly defaultValue?: unknown
}

export interface ToolDefinition {
  readonly name: string
  readonly description: string
  readonly parameters: readonly ToolParameter[]
}

export interface ToolResult {
  readonly success: boolean
  readonly output: string
  readonly error?: string
}

export interface ToolInvocation {
  readonly toolName: string
  readonly arguments: Record<string, unknown>
  readonly timestamp: Date
}

export function createToolParameter(options: {
  name: string
  type: ParameterType
  description: string
  required?: boolean
  defaultValue?: unknown
}): ToolParameter {
  const param: ToolParameter = {
    name: options.name,
    type: options.type,
    description: options.description,
    required: options.required ?? true,
    defaultValue: options.defaultValue
  }

  return Object.freeze(param)
}

export function createToolDefinition(options: {
  name: string
  description: string
  parameters: ToolParameter[]
}): ToolDefinition {
  const definition: ToolDefinition = {
    name: options.name,
    description: options.description,
    parameters: Object.freeze([...options.parameters])
  }

  return Object.freeze(definition)
}

export function createToolResult(options: {
  success: boolean
  output: string
  error?: string
}): ToolResult {
  const result: ToolResult = {
    success: options.success,
    output: options.output,
    error: options.error
  }

  return Object.freeze(result)
}

export function createToolInvocation(
  toolName: string,
  args: Record<string, unknown>
): ToolInvocation {
  const invocation: ToolInvocation = {
    toolName,
    arguments: Object.freeze({ ...args }),
    timestamp: new Date()
  }

  return Object.freeze(invocation)
}
