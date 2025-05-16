/**
 * config-schema.ts
 * ----------------
 * Defines the Zod schemas and types for validating the proxy server configuration file.
 *
 * This module ensures that all configuration loaded from YAML or JSON is type-safe and validated before use.
 *
 * Author: Pallav
 * Date: 2025-05-16
 */

import { z } from "zod";

/**
 * Schema for defining an upstream server.
 */
const upstreamSchems = z.object({
  /**
   * Unique identifier for the upstream.
   */
  id: z.string(),
  /**
   * URL of the upstream server.
   */
  url: z.string(),
});

/**
 * Schema for defining a header.
 */
const headerSchema = z.object({
  /**
   * Key of the header.
   */
  key: z.string(),
  /**
   * Value of the header.
   */
  value: z.string(),
});

/**
 * Schema for defining rate limiting.
 */
const rateLimitSchema = z.object({
  /**
   * Maximum number of requests allowed within the time window.
   */
  maxRequests: z.number().default(5),
  /**
   * Time window in milliseconds for rate limiting.
   */
  timeWindow: z.number().default(60000), // 1 minute in milliseconds
});

/**
 * Schema for defining a rule.
 */
const ruleSchema = z.object({
    /**
     * Path to match for the rule.
     */
    path: z.string(),
    /**
     * Array of upstream IDs to use for the rule.
     */
    upstreams: z.array(z.string()),
    /**
     * Rate limit configuration for the rule.
     */
    rateLimit: rateLimitSchema.optional(),
});

/**
 * Schema for defining a server.
 */
const serverSchema = z.object({
  /**
   * Port to listen on.
   */
  listen: z.number(),
  /**
   * Number of worker processes to spawn.
   */
  workers: z.number().optional(),
  /**
   * Array of upstream servers.
   */
  upstreams: z.array(upstreamSchems),
  /**
   * Array of headers to add to all responses.
   */
  headers: z.array(headerSchema).optional(),
  /**
   * Array of rules to apply to incoming requests.
   */
  rules: z.array(ruleSchema),
});

/**
 * Schema for the root configuration.
 * Includes upstreams, rules, and global server settings.
 */
export const rootConfigSchema = z.object({
  /**
   * Server configuration.
   */
  server: serverSchema,
  /**
   * Global rate limit configuration.
   */
  rateLimit: rateLimitSchema.optional(),
});

/**
 * Type for the root configuration schema.
 */
export type ConfigSchemaType = z.infer<typeof rootConfigSchema>;
