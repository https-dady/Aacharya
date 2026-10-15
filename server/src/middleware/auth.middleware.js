import { verifyAccessToken } from '../services/auth/token.service.js';

export function authenticate(req, res, next) {
  const authorization = req.get('authorization');

  if (!authorization) {
    const error = new Error('Authentication is required.');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return next(error);
  }

  const [scheme, token, ...extraParts] = authorization.trim().split(/\s+/);

  if (
    scheme?.toLowerCase() !== 'bearer'
    || !token
    || extraParts.length > 0
  ) {
    const error = new Error('A valid access token is required.');
    error.statusCode = 401;
    error.code = 'INVALID_TOKEN';
    return next(error);
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.userId,
    };

    return next();
  } catch {
    const error = new Error('A valid access token is required.');
    error.statusCode = 401;
    error.code = 'INVALID_TOKEN';
    return next(error);
  }
}