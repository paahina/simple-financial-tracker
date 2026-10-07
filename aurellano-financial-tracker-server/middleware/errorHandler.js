import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  void next;

  const statusCode = err.statusCode || 500;
  const isProduction = env.nodeEnv === 'production';
  const message =
    statusCode === 500 && isProduction ? 'Something went wrong' : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message,
    },
  });
}
