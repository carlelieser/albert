import { Effect } from 'effect';
import type { ITool } from '../../domain/services/tool-registry';
import type { ToolDefinition, ToolExecutionContext, ToolOutput, ToolError } from '../../domain/entities/tool';
import { ToolExecutionError, type ToolTimeoutError, UrlProtocolError } from '../../domain/errors';
import { extractTextFromHtml, isHtmlContent } from '../services/html-parser';

export interface WebFetchConfig {
    timeoutMs?: number;
    maxResponseSize?: number;
    allowedProtocols?: string[];
}

export class WebFetchTool implements ITool {
    private readonly config: Required<WebFetchConfig>;

    readonly definition: ToolDefinition = {
        name: 'web_fetch',
        description:
            'Fetches content from a URL. Use this to retrieve web pages, API responses, or any HTTP resource. ' +
            'Returns the response body as text.',
        parameters: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'The URL to fetch (must be http or https)',
                },
                method: {
                    type: 'string',
                    description: 'HTTP method to use',
                    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                },
                body: {
                    type: 'string',
                    description: 'Request body for POST/PUT/PATCH requests (optional)',
                },
                headers: {
                    type: 'object',
                    description: 'Custom headers to include in the request (optional)',
                },
            },
            required: ['url'],
        },
    };

    constructor(config: WebFetchConfig = {}) {
        this.config = {
            timeoutMs: config.timeoutMs ?? 30000,
            maxResponseSize: config.maxResponseSize ?? 102400,
            allowedProtocols: config.allowedProtocols ?? ['https:', 'http:'],
        };
    }

    execute(
        args: Record<string, unknown>,
        _context: ToolExecutionContext
    ): Effect.Effect<ToolOutput, ToolError> {
        const start = Date.now();

        return Effect.gen(this, function* () {
            const url = yield* this.validateUrl(args.url as string);
            const method = (args.method as string) ?? 'GET';
            const body = args.body as string | undefined;
            const headers = args.headers as Record<string, string> | undefined;

            const response = yield* this.fetchWithTimeout(url, method, body, headers);

            return {
                toolName: this.definition.name,
                output: response,
                executionTimeMs: Date.now() - start,
            };
        }).pipe(
            Effect.catchAll((error) => {
                // Convert UrlProtocolError to ToolExecutionError
                if (error._tag === 'UrlProtocolError') {
                    return Effect.fail(
                        new ToolExecutionError({
                            toolName: this.definition.name,
                            message: error.message,
                            args: { url: args.url },
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

    private validateUrl(urlString: string): Effect.Effect<string, UrlProtocolError> {
        return Effect.try({
            try: () => {
                const url = new URL(urlString);
                if (!this.config.allowedProtocols.includes(url.protocol)) {
                    throw new Error('Invalid protocol');
                }
                return url.toString();
            },
            catch: () =>
                new UrlProtocolError({
                    url: urlString,
                    protocol: new URL(urlString).protocol,
                    allowed: this.config.allowedProtocols,
                }),
        });
    }

    private fetchWithTimeout(
        url: string,
        method: string,
        body: string | undefined,
        headers: Record<string, string> | undefined
    ): Effect.Effect<string, ToolExecutionError | ToolTimeoutError> {
        return Effect.async<string, ToolExecutionError>((resume) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => { controller.abort(); }, this.config.timeoutMs);

            fetch(url, {
                method,
                body: ['POST', 'PUT', 'PATCH'].includes(method) ? body : undefined,
                headers,
                signal: controller.signal,
            })
                .then(async (response) => {
                    clearTimeout(timeout);
                    const text = await response.text();

                    let output: string;
                    if (isHtmlContent(text)) {
                        output = extractTextFromHtml(text);
                    } else {
                        const truncated = text.slice(0, this.config.maxResponseSize);
                        const wasTruncated = text.length > this.config.maxResponseSize;
                        output = wasTruncated
                            ? `${truncated}\n\n[Response truncated]`
                            : truncated;
                    }

                    if (response.ok) {
                        resume(Effect.succeed(output));
                    } else {
                        resume(
                            Effect.succeed(`HTTP ${response.status} ${response.statusText}\n${output}`)
                        );
                    }
                })
                .catch((error) => {
                    clearTimeout(timeout);
                    if (error.name === 'AbortError') {
                        resume(
                            Effect.fail(
                                new ToolExecutionError({
                                    toolName: this.definition.name,
                                    message: `Request timed out after ${this.config.timeoutMs}ms`,
                                    args: { url, method },
                                })
                            )
                        );
                    } else {
                        resume(
                            Effect.fail(
                                new ToolExecutionError({
                                    toolName: this.definition.name,
                                    message: error instanceof Error ? error.message : 'Fetch failed',
                                    args: { url, method },
                                    cause: error,
                                })
                            )
                        );
                    }
                });
        });
    }
}
