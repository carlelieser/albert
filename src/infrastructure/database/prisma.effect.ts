import { Effect, Context, Layer } from 'effect';
import type { PrismaClient } from '../../generated/prisma/client';
import { DatabaseError, DatabaseConnectionError } from '../../domain/errors';

// ============================================================================
// Service Definition
// ============================================================================

/**
 * PrismaService is an Effect Context tag for the PrismaClient.
 * This allows PrismaClient to be injected as a dependency.
 */
export class PrismaService extends Context.Tag('PrismaService')<
    PrismaService,
    PrismaClient
>() {}

// ============================================================================
// Effect Helpers
// ============================================================================

/**
 * Wraps a Prisma operation in an Effect, converting errors to DatabaseError.
 *
 * @param operation - A descriptive name for the operation (for error context)
 * @param fn - A function that takes PrismaClient and returns a Promise
 * @returns An Effect that either succeeds with the result or fails with DatabaseError
 *
 * @example
 * ```ts
 * const getUserById = (id: number) =>
 *   prismaEffect("getUserById", (prisma) =>
 *     prisma.user.findUnique({ where: { id } })
 *   );
 * ```
 */
export function prismaEffect<A>(
    operation: string,
    fn: (prisma: PrismaClient) => Promise<A>
): Effect.Effect<A, DatabaseError, PrismaService> {
    return Effect.gen(function* () {
        const prisma = yield* PrismaService;
        return yield* Effect.tryPromise({
            try: () => fn(prisma),
            catch: (error) =>
                new DatabaseError({
                    operation,
                    message: error instanceof Error ? error.message : 'Unknown database error',
                    cause: error,
                }),
        });
    });
}

/**
 * Wraps a Prisma transaction in an Effect.
 *
 * @param operation - A descriptive name for the transaction
 * @param fn - A function that receives a transaction client
 * @returns An Effect that either succeeds with the result or fails with DatabaseError
 *
 * @example
 * ```ts
 * const transferFunds = (from: number, to: number, amount: number) =>
 *   prismaTransaction("transferFunds", async (tx) => {
 *     await tx.account.update({ where: { id: from }, data: { balance: { decrement: amount } } });
 *     await tx.account.update({ where: { id: to }, data: { balance: { increment: amount } } });
 *   });
 * ```
 */
export function prismaTransaction<A>(
    operation: string,
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<A>
): Effect.Effect<A, DatabaseError, PrismaService> {
    return Effect.gen(function* () {
        const prisma = yield* PrismaService;
        return yield* Effect.tryPromise({
            try: () => prisma.$transaction(fn),
            catch: (error) =>
                new DatabaseError({
                    operation: `transaction:${operation}`,
                    message: error instanceof Error ? error.message : 'Transaction failed',
                    cause: error,
                }),
        });
    });
}

/**
 * Creates a PrismaService layer from an existing PrismaClient.
 *
 * @param client - An existing PrismaClient instance
 * @returns A Layer that provides PrismaService
 *
 * @example
 * ```ts
 * const client = getPrismaClient();
 * const layer = PrismaLive(client);
 * ```
 */
export function PrismaLive(client: PrismaClient): Layer.Layer<PrismaService> {
    return Layer.succeed(PrismaService, client);
}

/**
 * Creates a scoped PrismaService layer that manages the client lifecycle.
 * The client will be disconnected when the scope is closed.
 *
 * @param createClient - A function that creates the PrismaClient
 * @returns A scoped Layer that provides PrismaService
 *
 * @example
 * ```ts
 * const layer = PrismaLiveScoped(() => new PrismaClient());
 * ```
 */
export function PrismaLiveScoped(
    createClient: () => PrismaClient
): Layer.Layer<PrismaService, DatabaseConnectionError> {
    return Layer.scoped(
        PrismaService,
        Effect.acquireRelease(
            Effect.tryPromise({
                try: async () => {
                    const client = createClient();
                    await client.$connect();
                    return client;
                },
                catch: (error) =>
                    new DatabaseConnectionError({
                        message: error instanceof Error ? error.message : 'Failed to connect to database',
                        cause: error,
                    }),
            }),
            (client) =>
                Effect.promise(() => client.$disconnect()).pipe(
                    Effect.catchAll(() => Effect.void)
                )
        )
    );
}

// ============================================================================
// Utility Effects
// ============================================================================

/**
 * Gets the raw PrismaClient from the context.
 * Use this when you need direct access to the client.
 */
export const getPrisma: Effect.Effect<PrismaClient, never, PrismaService> = PrismaService;

/**
 * Checks if the database connection is healthy.
 */
export const healthCheck: Effect.Effect<boolean, DatabaseError, PrismaService> = prismaEffect(
    'healthCheck',
    async (prisma) => {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    }
);
