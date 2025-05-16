"use strict";
/**
 * index.ts
 * --------
 * Entry point for the Proxy Server CLI. Parses command-line arguments, loads configuration, and starts the server.
 *
 * Author: Pallav
 * Date: 2025-05-16
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const config_1 = require("./config");
const server_1 = require("./server");
/**
 * Main function to start the proxy server.
 */
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            // Parse CLI options
            commander_1.program.option("--config <path>");
            commander_1.program.parse();
            const options = commander_1.program.opts();
            // Load and validate config, then start server
            if (options && options.config) {
                const config = yield (0, config_1.parseYAMLConfig)(options.config);
                const validatedConfig = yield (0, config_1.validateConfig)(config);
                yield (0, server_1.createServer)({
                    port: validatedConfig.server.listen,
                    workerCount: (_a = validatedConfig.server.workers) !== null && _a !== void 0 ? _a : 2,
                    config: validatedConfig,
                });
            }
            else {
                console.error("Error: --config option is required");
                process.exit(1);
            }
        }
        catch (error) {
            // Handle startup errors
            console.error("Error starting the proxy server:", error);
            process.exit(1);
        }
    });
}
main();
