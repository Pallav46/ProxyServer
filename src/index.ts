import { program } from "commander";

import { validateConfig, parseYAMLConfig } from "./config";
import { createServer } from "./server";

async function main() {
  program.option("--config <path>");
  program.parse();
  const options = program.opts();

  if (options && options.config) {
    const config = await parseYAMLConfig(options.config);
    const validatedConfig = await validateConfig(config);
    await createServer({
      port: validatedConfig.server.listen,
      workerCount: validatedConfig.server.workers ?? 2,
      config: validatedConfig,
    });
  }
}

main();
