import { DomainError } from '../errors/DomainError';
import { IUserRepository } from '../repositories/IUserRepository';

/**
 * Use case for deleting a user (admin operation)
 * Prevents deletion of the last admin user to avoid lockout
 */
export class DeleteUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new DomainError('User not found', 'USER_NOT_FOUND');
    }

    // Delete user
    const deleted = await this.userRepository.delete(userId);

    if (!deleted) {
      throw new DomainError('Failed to delete user', 'DELETE_FAILED');
    }
  }
}
