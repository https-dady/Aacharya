import app from './app.js';

import { env } from './config/env.js';

import {
  connectDatabase,
  disconnectDatabase,
} from './config/database.js';

import {
  configureCloudinary,
} from './config/cloudinary.js';

let server;
let isShuttingDown = false;
let shutdownPromise;

function listen() {
  return new Promise((resolve, reject) => {
    const httpServer = app.listen(env.port);

    const handleStartupError = (error) => {
      httpServer.removeListener('listening', handleListening);
      reject(error);
    };

    const handleListening = () => {
      httpServer.removeListener('error', handleStartupError);
      server = httpServer;

      console.log(
        `Aacharya LMS API running at http://localhost:${env.port}`,
      );

      resolve(httpServer);
    };

    httpServer.once('error', handleStartupError);
    httpServer.once('listening', handleListening);
  });
}

async function startServer() {
  try {
    if (env.cloudinary.enabled) {
      configureCloudinary();
      console.log('Cloudinary storage configured.');
    } else {
      console.log(
        'Cloudinary storage is not configured; storage operations remain unavailable.',
      );
    }

    await connectDatabase();

    if (isShuttingDown) {
      await disconnectDatabase();
      return;
    }

    await listen();
  } catch (error) {
    console.error(
      'Aacharya LMS startup failed. Check the application configuration, port availability, and database connectivity.',
      error.message,
    );

    try {
      await disconnectDatabase();
    } catch (disconnectError) {
      console.error(
        'Database cleanup failed during startup:',
        disconnectError.message,
      );
    }

    process.exitCode = 1;
  }
}

function closeHttpServer() {
  if (!server) {
    return Promise.resolve();
  }

  const httpServer = server;
  server = undefined;

  return new Promise((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function performShutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully.`);

  let shutdownFailed = false;

  try {
    await closeHttpServer();
  } catch (error) {
    shutdownFailed = true;

    console.error(
      'HTTP server shutdown failed:',
      error.message,
    );
  }

  try {
    await disconnectDatabase();
  } catch (error) {
    shutdownFailed = true;

    console.error(
      'Database shutdown failed:',
      error.message,
    );
  }

  if (shutdownFailed) {
    process.exitCode = 1;
    return;
  }

  console.log('HTTP server and database connection closed.');
}

function shutdown(signal) {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  isShuttingDown = true;
  shutdownPromise = performShutdown(signal);

  return shutdownPromise;
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void startServer();