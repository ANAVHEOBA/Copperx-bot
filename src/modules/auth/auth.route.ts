import { Context, Bot } from '../../types/context';
import { AuthController } from './auth.controller';

export class AuthRoute {
    private controller: AuthController;

    constructor(private bot: Bot) {
        // Get NotificationsService from bot context
        const notificationsService = (bot as any).context.notificationsService;
        this.controller = new AuthController(notificationsService);
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.bot.command('login', (ctx: Context) => this.controller.handleLoginRequest(ctx));
        this.bot.command('verify', (ctx: Context) => this.controller.handleVerifyOtp(ctx));
        this.bot.command('profile', (ctx: Context) => this.controller.handleProfile(ctx));
        this.bot.command('logout', (ctx: Context) => this.controller.handleLogout(ctx));
        this.bot.command('help', (ctx: Context) => this.handleHelp(ctx));
    }

    private async handleHelp(ctx: Context): Promise<void> {
        await ctx.reply(
            '🔑 *Authentication Commands*\n\n' +
            '/login <email> - Start the login process\n' +
            '/verify <code> - Verify OTP code\n' +
            '/profile - View your profile\n' +
            '/logout - Logout from the bot\n' +
            '/help - Show this help message'
        );
    }
}