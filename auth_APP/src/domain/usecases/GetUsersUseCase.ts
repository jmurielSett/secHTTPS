import { User } from '../../types/user';
import { IUserRepository } from '../repositories/IUserRepository';

/**
 * Use case for retrieving all users (admin operation)
 * Returns users without password hashes
 */
export class GetUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(): Promise<User[]> {
    const users = await this.userRepository.findAll();

    // Remove password hashes from response
    return users.map(user => ({
      ...user,
      passwordHash: undefined as any
    }));
  }
}
