import { Context as TelegrafContext, Telegraf } from 'telegraf';

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


export interface Context extends TelegrafContext {
    session: SessionData;
}


export type Bot = Telegraf<Context>;