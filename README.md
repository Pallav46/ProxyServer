# ProxyServer (Node.js Reverse Proxy)

A lightweight, scalable, and configurable reverse proxy server built with Node.js and TypeScript, inspired by Nginx. This project enables HTTP request routing to upstream servers based on flexible, YAML-based configuration rules.

---

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Features
- **Clustered**: Utilizes Node.js clustering for multi-core scalability.
- **Configurable**: All routing, upstreams, and rate limits are defined in a YAML config file.
- **Load Balancing**: Built-in round-robin load balancing across upstreams.
- **Rate Limiting**: Per-path and global rate limiting support.
- **Extensible**: Easily add new rules, upstreams, or headers.
- **Type-Safe**: Uses Zod for runtime config validation.
- **Robust Error Handling**: Clear error messages and status codes for all failure scenarios.

---

## Architecture
- **src/server.ts**: Main entry point, handles clustering, rate limiting, and request forwarding.
- **src/config-schema.ts**: Zod schemas and types for validating configuration.
- **src/server-schema.ts**: Zod schemas for inter-process communication.
- **src/config.ts**: Utilities for loading and validating YAML config files.
- **src/index.ts**: CLI entry point.

---

## Folder Structure
```
ProxyServer/
├── config.yaml           # Main configuration file (YAML)
├── LICENSE
├── package.json
├── pnpm-lock.yaml
├── README.md
├── tsconfig.json
└── src/
    ├── config-schema.ts  # Zod schemas for config validation
    ├── config.ts         # Config loading/validation utilities
    ├── index.ts          # CLI entry point
    ├── server-schema.ts  # Message schemas for cluster communication
    └── server.ts         # Main server logic
```

---

## Getting Started

### Prerequisites
- Node.js v18 or higher
- pnpm (recommended), or npm/yarn

### Installation
```bash
# Clone the repository
$ git clone https://github.com/yourusername/proxyserver.git
$ cd proxyserver

# Install dependencies
$ pnpm install

# Build the project
$ pnpm run build
```

---

## Configuration

All server behavior is defined in `config.yaml` at the project root. Example:

```yaml
server:
  listen: 8080
  workers: 4
  upstreams:
    - id: node1
      url: http://jsonplaceholder.typicode.com
    - id: node2
      url: http://jsonplaceholder.typicode.com
  headers:
    - key: X-Forwarded-For
      value: "$ip"
    - key: Authorization
      value: "Bearer $token"
  rules:
    - path: /
      upstreams: [node1, node2]
    - path: /todos
      upstreams: [node1]
    - path: /todos/1
      upstreams: [node1, node2]
      rateLimit:
        maxRequests: 3
        timeWindow: 30000
rateLimit:
  maxRequests: 5
  timeWindow: 60000
```

- **server.listen**: Port to listen on
- **server.workers**: Number of worker processes
- **server.upstreams**: List of backend servers
- **server.headers**: Headers to add to all responses
- **server.rules**: Routing rules (by path, upstreams, and optional rate limit)
- **rateLimit**: Global rate limiting (can be overridden per rule)

---

## Running the Server

```bash
pnpm start -- --config config.yaml
```

- The server will be available at `http://localhost:8080` (or your configured port).

---

## Testing

You can test the proxy using `curl`, Postman, or any HTTP client:

```bash
curl http://localhost:8080/todos
```

---

## Contributing

1. Fork the repository
2. Create a new branch for your feature or bugfix
3. Commit your changes with clear, descriptive messages
4. Submit a pull request

Please ensure your code follows the existing style and includes appropriate documentation/comments.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

**Maintainer:** Pallav

