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

import { z } from "zod";

/**
 * Message protocol for master-worker communication:
 * - workerMessageType: Sent from master to worker, describes the HTTP request to process.
 * - workerMessageReplyType: Sent from worker to master, contains the response or error.
 */

/**
 * Schema for messages sent to workers.
 */
export const workerMessageSchema = z.object({
  /**
   * Type of request.
   */
  requestType: z.enum(["http"]),
  /**
   * Headers for the request.
   */
  headers: z.object({}),
  /**
   * Body of the request.
   */
  body: z.string(),
  /**
   * URL of the request.
   */
  url: z.string(),
});

/**
 * Schema for reply messages from workers.
 */
export const workerMessageReplySchema = z.object({
    /**
     * Data returned by the worker.
     */
    data: z.string().optional(),
    /**
     * Error message returned by the worker.
     */
    error: z.string().optional(),
    /**
     * Error code returned by the worker.
     */
    errorCode: z.enum(['500', '404', '400', '429']).optional(),
});

/**
 * Type for worker messages.
 */
export type workerMessageType = z.infer<typeof workerMessageSchema>;
/**
 * Type for worker reply messages.
 */
export type workerMessageReplyType = z.infer<typeof workerMessageReplySchema>;
