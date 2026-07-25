import express, { Request, Response } from 'express';
import 'dotenv/config';
import cors from 'cors';
import { checkDatabaseConnection, disconnectDatabase } from './lib/prisma.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response): void => {
  res.send('Backend is running!');
});

async function startServer(): Promise<void> {
  try {
    // Check database connection before starting the server
    const isDbConnected = await checkDatabaseConnection();

    if (!isDbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start the Express server
    app.listen(PORT, (): void => {
      console.log(`Server running on port ${PORT}`);
    });

    // Handle graceful shutdown
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
