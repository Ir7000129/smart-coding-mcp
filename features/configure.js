import fs from "fs/promises";
import path from "path";
import { saveGlobalConfig } from "../lib/config.js";

export class Configure {
    constructor(config) {
        this.config = config;
    }

    async configure(newPath, settings = {}) {
        const targetDir = path.resolve(newPath);

        // Validate path
        try {
            await fs.access(targetDir);
        } catch {
            return { success: false, message: `Invalid path: ${targetDir}. Directory does not exist.` };
        }

        // Save settings to Encapsulated Project Config (.smart-coding-cache/config.json)
        // We reuse the saveGlobalConfig function because it now targets the project-local storage
        const success = await saveGlobalConfig(settings, targetDir);

        if (success) {
            return {
                success: true,
                message: `Configuration saved to encapsulated project folder: ${path.join(targetDir, '.smart-coding-cache', 'config.json')}. Settings updated: ${JSON.stringify(settings)}`
            };
        } else {
            return {
                success: false,
                message: `Failed to save configuration to encapsulated project folder.`
            };
        }
    }
}

export function getToolDefinition(config) {
    return {
        name: "configure_workspace",
        description: "Dynamically configures the workspace path and performance settings. Updates the encapsulated configuration file in your project's .smart-coding-cache directory.",
        inputSchema: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Absolute path to the project root directory you want to index (e.g. C:/Users/Name/Project)"
                },
                settings: {
                    type: "object",
                    description: "Optional performance settings",
                    properties: {
                        workerThreads: { type: "number", description: "Number of worker threads (1 for low resource usage)" },
                        watchFiles: { type: "boolean", description: "Enable/disable file watching" }
                    }
                }
            },
            required: ["path"]
        }
    };
}

export async function handleToolCall(request, instance) {
    const newPath = request.params.arguments.path;
    const settings = request.params.arguments.settings;

    const result = await instance.configure(newPath, settings);

    return {
        content: [{ type: "text", text: result.message }]
    };
}
