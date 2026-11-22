import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

// Fallback replica set URI for Windows environments where Node DNS c-ares blocks SRV queries
const resolveFallbackUri = (uri: string): string => {
  if (uri.includes('cluster0.xt9xdlm.mongodb.net')) {
    const directReplicaUri = 'mongodb://abhishekanandok_db_user:zbPdgKL6ebwf8fwH@ac-xubefca-shard-00-00.xt9xdlm.mongodb.net:27017,ac-xubefca-shard-00-01.xt9xdlm.mongodb.net:27017,ac-xubefca-shard-00-02.xt9xdlm.mongodb.net:27017/dipu_khata?ssl=true&replicaSet=atlas-13df8y-shard-0&authSource=admin&retryWrites=true&w=majority';
    return directReplicaUri;
  }
  return uri;
};

export const connectDatabase = async (): Promise<typeof mongoose> => {
  if (isConnected) {
    return mongoose;
  }

  let connectionUri = env.MONGODB_URI;

  try {
    logger.info('Connecting to MongoDB...');
    const conn = await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: true,
    });

    isConnected = conn.connection.readyState === 1;
    logger.info(`✅ MongoDB Connected: ${conn.connection.host} / DB: ${conn.connection.name}`);
    setupEventHandlers();
    return conn;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    // If Node DNS SRV failed (querySrv ECONNREFUSED), fall back to standard replicaSet URI
    if (err.code === 'ECONNREFUSED' || err.message?.includes('querySrv')) {
      logger.warn('⚠️ SRV DNS resolution failed. Retrying with Direct ReplicaSet connection...');
      try {
        const fallbackUri = resolveFallbackUri(connectionUri);
        const conn = await mongoose.connect(fallbackUri, {
          serverSelectionTimeoutMS: 10000,
          autoIndex: true,
        });
        isConnected = conn.connection.readyState === 1;
        logger.info(`✅ MongoDB Connected via ReplicaSet: ${conn.connection.host} / DB: ${conn.connection.name}`);
        setupEventHandlers();
        return conn;
      } catch (fallbackError) {
        logger.error('❌ Failed to connect via Direct ReplicaSet fallback:', fallbackError);
        throw fallbackError;
      }
    }

    logger.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
};

const setupEventHandlers = () => {
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Setting state to false.');
    isConnected = false;
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected.');
    isConnected = true;
  });
};

export const getDbState = (): { isConnected: boolean; state: string } => {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const readyState = mongoose.connection.readyState;
  return {
    isConnected: readyState === 1,
    state: states[readyState] || 'unknown',
  };
};
