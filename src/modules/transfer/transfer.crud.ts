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
        try {
            const response = await axios.post<Transfer>(
                `${CONFIG.API.BASE_URL}/api/transfers/wallet-withdraw`,
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
                console.error('Wallet Withdraw Error:', error.response?.data);
                const errorResponse: ErrorResponseDto = {
                    message: error.response?.data?.message || 'Failed to withdraw to wallet',
                    statusCode: error.response?.status || 500,
                    error: error.response?.data?.error || error.message
                };
                throw errorResponse;
            }
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
} 