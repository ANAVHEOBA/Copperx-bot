import axios from 'axios';
import { CONFIG } from '../../config/env';
import { Transfer, TransferRequest, ErrorResponseDto, WalletWithdrawRequest, OfframpRequest, BatchTransferRequest, BatchTransferResponse, BatchTransferRequestPayload, BatchTransferResponsePayload, TransferListParams, TransferListResponse } from './transfer.schema';

export class TransferCrud {
    static async sendTransfer(accessToken: string, data: TransferRequest): Promise<Transfer> {
        try {
            const response = await axios.post<Transfer>(
                `${CONFIG.API.BASE_URL}/api/transfers/send`,
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
                console.error('Transfer Error:', error.response?.data);
                const errorResponse: ErrorResponseDto = {
                    message: error.response?.data?.message || 'Failed to send transfer',
                    statusCode: error.response?.status || 500,
                    error: error.response?.data?.error || error.message
                };
                throw errorResponse;
            }
            throw error;
        }
    }

    static async withdrawToWallet(accessToken: string, data: WalletWithdrawRequest): Promise<Transfer> {
        console.log('\n🔄 === WITHDRAW TO WALLET API CALL ===');
        console.log('Request data:', {
            ...data,
            amount: data.amount.toString(),
            currency: data.currency.toUpperCase()
        });
        
        try {
            const response = await axios.post<Transfer>(
                `${CONFIG.API.BASE_URL}/api/transfers/wallet-withdraw`,
                {
                    ...data,
                    amount: data.amount.toString(),
                    currency: data.currency.toUpperCase()
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log('✅ API Response:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ API Error:', {
                status: axios.isAxiosError(error) ? error.response?.status : 'unknown',
                data: axios.isAxiosError(error) ? error.response?.data : error,
                message: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    static async createOfframp(accessToken: string, data: OfframpRequest): Promise<Transfer> {
        try {
            const response = await axios.post<Transfer>(
                `${CONFIG.API.BASE_URL}/api/transfers/offramp`,
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
                console.error('Offramp Error:', error.response?.data);
                const errorResponse: ErrorResponseDto = {
                    message: error.response?.data?.message || 'Failed to create offramp transfer',
                    statusCode: error.response?.status || 500,
                    error: error.response?.data?.error || error.message
                };
                throw errorResponse;
            }
            throw error;
        }
    }

    static async sendBatchTransfer(accessToken: string, data: BatchTransferRequestPayload): Promise<BatchTransferResponsePayload> {
        try {
            const response = await axios.post<BatchTransferResponsePayload>(
                `${CONFIG.API.BASE_URL}/api/transfers/send-batch`,
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
                console.error('Batch Transfer Error:', error.response?.data);
                const errorResponse: ErrorResponseDto = {
                    message: error.response?.data?.message || 'Failed to send batch transfer',
                    statusCode: error.response?.status || 500,
                    error: error.response?.data?.error || error.message
                };
                throw errorResponse;
            }
            throw error;
        }
    }

    static async listTransfers(accessToken: string, params: TransferListParams): Promise<TransferListResponse> {
        try {
            const response = await axios.get<TransferListResponse>(
                `${CONFIG.API.BASE_URL}/api/transfers`,
                {
                    params,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('List Transfers Error:', error.response?.data);
                const errorResponse: ErrorResponseDto = {
                    message: error.response?.data?.message || 'Failed to list transfers',
                    statusCode: error.response?.status || 500,
                    error: error.response?.data?.error || error.message
                };
                throw errorResponse;
            }
            throw error;
        }
    }

    static async getTransfer(accessToken: string, id: string): Promise<Transfer> {
        try {
            const response = await axios.get<Transfer>(
                `${CONFIG.API.BASE_URL}/api/transfers/${id}`,
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
                console.error('Get Transfer Error:', error.response?.data);
                const errorResponse: ErrorResponseDto = {
                    message: error.response?.data?.message || 'Failed to get transfer',
                    statusCode: error.response?.status || 500,
                    error: error.response?.data?.error || error.message
                };
                throw errorResponse;
            }
            throw error;
        }
    }

    static async getWalletBalances(accessToken: string): Promise<any> {
        try {
            const response = await axios.get(
                `${CONFIG.API.BASE_URL}/api/wallets/balances`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'User-Agent': 'CopperX-Bot/1.0'
                    }
                }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Get Balances Error:', error.response?.data);
                throw error.response?.data || error;
            }
            throw error;
        }
    }
} 