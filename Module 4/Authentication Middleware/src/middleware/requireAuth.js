const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {

  // 1. Read Authorization header
  const authHeader = req.headers.authorization ?? '';

  // 2. Extract Bearer token using strict regex
  const match = /^Bearer ([^\s]+)$/i.exec(authHeader);
  const token = match ? match[1] : null;

  // 3. If token is missing, return 401
  if (!token) {
    return res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required'
      }
    });
  }

  // 4. Verify JWT token
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });

    // 5. Attach verified user information
    req.user = payload;

    // 6. Continue to next middleware
    next();

  } catch (_error) {

    // 7. Return the same error for invalid tokens
    return res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required'
      }
    });

  }
};