import { z } from "zod";

const upstreamSchems = z.object({
  id: z.string(),
  url: z.string(),
});

const headerSchema = z.object({
  key: z.string(),
  value: z.string(),
});

const rateLimitSchema = z.object({
  maxRequests: z.number().default(5),
  timeWindow: z.number().default(60000), // 1 minute in milliseconds
});

const ruleSchema = z.object({
    path: z.string(),
    upstreams: z.array(z.string()),
    rateLimit: rateLimitSchema.optional(),
});

const serverSchema = z.object({
  listen: z.number(),
  workers: z.number().optional(),
  upstreams: z.array(upstreamSchems),
  headers: z.array(headerSchema).optional(),
  rules: z.array(ruleSchema),
});

export const rootConfigSchema = z.object({
  server: serverSchema,
  rateLimit: rateLimitSchema.optional(),
});

export type ConfigSchemaType = z.infer<typeof rootConfigSchema>;
