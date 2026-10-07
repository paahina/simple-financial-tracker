import dotenv from 'dotenv';

dotenv.config();

function required(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

const port = Number(process.env.PORT || 5000);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error('PORT must be a positive integer');
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port,
  mongoUri: required('MONGODB_URI'),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
