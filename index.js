#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createRequire } from "module";
import { fileURLToPath } from "url";

// Import package.json for version
const require = createRequire(import.meta.url);
const packageJson = require("./package.json");

import { loadConfig } from "./lib/config.js";
import { SQLiteCache } from "./lib/sqlite-cache.js";
import { createEmbedder } from "./lib/mrl-embedder.js";
import { CodebaseIndexer } from "./features/index-codebase.js";
import { HybridSearch } from "./features/hybrid-search.js";

import * as IndexCodebaseFeature from "./features/index-codebase.js";
import * as HybridSearchFeature from "./features/hybrid-search.js";
import * as ClearCacheFeature from "./features/clear-cache.js";
import * as CheckLastVersionFeature from "./features/check-last-version.js";
import * as SetWorkspaceFeature from "./features/set-workspace.js";
import * as GetStatusFeature from "./features/get-status.js";
// PR #4 Feature
import * as ConfigureFeature from "./features/configure.js";
// PR #4 Lib (if needed, but we use HEAD's ide-setup usually? No, PR #4 has `lib/ide-setup.js` import in diff, but I didn't verify if it exists on HEAD. I'll omit if unsure, or check.)
// PR #4 index.js had `import { configureAntigravity } from "./lib/ide-setup.js";`
// I should include it if I can.

// Parse arguments
const args = process.argv.slice(2);

// Handle help flag (from PR #4)
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Smart Coding MCP v${packageJson.version}
Usage: npx smart-coding-mcp [options]

Options:
  --workspace <path>    Set the active workspace directory (default: current directory)
  --configure           Automatically update Antigravity configuration for current directory
  --help, -h            Show this help message

