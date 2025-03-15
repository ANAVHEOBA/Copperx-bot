import { Context as TelegrafContext, Telegraf } from 'telegraf';

// Define the session data structure
export interface SessionData {
    accessToken?: string;
    tokenTimestamp?: number;
    organizationId?: string;
}

// Define the custom context type that includes session data
export interface Context extends TelegrafContext {
    session: SessionData;
}

// Create a custom bot type that uses our Context
export type Bot = Telegraf<Context>;