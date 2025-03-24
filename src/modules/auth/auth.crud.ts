import axios from 'axios';
import { 
  EmailOtpRequestDto, 
  EmailOtpResponseDto, 
  VerifyOtpRequestDto,
  AuthResponseDto,
  ErrorResponseDto,
  UserProfileDto,
  LogoutResponseDto
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
      console.log('Sending OTP verification request:', data);
      const response = await axios.post<AuthResponseDto>(
        `${CONFIG.API.BASE_URL}/api/auth/email-otp/authenticate`,
        data,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('OTP verification response:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('OTP Verification Error:', { 
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
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
      console.log('Fetching profile with token:', accessToken.substring(0, 10) + '...');
      const response = await axios.get<UserProfileDto>(
        `${CONFIG.API.BASE_URL}/api/auth/me`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      console.log('Profile response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Profile fetch error:', error);
      if (axios.isAxiosError(error)) {
        const errorResponse: ErrorResponseDto = {
          message: error.response?.data?.message || 'Failed to fetch profile',
          statusCode: error.response?.status || 500,
          error: error.message
        };
        throw errorResponse;
      }
      throw error;
    }
  }

  static async logout(accessToken: string): Promise<LogoutResponseDto> {
    try {
      const response = await axios.post<LogoutResponseDto>(
        `${CONFIG.API.BASE_URL}/api/auth/logout`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorResponse: ErrorResponseDto = {
          message: error.response?.data?.message || 'Logout failed',
          statusCode: error.response?.status || 500,
          error: error.message
        };
        throw errorResponse;
      }
      throw error;
    }
  }
}