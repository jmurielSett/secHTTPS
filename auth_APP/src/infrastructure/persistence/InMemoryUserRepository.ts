import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { ApplicationRole, User } from '../../types/user';

/**
 * In-Memory User Repository
 * For testing purposes only
 */
export class InMemoryUserRepository implements IUserRepository {
  private readonly users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async create(user: User): Promise<User> {
    const userId = String(user.id);
    if (this.users.has(userId)) {
      throw new Error(`User with id ${user.id} already exists`);
    }

    this.users.set(userId, { ...user });
    return { ...user };
  }

  async update(user: User): Promise<User> {
    const userId = String(user.id);
    if (!this.users.has(userId)) {
      throw new Error(`User with id ${user.id} not found`);
    }

    this.users.set(userId, { ...user });
    return { ...user };
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values()).map(user => ({ ...user }));
  }

  async getUserRolesByApplication(userId: string, _applicationName: string): Promise<string[]> {
    // For in-memory testing, return the user's role from the legacy field
    // In real PostgreSQL implementation, this queries user_application_roles table
    const user = this.users.get(userId);
    if (!user?.role) {
      return [];
    }
    // Return role as array (converting from legacy single role to RBAC multiple roles)
    return [user.role];
  }

  async getAllUserRoles(userId: string): Promise<ApplicationRole[]> {
    // For in-memory testing, return a multi-app structure with the user's legacy role
    const user = this.users.get(userId);
    if (!user?.role) {
      return [];
    }
    // Mock structure: user has same role in both apps for testing
    return [
      { applicationName: 'secHTTPS_APP', roles: [user.role] },
      { applicationName: 'auth_APP', roles: [user.role] }
    ];
  }

  /**
   * Testing utility: Clear all users
   */
  clear(): void {
    this.users.clear();
  }

  /**
   * Testing utility: Get user count
   */
  count(): number {
    return this.users.size;
  }
}
