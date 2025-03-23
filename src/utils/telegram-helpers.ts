import { Context } from '../types/context';

export async function sendMessageWithRetry(
    ctx: Context, 
    message: string, 
    options: any = {}, 
    maxRetries = 3
): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await ctx.reply(message, options);
        } catch (error: any) {
            if (i === maxRetries - 1) {
                throw error;
            }
            if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                continue;
            }
            throw error;
        }
    }
} 