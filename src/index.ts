/**
 * index.ts
 * --------
 * Entry point for the Proxy Server CLI. Parses command-line arguments, loads configuration, and starts the server.
 *
 * Author: Pallav
 * Date: 2025-05-16
 */

import { program } from "commander";

import { validateConfig, parseYAMLConfig } from "./config";
import { createServer } from "./server";

/**
 * Main function to start the proxy server.
 */
async function main() {
  try {
    // Parse CLI options
    program.option("--config <path>");
    program.parse();
    const options = program.opts();

    // Load and validate config, then start server
    if (options && options.config) {
      const config = await parseYAMLConfig(options.config);
      const validatedConfig = await validateConfig(config);
      await createServer({
        port: validatedConfig.server.listen,
        workerCount: validatedConfig.server.workers ?? 2,
        config: validatedConfig,
      });
    } else {
      console.error("Error: --config option is required");
      process.exit(1);
    }
  } catch (error) {
    // Handle startup errors
    console.error("Error starting the proxy server:", error);
    process.exit(1);
  }
}

main();
