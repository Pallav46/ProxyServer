"use strict";
/**
 * server-schema.ts
 * ----------------
 * Defines the Zod schemas and types for validating messages exchanged between the master and worker processes.
 *
 * This module ensures type-safe and validated inter-process communication for the proxy server.
 *
 * Author: Pallav
 * Date: 2025-05-16
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.workerMessageReplySchema = exports.workerMessageSchema = void 0;
const zod_1 = require("zod");
/**
 * Message protocol for master-worker communication:
 * - workerMessageType: Sent from master to worker, describes the HTTP request to process.
 * - workerMessageReplyType: Sent from worker to master, contains the response or error.
 */
/**
 * Schema for messages sent to workers.
 */
exports.workerMessageSchema = zod_1.z.object({
    /**
     * Type of request.
     */
    requestType: zod_1.z.enum(["http"]),
    /**
     * Headers for the request.
     */
    headers: zod_1.z.object({}),
    /**
     * Body of the request.
     */
    body: zod_1.z.string(),
    /**
     * URL of the request.
     */
    url: zod_1.z.string(),
});
/**
 * Schema for reply messages from workers.
 */
exports.workerMessageReplySchema = zod_1.z.object({
    /**
     * Data returned by the worker.
     */
    data: zod_1.z.string().optional(),
    /**
     * Error message returned by the worker.
     */
    error: zod_1.z.string().optional(),
    /**
     * Error code returned by the worker.
     */
    errorCode: zod_1.z.enum(['500', '404', '400', '429']).optional(),
});
