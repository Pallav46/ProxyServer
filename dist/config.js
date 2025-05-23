"use strict";
/**
 * config.ts
 * ---------
 * Handles loading, parsing, and validating the proxy server configuration from YAML files.
 *
 * Provides utility functions to ensure configuration is loaded safely and correctly before server startup.
 *
 * Author: Pallav
 * Date: 2025-05-16
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.parseYAMLConfig = parseYAMLConfig;
exports.validateConfig = validateConfig;
const fs = __importStar(require("node:fs/promises"));
const yaml_1 = require("yaml");
const config_schema_1 = require("./config-schema");
/**
 * Parses a YAML config file and returns a JSON string representation.
 * @param {string} filePath - The path to the YAML config file.
 * @returns {Promise<string>} - A promise that resolves with the JSON string representation of the config.
 */
function parseYAMLConfig(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const configFileContent = yield fs.readFile(filePath, "utf-8");
            const config = (0, yaml_1.parse)(configFileContent);
            return JSON.stringify(config);
        }
        catch (error) {
            console.error("Error parsing YAML config:", error);
            throw new Error(`Failed to parse YAML config file at ${filePath}: ${error}`);
        }
    });
}
/**
 * Validates a config string against the rootConfigSchema.
 * @param {string} config - The config string to validate.
 * @returns {Promise<ConfigSchemaType>} - A promise that resolves with the validated config.
 */
function validateConfig(config) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const parsedConfig = JSON.parse(config);
            const validatedConfig = yield config_schema_1.rootConfigSchema.parseAsync(parsedConfig);
            return validatedConfig;
        }
        catch (error) {
            console.error("Error validating config:", error);
            throw new Error(`Failed to validate config: ${error}`);
        }
    });
}
