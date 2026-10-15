import dns from 'node:dns';
import mongoose from 'mongoose';

import { env } from './env.js';

const DATABASE_CONNECTION_TIMEOUT_MS = 10000;

const DEFAULT_DNS_SERVERS = ['8.8.8.8', '8.8.4.4'];



function configureDnsServers() {
  const configuredServers = process.env.MONGODB_DNS_SERVERS
    ?.split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  const dnsServers = configuredServers?.length
    ? configuredServers
    : DEFAULT_DNS_SERVERS;

  dns.setServers(dnsServers);
}

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!env.mongodbUri) {
    throw new Error(
      'MONGODB_URI is not configured. Check the server environment.',
    );
  }

  if (env.mongodbUri.startsWith('mongodb+srv://')) {
    configureDnsServers();
  }

  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: DATABASE_CONNECTION_TIMEOUT_MS,
  });

  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
}

export function getDatabaseStatus() {
  const connectionStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return connectionStates[mongoose.connection.readyState] ?? 'unknown';
}