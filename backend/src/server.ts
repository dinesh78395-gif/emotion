import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import logsRouter from './routes/logs';

export const app = express();

const MONGODB_URI = process.env.MONGODB_URI as string;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
const PORT = process.env.PORT ?? 3001;

// Middleware
app.use(express.json());
app.use(cors({ origin: FRONTEND_ORIGIN }));

// Routes
app.use('/', logsRouter);

// Start server only when this module is the entry point
if (require.main === module) {
  mongoose
    .connect(MONGODB_URI, { serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 })
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
      });
    })
    .catch((err: unknown) => {
      console.error('Failed to connect to MongoDB:', err);
      process.exit(1);
    });
}
