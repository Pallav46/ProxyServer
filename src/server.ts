import cluster, { Worker } from "cluster";
import http, { request } from "http";

import { ConfigSchemaType, rootConfigSchema } from "./config-schema";
import {
  workerMessageReplyType,
  workerMessageSchema,
  workerMessageType,
} from "./server-schema";

interface CreateServerConfig {
  port: number;
  workerCount: number;
  config: ConfigSchemaType;
}

export async function createServer(config: CreateServerConfig) {
  const { workerCount, port } = config;

  const WORKER_POOL: Worker[] = [];

  if (cluster.isPrimary) {
    console.log(`Master Process is Up with PID: ${process.pid} 🎉`);
    for (let i = 0; i < workerCount; i++) {
      const w = cluster.fork({ config: JSON.stringify(config.config) });
      WORKER_POOL.push(w);
      console.log(`Master Process: Forking Worker Process: ${i} 🚀`);
    }

    const server = http.createServer((req, res) => {
      const index = Math.floor(Math.random() * WORKER_POOL.length);
      const worker: Worker = WORKER_POOL[index];

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
    const config = await rootConfigSchema.parseAsync(
      JSON.parse(process.env.config as string)
    );

    process.on("message", async (message: string) => {
      const messagevalidated = await workerMessageSchema.parseAsync(
        JSON.parse(message)
      );
      const requestURL = messagevalidated.url;
      const rule = config.server.rules.find((e) => e.path === requestURL);

      if (!rule) {
        const reply: workerMessageReplyType = {
          errorCode: "404",
          error: "Rule Not Found",
        };
        if (process.send) JSON.stringify(reply);
        return;
      }

      const upstreamId = rule?.upstreams[0];
      const upstream = config.server.upstreams.find((e) => e.id === upstreamId);
      
      if (!upstream) {
        const reply: workerMessageReplyType = {
          errorCode: "500",
          error: "Upstream Not Found",
        };
        if (process.send) JSON.stringify(reply);
        return;
      }

      const url = new URL(upstream?.url as string); // Parse the upstream URL

      const request = http.request(
        {
          hostname: url.hostname, // Extract the hostname
          port: url.port || 80, // Use the port from the URL or default to 80
          path: requestURL, // Forward the request URL
          method: "GET", // HTTP method
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
