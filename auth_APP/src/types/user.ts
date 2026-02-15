/**
 * User domain entity
 */
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

/**
 * User roles
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

/**
 * DTO for creating a new user
 */
export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

/**
 * DTO for login request
 */
export interface LoginDTO {
  username: string;
  password: string;
  applicationName?: string; // Optional: target application for role-specific JWT. If omitted, includes all apps
}

/**
 * JWT token pair (access + refresh)
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Role assignment for a specific application
 */
export interface ApplicationRole {
  applicationName: string;
  roles: string[];
}

/**
 * JWT token payload
 */
export interface TokenPayload {
  userId: string;
  username: string;
  applicationName?: string; // Single app (if specified in login)
  roles?: string[]; // Roles for single app
  applications?: ApplicationRole[]; // All apps with roles (if no app specified)
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * DTO for refresh token request
 */
export interface RefreshTokenDTO {
  refreshToken: string;
}

/**
 * User without sensitive data (for responses)
 */
export interface UserPublic {
  id: string;
  username: string;
  role: string; // Legacy field for backward compatibility
}

/**
 * Validated token data (from JWT payload)
 */
export interface ValidatedToken {
  userId: string;
  username: string;
  // Single-app token
  applicationName?: string;
  roles?: string[];
  // Multi-app token
  applications?: ApplicationRole[];
  type: 'access' | 'refresh';
}

/**
 * Login response
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserPublic;
}
