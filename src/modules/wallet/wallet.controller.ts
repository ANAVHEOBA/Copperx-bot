import { Context } from '../../types/context';
import { WalletCrud } from './wallet.crud';
import { SessionManager } from '../../utils/session-manager';
import { WalletModel } from './wallet.model';
import { CallbackQuery, Message } from 'telegraf/typings/core/types/typegram';
import axios from 'axios';
import { RecoverTokensRequest, WalletSessionData } from './wallet.schema';

export class WalletController {
    async handleWalletList(ctx: Context): Promise<void> {
        try {
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('🔒 Please login first by clicking the Login button in the main menu');
                return;
            }

            const wallets = await WalletCrud.getWallets(accessToken);
            if (wallets.length === 0) {
                await ctx.reply('No wallets found');
                return;
            }

            const walletModels = wallets.map(wallet => new WalletModel(wallet));
            const walletList = walletModels.map(wallet => wallet.getWalletInfo()).join('\n\n');

            await ctx.reply(
                '💼 Your Wallets:\n\n' +
                walletList +
                '\n\nUse /wallet_help to see all available commands'
            );
        } catch (error) {
            console.error('Failed to fetch wallets:', error);
            await ctx.reply('❌ Failed to fetch wallets. Please try again.');
        }
    }

    async handleWalletBalance(ctx: Context): Promise<void> {
        try {
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('🔒 Please login first by clicking the Login button in the main menu');
                return;
            }

            const balance = await WalletCrud.getWalletBalance(accessToken);
            await ctx.reply(
                '💰 Default Wallet Balance:\n\n' +
                `Amount: ${balance.balance} ${balance.symbol}\n` +
                `Token Address: ${balance.address}\n` +
                `Decimals: ${balance.decimals}`
            );
        } catch (error) {
            console.error('Failed to fetch balance:', error);
            await ctx.reply('❌ Failed to fetch balance. Please try again.');
        }
    }

    async handleWalletHelp(ctx: Context): Promise<void> {
        await ctx.reply(
            '💼 *Wallet Commands*\n\n' +
            '/wallets - View all wallets\n' +
            '/balance - Check wallet balances\n' +
            '/deposit - Get deposit address\n' +
            '/set_default - Set default wallet\n' +
            '/networks - List supported networks\n' +
            '/token_balance - Check token balance\n' +
            '/recover_tokens - Recover tokens\n' +
            '/wallet_help - Show this help message',
            { parse_mode: 'Markdown' }
        );
    }

    async handleGetDefaultWallet(ctx: Context): Promise<void> {
        try {
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('🔒 Please login first by clicking the Login button in the main menu');
                return;
            }

            const wallet = await WalletCrud.getDefaultWallet(accessToken);
            const walletModel = new WalletModel(wallet);

            await ctx.reply(
                '🔒 Default Wallet:\n\n' +
                walletModel.getWalletInfo()
            );
        } catch (error) {
            console.error('Failed to fetch default wallet:', error);
            await ctx.reply('❌ Failed to fetch default wallet. Please try again.');
        }
    }

    async handleSetDefaultWallet(ctx: Context): Promise<void> {
        try {
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('🔒 Please login first by clicking the Login button in the main menu');
                return;
            }

            // Get all wallets first
            const wallets = await WalletCrud.getWallets(accessToken);
            if (wallets.length === 0) {
                await ctx.reply('No wallets found');
                return;
            }

            // Create inline keyboard with wallet options
            const keyboard = wallets.map(wallet => [{
                text: `${wallet.walletAddress.slice(0, 8)}... (${wallet.network})`,
                callback_data: `set_default:${wallet.id}`
            }]);

            await ctx.reply(
                'Select a wallet to set as default:',
                {
                    reply_markup: {
                        inline_keyboard: keyboard
                    }
                }
            );
        } catch (error) {
            console.error('Failed to show wallet selection:', error);
            await ctx.reply('❌ Failed to load wallets. Please try again.');
        }
    }

    async handleSetDefaultCallback(ctx: Context): Promise<void> {
        try {
            const callbackQuery = ctx.callbackQuery as CallbackQuery.DataQuery;
            if (!callbackQuery?.data) {
                await ctx.reply('Invalid callback data');
                return;
            }

            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('🔒 Please login first by clicking the Login button in the main menu');
                return;
            }

            const walletId = callbackQuery.data.split(':')[1];
            const wallet = await WalletCrud.setDefaultWallet(accessToken, walletId);
            const walletModel = new WalletModel(wallet);

            await ctx.editMessageText(
                '✅ Default wallet updated:\n\n' +
                walletModel.getWalletInfo()
            );
        } catch (error) {
            console.error('Failed to set default wallet:', error);
            await ctx.reply('❌ Failed to set default wallet. Please try again.');
        }
    }

    async handleNetworks(ctx: Context): Promise<void> {
        try {
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('🔒 Please login first by clicking the Login button in the main menu');
                return;
            }

            const networks = await WalletCrud.getNetworks(accessToken);
            if (networks.length === 0) {
                await ctx.reply('No supported networks found');
                return;
            }

            const networkList = networks.map(network => `• ${network}`).join('\n');
            await ctx.reply(
                '🌐 Supported Networks:\n\n' +
                networkList
            );
        } catch (error) {
            console.error('Failed to fetch networks:', error);
            await ctx.reply('❌ Failed to fetch networks. Please try again.');
        }
    }

    async handleTokenBalance(ctx: Context): Promise<void> {
        try {
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('🔒 Please login first by clicking the Login button in the main menu');
                return;
            }

            const message = ctx.message as Message.TextMessage;
            if (!message?.text) {
                await ctx.reply('Invalid command format');
                return;
            }

            const args = message.text.split(' ');
            if (args.length !== 3) {
                await ctx.reply('Usage: /token_balance <chainId> <token>');
                return;
            }

            const [_, chainId, token] = args;
            const balance = await WalletCrud.getTokenBalance(accessToken, chainId, token);
            
            await ctx.reply(
                `💰 Token Balance (${token} on ${chainId}):\n\n` +
                `Amount: ${balance.balance} ${balance.symbol}\n` +
                `Token Address: ${balance.address}\n` +
                `Decimals: ${balance.decimals}`
            );
        } catch (error) {
            console.error('Failed to fetch token balance:', error);
            await ctx.reply('❌ Failed to fetch token balance. Please try again.');
        }
    }

    async handleRecoverTokens(ctx: Context): Promise<void> {
        try {
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('🔒 Please login first by clicking the Login button in the main menu');
                return;
            }

            const message = ctx.message as Message.TextMessage;
            if (!message?.text) {
                await ctx.reply('Invalid command format');
                return;
            }

            const args = message.text.split(' ');
            if (args.length !== 5) {
                await ctx.reply('Usage: /recover_tokens <chainId> <amount> <currency> <toAccount>');
                return;
            }

            const session = ctx.session as WalletSessionData;
            if (!session?.organizationId) {
                await ctx.reply('Organization ID not found. Please login again.');
                return;
            }

            const [_, chainId, amount, currency, toAccount] = args;
            const data: RecoverTokensRequest = {
                organizationId: session.organizationId,
                chainId,
                amount,
                currency,
                toAccount
            };

            const result = await WalletCrud.recoverTokens(accessToken, data);
            await ctx.reply(
                '✅ Tokens Recovery Initiated:\n\n' +
                `Transaction: ${result}`
            );
        } catch (error) {
            console.error('Failed to recover tokens:', error);
            await ctx.reply('❌ Failed to recover tokens. Please try again.');
        }
    }

    private async checkAuth(ctx: Context): Promise<string | null> {
        const accessToken = await SessionManager.getToken(ctx);
        if (!accessToken) {
            await ctx.reply('🔒 Please login first by clicking the Login button in the main menu');
            return null;
        }
        return accessToken;
    }
}