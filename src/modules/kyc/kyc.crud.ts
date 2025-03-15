import axios from 'axios';
import { CONFIG } from '../../config/env';
import { KycListResponse, KycResponse, ErrorResponseDto } from './kyc.schema';

export class KycCrud {
  static async getKycList(accessToken: string, page: number = 1, limit: number = 10): Promise<KycListResponse> {
    try {
      const response = await axios.get<KycListResponse>(
        `${CONFIG.API.BASE_URL}/api/kycs?page=${page}&limit=${limit}`,
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
        console.error('KYC List Error:', error.response?.data);
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

  static async getKycById(accessToken: string, id: string): Promise<KycResponse> {
    try {
      const response = await axios.get<KycResponse>(
        `${CONFIG.API.BASE_URL}/api/kycs/${id}`,
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
        console.error('KYC Get By ID Error:', error.response?.data);
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

  static async createKyc(accessToken: string, formData: FormData): Promise<KycResponse> {
    try {
      console.log('Creating KYC with FormData...');
      
      // Log the content type and size of the file
      const file = formData.get('panCardImage') as File;
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      const response = await axios.post<KycResponse>(
        `${CONFIG.API.BASE_URL}/api/kycs`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      console.log('KYC Creation Success:', response.data);
      return response.data;
    } catch (error) {
      console.error('KYC Creation Error:', error);
      if (axios.isAxiosError(error)) {
        console.error('API Error Response:', error.response?.data);
        const errorResponse: ErrorResponseDto = {
          message: error.response?.data?.message || 'Unknown error',
          statusCode: error.response?.status || 500,
          error: error.response?.data?.error || error.message
        };
        throw errorResponse;
      }
      throw error;
    }
  }
} 