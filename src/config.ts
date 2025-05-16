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

import * as fs from "node:fs/promises";
import { parse } from "yaml";

import { rootConfigSchema } from "./config-schema";

/**
 * Parses a YAML config file and returns a JSON string representation.
 * @param {string} filePath - The path to the YAML config file.
 * @returns {Promise<string>} - A promise that resolves with the JSON string representation of the config.
 */
export async function parseYAMLConfig(filePath: string): Promise<string> {
  try {
    const configFileContent = await fs.readFile(filePath, "utf-8");
    const config = parse(configFileContent);
    return JSON.stringify(config);
  } catch (error) {
    console.error("Error parsing YAML config:", error);
    throw new Error(`Failed to parse YAML config file at ${filePath}: ${error}`);
  }
}

/**
 * Validates a config string against the rootConfigSchema.
 * @param {string} config - The config string to validate.
 * @returns {Promise<ConfigSchemaType>} - A promise that resolves with the validated config.
 */
export async function validateConfig(config: string) {
  try {
    const parsedConfig = JSON.parse(config);
    const validatedConfig = await rootConfigSchema.parseAsync(parsedConfig);
    return validatedConfig;
  } catch (error) {
    console.error("Error validating config:", error);
    throw new Error(`Failed to validate config: ${error}`);
  }
}
