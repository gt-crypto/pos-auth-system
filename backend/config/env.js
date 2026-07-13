import { z } from 'zod';
import dotenv from 'dotenv';
import logger from './logger.js';

// Ensure dotenv is loaded before parsing
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string({
    required_error: 'MONGO_URI is required'
  }).min(1, 'MONGO_URI cannot be empty'),
  JWT_SECRET: z.string({
    required_error: 'JWT_SECRET is required'
  }).min(8, 'JWT_SECRET must be at least 8 characters long'),
  JWT_EXPIRE: z.string().default('24h'),
  COOKIE_EXPIRE: z.coerce.number().default(24),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SUPER_ADMIN_INVITE: z.string().optional(),
  ADMIN_INVITE: z.string().optional()
});

let env;
try {
  env = envSchema.parse(process.env);
  logger.info('Environment variables validated successfully.');
  logger.info(`Booting settings: PORT=${env.PORT}, NODE_ENV=${env.NODE_ENV}, CLIENT_URL=${env.CLIENT_URL}`);
} catch (error) {
  logger.error('Environment validation failed:');
  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      logger.error(`  - [ENV] ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    logger.error(error.message);
  }
  process.exit(1);
}

export default env;
