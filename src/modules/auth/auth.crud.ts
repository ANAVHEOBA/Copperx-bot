import axios from 'axios';
import { 
  EmailOtpRequestDto, 
  EmailOtpResponseDto, 
  VerifyOtpRequestDto,
  AuthResponseDto,
  ErrorResponseDto,
  UserProfileDto 
} from './auth.schema';
import { CONFIG } from '../../config/env';

export class AuthCrud {
  static async requestEmailOtp(email: string): Promise<EmailOtpResponseDto> {
    try {
      const response = await axios.post<EmailOtpResponseDto>(
        `${CONFIG.API.BASE_URL}/api/auth/email-otp/request`, 
        { email },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorResponse: ErrorResponseDto = {
          message: error.response?.data?.message || 'Unknown error',
          statusCode: error.response?.status || 500,
          error: error.message
        };
        throw errorResponse;
      }
      throw error;
    }
  }

  static async verifyOtp(data: VerifyOtpRequestDto): Promise<AuthResponseDto> {
    try {
      const response = await axios.post<AuthResponseDto>(
        `${CONFIG.API.BASE_URL}/api/auth/email-otp/authenticate`,
        data,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorResponse: ErrorResponseDto = {
          message: error.response?.data?.message || 'Unknown error',
          statusCode: error.response?.status || 500,
          error: error.message
        };
        throw errorResponse;
      }
      throw error;
    }
  }

  static async getProfile(accessToken: string): Promise<UserProfileDto> {
    try {
      const response = await axios.get<UserProfileDto>(
        `${CONFIG.API.BASE_URL}/api/auth/me`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorResponse: ErrorResponseDto = {
          message: error.response?.data?.message || 'Unknown error',
          statusCode: error.response?.status || 500,
          error: error.message
        };
        throw errorResponse;
      }
      throw error;
    }
  }
}