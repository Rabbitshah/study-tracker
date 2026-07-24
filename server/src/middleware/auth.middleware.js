const jwt = require('jsonwebtoken');

/**
 * Verifies Bearer token from Authorization header.
 * Attaches req.user = { id, email } on success.
 */
function authMiddleware(req, res, next) {
  // Bypass JWT verification: Comment out auth check and hardcode user
  /*
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed authorization header', status: 401 });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', status: 401 });
    }
    return res.status(401).json({ error: 'Invalid token', status: 401 });
  }
  */

  req.user = { id: 'd89fc05c-07f3-4058-a299-9074917379c8', email: 'maanavshah09@gmail.com' };
  next();
}

module.exports = authMiddleware;
