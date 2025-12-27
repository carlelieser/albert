import { Effect } from 'effect';
import { writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { resolve, isAbsolute, dirname } from 'node:path';
import type { ITool } from '../../domain/services/tool-registry';
import type { ToolDefinition, ToolExecutionContext, ToolOutput, ToolError } from '../../domain/entities/tool';
import { ToolExecutionError, ToolValidationError, FileSystemError } from '../../domain/errors';

export interface FileWriteConfig {
    maxContentSize?: number;
    baseDirectory?: string;
    createBackup?: boolean;
}

export class FileWriteTool implements ITool {
    private readonly config: Required<FileWriteConfig>;

    readonly definition: ToolDefinition = {
        name: 'file_write',
        description:
            'Writes content to a file. Creates the file if it does not exist, or overwrites if it does. ' +
            'Parent directories are created automatically if needed.',
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'The path to the file to write (relative or absolute)',
                },
                content: {
                    type: 'string',
                    description: 'The content to write to the file',
                },
                encoding: {
                    type: 'string',
                    description: 'Character encoding (default: utf-8)',
                    enum: ['utf-8', 'ascii', 'utf-16le', 'latin1'],
                },
            },
            required: ['path', 'content'],
        },
    };

    constructor(config: FileWriteConfig = {}) {
        this.config = {
            maxContentSize: config.maxContentSize ?? 1048576,
            baseDirectory: config.baseDirectory ?? process.cwd(),
            createBackup: config.createBackup ?? true,
        };
    }

    execute(
        args: Record<string, unknown>,
        _context: ToolExecutionContext
    ): Effect.Effect<ToolOutput, ToolError> {
        const start = Date.now();
        const inputPath = args.path as string;
        const content = args.content as string;
        const encoding = (args.encoding as BufferEncoding) ?? 'utf-8';
        const filePath = this.resolvePath(inputPath);

        return Effect.gen(this, function* () {
            yield* this.validateContentSize(content);
            yield* this.ensureDirectory(filePath);
            yield* this.createBackupIfNeeded(filePath);
            yield* this.writeContent(filePath, content, encoding);

            return {
                toolName: this.definition.name,
                output: `Successfully wrote ${content.length} characters to ${filePath}`,
                executionTimeMs: Date.now() - start,
            };
        }).pipe(
            Effect.catchAll((error) => {
                // ToolValidationError is already a ToolError, pass through
                if ('_tag' in error && error._tag === 'ToolValidationError') {
                    return Effect.fail(error as ToolError);
                }
                // Convert other errors to ToolExecutionError
                return Effect.fail(
                    new ToolExecutionError({
                        toolName: this.definition.name,
                        message: error instanceof Error ? error.message : String(error),
                        executionTimeMs: Date.now() - start,
                        cause: error,
                    })
                );
            })
        );
    }

    private validateContentSize(
        content: string
    ): Effect.Effect<void, ToolValidationError> {
        if (content.length > this.config.maxContentSize) {
            return Effect.fail(
                new ToolValidationError({
                    toolName: this.definition.name,
                    parameter: 'content',
                    message: `Content too large: ${content.length} characters (max: ${this.config.maxContentSize})`,
                    value: content.length,
                })
            );
        }
        return Effect.void;
    }

    private ensureDirectory(filePath: string): Effect.Effect<void, FileSystemError> {
        const dir = dirname(filePath);
        return Effect.tryPromise({
            try: () => mkdir(dir, { recursive: true }),
            catch: (error) =>
                new FileSystemError({
                    path: dir,
                    operation: 'mkdir',
                    message: error instanceof Error ? error.message : 'Failed to create directory',
                    cause: error,
                }),
        }).pipe(Effect.asVoid);
    }

    private createBackupIfNeeded(filePath: string): Effect.Effect<void, never> {
        if (!this.config.createBackup) {
            return Effect.void;
        }

        return Effect.tryPromise({
            try: async () => {
                await access(filePath);
                await copyFile(filePath, `${filePath}.bak`);
            },
            catch: () => undefined, // File doesn't exist, no backup needed
        }).pipe(
            Effect.catchAll(() => Effect.void),
            Effect.asVoid
        );
    }

    private writeContent(
        filePath: string,
        content: string,
        encoding: BufferEncoding
    ): Effect.Effect<void, FileSystemError> {
        return Effect.tryPromise({
            try: () => writeFile(filePath, content, { encoding }),
            catch: (error) =>
                new FileSystemError({
                    path: filePath,
                    operation: 'write',
                    message: error instanceof Error ? error.message : 'Failed to write file',
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
