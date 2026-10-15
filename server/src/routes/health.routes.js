import { Router } from 'express';

import { getDatabaseStatus } from '../config/database.js';

const router = Router();

router.get('/live', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'alive',
    },
  });
});

router.get('/ready', (_req, res) => {
  const databaseStatus = getDatabaseStatus();
  const isDatabaseConnected = databaseStatus === 'connected';

  const status = isDatabaseConnected ? 'ready' : 'not_ready';

  res.status(isDatabaseConnected ? 200 : 503).json({
    success: isDatabaseConnected,
    data: {
      status,
      checks: {
        application: 'ok',
        database: databaseStatus,
      },
    },
  });
});

export default router;