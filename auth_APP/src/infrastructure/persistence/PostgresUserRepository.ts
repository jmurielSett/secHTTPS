import { Pool } from 'pg';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { ApplicationRole, User, UserRole } from '../../types/user';

/**
 * PostgreSQL User Repository
 * Implements user persistence using PostgreSQL
 */
export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async findByUsername(username: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await this.pool.query(query, [username]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pool.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async create(user: User): Promise<User> {
    const query = `
      INSERT INTO users (id, username, email, password_hash, role, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      user.id,
      user.username,
      user.email,
      user.passwordHash,
      user.role,
      user.createdAt
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToUser(result.rows[0]);
  }

  async update(user: User): Promise<User> {
    const query = `
      UPDATE users
      SET username = $2, email = $3, password_hash = $4, role = $5
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      user.id,
      user.username,
      user.email,
      user.passwordHash,
      user.role
    ];

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`User with id ${user.id} not found`);
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [id]);

    return result.rowCount !== null && result.rowCount > 0;
  }

  async findAll(): Promise<User[]> {
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    const result = await this.pool.query(query);

    return result.rows.map(row => this.mapRowToUser(row));
  }

  async getUserRolesByApplication(userId: string, applicationName: string): Promise<string[]> {
    const query = `
      SELECT r.name as role_name
      FROM user_application_roles uar
      JOIN roles r ON uar.role_id = r.id
      JOIN applications a ON uar.application_id = a.id
      WHERE uar.user_id = $1 
        AND a.name = $2
        AND a.is_active = true
        AND (uar.expires_at IS NULL OR uar.expires_at > NOW())
      ORDER BY r.name
    `;
    
    const result = await this.pool.query(query, [userId, applicationName]);
    return result.rows.map(row => row.role_name);
  }

  async getAllUserRoles(userId: string): Promise<ApplicationRole[]> {
    const query = `
      SELECT a.name as application_name, r.name as role_name
      FROM user_application_roles uar
      JOIN roles r ON uar.role_id = r.id
      JOIN applications a ON uar.application_id = a.id
      WHERE uar.user_id = $1 
        AND a.is_active = true
        AND (uar.expires_at IS NULL OR uar.expires_at > NOW())
      ORDER BY a.name, r.name
    `;
    
    const result = await this.pool.query(query, [userId]);
    
    // Group roles by application
    const appRolesMap = new Map<string, string[]>();
    
    for (const row of result.rows) {
      const appName = row.application_name;
      const roleName = row.role_name;
      
      if (!appRolesMap.has(appName)) {
        appRolesMap.set(appName, []);
      }
      appRolesMap.get(appName)!.push(roleName);
    }
    
    // Convert map to array of ApplicationRole
    return Array.from(appRolesMap.entries()).map(([applicationName, roles]) => ({
      applicationName,
      roles
    }));
  }

  /**
   * Maps a database row to a User entity
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as UserRole,
      createdAt: row.created_at.toISOString()
    };
  }
}
