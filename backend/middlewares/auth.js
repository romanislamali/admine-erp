const jwt = require('jsonwebtoken');
const tokenBlacklist = require('../utils/tokenBlacklist');

/**
 * JWT Authentication Middleware
 * Verifies Authorization: Bearer <token>
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token is required. Authorization denied.' });
  }

  if (tokenBlacklist.isRevoked(token)) {
    return res.status(401).json({ message: 'Session has been logged out. Please log in again.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(403).json({ message: 'Invalid token. Authorization denied.' });
  }
};

/**
 * Role authorization wrapper
 * @param {Array<string>} roles Allowed roles
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied. Requires one of roles: ${roles.join(', ')}` });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
};
