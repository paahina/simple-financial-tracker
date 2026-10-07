import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  if (!connected) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is not connected',
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      database: 'connected',
    },
  });
});
