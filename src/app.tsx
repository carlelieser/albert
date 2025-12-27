import React from 'react';
import { render } from 'ink';
import { program } from 'commander';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

import { Brain } from './core/brain';
import { ollama } from './ollama';

// Infrastructure
import { disconnectPrisma, getPrismaClient } from './infrastructure/database/prisma';
import { createAppRuntime } from './infrastructure/runtime';
import { PrismaKnowledgeRepository } from './infrastructure/repositories/prisma-knowledge.repository';
import { PrismaMemoryRepository } from './infrastructure/repositories/prisma-memory.repository';
import { PrismaPersonalityRepository } from './infrastructure/repositories/prisma-personality.repository';

// Modules
import { ExecutiveModule } from './core/modules/executive';
import { KnowledgeModule } from './core/modules/knowledge';
import { MemoryModule } from './core/modules/memory';
import { PersonalityModule } from './core/modules/personality';

// Tools
import { ToolRegistry } from './infrastructure/services/tool-registry';
import { WebFetchTool } from './infrastructure/tools/web-fetch.tool';
import { ShellExecTool } from './infrastructure/tools/shell-exec.tool';
import { FileReadTool } from './infrastructure/tools/file-read.tool';
import { FileWriteTool } from './infrastructure/tools/file-write.tool';
import { PythonExecTool } from './infrastructure/tools/python-exec.tool';

// Input/Output
import { InkInput } from './core/inputs/ink';
import { InkOutput } from './core/outputs/ink';

// UI
import { App } from './ui/App';
import { config } from './config';

dotenv.config({ path: '.env' });

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

program.version(packageJson.version).parse(process.argv);

async function main(): Promise<void> {
    // Create the Effect runtime with all services
    const prisma = getPrismaClient();
    const runtime = createAppRuntime(prisma, ollama);

    // Create repositories
    const knowledgeRepository = new PrismaKnowledgeRepository();
    const memoryRepository = new PrismaMemoryRepository();
    const personalityRepository = new PrismaPersonalityRepository();

    // Create brain and inject runtime
    const brain = new Brain();
    brain.setRuntime(runtime);

    // Create and configure tool registry
    const toolRegistry = new ToolRegistry();
    toolRegistry.register(new WebFetchTool({
        timeoutMs: 30000,
        maxResponseSize: 102400,
    }));
    toolRegistry.register(new ShellExecTool({
        timeoutMs: 30000,
        maxOutputSize: 102400,
    }));
    toolRegistry.register(new FileReadTool({
        maxFileSize: 1048576,
    }));
    toolRegistry.register(new FileWriteTool({
        maxContentSize: 1048576,
        createBackup: true,
    }));
    toolRegistry.register(new PythonExecTool({
        timeoutMs: 30000,
        maxOutputSize: 102400,
    }));

    // Create modules with injected repositories
    const executiveModule = new ExecutiveModule(config.ollama.models, toolRegistry);
    const knowledgeModule = new KnowledgeModule(knowledgeRepository);
    const memoryModule = new MemoryModule(memoryRepository, 20);
    const personalityModule = new PersonalityModule(personalityRepository);

    // Register modules
    brain.registerModule(executiveModule);
    brain.registerModule(knowledgeModule);
    brain.registerModule(memoryModule);
    brain.registerModule(personalityModule);

    // Create and register Ink-based input/output
    const inkInput = new InkInput();
    const inkOutput = new InkOutput();

    brain.registerInput(inkInput);
    brain.registerOutput(inkOutput);

    // Start the brain
    await brain.awake();

    // Start a new session
    const session = await memoryModule.startNewSession();
    const sessionId = session?.id ?? null;

    // Render the Ink app
    const { waitUntilExit, unmount } = render(
        <App
            brain={brain}
            input={inkInput}
            output={inkOutput}
            modelName={config.ollama.models.main}
            sessionId={sessionId}
        />,
        {
            // Enable fullscreen mode
            exitOnCtrlC: false,
        }
    );

    // Setup graceful shutdown
    const shutdown = async (): Promise<void> => {
        unmount();
        await brain.sleep();
        await runtime.dispose();
        await disconnectPrisma();
        process.exit(0);
    };

    process.on('SIGINT', () => { void shutdown(); });
    process.on('SIGTERM', () => { void shutdown(); });

    // Wait for the app to exit
    await waitUntilExit();
    await shutdown();
}

main().catch(console.error);
