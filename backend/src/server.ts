import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  try {
    // 1. Connect Database
    await connectDatabase();

    // 2. Create Express app
    const app = createApp();

    // 3. Start listening
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 GittiBalu Dippu API Server running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`👉 Health check: http://localhost:${env.PORT}/api/health`);
    });

    // Graceful Shutdown
    const handleShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    logger.error('Fatal error during server startup:', error);
    process.exit(1);
  }
};

startServer();
