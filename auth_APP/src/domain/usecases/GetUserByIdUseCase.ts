import { User } from '../../types/user';
import { DomainError } from '../errors/DomainError';
import { IUserRepository } from '../repositories/IUserRepository';

/**
 * Use case for retrieving a user by ID (admin operation)
 * Returns user without password hash
 */
export class GetUserByIdUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new DomainError('User not found', 'USER_NOT_FOUND');
    }

    // Remove password hash from response
    return {
      ...user,
      passwordHash: undefined as any
    };
  }
}
