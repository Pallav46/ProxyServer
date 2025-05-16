import cluster, { Worker } from "cluster";
import http, { request } from "http";
import { URL } from "url";

import { ConfigSchemaType, rootConfigSchema } from "./config-schema";
import {
  workerMessageReplyType,
  workerMessageSchema,
  workerMessageType,
} from "./server-schema";

interface ClientInfo {
  lastRequestTime: number;
  requestCount: number;
}

const clientRequestCounts: Map<string, ClientInfo> = new Map();

interface CreateServerConfig {
  port: number;
  workerCount: number;
  config: ConfigSchemaType;
}

export async function createServer(config: CreateServerConfig) {
  const { workerCount, port } = config;
  const { rateLimit } = config.config;

  const WORKER_POOL: Worker[] = [];

  if (cluster.isPrimary) {
    console.log(`Master Process is Up with PID: ${process.pid} 🎉`);
    for (let i = 0; i < workerCount; i++) {
      const w = cluster.fork({ config: JSON.stringify(config.config) });
      WORKER_POOL.push(w);
      console.log(`Master Process: Forking Worker Process: ${i} 🚀`);
    }

    let workerIndex = 0;

    const roundRobin = (): Worker => {
      const worker: Worker = WORKER_POOL[workerIndex];
      console.log(`Request forwarded to worker ${workerIndex}`);
      workerIndex = (workerIndex + 1) % WORKER_POOL.length;
      return worker;
    };

    const server = http.createServer((req, res) => {
      const clientIp = req.socket.remoteAddress || "127.0.0.1";
      const rule = config.config.server.rules.find((e) => e.path === req.url);
      const pathRateLimit = rule?.rateLimit;

      const now = Date.now();
      const clientInfo = clientRequestCounts.get(clientIp) || {
        lastRequestTime: now,
        requestCount: 0,
      };

      const activeRateLimit = pathRateLimit || rateLimit;

      if (activeRateLimit) {
        if (now - clientInfo.lastRequestTime > activeRateLimit.timeWindow) {
          clientInfo.requestCount = 0;
        }

        if (clientInfo.requestCount >= activeRateLimit.maxRequests) {
          console.warn(`Rate limit exceeded for client ${clientIp}`);
          res.statusCode = 429;
          res.end("Too Many Requests");
          return;
        }
      }

      clientInfo.lastRequestTime = now;
      clientInfo.requestCount++;
      clientRequestCounts.set(clientIp, clientInfo);

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

      worker.on("message", (message) => {
        const reply = JSON.parse(message) as workerMessageReplyType;
        if (reply.errorCode) {
          res.statusCode = parseInt(reply.errorCode);
          res.end(reply.error);
          return;
        } else {
          res.statusCode = 200;
          res.end(reply.data);
        }
      });
    });

    server.listen(port, () => {
      console.log(`Master Process: Server is Running on Port: ${port} 🚀`);
    });
  } else {
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

      const url = new URL(upstream?.url as string); // Parse the upstream URL

      console.log(`Forwarding request to ${url.href}`);

      const request = http.request(
        {
          hostname: url.hostname, // Extract the hostname
          port: url.port || 80, // Use the port from the URL or default to 80
          path: requestURL, // Forward the request URL
          method: "GET", // HTTP method
          agent: new http.Agent({ keepAlive: true }),
        },
        (response) => {
          let data = "";
          response.on("data", (chunk) => {
            data += chunk;
          });

          response.on("end", () => {
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
