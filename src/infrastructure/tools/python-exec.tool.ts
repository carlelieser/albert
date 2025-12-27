import { Effect, Duration } from 'effect';
import { spawn } from 'node:child_process';
import type { ITool } from '../../domain/services/tool-registry';
import type { ToolDefinition, ToolExecutionContext, ToolOutput, ToolError } from '../../domain/entities/tool';
import { ToolExecutionError, ToolTimeoutError } from '../../domain/errors';

export interface PythonExecConfig {
    timeoutMs?: number;
    maxOutputSize?: number;
    pythonPath?: string;
}

export class PythonExecTool implements ITool {
    private readonly config: Required<PythonExecConfig>;

    readonly definition: ToolDefinition = {
        name: 'python_exec',
        description:
            'Executes Python code and returns the output. Use this for data processing, parsing, ' +
            'calculations, text manipulation, or any task that benefits from Python. ' +
            'The code runs in a fresh Python interpreter. Use print() to output results.',
        parameters: {
            type: 'object',
            properties: {
                code: {
                    type: 'string',
                    description: 'The Python code to execute. Use print() for output.',
                },
            },
            required: ['code'],
        },
    };

    constructor(config: PythonExecConfig = {}) {
        this.config = {
            timeoutMs: config.timeoutMs ?? 30000,
            maxOutputSize: config.maxOutputSize ?? 102400,
            pythonPath: config.pythonPath ?? 'python3',
        };
    }

    execute(
        args: Record<string, unknown>,
        _context: ToolExecutionContext
    ): Effect.Effect<ToolOutput, ToolError> {
        const start = Date.now();
        const code = args.code as string;

        return Effect.gen(this, function* () {
            const output = yield* this.runPython(code).pipe(
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
        });
    }

    private runPython(code: string): Effect.Effect<string, ToolExecutionError> {
        return Effect.async<string, ToolExecutionError>((resume) => {
            const child = spawn(this.config.pythonPath, ['-c', code], {
                cwd: process.cwd(),
                env: process.env,
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
                            args: { code: code.slice(0, 200) },
                            cause: error,
                        })
                    )
                );
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resume(Effect.succeed(stdout || '(no output)'));
                } else {
                    const output = stderr || stdout || 'Unknown error';
                    resume(Effect.succeed(`Error (exit code ${code}):\n${output}`));
                }
            });
        });
    }
}
