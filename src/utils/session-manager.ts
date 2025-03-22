import { Context } from '../types/context';
import { SessionStore } from './session-store';

export class SessionManager {
  private static readonly TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

  static async getToken(ctx: Context): Promise<string | null> {
    try {
      const userId = ctx.from?.id;
      if (!userId) return null;

      const session = SessionStore.getSession(userId);
      if (!session.accessToken || !session.tokenTimestamp) {
        console.log('No token or timestamp in session');
        return null;
      }

      if (this.isTokenExpired(session.tokenTimestamp)) {
        console.log('Token expired, clearing session');
        await this.clearSession(ctx);
        return null;
      }

      console.log('Valid token found in session');
      return session.accessToken;
    } catch (error) {
      console.error('Error in getToken:', error);
      return null;
    }
  }

  static async setToken(ctx: Context, token: string): Promise<void> {
    try {
      const userId = ctx.from?.id;
      if (!userId) throw new Error('No user ID found');

      const session = SessionStore.getSession(userId);
      session.accessToken = token;
      session.tokenTimestamp = Date.now();
      SessionStore.setSession(userId, session);
      
      console.log('Token set successfully');
    } catch (error) {
      console.error('Error in setToken:', error);
      throw error;
    }
  }

  static async clearSession(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    SessionStore.setSession(userId, {});
  }

  private static isTokenExpired(timestamp: number): boolean {
    const elapsed = Date.now() - timestamp;
    const isExpired = elapsed > this.TOKEN_EXPIRY;
    
    if (isExpired) {
      console.log('Token expired:', {
        elapsed,
        expiry: this.TOKEN_EXPIRY
      });
    }
    
    return isExpired;
  }
} 