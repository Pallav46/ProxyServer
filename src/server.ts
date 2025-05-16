/**
 * server.ts
 * -------------
 * Main entry point for the Proxy Server. Implements a clustered HTTP proxy with rate limiting and rule-based upstream forwarding.
 *
 * Design Principles:
 * - Single Responsibility: Each function and interface has a clear, single purpose.
 * - DRY: Avoids code duplication, especially in error handling and configuration parsing.
 * - Robust Error Handling: All error cases are handled with clear messages and status codes.
 * - Readability: Code is organized, commented, and uses descriptive names.
 *
 * Author: Pallav
 * Date: 2025-05-16
 */

import cluster, { Worker } from "cluster";
import http, { request } from "http";
import { URL } from "url";

import { ConfigSchemaType, rootConfigSchema } from "./config-schema";
import {
  workerMessageReplyType,
  workerMessageSchema,
  workerMessageType,
} from "./server-schema";

/**
 * Interface for client information for rate limiting.
 * @interface ClientInfo
 * @property {number} lastRequestTime - Last request timestamp (ms).
 * @property {number} requestCount - Number of requests in the current window.
 */
interface ClientInfo {
  lastRequestTime: number;
  requestCount: number;
}

/**
 * Map to store client request counts for rate limiting.
 * Keyed by client IP address.
 */
const clientRequestCounts: Map<string, ClientInfo> = new Map();

/**
 * Interface for cache entry.
 * @interface CacheEntry
 * @property {string} data - Cached response data.
 * @property {number} expirationTime - Timestamp when the cache entry expires.
 */
interface CacheEntry {
  data: string;
  expirationTime: number;
}

/**
 * Map to store cached responses.
 * Keyed by request URL.
 */
const cache: Map<string, CacheEntry> = new Map();

/**
 * Interface for the createServer config.
 * @interface CreateServerConfig
 * @property {number} port - Port to listen on.
 * @property {number} workerCount - Number of worker processes.
 * @property {ConfigSchemaType} config - Server configuration object.
 */
interface CreateServerConfig {
  port: number;
  workerCount: number;
  config: ConfigSchemaType;
}

/**
 * Creates a proxy server with clustering, rate limiting, and rule-based upstream forwarding.
 *
 * @param {CreateServerConfig} config - The config for the server.
 * @returns {Promise<void>} Resolves when the server is started.
 */
