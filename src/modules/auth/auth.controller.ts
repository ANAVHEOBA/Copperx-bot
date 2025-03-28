import { Message } from 'telegraf/types';
import { AuthCrud } from './auth.crud';
import { AuthModel } from './auth.model';
import { Context } from '../../types/context'; // Update this import
import { SessionManager } from '../../utils/session-manager';
import { NotificationsService } from '../notifications/notifications.service';
import { MENUS } from '../menu/menu.config';

export class AuthController {
  private userSessions: Map<number, AuthModel> = new Map();
  private notificationsService: NotificationsService;

  constructor(notificationsService: NotificationsService) {
    this.notificationsService = notificationsService;
  }

  async handleLoginRequest(ctx: Context): Promise<void> {
    try {
      const message = ctx.message as Message.TextMessage;
      
      if (!message || !message.text || !message.from) {
        await ctx.reply('Invalid command format');
        return;
      }

      const email = message.text.split(' ')[1];
      
      if (!email) {
        await ctx.reply('Please provide an email: /login your_email@example.com');
        return;
      }

      const authModel = new AuthModel(email);
      
      if (!authModel.validate()) {
        await ctx.reply('Invalid email format. Please try again.');
        return;
      }

      const response = await AuthCrud.requestEmailOtp(authModel.getEmail());
      authModel.setSid(response.sid);
      
      // Store the session for OTP verification
      this.userSessions.set(message.from.id, authModel);
      
      await ctx.reply('✉️ OTP sent successfully! Please enter the OTP using /verify <code>');
    } catch (error: any) {
      await ctx.reply(`❌ Login failed: ${error.message}`);
    }
  }

  async handleVerifyOtp(ctx: Context): Promise<void> {
    try {
      const message = ctx.message as Message.TextMessage;
      
      if (!message || !message.text || !message.from) {
        await ctx.reply('Invalid command format');
        return;
      }

      const otp = message.text.split(' ')[1];
      
      if (!otp) {
        await ctx.reply('Please provide the OTP: /verify <code>');
        return;
      }

      const authModel = this.userSessions.get(message.from.id);
      
      if (!authModel) {
        await ctx.reply('Please start the login process first using /login');
        return;
      }

      authModel.setOtp(otp);
      
      if (!authModel.validateOtp()) {
        await ctx.reply('Invalid OTP format. Please try again.');
        return;
      }

      const response = await AuthCrud.verifyOtp({
        email: authModel.getEmail(),
        otp: authModel.getOtp()!,
        sid: authModel.getSid()!
      });

      // Store token and org ID
      await SessionManager.setToken(ctx, response.accessToken);
      ctx.session.organizationId = response.user.organizationId;

      // Subscribe to deposit notifications
      if (ctx.from?.id) {
        this.notificationsService.subscribeToDeposits(
          response.user.organizationId,
          ctx.from.id,
          response.accessToken
        );
      }

      // Clear the temporary session
      this.userSessions.delete(message.from.id);

      await ctx.reply(
        `✅ Login successful!\n\n` +
        `Welcome ${response.user.firstName} ${response.user.lastName}\n` +
        `Role: ${response.user.role}\n` +
        `Organization ID: ${response.user.organizationId}`
      );

      // Log session state
      console.log('Session saved:', {
        accessToken: ctx.session.accessToken,
        timestamp: ctx.session.tokenTimestamp
      });

    } catch (error: any) {
      await ctx.reply(`❌ Verification failed: ${error.message}`);
    }
  }

  async handleProfile(ctx: Context): Promise<void> {
    try {
      const message = ctx.message as Message.TextMessage;
      
      if (!message || !message.from) {
        await ctx.reply('Invalid command format');
        return;
      }

      if (!ctx.session.accessToken) {
        await ctx.reply('Please login first using /login');
        return;
      }

      const profile = await AuthCrud.getProfile(ctx.session.accessToken);

      await ctx.reply(
        `👤 *Your Profile*\n\n` +
        `Name: ${profile.firstName} ${profile.lastName}\n` +
        `Email: ${profile.email}\n` +
        `Role: ${profile.role}\n` +
        `Status: ${profile.status}\n` +
        `Type: ${profile.type}\n` +
        `Organization ID: ${profile.organizationId}\n` +
        `Wallet Address: ${profile.walletAddress}\n` +
        `Wallet Type: ${profile.walletAccountType}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error: any) {
      console.error('Profile error:', error);
      await ctx.reply(`❌ Failed to fetch profile: ${error.message}`);
    }
  }

  async handleLogout(ctx: Context): Promise<void> {
    try {
      const token = await SessionManager.getToken(ctx);
      if (!token) {
        await ctx.reply('You are not logged in.');
        return;
      }

      await AuthCrud.logout(token);
      await SessionManager.clearSession(ctx);
      
      await ctx.reply('✅ Successfully logged out!');
      
      // Show start menu
      await ctx.reply(
        MENUS.START.title,
        {
          reply_markup: {
            inline_keyboard: this.createButtonRows(MENUS.START.options)
          }
        }
      );
    } catch (error: any) {
      console.error('Logout error:', error);
      await ctx.reply(`❌ Logout failed: ${error.message}`);
    }
  }

  private createButtonRows(options: Array<{ text: string, callback: string }>) {
    const buttons = options.map(option => ({
      text: option.text,
      callback_data: option.callback
    }));
    
    // Create rows of 2 buttons each
    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }
    return rows;
  }
}