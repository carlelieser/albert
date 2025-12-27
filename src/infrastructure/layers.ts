import { Layer } from 'effect';
import type { PrismaClient } from '../generated/prisma/client';
import type { Ollama } from 'ollama';
import { PrismaService, PrismaLive } from './database/prisma.effect';
import { OllamaService, OllamaLive } from './services/ollama.effect';

export type AppServices = PrismaService | OllamaService;

export function createAppLayer(
    prisma: PrismaClient,
    ollama: Ollama
): Layer.Layer<AppServices> {
    return Layer.merge(PrismaLive(prisma), OllamaLive(ollama));
}