export async function createServer(config: CreateServerConfig) {
  const { workerCount, port } = config;
  const { rateLimit: globalRateLimit, cache: globalCacheConfig } = config.config;

  // Clear expired cache entries periodically
  setInterval(() => {
    const now = Date.now();
    cache.forEach((entry, url) => {
      if (entry.expirationTime <= now) {
        cache.delete(url);
        console.log(`Cache entry expired for ${url}`);
      }
    });
  }, globalCacheConfig?.expirationTime || 60000);

  const WORKER_POOL: Worker[] = [];

  if (cluster.isPrimary) {
    /**
     * Master process logic: forks workers and handles round-robin load balancing.
     */
    console.log(`Master Process is Up with PID: ${process.pid} 🎉`);
    // Fork workers.
    for (let i = 0; i < workerCount; i++) {
      const w = cluster.fork({ config: JSON.stringify(config.config) });
      WORKER_POOL.push(w);
      console.log(`Master Process: Forking Worker Process: ${i} 🚀`);
    }

    let workerIndex = 0;

    /**
     * Performs round robin load balancing to select the next worker.
     * @returns {Worker} - The selected worker.
     */
    const roundRobin = (): Worker => {
      const worker: Worker = WORKER_POOL[workerIndex];
      console.log(`Request forwarded to worker ${workerIndex}`);
      workerIndex = (workerIndex + 1) % WORKER_POOL.length;
      return worker;
    };

    /**
     * Creates an HTTP server to handle incoming requests.
     * Handles rate limiting and forwards requests to workers.
     */
    const server = http.createServer((req, res) => {
      const clientIp = req.socket.remoteAddress || "127.0.0.1";
      const rule = config.config.server.rules.find((e) => e.path === req.url);
      const pathRateLimit = rule?.rateLimit;
      const pathCacheConfig = rule?.cache;

      // Determine the active rate limit and cache configuration
      const activeRateLimit = pathRateLimit || globalRateLimit;
      const activeCacheConfig = pathCacheConfig || globalCacheConfig;

      const now = Date.now();
      const clientInfo = clientRequestCounts.get(clientIp) || {
        lastRequestTime: now,
        requestCount: 0,
      };

      // Rate limiting logic
      if (activeRateLimit?.enabled) {
        if (now - clientInfo.lastRequestTime > activeRateLimit.timeWindow) {
          clientInfo.requestCount = 0;
        }

        if (clientInfo.requestCount >= activeRateLimit.maxRequests) {
          console.warn(`Rate limit exceeded for client ${clientIp}`);
          res.statusCode = 429;
          res.end("Too Many Requests");
          return;
        }

        clientInfo.lastRequestTime = now;
        clientInfo.requestCount++;
        clientRequestCounts.set(clientIp, clientInfo);
      }

      // Check if caching is enabled
      if (activeCacheConfig?.enabled) {
        const cachedResponse = cache.get(req.url as string);

        // Check if the response is in the cache and hasn't expired
        if (cachedResponse && cachedResponse.expirationTime > now) {
          console.log(`Cache hit for ${req.url}`);
          res.statusCode = 200;
          res.end(cachedResponse.data);
          return;
        } else {
          // Remove expired entry from the cache
          cache.delete(req.url as string);
        }
      }

      // Forward request to worker
      const worker: Worker = roundRobin();

      if (!worker.isConnected()) {
        res.statusCode = 503;
        res.end("Service Unavailable");
        return;
      }

      const payload: workerMessageType = {
        requestType: "http",
        headers: req.headers,
        body: "",
        url: req.url as string,
      };

      worker.send(JSON.stringify(payload));

      // Handle worker response
      worker.on("message", (message: string) => {
        const reply = JSON.parse(message) as workerMessageReplyType;
        if (reply.errorCode) {
          res.statusCode = parseInt(reply.errorCode);
          res.end(reply.error);
          return;
        } else {
          // Store the response in the cache
          if (activeCacheConfig?.enabled && reply.data) {
            const expirationTime = now + (activeCacheConfig.expirationTime || 60000);
            cache.set(req.url as string, { data: reply.data, expirationTime });
            console.log(`Cache set for ${req.url}`);
          }
          res.statusCode = 200;
          res.end(reply.data || "");
        }
      });
    });

    server.listen(port, () => {
      console.log(`Master Process: Server is Running on Port: ${port} 🚀`);
    });
  } else {
    /**
     * Worker process logic: receives requests from master, applies rules, and forwards to upstreams.
     */
    console.log(`Worker Process is Up with PID: ${process.pid} 🎉`);
    let config: ConfigSchemaType;
    try {
      config = await rootConfigSchema.parseAsync(
        JSON.parse(process.env.config as string)
      );
    } catch (error) {
      console.error("Error parsing config:", error);
      const reply: workerMessageReplyType = {
        errorCode: "500",
        error: "Config Parsing Error",
      };
      if (process.send) {
        await process.send(JSON.stringify(reply));
      } else {
        console.error("process.send is not defined");
      }
      return;
    }

    process.on("message", async (message: string) => {
      // Validate and parse incoming message
      let messagevalidated;

      try {
        messagevalidated = await workerMessageSchema.parseAsync(
          JSON.parse(message)
        );
      } catch (error) {
        console.error("Error parsing message:", error);
        const reply: workerMessageReplyType = {
          errorCode: "400",
          error: "Message Parsing Error",
        };
        if (process.send) {
          await process.send(JSON.stringify(reply));
        } else {
          console.error("process.send is not defined");
        }
        return;
      }

      // Find matching rule for the request URL
      const requestURL = messagevalidated.url;
      const rule = config.server.rules.find((e) => e.path === requestURL);

      if (!rule) {
        const reply: workerMessageReplyType = {
          errorCode: "404",
          error: "Rule Not Found",
        };
        if (process.send) {
          await process.send(JSON.stringify(reply));
        } else {
          console.error("process.send is not defined");
        }
        return;
      }

      // Find upstream for the rule
      const upstreamId = rule?.upstreams[0];
      if (!upstreamId) {
        const reply: workerMessageReplyType = {
          errorCode: "500",
          error: "Upstream ID Not Found",
        };
        if (process.send) {
          await process.send(JSON.stringify(reply));
        } else {
          console.error("process.send is not defined");
        }
        return;
      }
      const upstream = config.server.upstreams.find((e) => e.id === upstreamId);

      if (!upstream) {
        const reply: workerMessageReplyType = {
          errorCode: "500",
          error: "Upstream Not Found",
        };
        if (process.send) {
          await process.send(JSON.stringify(reply));
        } else {
          console.error("process.send is not defined");
        }
        return;
      }

      // Parse upstream URL
      const url = new URL(upstream?.url as string); // Parse the upstream URL

      console.log(`Forwarding request to ${url.href}`);

      const agent = new http.Agent({
        keepAlive: true,
        maxSockets: 100, // Maximum number of sockets in the pool
      });

      // Forward request to upstream using Node.js http.request
      const request = http.request(
        {
          hostname: url.hostname, // Extract the hostname
          port: url.port || 80, // Use the port from the URL or default to 80
          path: requestURL, // Forward the request URL
          method: "GET", // HTTP method (can be extended for other methods)
          agent: agent, // Use the connection pool
        },
        (response) => {
          let data = "";
          response.on("data", (chunk) => {
            data += chunk;
          });

          response.on("end", () => {
            // Send response data back to master process
            const reply: workerMessageReplyType = {
              data,
            };
            if (process.send) return process.send(JSON.stringify(reply));
          });
        }
      );
      request.end();
    });
  }
}
