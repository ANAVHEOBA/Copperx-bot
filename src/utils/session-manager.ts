import { Context } from '../types/context';

export class SessionManager {
  private static readonly TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

  static async getToken(ctx: Context): Promise<string | null> {
    if (!ctx.session.accessToken) {
      return null;
    }

    if (this.isTokenExpired(ctx)) {
      await this.clearSession(ctx);
      return null;
    }

    return ctx.session.accessToken;
  }

  static async setToken(ctx: Context, token: string): Promise<void> {
    ctx.session.accessToken = token;
    ctx.session.tokenTimestamp = Date.now();
  }

  static async clearSession(ctx: Context): Promise<void> {
    ctx.session.accessToken = undefined;
    ctx.session.tokenTimestamp = undefined;
  }

  private static isTokenExpired(ctx: Context): boolean {
    const timestamp = ctx.session.tokenTimestamp;
    if (!timestamp) return true;
    return Date.now() - timestamp > this.TOKEN_EXPIRY;
  }
} 