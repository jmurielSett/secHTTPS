import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Extended Request interface with user authentication data
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    applicationName?: string;
    roles?: string[];
  };
}

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const APPLICATION_NAME = process.env.APPLICATION_NAME || 'secHTTPS_APP';

/**
 * Authentication middleware using JWT tokens from httpOnly cookies
 * 
 * Validates the access token and attaches user data to the request.
 * If token is invalid or expired, returns 401 Unauthorized.
 * 
 * @example
 * // REST API routes
 * app.get('/api/certificates', authMiddleware, (req: AuthenticatedRequest, res) => {
 *   console.log('User:', req.user?.username);
 *   // ... handle request
 * });
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract access token from httpOnly cookie
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      res.status(401).json({ 
        error: 'UNAUTHORIZED',
        message: 'No access token provided. Please login.' 
      });
      return;
    }

    // Verify JWT signature and expiration
    const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET) as any;

    // Validate token type
    if (decoded.type !== 'access') {
      res.status(401).json({ 
        error: 'INVALID_TOKEN',
        message: 'Token is not an access token' 
      });
      return;
    }

    // Validate that token is for this application
    if (decoded.applicationName && decoded.applicationName !== APPLICATION_NAME) {
      res.status(403).json({ 
        error: 'FORBIDDEN',
        message: `Token is not valid for application: ${APPLICATION_NAME}` 
      });
      return;
    }

    // Attach user data to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      applicationName: decoded.applicationName,
      roles: decoded.roles || []
    };

    next();

  } catch (error: any) {
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ 
        error: 'TOKEN_EXPIRED',
        message: 'Access token has expired. Use refresh token to get a new one.' 
      });
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ 
        error: 'INVALID_TOKEN',
        message: 'Invalid access token signature' 
      });
      return;
    }

    // Generic error
    res.status(401).json({ 
      error: 'AUTHENTICATION_ERROR',
      message: 'Authentication failed' 
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user data if valid token exists, but doesn't block the request
 * 
 * @example
 * // Route accessible by both authenticated and anonymous users
 * app.get('/api/public', optionalAuthMiddleware, (req: AuthenticatedRequest, res) => {
 *   if (req.user) {
 *     console.log('Authenticated as:', req.user.username);
 *   } else {
 *     console.log('Anonymous user');
 *   }
 * });
 */
export async function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const accessToken = req.cookies.accessToken;

    if (accessToken) {
      const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET) as any;
      
      if (decoded.type === 'access') {
        req.user = {
          userId: decoded.userId,
          username: decoded.username,
          applicationName: decoded.applicationName,
          roles: decoded.roles || []
        };
      }
    }
  } catch (error) {
    // Ignore errors - user remains undefined
  }

  next();
}
