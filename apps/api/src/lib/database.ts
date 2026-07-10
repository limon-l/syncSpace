import mongoose from 'mongoose';
import { config } from './config.js';
import { logger } from './logger.js';

export async function connectDatabase() {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      connectTimeoutMS: 10_000,
    });
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error(error, 'Failed to connect to MongoDB');
    process.exit(1);
  }

  mongoose.connection.on('error', (error) => {
    logger.error(error, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}
