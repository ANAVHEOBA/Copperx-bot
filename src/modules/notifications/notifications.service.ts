import Pusher from 'pusher-js';
import axios from 'axios';
import { CONFIG } from '../../config/env';
import { Bot, Context } from '../../types/context';
import { SessionManager } from '../../utils/session-manager';

interface PusherAuthorizer {
    authorize: (socketId: string, callback: (error: Error | null, data: any) => void) => void;
}

interface DepositNotification {
    amount: string;
    currency: string;
    network: string;
    transactionHash: string;
    status: string;
    explorerUrl?: string;
}

type PusherChannel = ReturnType<Pusher['subscribe']>;

export class NotificationsService {
    private pusher: Pusher;
    private bot: Bot;
    private userChannels: Map<string, PusherChannel> = new Map();
    private activeTokens: Map<string, string> = new Map();

    constructor(bot: Bot) {
        this.bot = bot;
        this.pusher = new Pusher(CONFIG.PUSHER.KEY, {
            cluster: CONFIG.PUSHER.CLUSTER,
            authorizer: (channel: { name: string }): PusherAuthorizer => ({
                authorize: async (socketId: string, callback: (error: Error | null, data: any) => void) => {
                    try {
                        // Extract organization ID from channel name
                        const orgId = channel.name.replace('private-org-', '');
                        const token = this.activeTokens.get(orgId);

                        if (!token) {
                            throw new Error('No valid token found for authorization');
                        }

                        const response = await axios.post(CONFIG.PUSHER.AUTH_ENDPOINT, {
                            socket_id: socketId,
                            channel_name: channel.name
                        }, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        callback(null, response.data);
                    } catch (error) {
                        console.error('Pusher authorization error:', error);
                        callback(error instanceof Error ? error : new Error('Unknown error'), null);
                    }
                }
            })
        });
    }

    subscribeToDeposits(organizationId: string, chatId: number, accessToken: string): void {
        const channelName = `private-org-${organizationId}`;
        
        try {
            // Store the token for this organization
            this.activeTokens.set(organizationId, accessToken);

            const channel = this.pusher.subscribe(channelName);
            
            channel.bind('pusher:subscription_succeeded', () => {
                console.log(`Successfully subscribed to channel: ${channelName}`);
            });

            channel.bind('pusher:subscription_error', (error: Error) => {
                console.error(`Subscription error for ${channelName}:`, error);
                // Clean up on error
                this.activeTokens.delete(organizationId);
            });

            channel.bind('deposit', (data: DepositNotification) => {
                this.handleDepositNotification(chatId, data);
            });

            this.userChannels.set(organizationId, channel);
        } catch (error) {
            console.error(`Failed to subscribe to channel ${channelName}:`, error);
            this.activeTokens.delete(organizationId);
        }
    }

    unsubscribeFromDeposits(organizationId: string): void {
        const channel = this.userChannels.get(organizationId);
        if (channel) {
            this.pusher.unsubscribe(`private-org-${organizationId}`);
            this.userChannels.delete(organizationId);
            this.activeTokens.delete(organizationId);
        }
    }

    private async handleDepositNotification(chatId: number, data: DepositNotification): Promise<void> {
        try {
            await this.bot.telegram.sendMessage(chatId,
                `💰 *New Deposit Received*\n\n` +
                `Amount: ${data.amount} ${data.currency}\n` +
                `Network: ${data.network}\n` +
                `Transaction Hash: \`${data.transactionHash}\`\n` +
                `Status: ${data.status}\n` +
                (data.explorerUrl ? `\nView transaction: ${data.explorerUrl}` : ''),
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('Failed to send deposit notification:', error);
        }
    }

    async unsubscribeAll(): Promise<void> {
        try {
            // Unsubscribe from all channels
            for (const [organizationId] of this.userChannels) {
                this.unsubscribeFromDeposits(organizationId);
            }
            
            // Clear maps
            this.userChannels.clear();
            this.activeTokens.clear();
            
            console.log('Successfully unsubscribed from all channels');
        } catch (error) {
            console.error('Error unsubscribing from channels:', error);
        }
    }
}