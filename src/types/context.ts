import { Context as TelegrafContext, Telegraf } from 'telegraf';
import { Update } from 'telegraf/types';

export interface MenuState {
    currentMenu?: string;
    previousMenu?: string;
    pendingAction?: string;
    data?: any;
}

export interface SessionData {
    accessToken?: string;
    tokenTimestamp?: number;
    organizationId?: string;
    menuState?: MenuState;
    lastCommand?: string;
    naturalLanguageContext?: {
        intent?: string;
        entities?: any;
        step?: number;
    };
    selectedNetwork?: string;
}

// Define our custom context type
export interface Context extends TelegrafContext {
    session: SessionData;
}

// Define the bot type with our custom context
export type Bot = Telegraf<Context>;