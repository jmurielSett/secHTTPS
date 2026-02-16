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
    let updatedUsername = existingUser.username;
    let updatedEmail = existingUser.email;
    let updatedPasswordHash = existingUser.passwordHash;

    if (input.username) {
      const username = Username.create(input.username);
      
      // Check if new username is taken by another user
      if (username.getValue() !== existingUser.username) {
        const usernameExists = await this.userRepository.findByUsername(username.getValue());
        if (usernameExists && usernameExists.id !== input.userId) {
          throw new DomainError('Username already exists', 'DUPLICATE_USERNAME');
        }
      }
      
      updatedUsername = username.getValue();
    }

    if (input.email) {
      const email = Email.create(input.email);
      
      // Check if new email is taken by another user
      if (email.getValue() !== existingUser.email) {
        const emailExists = await this.userRepository.findByEmail(email.getValue());
        if (emailExists && emailExists.id !== input.userId) {
          throw new DomainError('Email already exists', 'DUPLICATE_EMAIL');
        }
      }
      
      updatedEmail = email.getValue();
    }

    if (input.password) {
      const password = Password.create(input.password);
      updatedPasswordHash = await this.passwordHasher.hash(password.getValue());
    }

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
}
