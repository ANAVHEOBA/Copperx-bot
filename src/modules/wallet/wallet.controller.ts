import { Context } from '../../types/context';
import { WalletCrud } from './wallet.crud';
import { SessionManager } from '../../utils/session-manager';
import { WalletModel } from './wallet.model';
import { CallbackQuery, Message } from 'telegraf/typings/core/types/typegram';
import axios from 'axios';
import { RecoverTokensRequest, WalletSessionData } from './wallet.schema';
import { Markup } from 'telegraf';

export class WalletController {
    async handleWalletList(ctx: Context): Promise<void> {
        try {
            const accessToken = await this.checkAuth(ctx);
            if (!accessToken) return;

            const wallets = await WalletCrud.getWallets(accessToken);
            if (wallets.length === 0) {
                await ctx.reply('No wallets found', 
                    Markup.inlineKeyboard([
                        Markup.button.callback('⬅️ Back to Wallet Menu', 'menu_wallet')
                    ])
                );
                return;
            }

            const walletModels = wallets.map(wallet => new WalletModel(wallet));
            const walletList = walletModels.map(wallet => wallet.getWalletInfo()).join('\n\n');

            await ctx.reply(
                '💼 Your Wallets:\n\n' +
                walletList +
                '\n\nUse /wallet_help to see all available commands',
                Markup.inlineKeyboard([
                    Markup.button.callback('⬅️ Back to Wallet Menu', 'menu_wallet')
                ])
            );
        } catch (error) {
            console.error('Failed to fetch wallets:', error);
            await ctx.reply('❌ Failed to fetch wallets. Please try again.');
        }
    }

    async handleWalletBalance(ctx: Context): Promise<void> {
        try {
            const accessToken = await this.checkAuth(ctx);
            if (!accessToken) return;

            const balance = await WalletCrud.getWalletBalance(accessToken);
            await ctx.reply(
                '💰 Default Wallet Balance:\n\n' +
                `Amount: ${balance.balance} ${balance.symbol}\n` +
                `Token Address: ${balance.address}\n` +
                `Decimals: ${balance.decimals}`,
                Markup.inlineKeyboard([
                    Markup.button.callback('⬅️ Back to Wallet Menu', 'menu_wallet')
                ])
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
            '/balance - Check default wallet balance\n' +
            '/all_balances - Check all wallet balances\n' +
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

    async handleTokenBalanceMenu(ctx: Context): Promise<void> {
        try {
            const accessToken = await this.checkAuth(ctx);
            if (!accessToken) return;

            // Get networks first to show available options
            const networks = await WalletCrud.getNetworks(accessToken);
            if (networks.length === 0) {
                await ctx.reply('No supported networks found');
                return;
            }

            const networkButtons = networks.map(network => 
                Markup.button.callback(`🌐 ${network}`, `token_balance_network:${network}`)
            );

            await ctx.reply(
                '🪙 Token Balance Check\n\n' +
                'Please select a network:',
                Markup.inlineKeyboard([
                    ...networkButtons.map(button => [button]),
                    [Markup.button.callback('⬅️ Back to Wallet Menu', 'menu_wallet')]
                ])
            );
        } catch (error) {
            console.error('Failed to show token balance menu:', error);
            await ctx.reply('❌ An error occurred. Please try again.');
        }
    }

    async handleTokenBalanceNetworkSelected(ctx: Context, network: string): Promise<void> {
        try {
            await ctx.reply(
                '🪙 Enter the token symbol (e.g., USDC):',
                Markup.inlineKeyboard([
                    [Markup.button.callback('⬅️ Back', 'wallet_token_balance')]
                ])
            );
            
            // Store the selected network in session
            if (ctx.session) {
                ctx.session.selectedNetwork = network;
            }
        } catch (error) {
            console.error('Failed to handle network selection:', error);
            await ctx.reply('❌ An error occurred. Please try again.');
        }
    }

    async handleTokenBalance(ctx: Context, token?: string): Promise<void> {
        try {
            const accessToken = await this.checkAuth(ctx);
            if (!accessToken) return;

            let networkId: string;
            let tokenSymbol: string;

            if (ctx.session?.selectedNetwork && token) {
                // Interactive flow
                networkId = ctx.session.selectedNetwork;
                tokenSymbol = token;
                delete ctx.session.selectedNetwork; // Clean up
            } else {
                // Command flow
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
                const [_command, chainId, token] = args;
                networkId = chainId;
                tokenSymbol = token;
            }

            const balance = await WalletCrud.getTokenBalance(accessToken, networkId, tokenSymbol);
            
            await ctx.reply(
                `💰 Token Balance (${tokenSymbol} on ${networkId}):\n\n` +
                `Amount: ${balance.balance} ${balance.symbol}\n` +
                `Token Address: ${balance.address}\n` +
                `Decimals: ${balance.decimals}`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('⬅️ Back to Wallet Menu', 'menu_wallet')]
                ])
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

    async handleAllWalletBalances(ctx: Context): Promise<void> {
        try {
            const accessToken = await this.checkAuth(ctx);
            if (!accessToken) return;

            const walletsWithBalances = await WalletCrud.getAllWalletBalances(accessToken);
            
            if (walletsWithBalances.length === 0) {
                await ctx.reply('No wallet balances found', 
                    Markup.inlineKeyboard([
                        Markup.button.callback('⬅️ Back to Wallet Menu', 'menu_wallet')
                    ])
                );
                return;
            }

            const balanceMessages = walletsWithBalances.map(wallet => {
                const balanceList = wallet.balances.map(balance => 
                    `${balance.balance} ${balance.symbol}`
                ).join('\n');

                return `🏦 Wallet (${wallet.network})\n` +
                       `Default: ${wallet.isDefault ? '✅' : '❌'}\n` +
                       `ID: ${wallet.walletId}\n` +
                       `Balances:\n${balanceList}`;
            }).join('\n\n');

            await ctx.reply(
                '💰 All Wallet Balances:\n\n' + balanceMessages,
                Markup.inlineKeyboard([
                    Markup.button.callback('⬅️ Back to Wallet Menu', 'menu_wallet')
                ])
            );
        } catch (error) {
            console.error('Failed to fetch wallet balances:', error);
            await ctx.reply('❌ Failed to fetch wallet balances. Please try again.');
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