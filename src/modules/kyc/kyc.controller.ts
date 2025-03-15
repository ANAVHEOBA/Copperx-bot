import { Context } from '../../types/context';
import { Message } from 'telegraf/types';
import { KycCrud } from './kyc.crud';
import axios, { AxiosError } from 'axios';
import { CONFIG } from '../../config/env';
import { ErrorResponseDto } from './kyc.schema';
import { SessionManager } from '../../utils/session-manager';
import { RateLimiter } from '../../utils/rate-limiter';
import { KycModel } from './kyc.model';

export class KycController {
  async handleKycList(ctx: Context): Promise<void> {
    try {
      const message = ctx.message as Message.TextMessage;
      
      if (!message?.from) {
        await ctx.reply('Invalid request');
        return;
      }

      if (!ctx.session.accessToken) {
        await ctx.reply('Please login first using /login');
        return;
      }

      const response = await KycCrud.getKycList(ctx.session.accessToken);
      
      if (response.data.length === 0) {
        await ctx.reply('No KYC records found');
        return;
      }

      const kycList = response.data.map((kyc, index) => 
        `${index + 1}. ID: ${kyc.id}\n` +
        `   Status: ${kyc.status}\n` +
        `   Type: ${kyc.type}\n` +
        `   Country: ${kyc.country}\n`
      ).join('\n');

      await ctx.reply(
        `📋 *KYC List*\n\n${kycList}\n\n` +
        `Page ${response.page} of ${Math.ceil(response.count / response.limit)}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error: any) {
      await ctx.reply(`❌ Failed to fetch KYC list: ${error.message}`);
    }
  }

  async handleKycStatus(ctx: Context): Promise<void> {
    try {
      const message = ctx.message as Message.TextMessage;
      
      if (!message?.from || !message.text) {
        await ctx.reply('Invalid request');
        return;
      }

      if (!ctx.session.accessToken) {
        await ctx.reply('Please login first using /login');
        return;
      }

      const kycId = message.text.split(' ')[1];
      if (!kycId) {
        await ctx.reply('Please provide a KYC ID: /kyc_status <id>');
        return;
      }

      const kyc = await KycCrud.getKycById(ctx.session.accessToken, kycId);

      await ctx.reply(
        `🔍 *KYC Details*\n\n` +
        `ID: ${kyc.id}\n` +
        `Status: ${kyc.status}\n` +
        `Type: ${kyc.type}\n` +
        `Country: ${kyc.country}\n` +
        `Provider: ${kyc.kycProviderCode}\n\n` +
        `👤 *Personal Details*\n` +
        `Name: ${kyc.kycDetail.firstName} ${kyc.kycDetail.lastName}\n` +
        `Email: ${kyc.kycDetail.email}\n` +
        `Phone: ${kyc.kycDetail.phoneNumber}\n` +
        `Address: ${kyc.kycDetail.addressLine1}, ${kyc.kycDetail.city}, ${kyc.kycDetail.country}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error: any) {
      await ctx.reply(`❌ Failed to fetch KYC status: ${error.message}`);
    }
  }

  async handleCreateKyc(ctx: Context): Promise<void> {
    try {
      const accessToken = await SessionManager.getToken(ctx);
      if (!accessToken) {
        await ctx.reply('Please login first using /login');
        return;
      }

      // Type guard functions
      const isPhotoMessage = (msg: any): msg is Message.PhotoMessage => {
        return Array.isArray(msg?.photo);
      };

      const isDocumentMessage = (msg: any): msg is Message.DocumentMessage => {
        return msg?.document !== undefined;
      };

      // Handle photo upload with proper type checking
      const message = ctx.message;
      let mediaFile: { file_id: string; mime_type?: string } | null = null;

      if (isPhotoMessage(message)) {
        mediaFile = message.photo[0];
      } else if (isDocumentMessage(message)) {
        // Validate document type
        if (!message.document.mime_type?.startsWith('image/')) {
          await ctx.reply('❌ Please upload an image file (JPEG, PNG)');
          return;
        }
        mediaFile = message.document;
      }

      if (!mediaFile) {
        await ctx.reply(
          'Please upload a photo of your PAN card.\n' +
          'You can either:\n' +
          '1. Send the photo directly\n' +
          '2. Send as a document (JPEG, PNG only)'
        );
        return;
      }

      // Get and validate file size
      const file = await ctx.telegram.getFile(mediaFile.file_id);
      if (!file.file_path) {
        throw new Error('Failed to get file path');
      }

      // Validate file size (max 5MB)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.file_size && file.file_size > MAX_FILE_SIZE) {
        await ctx.reply('❌ File size too large. Please upload an image under 5MB');
        return;
      }

      // Download and process file
      const fileUrl = `https://api.telegram.org/file/bot${CONFIG.TELEGRAM.BOT_TOKEN}/${file.file_path}`;
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      
      // Create FormData
      const kycModel = new KycModel();
      const blob = new Blob([response.data], { type: 'image/jpeg' });
      kycModel.addDocument('panCardImage', blob);
      const formData = kycModel.toFormData();

      // Upload to API
      const kyc = await KycCrud.createKyc(accessToken, formData);

      // Handle response based on status
      if (kyc.status === 'pending') {
        await ctx.reply(
          '✅ Initial KYC submission successful!\n\n' +
          `ID: ${kyc.id}\n` +
          'Please complete your verification on our platform:\n' +
          `${CONFIG.APP.KYC_URL}\n\n` +
          'You will need to provide additional information and documents.'
        );
      } else if (kyc.status === 'rejected') {
        await ctx.reply(
          '❌ KYC submission was rejected.\n\n' +
          'Please visit our platform to complete the verification process:\n' +
          CONFIG.APP.KYC_URL
        );
      } else {
        await ctx.reply(
          '✅ KYC submission received!\n\n' +
          `ID: ${kyc.id}\n` +
          `Status: ${kyc.status}\n` +
          'Please wait for verification.'
        );
      }
    } catch (error) {
      console.error('KYC creation error:', error);
      let errorMessage = `Failed to create KYC. Please try again on our platform:\n${CONFIG.APP.KYC_URL}`;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ErrorResponseDto>;
        console.error('API Error Response:', axiosError.response?.data);
        errorMessage = `${axiosError.response?.data?.message?.toString() || 'Failed to create KYC.'}\nPlease complete your verification at:\n${CONFIG.APP.KYC_URL}`;
      }

      await ctx.reply(
        `❌ ${errorMessage}`
      );
    }
  }
} 