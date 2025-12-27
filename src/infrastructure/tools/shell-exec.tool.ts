import { Effect, Duration } from 'effect';
import { spawn } from 'node:child_process';
import type { ITool } from '../../domain/services/tool-registry';
import type { ToolDefinition, ToolExecutionContext, ToolOutput, ToolError } from '../../domain/entities/tool';
import { ToolExecutionError, ToolTimeoutError, DangerousCommandError } from '../../domain/errors';

export interface ShellExecConfig {
    timeoutMs?: number;
    maxOutputSize?: number;
    workingDirectory?: string;
    sanitizeEnv?: boolean;
}

const DANGEROUS_PATTERNS = [
    /rm\s+(-[rRf]+\s+)*[/~]/,
    /rm\s+-[rRf]*\s+\//,
    /sudo\s+/,
    />\s*\/etc\//,
    />\s*\/usr\//,
    />\s*\/bin\//,
    />\s*\/sbin\//,
    />\s*\/boot\//,
    />\s*\/sys\//,
    />\s*\/proc\//,
    /\beval\s+/,
    /`[^`]+`/,
    /\$\([^)]+\)/,
    /chmod\s+777/,
    /chown\s+root/,
    /\bmkfs\b/,
    /\bdd\s+if=/,
    /:(){ :|:& };:/,
    />\s*\/dev\//,
];

const SENSITIVE_ENV_PATTERNS = [
    /API[_-]?KEY/i,
    /SECRET/i,
    /PASSWORD/i,
    /TOKEN/i,
    /PRIVATE/i,
    /^AWS_/i,
    /^AZURE_/i,
    /^GCP_/i,
    /^GITHUB_TOKEN$/i,
    /^NPM_TOKEN$/i,
    /^OPENAI_/i,
    /^ANTHROPIC_/i,
];

export class ShellExecTool implements ITool {
    private readonly config: Required<ShellExecConfig>;

    readonly definition: ToolDefinition = {
        name: 'shell_exec',
        description:
            'Executes a shell command and returns the output. Use for file system operations, ' +
            'running scripts, git commands, or system utilities. Some dangerous commands are blocked for safety.',
        parameters: {
            type: 'object',
            properties: {
                command: {
                    type: 'string',
                    description: 'The shell command to execute',
                },
                workingDirectory: {
                    type: 'string',
                    description: 'Working directory for command execution (optional)',
                },
            },
            required: ['command'],
        },
    };

    constructor(config: ShellExecConfig = {}) {
        this.config = {
            timeoutMs: config.timeoutMs ?? 30000,
            maxOutputSize: config.maxOutputSize ?? 102400,
            workingDirectory: config.workingDirectory ?? process.cwd(),
            sanitizeEnv: config.sanitizeEnv ?? true,
        };
    }

    execute(
        args: Record<string, unknown>,
        _context: ToolExecutionContext
    ): Effect.Effect<ToolOutput, ToolError> {
        const start = Date.now();
        const command = args.command as string;
        const cwd = (args.workingDirectory as string) ?? this.config.workingDirectory;

        return Effect.gen(this, function* () {
            yield* this.validateCommand(command);

            const output = yield* this.runCommand(command, cwd).pipe(
                Effect.timeout(Duration.millis(this.config.timeoutMs)),
                Effect.catchTag('TimeoutException', () =>
                    Effect.fail(
                        new ToolTimeoutError({
                            toolName: this.definition.name,
                            timeoutMs: this.config.timeoutMs,
                        })
                    )
                )
            );

            const truncated = output.slice(0, this.config.maxOutputSize);
            const wasTruncated = output.length > this.config.maxOutputSize;

            return {
                toolName: this.definition.name,
                output: wasTruncated
                    ? `${truncated}\n\n[Output truncated: ${output.length - this.config.maxOutputSize} bytes omitted]`
                    : truncated,
                executionTimeMs: Date.now() - start,
            };
        }).pipe(
            Effect.catchAll((error) => {
                // Convert DangerousCommandError to ToolExecutionError
                if (error._tag === 'DangerousCommandError') {
                    return Effect.fail(
                        new ToolExecutionError({
                            toolName: this.definition.name,
                            message: error.message,
                            args: { command },
                            executionTimeMs: Date.now() - start,
                            cause: error,
                        })
                    );
                }
                // Pass through other ToolErrors
                return Effect.fail(error as ToolError);
            })
        );
    }

    private validateCommand(command: string): Effect.Effect<void, DangerousCommandError> {
        for (const pattern of DANGEROUS_PATTERNS) {
            if (pattern.test(command)) {
                return Effect.fail(
                    new DangerousCommandError({
                        command,
                        pattern: pattern.toString(),
                    })
                );
            }
        }
        return Effect.void;
    }

    private runCommand(
        command: string,
        cwd: string
    ): Effect.Effect<string, ToolExecutionError> {
        return Effect.async<string, ToolExecutionError>((resume) => {
            const env = this.config.sanitizeEnv ? this.getSanitizedEnv() : process.env;

            const child = spawn('sh', ['-c', command], {
                cwd,
                env: env as NodeJS.ProcessEnv,
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            child.on('error', (error) => {
                resume(
                    Effect.fail(
                        new ToolExecutionError({
                            toolName: this.definition.name,
                            message: error.message,
                            args: { command },
                            cause: error,
                        })
                    )
                );
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resume(Effect.succeed(stdout || stderr));
                } else {
                    const output = stderr || stdout;
                    resume(
                        Effect.fail(
                            new ToolExecutionError({
                                toolName: this.definition.name,
                                message: `Command failed with exit code ${code}${output ? `: ${output}` : ''}`,
                                args: { command },
                            })
                        )
                    );
                }
            });
        });
    }

    private getSanitizedEnv(): Record<string, string> {
        const env: Record<string, string> = {};
        for (const [key, value] of Object.entries(process.env)) {
            if (value === undefined) continue;

            const isSensitive = SENSITIVE_ENV_PATTERNS.some((pattern) => pattern.test(key));
            if (!isSensitive) {
                env[key] = value;
            }
        }
        return env;
    }
}
