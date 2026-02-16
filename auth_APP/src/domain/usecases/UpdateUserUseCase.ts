import { User } from '../../types/user';
import { DomainError } from '../errors/DomainError';
import { IUserRepository } from '../repositories/IUserRepository';
import { IPasswordHasher } from '../services';
import { Email, Password, Username } from '../value-objects';

interface UpdateUserInput {
  userId: string;
  username?: string;
  email?: string;
  password?: string;
}

/**
 * Use case for updating a user (admin operation)
 * Can update username, email, and/or password
 */
export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(input: UpdateUserInput): Promise<User> {
    // Find existing user
    const existingUser = await this.userRepository.findById(input.userId);
    if (!existingUser) {
      throw new DomainError('User not found', 'USER_NOT_FOUND');
    }

    // Validate and update fields
    const updatedUsername = await this.validateAndUpdateUsername(input.username, existingUser);
    const updatedEmail = await this.validateAndUpdateEmail(input.email, existingUser, input.userId);
    const updatedPasswordHash = await this.updatePassword(input.password, existingUser.passwordHash);

    // Create updated user entity
    const updatedUser: User = {
      ...existingUser,
      username: updatedUsername,
      email: updatedEmail,
      passwordHash: updatedPasswordHash
    };

    // Save updated user
    const savedUser = await this.userRepository.update(updatedUser);

    // Return user without password hash
    return {
      ...savedUser,
      passwordHash: undefined as any
    };
  }

  /**
   * Validates and updates username if provided
   */
  private async validateAndUpdateUsername(
    newUsername: string | undefined,
    existingUser: User
  ): Promise<string> {
    if (!newUsername) {
      return existingUser.username;
    }

    const username = Username.create(newUsername);
    
    // Check if new username is taken by another user
    if (username.getValue() !== existingUser.username) {
      const usernameExists = await this.userRepository.findByUsername(username.getValue());
      if (usernameExists && usernameExists.id !== existingUser.id) {
        throw new DomainError('Username already exists', 'DUPLICATE_USERNAME');
      }
    }
    
    return username.getValue();
  }

  /**
   * Validates and updates email if provided
   */
  private async validateAndUpdateEmail(
    newEmail: string | undefined,
    existingUser: User,
    userId: string
  ): Promise<string> {
    if (!newEmail) {
      return existingUser.email;
    }

    const email = Email.create(newEmail);
    
    // Check if new email is taken by another user
    if (email.getValue() !== existingUser.email) {
      const emailExists = await this.userRepository.findByEmail(email.getValue());
      if (emailExists && emailExists.id !== userId) {
        throw new DomainError('Email already exists', 'DUPLICATE_EMAIL');
      }
    }
    
    return email.getValue();
  }

  /**
   * Updates password if provided
   */
  private async updatePassword(
    newPassword: string | undefined,
    currentPasswordHash: string
  ): Promise<string> {
    if (!newPassword) {
      return currentPasswordHash;
    }

    const password = Password.create(newPassword);
    return await this.passwordHasher.hash(password.getValue());
  }
}
