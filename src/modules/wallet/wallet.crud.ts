import axios from 'axios';
import { CONFIG } from '../../config/env';
import { Wallet, WalletBalance, SetDefaultWalletRequest, ErrorResponseDto, TokenBalance, RecoverTokensRequest } from './wallet.schema';

export class WalletCrud {
    static async getWallets(accessToken: string): Promise<Wallet[]> {
        try {
            const response = await axios.get<Wallet[]>(
                `${CONFIG.API.BASE_URL}/api/wallets`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Wallet List Error:', error.response?.data);
                const errorResponse: ErrorResponseDto = {
                    message: error.response?.data?.message || 'Failed to fetch wallets',
                    statusCode: error.response?.status || 500,
                    error: error.response?.data?.error || error.message
                };
                throw errorResponse;
            }
            throw error;
        }
    }

    static async getWalletBalance(accessToken: string): Promise<WalletBalance> {
        try {
            const response = await axios.get<WalletBalance>(
                `${CONFIG.API.BASE_URL}/api/wallets/balance`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Balance Error:', error.response?.data);
                const errorResponse: ErrorResponseDto = {
                    message: error.response?.data?.message || 'Failed to fetch balance',
                    statusCode: error.response?.status || 500,
                    error: error.response?.data?.error || error.message
                };
                throw errorResponse;
            }
            throw error;
        }
    }

    static async getDefaultWallet(accessToken: string): Promise<Wallet> {
        try {
            const response = await axios.get<Wallet>(
                `${CONFIG.API.BASE_URL}/api/wallets/default`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Default Wallet Error:', error.response?.data);
                const errorResponse: ErrorResponseDto = {
                    message: error.response?.data?.message || 'Failed to fetch default wallet',
                    statusCode: error.response?.status || 500,
                    error: error.response?.data?.error || error.message
                };
                throw errorResponse;
            }
            throw error;
        }
    }

    static async setDefaultWallet(accessToken: string, walletId: string): Promise<Wallet> {
        try {
            const response = await axios.post<Wallet>(
                `${CONFIG.API.BASE_URL}/api/wallets/default`,
                { walletId } as SetDefaultWalletRequest,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Set Default Wallet Error:', error.response?.data);
                const errorResponse: ErrorResponseDto = {
                    message: error.response?.data?.message || 'Failed to set default wallet',
                    statusCode: error.response?.status || 500,
                    error: error.response?.data?.error || error.message
                };
                throw errorResponse;
            }
            throw error;
        }
    }

    static async getNetworks(accessToken: string): Promise<string[]> {
        try {
            const response = await axios.get<string[]>(
                `${CONFIG.API.BASE_URL}/api/wallets/networks`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Networks Error:', error.response?.data);
                throw {
                    message: error.response?.data?.message || 'Failed to fetch networks',
                    statusCode: error.response?.status || 500,
                    error: error.response?.data?.error || error.message
                };
            }
            throw error;
        }
    }

    static async getTokenBalance(accessToken: string, chainId: string, token: string): Promise<TokenBalance> {
        try {
            const response = await axios.get<TokenBalance>(
                `${CONFIG.API.BASE_URL}/api/wallets/${chainId}/tokens/${token}/balance`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Token Balance Error:', error.response?.data);
                throw {
                    message: error.response?.data?.message || 'Failed to fetch token balance',
                    statusCode: error.response?.status || 500,
                    error: error.response?.data?.error || error.message
                };
            }
            throw error;
        }
    }

    static async recoverTokens(accessToken: string, data: RecoverTokensRequest): Promise<string> {
        try {
            const response = await axios.post<string>(
                `${CONFIG.API.BASE_URL}/api/wallets/recover-tokens`,
                data,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Recover Tokens Error:', error.response?.data);
                throw {
                    message: error.response?.data?.message || 'Failed to recover tokens',
                    statusCode: error.response?.status || 500,
                    error: error.response?.data?.error || error.message
                };
            }
            throw error;
        }
    }
} 