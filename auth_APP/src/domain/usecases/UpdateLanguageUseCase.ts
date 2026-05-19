import { TokenPayload } from '../../types/user';
import { DomainError } from '../errors/DomainError';
import { IUserRepository } from '../repositories/IUserRepository';
import { ITokenService } from '../services';

const SUPPORTED_LANGUAGES = ['ca', 'es'] as const;

interface UpdateLanguageInput {
  targetUserId: string;
  requesterPayload: TokenPayload;
  language: string;
}

interface UpdateLanguageResult {
  language: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Updates a user's preferred language and re-emits a fresh token pair
 * with the new language embedded in the `lang` claim.
 *
 * Authorization rules:
 *  - A user may update their own language.
 *  - An admin may update any user's language.
 */
export class UpdateLanguageUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService
  ) {}

  async execute(input: UpdateLanguageInput): Promise<UpdateLanguageResult> {
    const { targetUserId, requesterPayload, language } = input;

    // Authorization check
    const isOwn = targetUserId === requesterPayload.userId;
    const isAdmin =
      requesterPayload.roles?.includes('admin') ||
      requesterPayload.applications?.some(a => a.roles.includes('admin')) ||
      false;

    if (!isOwn && !isAdmin) {
      throw new DomainError('Access denied', 'FORBIDDEN');
    }

    // Validate language value
    if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(language)) {
      throw new DomainError(
        `Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    // Fetch the target user
    const user = await this.userRepository.findById(targetUserId);
    if (!user) {
      throw new DomainError('User not found', 'USER_NOT_FOUND');
    }

    // Persist new language
    const updatedUser = await this.userRepository.update({ ...user, language });

    // Re-emit a token pair preserving the requester's application context
    const tokens = this.tokenService.generateTokenPair(
      updatedUser.id.toString(),
      updatedUser.username,
      requesterPayload.applicationName,
      requesterPayload.roles,
      requesterPayload.applications,
      updatedUser.authProvider,
      updatedUser.language
    );

    return {
      language: updatedUser.language,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }
}
