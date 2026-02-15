import { ApplicationRole, User } from '../../types/user';

/**
 * User Repository Interface
 * Contract for user persistence operations
 */
export interface IUserRepository {
  /**
   * Finds a user by ID
   * @param id - User unique identifier
   * @returns User if found, null otherwise
   */
  findById(id: string): Promise<User | null>;

  /**
   * Finds a user by username
   * @param username - Username
   * @returns User if found, null otherwise
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Finds a user by email
   * @param email - Email address
   * @returns User if found, null otherwise
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Creates a new user
   * @param user - User data
   * @returns Created user
   */
  create(user: User): Promise<User>;

  /**
   * Updates an existing user
   * @param user - User data with updated fields
   * @returns Updated user
   */
  update(user: User): Promise<User>;

  /**
   * Deletes a user by ID
   * @param id - User unique identifier
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Gets user roles for a specific application
   * @param userId - User unique identifier
   * @param applicationName - Application name
   * @returns Array of role names for the user in that application
   */
  getUserRolesByApplication(userId: string, applicationName: string): Promise<string[]>;

  /**
   * Gets user roles for all applications
   * @param userId - User unique identifier
   * @returns Array of application roles
   */
  getAllUserRoles(userId: string): Promise<ApplicationRole[]>;

  /**
   * Lists all users
   * @returns Array of users
   */
  findAll(): Promise<User[]>;
}
