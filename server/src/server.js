import app from './app.js';
import { env } from './config/env.js';
import {
  connectDatabase,
  disconnectDatabase,
} from './config/database.js';

let server;
let isShuttingDown = false;

async function startServer() {
  try {
    await connectDatabase();

    if (isShuttingDown) {
      await disconnectDatabase();
      return;
    }

    server = app.listen(env.port, () => {
      console.log(
        `Aacharya LMS API running at http://localhost:${env.port}`,
      );
    });
  } catch (error) {
    console.error(
      'Aacharya LMS startup failed. Check the database configuration and connectivity.',
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

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(`${signal} received. Shutting down gracefully.`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    await disconnectDatabase();

    console.log('HTTP server and database connection closed.');
  } catch (error) {
    console.error('Graceful shutdown failed:', error.message);
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void startServer();