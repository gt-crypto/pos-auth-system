import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mongoose from 'mongoose';

// Load configurations
dotenv.config();

// Validate environment variables right after loading configurations
import './config/env.js';

import connectDB from './config/db.js';
import logger from './config/logger.js';
import { requestLogger } from './middleware/requestLogger.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/authRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import userRoutes from './routes/userRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import ingredientRoutes from './routes/ingredientRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Read API version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
const API_VERSION = pkg.version;

// Apply structured request logging middleware first
app.use(requestLogger);

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
})); // Set security HTTP headers

// Disable HTTP caching for all API endpoints to secure user session lifecycle
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// CORS Setup (Must explicitly map the client origin for cookie transfer)
const configuredClientOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  ...configuredClientOrigins,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Apply global rate limiter to all API endpoints, excluding health check
app.use('/api', (req, res, next) => {
  if (req.originalUrl === '/api/health') {
    return next();
  }
  return globalRateLimiter(req, res, next);
});

// Body parsing middlewares
app.use(express.json({ limit: '10kb' })); // parse application/json with sizing protection
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser()); // parse HttpOnly cookies

// Sanitize inputs
app.use(mongoSanitize()); // prevent MongoDB Operator Injection
app.use(hpp()); // prevent HTTP Parameter Pollution

// Performance enhancements
app.use(compression()); // compress response bodies

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED';
  res.status(200).json({ 
    status: dbStatus === 'CONNECTED' ? 'UP' : 'DOWN',
    uptime: Math.floor(process.uptime()),
    database: dbStatus,
    version: API_VERSION,
    memory: process.memoryUsage(),
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
});

// App Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/audit', auditRoutes);

// Global Error Handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server started: listening on port ${PORT} in ${process.env.NODE_ENV} mode [API v${API_VERSION}]`);
});

// Handle graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed.');
    
    mongoose.connection.close(false).then(() => {
      logger.info('MongoDB connection closed.');
      process.exit(0);
    }).catch((err) => {
      logger.error('Error closing MongoDB connection gracefully:', err);
      process.exit(1);
    });
  });
  
  // Force close after 10 seconds if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err, promise) => {
  logger.error(`Unhandled Rejection Error: ${err.message}`);
  server.close(() => {
    mongoose.connection.close(false).then(() => {
      process.exit(1);
    }).catch(() => {
      process.exit(1);
    });
  });
});
