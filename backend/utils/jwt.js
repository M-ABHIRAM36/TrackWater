const jwt = require('jsonwebtoken');

/**
 * JWT Utility functions for authentication
 * Handles token generation, verification, and middleware
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for user
 * @param {object} user - User object containing id and email
 * @returns {string} - JWT token
 */
const generateToken = (user) => {
  try {
    const payload = {
      userId: user._id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'hydration-app',
      audience: 'hydration-users'
    });
  } catch (error) {
    throw new Error('Token generation failed: ' + error.message);
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} - Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'hydration-app',
      audience: 'hydration-users'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed: ' + error.message);
    }
  }
};

/**
 * Express middleware to authenticate requests
 * Extracts token from Authorization header and verifies it
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Add user info to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    return res.status(403).json({
      error: 'Forbidden',
      message: error.message
    });
  }
};

/**
 * Optional authentication middleware
 * Similar to authenticateToken but doesn't fail if no token is provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        userId: decoded.userId,
        email: decoded.email
      };
    }

    next();
  } catch (error) {
    // For optional auth, we just continue without setting req.user
    console.warn('Optional auth failed:', error.message);
    next();
  }
};

/**
 * Extract user ID from request
 * @param {object} req - Express request object
 * @returns {string} - User ID
 */
const getUserIdFromRequest = (req) => {
  if (req.user && req.user.userId) {
    return req.user.userId;
  }
  throw new Error('User ID not found in request');
};

/**
 * Generate refresh token (for future enhancement)
 * @param {object} user - User object
 * @returns {string} - Refresh token
 */
const generateRefreshToken = (user) => {
  try {
    const payload = {
      userId: user._id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '30d', // Refresh tokens last longer
      issuer: 'hydration-app',
      audience: 'hydration-users'
    });
  } catch (error) {
    throw new Error('Refresh token generation failed: ' + error.message);
  }
};

/**
 * Verify refresh token
 * @param {string} refreshToken - Refresh token to verify
 * @returns {object} - Decoded refresh token payload
 */
const verifyRefreshToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET, {
      issuer: 'hydration-app',
      audience: 'hydration-users'
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token type');
    }

    return decoded;
  } catch (error) {
    throw new Error('Refresh token verification failed: ' + error.message);
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  optionalAuth,
  getUserIdFromRequest,
  generateRefreshToken,
  verifyRefreshToken
};
