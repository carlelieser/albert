import { Effect } from 'effect';
import { readFile, stat } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
import type { ITool } from '../../domain/services/tool-registry';
import type { ToolDefinition, ToolExecutionContext, ToolOutput, ToolError } from '../../domain/entities/tool';
import { ToolExecutionError, FileTooLargeError, FileSystemError } from '../../domain/errors';

export interface FileReadConfig {
    maxFileSize?: number;
    baseDirectory?: string;
}

export class FileReadTool implements ITool {
    private readonly config: Required<FileReadConfig>;

    readonly definition: ToolDefinition = {
        name: 'file_read',
        description:
            'Reads the contents of a file. Use this to examine source code, configuration files, ' +
            'or any text-based file. Returns the file contents as text.',
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'The path to the file to read (relative or absolute)',
                },
                encoding: {
                    type: 'string',
                    description: 'Character encoding (default: utf-8)',
                    enum: ['utf-8', 'ascii', 'utf-16le', 'latin1'],
                },
            },
            required: ['path'],
        },
    };

    constructor(config: FileReadConfig = {}) {
        this.config = {
            maxFileSize: config.maxFileSize ?? 1048576,
            baseDirectory: config.baseDirectory ?? process.cwd(),
        };
    }

    execute(
        args: Record<string, unknown>,
        _context: ToolExecutionContext
    ): Effect.Effect<ToolOutput, ToolError> {
        const start = Date.now();
        const inputPath = args.path as string;
        const encoding = (args.encoding as BufferEncoding) ?? 'utf-8';
        const filePath = this.resolvePath(inputPath);

        return Effect.gen(this, function* () {
            const stats = yield* this.getFileStats(filePath);

            if (stats.size > this.config.maxFileSize) {
                const error = new FileTooLargeError({
                    path: filePath,
                    size: stats.size,
                    maxSize: this.config.maxFileSize,
                });
                return yield* Effect.fail(
                    new ToolExecutionError({
                        toolName: this.definition.name,
                        message: error.message,
                        executionTimeMs: Date.now() - start,
                        cause: error,
                    })
                );
            }

            const content = yield* this.readFileContent(filePath, encoding);

            return {
                toolName: this.definition.name,
                output: content,
                executionTimeMs: Date.now() - start,
            };
        }).pipe(
            Effect.catchAll((error) =>
                Effect.fail(
                    new ToolExecutionError({
                        toolName: this.definition.name,
                        message: error instanceof Error ? error.message : String(error),
                        executionTimeMs: Date.now() - start,
                        cause: error,
                    })
                )
            )
        );
    }

    private getFileStats(
        filePath: string
    ): Effect.Effect<{ size: number }, FileSystemError> {
        return Effect.tryPromise({
            try: () => stat(filePath),
            catch: (error) =>
                new FileSystemError({
                    path: filePath,
                    operation: 'stat',
                    message: error instanceof Error ? error.message : 'Failed to stat file',
                    cause: error,
                }),
        });
    }

    private readFileContent(
        filePath: string,
        encoding: BufferEncoding
    ): Effect.Effect<string, FileSystemError> {
        return Effect.tryPromise({
            try: () => readFile(filePath, { encoding }),
            catch: (error) =>
                new FileSystemError({
                    path: filePath,
                    operation: 'read',
                    message: error instanceof Error ? error.message : 'Failed to read file',
                    cause: error,
                }),
        });
    }

    private resolvePath(inputPath: string): string {
        if (isAbsolute(inputPath)) {
            return inputPath;
        }
        return resolve(this.config.baseDirectory, inputPath);
    }
}
