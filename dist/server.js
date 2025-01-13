"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const cluster_1 = __importDefault(require("cluster"));
const http_1 = __importDefault(require("http"));
const config_schema_1 = require("./config-schema");
const server_schema_1 = require("./server-schema");
function createServer(config) {
    return __awaiter(this, void 0, void 0, function* () {
        const { workerCount, port } = config;
        const WORKER_POOL = [];
        if (cluster_1.default.isPrimary) {
            console.log(`Master Process is Up with PID: ${process.pid} 🎉`);
            for (let i = 0; i < workerCount; i++) {
                const w = cluster_1.default.fork({ config: JSON.stringify(config.config) });
                WORKER_POOL.push(w);
                console.log(`Master Process: Forking Worker Process: ${i} 🚀`);
            }
            const server = http_1.default.createServer((req, res) => {
                const index = Math.floor(Math.random() * WORKER_POOL.length);
                const worker = WORKER_POOL[index];
                if (!worker.isConnected()) {
                    res.statusCode = 503;
                    res.end("Service Unavailable");
                    return;
                }
                const payload = {
                    requestType: "http",
                    headers: req.headers,
                    body: "",
                    url: req.url,
                };
                worker.send(JSON.stringify(payload));
                worker.on("message", (message) => {
                    const reply = JSON.parse(message);
                    if (reply.errorCode) {
                        res.statusCode = parseInt(reply.errorCode);
                        res.end(reply.error);
                        return;
                    }
                    else {
                        res.statusCode = 200;
                        res.end(reply.data);
                    }
                });
            });
            server.listen(port, () => {
                console.log(`Master Process: Server is Running on Port: ${port} 🚀`);
            });
        }
        else {
            console.log(`Worker Process is Up with PID: ${process.pid} 🎉`);
            const config = yield config_schema_1.rootConfigSchema.parseAsync(JSON.parse(process.env.config));
            process.on("message", (message) => __awaiter(this, void 0, void 0, function* () {
                const messagevalidated = yield server_schema_1.workerMessageSchema.parseAsync(JSON.parse(message));
                const requestURL = messagevalidated.url;
                const rule = config.server.rules.find((e) => e.path === requestURL);
                if (!rule) {
                    const reply = {
                        errorCode: "404",
                        error: "Rule Not Found",
                    };
                    if (process.send)
                        JSON.stringify(reply);
                    return;
                }
                const upstreamId = rule === null || rule === void 0 ? void 0 : rule.upstreams[0];
                const upstream = config.server.upstreams.find((e) => e.id === upstreamId);
                if (!upstream) {
                    const reply = {
                        errorCode: "500",
                        error: "Upstream Not Found",
                    };
                    if (process.send)
                        JSON.stringify(reply);
                    return;
                }
                const url = new URL(upstream === null || upstream === void 0 ? void 0 : upstream.url); // Parse the upstream URL
                const request = http_1.default.request({
                    hostname: url.hostname, // Extract the hostname
                    port: url.port || 80, // Use the port from the URL or default to 80
                    path: requestURL, // Forward the request URL
                    method: "GET", // HTTP method
                }, (response) => {
                    let data = "";
                    response.on("data", (chunk) => {
                        data += chunk;
                    });
                    response.on("end", () => {
                        const reply = {
                            data,
                        };
                        if (process.send)
                            return process.send(JSON.stringify(reply));
                    });
                });
                request.end();
            }));
        }
    });
}
