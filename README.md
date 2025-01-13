# Nginx Clone 🚀

A lightweight, Node.js-based reverse proxy server inspired by Nginx. This project allows you to route HTTP requests to upstream servers based on configurable rules.

## Features

- Lightweight and fast reverse proxy.
- Configurable upstreams and routing rules via a YAML configuration file.
- Support for both HTTP and HTTPS protocols.
- Easy to extend and customize.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Basic knowledge of reverse proxies and YAML configuration

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/nginx-clone.git
   cd nginx-clone
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project (if using TypeScript):
   ```bash
   npm run build
   ```

## Configuration

The server uses a `config.yaml` file for routing and upstream configuration. Below is a sample configuration:

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
      value: '$ip'

    - key: Authorization
      value: 'Bearer $token'

  rules:
    - path: /
      upstreams:
        - node1
        - node2

    - path: /todos
      upstreams:
        - node1
```

### Steps to Add Your Configuration

1. Create a `config.yaml` file in the root directory.
2. Copy and customize the sample configuration as per your requirements.

## Running the Server

1. Start the server:
   ```bash
   npm start -- --config config.yaml
   ```

2. Access the server at `http://localhost:8080`.

## Testing

To test the reverse proxy functionality, you can use tools like `curl` or Postman:

- Example request:
  ```bash
  curl http://localhost:8080/todos
  ```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes with descriptive messages.
4. Submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Feel free to reach out if you have any questions or suggestions!

