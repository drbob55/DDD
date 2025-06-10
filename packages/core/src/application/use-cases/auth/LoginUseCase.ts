import { UseCase } from '../UseCase';
import { Result } from '../../../shared/Result';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';

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
    token: string;
  };
  error?: string;
}

export class LoginUseCase implements UseCase<LoginRequest, LoginResponse> {
  constructor(
    private userRepository: IUserRepository,
    private authService: any // Will be properly typed later
  ) {}

  async execute(request: LoginRequest): Promise<LoginResponse> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.email)) {
        return {
          success: false,
          error: 'Invalid email format'
        };
      }

      // Find user by email
      const user = await this.userRepository.findByEmail(request.email);
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Verify password
      const passwordValid = await this.authService.verifyPassword(
        request.password,
        user.password
      );

      if (!passwordValid) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is deactivated'
        };
      }

      // Generate token
      const token = await this.authService.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          token
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
