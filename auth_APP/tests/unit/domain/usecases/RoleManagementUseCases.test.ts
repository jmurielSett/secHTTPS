import { AssignRoleUseCase, RevokeRoleUseCase } from '@/domain/usecases/RoleManagementUseCases';
import { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('RoleManagementUseCases', () => {
  let mockPool: Pool;
  let mockInvalidateCache: ReturnType<typeof vi.fn>;
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockInvalidateCache = vi.fn();
    mockQuery = vi.fn();
    
    mockPool = {
      query: mockQuery
    } as any;
  });

  describe('AssignRoleUseCase', () => {
    let useCase: AssignRoleUseCase;

    beforeEach(() => {
      useCase = new AssignRoleUseCase(mockPool, mockInvalidateCache as any);
    });

    it('should assign role successfully with all fields', async () => {
      // Mock: user exists
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock: application exists
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock: role exists
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock: INSERT successful
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await useCase.execute({
        userId: '1',
        applicationName: 'testApp',
        roleName: 'admin',
        grantedBy: '2',
        expiresAt: new Date('2026-12-31')
      });

      expect(result.success).toBe(true);
      expect(mockInvalidateCache).toHaveBeenCalledWith('1');
    });

    it('should call invalidateCache callback after assignment', async () => {
      // Mock todas las queries como exitosas
      mockQuery.mockResolvedValue({
        rows: [{ id: 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await useCase.execute({
        userId: '123',
        applicationName: 'app',
        roleName: 'viewer'
      });

      expect(mockInvalidateCache).toHaveBeenCalledOnce();
      expect(mockInvalidateCache).toHaveBeenCalledWith('123');
    });

    it('should throw error if user does not exist', async () => {
      // Mock: user NOT exists
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      await expect(
        useCase.execute({
          userId: '999',
          applicationName: 'app',
          roleName: 'admin'
        })
      ).rejects.toThrow('User with id 999 not found');

      expect(mockInvalidateCache).not.toHaveBeenCalled();
    });

    it('should throw error if application does not exist', async () => {
      // Mock: user exists
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock: application NOT exists
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      await expect(
        useCase.execute({
          userId: '1',
          applicationName: 'nonexistent',
          roleName: 'admin'
        })
      ).rejects.toThrow("Application 'nonexistent' not found");

      expect(mockInvalidateCache).not.toHaveBeenCalled();
    });

    it('should throw error if role does not exist', async () => {
      // Mock: user exists
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock: application exists
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock: role NOT exists
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      await expect(
        useCase.execute({
          userId: '1',
          applicationName: 'app',
          roleName: 'nonexistent'
        })
      ).rejects.toThrow("Role 'nonexistent' not found");

      expect(mockInvalidateCache).not.toHaveBeenCalled();
    });

    it('should work with optional fields (grantedBy, expiresAt)', async () => {
      // Mock todas las queries como exitosas
      mockQuery.mockResolvedValue({
        rows: [{ id: 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await useCase.execute({
        userId: '1',
        applicationName: 'app',
        roleName: 'viewer'
        // Sin grantedBy ni expiresAt
      });

      expect(result.success).toBe(true);
      expect(mockInvalidateCache).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Connection failed'));

      await expect(
        useCase.execute({
          userId: '1',
          applicationName: 'app',
          roleName: 'admin'
        })
      ).rejects.toThrow('Connection failed');
    });
  });

  describe('RevokeRoleUseCase', () => {
    let useCase: RevokeRoleUseCase;

    beforeEach(() => {
      useCase = new RevokeRoleUseCase(mockPool, mockInvalidateCache as any);
    });

    it('should revoke specific role successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'DELETE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await useCase.execute({
        userId: '1',
        applicationName: 'app',
        roleName: 'admin'
      });

      expect(result.success).toBe(true);
      expect(result.revokedCount).toBe(1);
      expect(mockInvalidateCache).toHaveBeenCalledWith('1');
    });

    it('should call invalidateCache callback after revocation', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'DELETE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await useCase.execute({
        userId: '456',
        applicationName: 'app',
        roleName: 'editor'
      });

      expect(mockInvalidateCache).toHaveBeenCalledOnce();
      expect(mockInvalidateCache).toHaveBeenCalledWith('456');
    });

    it('should return 0 if role was not assigned', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'DELETE',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await useCase.execute({
        userId: '1',
        applicationName: 'app',
        roleName: 'nonexistent'
      });

      expect(result.success).toBe(true);
      expect(result.revokedCount).toBe(0);
      
      // Aún debe invalidar cache (por si acaso)
      expect(mockInvalidateCache).toHaveBeenCalledWith('1');
    });

    it('should revoke all roles in specific app', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'DELETE',
        rowCount: 3,
        oid: 0,
        fields: []
      });

      const result = await useCase.revokeAllRolesInApp('1', 'app1');

      expect(result.success).toBe(true);
      expect(result.revokedCount).toBe(3);
      expect(mockInvalidateCache).toHaveBeenCalledWith('1');
    });

    it('should revoke all roles in all apps', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'DELETE',
        rowCount: 5,
        oid: 0,
        fields: []
      });

      const result = await useCase.revokeAllRoles('1');

      expect(result.success).toBe(true);
      expect(result.revokedCount).toBe(5);
      expect(mockInvalidateCache).toHaveBeenCalledWith('1');
    });

    it('should return 0 when revoking all roles with none assigned', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'DELETE',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await useCase.revokeAllRoles('999');

      expect(result.success).toBe(true);
      expect(result.revokedCount).toBe(0);
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Deadlock detected'));

      await expect(
        useCase.execute({
          userId: '1',
          applicationName: 'app',
          roleName: 'admin'
        })
      ).rejects.toThrow('Deadlock detected');
    });
  });

  describe('Integration between Assign and Revoke', () => {
    it('should maintain consistent behavior', async () => {
      const assignUseCase = new AssignRoleUseCase(mockPool, mockInvalidateCache as any);
      const revokeUseCase = new RevokeRoleUseCase(mockPool, mockInvalidateCache as any);

      // Assign
      mockQuery.mockResolvedValue({
        rows: [{ id: 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await assignUseCase.execute({
        userId: '1',
        applicationName: 'app',
        roleName: 'admin'
      });

      expect(mockInvalidateCache).toHaveBeenCalledWith('1');
      mockInvalidateCache.mockClear();

      // Revoke
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'DELETE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await revokeUseCase.execute({
        userId: '1',
        applicationName: 'app',
        roleName: 'admin'
      });

      expect(mockInvalidateCache).toHaveBeenCalledWith('1');
    });
  });
});
