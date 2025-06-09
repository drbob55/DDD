import { UseCase } from '../UseCase';
import { Result } from '../../../shared/Result';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuthService } from '../../services/IAuthService';
import { Email } from '../../../domain/value-objects/Email';
import { Password } from '../../../domain/value-objects/Password';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
  error?: string;
}

export class LoginUseCase implements UseCase<LoginRequest, LoginResponse> {
  constructor(
    private userRepository: IUserRepository,
    private authService: IAuthService
  ) {}

  async execute(request: LoginRequest): Promise<LoginResponse> {
    try {
      // 1. Validate email
      const emailResult = Email.create(request.email);
      if (emailResult.isFailure) {
        return {
          success: false,
          error: 'Invalid email address'
        };
      }

      // 2. Find user by email
      const user = await this.userRepository.findByEmail(emailResult.getValue());
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // 3. Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is deactivated'
        };
      }

      // 4. Verify password
      const passwordValid = await this.authService.verifyPassword(
        request.password,
        user.password.value
      );

      if (!passwordValid) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // 5. Generate tokens
      const tokens = await this.authService.generateTokens({
        userId: user.id,
        email: user.email.value,
        role: user.role.value
      });

      // 6. Update last login
      user.updateLastLogin();
      await this.userRepository.save(user);

      // 7. Return success response
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email.value,
            firstName: user.props.firstName,
            lastName: user.props.lastName,
            role: user.role.value
          },
          tokens
        }
      };

    } catch (error) {
      console.error('LoginUseCase error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }
}
