import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { env } from './config/env.js';
import { checkDatabaseConnection, disconnectDatabase } from './lib/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import apiRoutes from './routes/index.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use('/api', apiLimiter, apiRoutes);

app.get('/', (_req: Request, res: Response): void => {
  res.send('Backend is running!');
});

app.use(errorHandler);

async function startServer(): Promise<void> {
  try {
    const isDbConnected = await checkDatabaseConnection();

    if (!isDbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    app.listen(env.PORT, (): void => {
      console.log(`Server running on port ${env.PORT}`);
    });

    process.on('SIGINT', async () => {
      console.log('\nShutting down gracefully...');
      await disconnectDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nShutting down gracefully...');
      await disconnectDatabase();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();