Environment Variables:
  SMART_CODING_VERBOSE=true          Enable verbose logging
  SMART_CODING_WATCH_FILES=true      Enable file watching
  `);
  process.exit(0);
}

const workspaceIndex = args.findIndex((arg) => arg.startsWith("--workspace"));
let workspaceDir = null; // Default null to detect zero-config

if (workspaceIndex !== -1) {
  const arg = args[workspaceIndex];
  let rawWorkspace = null;

  if (arg.includes("=")) {
    rawWorkspace = arg.split("=")[1];
  } else if (workspaceIndex + 1 < args.length) {
    rawWorkspace = args[workspaceIndex + 1];
  }

  // Check if IDE variable wasn't expanded (contains ${})
  if (rawWorkspace && rawWorkspace.includes("${")) {
    console.error(
      `[Server] FATAL: Workspace variable "${rawWorkspace}" was not expanded by your IDE.`
    );
    console.error(
      `[Server] This typically means your MCP client does not support dynamic variables.`
    );
    console.error(
      `[Server] Please use an absolute path instead: --workspace /path/to/your/project`
    );
    process.exit(1);
  } else if (rawWorkspace) {
    workspaceDir = path.resolve(process.cwd(), rawWorkspace);
  }
}

// If no workspace arg, default to CWD but wait for handshake to confirm
if (!workspaceDir) {
  workspaceDir = process.cwd();
}

console.error(`[Server] Active Workspace: ${workspaceDir}`);

// Global state
let embedder = null;
let cache = null;
let indexer = null;
let hybridSearch = null;
let config = null;
let isInitialized = false;
let initializationPromise = null;

// Server instance
const server = new Server(
  {
    name: "smart-coding-mcp",
    version: packageJson.version
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Init promise
let readyPromise = null;

// Feature registry (Merged)
const features = [
  {
    module: HybridSearchFeature,
    instance: null,
    handler: HybridSearchFeature.handleToolCall,
  },
  {
    module: IndexCodebaseFeature,
    instance: null,
    handler: IndexCodebaseFeature.handleToolCall,
  },
  {
    module: ClearCacheFeature,
    instance: null,
    handler: ClearCacheFeature.handleToolCall,
  },
  {
    module: CheckLastVersionFeature,
    instance: null,
    handler: CheckLastVersionFeature.handleToolCall,
  },
  {
    module: SetWorkspaceFeature,
    instance: null,
    handler: SetWorkspaceFeature.handleToolCall,
  },
  {
    module: GetStatusFeature,
    instance: null,
    handler: GetStatusFeature.handleToolCall,
  },
  {
    // PR #4 Feature
    module: ConfigureFeature,
    instance: null,
    handler: ConfigureFeature.handleToolCall,
  }
];

/**
 * Lazy initialization - only loads heavy resources when first needed
 */
async function ensureInitialized() {
  // Already initialized
  if (isInitialized) {
    return;
  }

  // Initialization in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    console.error("[Server] Loading AI model and cache...");

    // Load Configuration first
    config = await loadConfig(workspaceDir);

    // Load AI model using MRL embedder factory (HEAD)
    embedder = await createEmbedder(config);
    console.error(
      `[Server] Model: ${embedder.modelName} (${embedder.dimension}d, device: ${embedder.device})`
    );

    // Initialize cache (HEAD: SQLiteCache)
    cache = new SQLiteCache(config);
    await cache.load();

    // Initialize features
    indexer = new CodebaseIndexer(embedder, cache, config, server);
    hybridSearch = new HybridSearch(embedder, cache, config, indexer);
    const cacheClearer = new ClearCacheFeature.CacheClearer(
      embedder,
      cache,
      config,
      indexer
    );
    const versionChecker = new CheckLastVersionFeature.VersionChecker(config);
    const workspaceManager = new SetWorkspaceFeature.WorkspaceManager(
      config,
      cache,
      indexer
    );
    const statusReporter = new GetStatusFeature.StatusReporter(
      config,
      cache,
      indexer,
      embedder
    );
    const configurator = new ConfigureFeature.Configure(config);

    // Store feature instances
    features[0].instance = hybridSearch;
    features[1].instance = indexer;
    features[2].instance = cacheClearer;
    features[3].instance = versionChecker;
    features[4].instance = workspaceManager;
    features[5].instance = statusReporter;
    features[6].instance = configurator;

    isInitialized = true;
    console.error("[Server] Model and cache loaded successfully");

    // Auto-index if configured and not watched (if watched, watcher handles it)
    if (config.autoIndexDelay && config.autoIndexDelay > 0) {
      setTimeout(async () => {
        console.error("[Server] Auto-indexing started...");
        await indexer.indexAll();
      }, config.autoIndexDelay);
    }

    // Setup watcher from PR #4 / HEAD logic
    if (config.watchFiles) {
      indexer.setupFileWatcher();
    }

  })();

  await initializationPromise;
}


// Handle Initialize Request (Handshake) - PR #4 Logic
server.setRequestHandler(InitializeRequestSchema, async (request) => {
  // If not manually set via CLI methods, try to detect from handshake
  if (!isInitialized && workspaceIndex === -1) {
    let rootPath = null;

    // Strategy 1: Check rootUri
    if (request.params.rootUri) {
      try {
        const uri = request.params.rootUri;
        if (uri.startsWith('file://')) {
          rootPath = fileURLToPath(uri);
        }
      } catch (err) {
        console.error(`[Server] Failed to parse rootUri: ${err.message}`);
      }
    }
    // Strategy 2: Check workspaceFolders (Array)
    else if (request.params.workspaceFolders && request.params.workspaceFolders.length > 0) {
      const firstFolder = request.params.workspaceFolders[0];
      try {
        if (firstFolder.uri.startsWith('file://')) {
          rootPath = fileURLToPath(firstFolder.uri);
        }
      } catch (err) {
        console.error(`[Server] Failed to parse workspaceFolder: ${err.message}`);
      }
    }

    if (rootPath) {
      console.error(`[Server] Auto-detected workspace from handshake: ${rootPath}`);
      workspaceDir = rootPath;
      // Trigger initialization
      ensureInitialized().catch(err => console.error(`[Server] Init failed: ${err.message}`));
    }
  }

  return {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {}
    },
    serverInfo: {
      name: "smart-coding-mcp",
      version: packageJson.version
    }
  };
});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Ensure config loaded for tool definitions
  await ensureInitialized();

  const tools = [];
  if (!config) return { tools: [] };

  for (const feature of features) {
    const toolDef = feature.module.getToolDefinition(config);
    tools.push(toolDef);
  }

  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Ensure initialized
  await ensureInitialized();

  for (const feature of features) {
    const toolDef = feature.module.getToolDefinition(config);

    if (request.params.name === toolDef.name) {
      return await feature.handler(request, feature.instance);
    }
  }

  return {
    content: [{
      type: "text",
      text: `Unknown tool: ${request.params.name}`
    }]
  };
});

// Main entry point
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Server] Smart Coding MCP server ready!");

  // If we have a definite workspace from CLI, initialize immediately
  if (workspaceIndex !== -1) {
    ensureInitialized().catch(console.error);
  }

  // Cleanup
  process.stdin.resume();
  process.stdin.on('close', () => {
    console.error("[Server] stdin closed, shutting down...");
    process.exit(0);
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.error("\n[Server] Shutting down gracefully...");

  // Stop file watcher
  if (indexer && indexer.watcher) {
    await indexer.watcher.close();
  }

  // Stop workers
  if (indexer) {
    indexer.terminateWorkers();
  }

  // Save cache
  if (cache) {
    await cache.save();
  }

  console.error("[Server] Goodbye!");
  process.exit(0);
});

// Windows/Generic SIGTERM
process.on("SIGTERM", async () => {
  if (indexer) indexer.terminateWorkers();
  process.exit(0);
});

main().catch(console.error);
