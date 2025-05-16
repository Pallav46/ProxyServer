"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.rootConfigSchema = void 0;
const zod_1 = require("zod");
/**
 * Schema for defining an upstream server.
 */
const upstreamSchems = zod_1.z.object({
    /**
     * Unique identifier for the upstream.
     */
    id: zod_1.z.string(),
    /**
     * URL of the upstream server.
     */
    url: zod_1.z.string(),
});
/**
 * Schema for defining a header.
 */
const headerSchema = zod_1.z.object({
    /**
     * Key of the header.
     */
    key: zod_1.z.string(),
    /**
     * Value of the header.
     */
    value: zod_1.z.string(),
});
/**
 * Schema for defining caching.
 */
const cacheSchema = zod_1.z.object({
    /**
     * Enable or disable caching.
     */
    enabled: zod_1.z.boolean().default(true),
    /**
     * Maximum number of entries in the cache.
     */
    maxSize: zod_1.z.number().default(100),
    /**
     * Time in milliseconds after which a cache entry expires.
     */
    expirationTime: zod_1.z.number().default(60000), // 1 minute in milliseconds
});
/**
 * Schema for defining rate limiting.
 */
const rateLimitSchema = zod_1.z.object({
    /**
     * Enable or disable rate limiting.
     */
    enabled: zod_1.z.boolean().default(true),
    /**
     * Maximum number of requests allowed within the time window.
     */
    maxRequests: zod_1.z.number().default(5),
    /**
     * Time window in milliseconds for rate limiting.
     */
    timeWindow: zod_1.z.number().default(60000), // 1 minute in milliseconds
});
/**
 * Schema for defining a rule.
 */
const ruleSchema = zod_1.z.object({
    /**
     * Path to match for the rule.
     */
    path: zod_1.z.string(),
    /**
     * Array of upstream IDs to use for the rule.
     */
    upstreams: zod_1.z.array(zod_1.z.string()),
    /**
     * Rate limit configuration for the rule.
     */
    rateLimit: rateLimitSchema.optional(),
    /**
     * Cache configuration for the rule.
     */
    cache: cacheSchema.optional(),
});
/**
 * Schema for defining a server.
 */
const serverSchema = zod_1.z.object({
    /**
     * Port to listen on.
     */
    listen: zod_1.z.number(),
    /**
     * Number of worker processes to spawn.
     */
    workers: zod_1.z.number().optional(),
    /**
     * Array of upstream servers.
     */
    upstreams: zod_1.z.array(upstreamSchems),
    /**
     * Array of headers to add to all responses.
     */
    headers: zod_1.z.array(headerSchema).optional(),
    /**
     * Array of rules to apply to incoming requests.
     */
    rules: zod_1.z.array(ruleSchema),
});
/**
 * Schema for the root configuration.
 * Includes upstreams, rules, and global server settings.
 */
exports.rootConfigSchema = zod_1.z.object({
    /**
     * Server configuration.
     */
    server: serverSchema,
    /**
     * Global rate limit configuration.
     */
    rateLimit: rateLimitSchema.optional(),
    /**
     * Global cache configuration.
     */
    cache: cacheSchema.optional(),
});
